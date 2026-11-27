// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {Distribution, DistributionFactory} from "../src/Distribution.sol";
import {PlainSender} from "./mocks/Mocks.sol";

interface ISafeProxyFactory {
    function createProxyWithNonce(address singleton, bytes memory initializer, uint256 saltNonce)
        external
        returns (address);
}

interface ISafe {
    function setup(
        address[] calldata owners_,
        uint256 threshold_,
        address to,
        bytes calldata data,
        address fallbackHandler,
        address paymentToken,
        uint256 payment,
        address payable paymentReceiver
    ) external;

    function getOwners() external view returns (address[] memory);
}

interface IMultisigFactory {
    function create(address[] calldata owners_, uint32 delay_, uint256 threshold_, address executor_, uint256 salt)
        external
        payable
        returns (address wallet);
}

interface IMultisigWallet {
    function getOwners() external view returns (address[] memory);
    function threshold() external view returns (uint16);
}

/// @notice What the two wallets a distribution really pays need in order to `receive` ETH, measured
/// against `PUSH_GAS`.
///
/// Run: `forge test --mc PushGasTest -vv`
///
/// Both recipients are the canonical mainnet contracts, etched from `test/fixtures/bytecode` at the
/// addresses they occupy on chain and held to their codehashes in `setUp`. The addresses are not
/// cosmetic: the multisig factory's clone bytecode embeds its implementation's address, so an
/// implementation etched anywhere else leaves the clone delegating into an empty account, where
/// `receive` still succeeds — a DELEGATECALL into no code returns 1 — for the access cost alone.
/// That answer is a few hundred gas and looks exactly like a measurement.
///
/// The clone's real answer is also a few hundred gas, and for a reason worth saying out loud: the
/// audited implementation's `receive()` has an empty body and costs 55 gas, so nearly all of the
/// clone's minimum is the cold DELEGATECALL into it. Magnitude alone therefore cannot tell a real
/// measurement from a vacuous one here. Four things do, and all four are asserted: the codehash, the
/// clone's whole 45 bytes, a capped call that comes back with the state `create` wrote
/// (`test_vaultCloneDelegateCallIsReal`), and the gap that opens when the implementation is emptied.
///
/// Every measurement here is taken from the cold state a real transaction meets. M01's finding (#18)
/// is that a warm measurement flatters this path: a distribution's first touch of a recipient, and
/// the recipient's first touch of the singleton behind it, both pay the 2,600-gas cold-account cost.
contract PushGasTest is Test {
    /// @dev Canonical Safe v1.4.1 (one address on every supported chain), and the codehash the
    /// multisig we sign with pins in its own Safe-comparison test. No fallback handler is etched:
    /// it is not on the `receive` path, and `setup` skips it when it is `address(0)`.
    address internal constant SAFE_SINGLETON = 0x41675C099F32341bf84BFc5382aF534df5C7461a;
    address internal constant SAFE_FACTORY = 0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67;
    bytes32 internal constant SAFE_CODEHASH = 0x1fe2df852ba3299d6534ef416eefa406e56ced995bca886ab7a553e6d0c5e1c4;
    /// @dev `keccak256("SafeReceived(address,uint256)")`, which the singleton's `receive` emits.
    bytes32 internal constant SAFE_RECEIVED = 0x3d0ce9bfc3ed7d6862dbb28b2dea94561fe714a1b4d019aa8af39730d1ad7c3d;

    /// @dev multisig.software, from its README § Deployments. The implementation must be etched here
    /// and nowhere else; see this contract's notice.
    address internal constant MULTISIG_IMPL = 0xD54cb65224410F3Ff97a8E72f363f224419f4FB0;
    address internal constant MULTISIG_FACTORY = 0x000000000e8CB9ed9DC2114d79d9215eacb9cB07;
    bytes32 internal constant MULTISIG_CODEHASH = 0xca195fdffa34ca3a8a52cd236d6b8f61524860ba674e31623d34b4b5be72f183;

    string internal constant MULTISIG_IMPL_FIXTURE = "test/fixtures/bytecode/multisig/implementation.hex";

    /// @dev The PUSH0 minimal proxy the multisig factory deploys — the same one this project's own
    /// factory uses — split around the address it delegates to. 9 + 20 + 16 bytes: one unconditional
    /// DELEGATECALL with no branch on the calldata, so the address named in the middle is the address
    /// `receive` reaches.
    bytes internal constant CLONE_HEAD = hex"5f5f365f5f37365f73";
    bytes internal constant CLONE_TAIL = hex"5af43d5f5f3e6029573d5ffd5b3d5ff3";

    /// @dev `Distribution.PUSH_GAS` is private, so this mirrors it. t02 moves the measured value into
    /// `src/` under D11 (#88); until then the number lives in both places.
    uint256 internal constant PUSH_GAS = 100_000;

    address internal constant OWNER = address(0xB0B);

    DistributionFactory internal factory;
    PlainSender internal sender;
    address internal distributionImpl;

    address internal safe;
    address internal vault;

    uint96 internal salts;

    function setUp() public {
        vm.etch(SAFE_SINGLETON, _fixture("test/fixtures/bytecode/safe-v1.4.1/singleton.hex"));
        vm.etch(SAFE_FACTORY, _fixture("test/fixtures/bytecode/safe-v1.4.1/factory.hex"));
        vm.etch(MULTISIG_IMPL, _fixture(MULTISIG_IMPL_FIXTURE));
        vm.etch(MULTISIG_FACTORY, _fixture("test/fixtures/bytecode/multisig/factory.hex"));

        // Fail loudly if a fixture is not the audited contract.
        assertEq(SAFE_SINGLETON.codehash, SAFE_CODEHASH, "Safe singleton fixture is not canonical v1.4.1");
        assertEq(MULTISIG_IMPL.codehash, MULTISIG_CODEHASH, "multisig implementation fixture is not canonical");

        factory = new DistributionFactory();
        distributionImpl = factory.implementation();
        sender = new PlainSender();
        vm.deal(address(sender), 1000 ether);
        vm.deal(address(this), 1000 ether);

        address[] memory owners = new address[](1);
        owners[0] = OWNER;

        // A Safe as one exists on chain: one owner, threshold 1, no fallback handler.
        bytes memory initializer =
            abi.encodeCall(ISafe.setup, (owners, 1, address(0), "", address(0), address(0), 0, payable(address(0))));
        safe = ISafeProxyFactory(SAFE_FACTORY).createProxyWithNonce(SAFE_SINGLETON, initializer, 1);
        assertEq(ISafe(safe).getOwners()[0], OWNER, "the Safe is a live Safe");

        // A vault clone as one exists on chain. The salt's top 20 bytes are zero, which the factory
        // takes from anyone.
        vault = IMultisigFactory(MULTISIG_FACTORY).create(owners, 0, 1, address(0), 1);

        // No figure in this file means anything unless the clone delegates into the real
        // implementation. Pinning all 45 bytes proves the proxy's shape and its target at once.
        assertEq(vault.code, _cloneCode(MULTISIG_IMPL), "the vault clone does not delegate to MULTISIG_IMPL");
    }

    /// @notice The criterion's test: a distribution whose whole table is a real Safe and a real vault
    /// clone pays both of them and escrows nothing.
    function test_realPathPaysASafeAndAVaultClone() public {
        // Arrange — forge hands every test body a fresh access list, and neither wallet nor either
        // singleton is touched by deploying or funding, so all four are cold here without being
        // cooled. The one account the arrangement does warm is the `Distribution` implementation, by
        // the `init` delegatecall inside `create`; a single `vm.cool` puts that back (a sequence of
        // them does not — see `_minimumCap`). The clone's own slots stay warm from `init`, as they
        // cannot be cooled without giving up this one, so this figure is a floor under what a real
        // transaction's `distribute` would spend.
        Distribution d = _deploy(safe, vault);
        _send(d, 1 ether);
        vm.cool(distributionImpl);

        // Act
        vm.recordLogs();
        uint256 before = gasleft();
        d.distribute(address(0));
        uint256 used = before - gasleft();
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Assert
        emit log_named_uint("real path: distribute(address(0)), a Safe and a vault clone, cold", used);
        assertEq(safe.balance, 0.5 ether, "the Safe took its half");
        assertEq(vault.balance, 0.5 ether, "the vault clone took its half");
        assertEq(address(d).balance, 0, "nothing was left behind");
        assertEq(d.reserved(address(0)), 0, "and nothing was reserved");
        uint256 received;
        for (uint256 i; i < logs.length; ++i) {
            assertTrue(logs[i].topics[0] != Distribution.Escrowed.selector, "a push was escrowed");
            if (logs[i].emitter == safe && logs[i].topics[0] == SAFE_RECEIVED) ++received;
        }
        // The Safe's own `receive` is what emits this, through the proxy's delegatecall. An etched
        // singleton that was not the real one would move the balance and log nothing.
        assertEq(received, 1, "the Safe logged the receipt itself");
    }

    /// @notice The per-recipient minimum: the smallest explicit `gas:` cap under which a push lands.
    function test_receiveMinimaAreUnderPushGas() public {
        // Arrange — the first statement of the test, so the snapshot holds the cold state.
        uint256 cold = vm.snapshotState();

        // Act
        uint256 safeMin = _minimumCap(safe, cold);
        uint256 vaultMin = _minimumCap(vault, cold);
        uint256 worst = safeMin > vaultMin ? safeMin : vaultMin;

        // Assert
        emit log_named_uint("minimum gas cap to receive: Safe v1.4.1 proxy      ", safeMin);
        emit log_named_uint("minimum gas cap to receive: multisig.software clone", vaultMin);
        emit log_named_uint("PUSH_GAS headroom over the larger of the two      ", PUSH_GAS - worst);
        assertLt(safeMin, PUSH_GAS, "a Safe needs less than PUSH_GAS to receive ETH");
        assertLt(vaultMin, PUSH_GAS, "a multisig.software vault clone needs less than PUSH_GAS");
    }

    /// @notice The clone's figure is only meaningful if the clone's DELEGATECALL lands on code. A
    /// clone whose target holds nothing answers `receive` just as successfully, for a few hundred
    /// gas, so this is the test that tells the two apart: under a gas cap, on the same unconditional
    /// DELEGATECALL the `receive` path takes, live code answers with the state `create` wrote, and an
    /// emptied implementation answers with nothing at all.
    function test_vaultCloneDelegateCallIsReal() public {
        // Arrange
        uint256 cold = vm.snapshotState();
        assertEq(MULTISIG_IMPL.code.length, 10_532, "the audited implementation's byte count");
        bytes memory probe = abi.encodeCall(IMultisigWallet.getOwners, ());

        // Act / assert — a capped call through the clone reaches the implementation's own code.
        (bool live, bytes memory answer) = vault.staticcall{gas: 20_000}(probe);
        assertTrue(live, "the clone answered under a cap");
        assertEq(
            answer,
            abi.encode(uint256(0x20), uint256(1), OWNER),
            "and answered with the owner table `create` initialised, so there is code behind the DELEGATECALL"
        );
        assertEq(IMultisigWallet(vault).threshold(), 1);

        // Act — the same push, measured in gas rather than by its cap, with the implementation's code
        // the only thing that differs. Both arms re-etch the same address from the same state, so
        // both pay the same access costs; `vm.etch` warms what it writes, which is why this arm is
        // measured in gas: under a warm implementation the minimum cap is 0 on both sides and the
        // comparison would say nothing.
        vm.revertToState(cold);
        vm.etch(MULTISIG_IMPL, _fixture(MULTISIG_IMPL_FIXTURE));
        uint256 real = _pushGas(vault);

        vm.revertToState(cold);
        vm.etch(MULTISIG_IMPL, "");
        uint256 vacuous = _pushGas(vault);
        (bool stillOk, bytes memory empty) = vault.staticcall(probe);

        // Assert
        emit log_named_uint("1-wei push through the clone, real implementation   ", real);
        emit log_named_uint("1-wei push through the clone, empty implementation  ", vacuous);
        assertTrue(stillOk, "a DELEGATECALL into an empty account still returns 1");
        assertEq(empty.length, 0, "but answers nothing, which is what a vacuous measurement looks like");
        assertGt(real, vacuous, "the push pays for work only the implementation can do");
    }

    /// @dev The smallest `gas:` cap under which a 1-wei push to `to` returns `ok`, by binary search
    /// between 0 and `PUSH_GAS`. A push carries value, so the recipient also gets the 2,300-gas
    /// stipend on top of the cap; the cap is what `_push` has to promise beyond it.
    ///
    /// Each probe runs from `cold`, a state snapshot, rather than from `vm.cool`. `vm.cool` is the
    /// method M01 used and the one upstream's harness uses, but under forge 1.7.1-dev only the most
    /// recent call survives: cooling five accounts in a row leaves four of them warm, and the
    /// measured minimum then omits the cold DELEGATECALL this path is all about. A snapshot taken
    /// before the first touch carries the whole cold access list, and `vm.revertToState` hands it
    /// back as often as it is asked — which is also what makes the probes independent of each other's
    /// 1-wei transfers.
    function _minimumCap(address to, uint256 cold) internal returns (uint256 hi) {
        assertTrue(_probe(to, PUSH_GAS, cold), "no cap under PUSH_GAS lets this recipient receive");
        if (_probe(to, 0, cold)) return 0;

        uint256 lo; // known to fail
        hi = PUSH_GAS; // known to succeed
        while (hi - lo > 1) {
            uint256 mid = (lo + hi) / 2;
            if (_probe(to, mid, cold)) hi = mid;
            else lo = mid;
        }
    }

    function _probe(address to, uint256 cap, uint256 cold) internal returns (bool ok) {
        vm.revertToState(cold);
        (ok,) = to.call{value: 1 wei, gas: cap}("");
    }

    /// @dev The gas an uncapped 1-wei push to `to` costs, call included.
    function _pushGas(address to) internal returns (uint256) {
        uint256 before = gasleft();
        (bool ok,) = to.call{value: 1 wei}("");
        uint256 used = before - gasleft();
        assertTrue(ok, "the push failed");
        return used;
    }

    /// @dev `tools/bytecode-fixtures.sh` writes one `cast code` line per file, so the trailing
    /// newline has to come off before `parseBytes` will take it.
    function _fixture(string memory path) internal view returns (bytes memory) {
        return vm.parseBytes(vm.trim(vm.readFile(path)));
    }

    function _cloneCode(address implementation) internal pure returns (bytes memory) {
        return abi.encodePacked(CLONE_HEAD, implementation, CLONE_TAIL);
    }

    /// @dev A 5000/5000 table of the two wallets, sorted: `_set` requires ascending accounts.
    function _deploy(address a, address b) internal returns (Distribution d) {
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](2);
        (address lo, address hi) = a < b ? (a, b) : (b, a);
        t[0] = Distribution.Beneficiary({account: lo, bps: 5000, name: "lo", note: "note"});
        t[1] = Distribution.Beneficiary({account: hi, bps: 5000, name: "hi", note: "note"});
        bytes32 salt = bytes32(uint256(uint160(address(this))) << 96) | bytes32(uint256(++salts));
        d = Distribution(payable(factory.create(OWNER, 0, "desc", t, salt)));
    }

    /// @dev `transfer`, so the distribution is funded the way a payer funds it: 2,300 gas, no more.
    function _send(Distribution d, uint256 amount) internal {
        sender.send(address(d), amount);
    }
}
