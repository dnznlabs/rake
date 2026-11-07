// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Distribution, DistributionFactory} from "../../src/Distribution.sol";
import {BlocklistToken, MockERC20, MockVault, RevertingReceiver} from "../../test/mocks/Mocks.sol";

/// @notice The two distributions the write screens need and the seed does not carry: one holding a
/// live escrow in both ETH and a token that reports failure, and one owned by a contract. Plus one
/// token escrow on the *featured* distribution, owed to an anvil EOA, which is the only escrow on this
/// chain whose own key can press `claim` in a browser (m03-t09).
/// @dev Not a `Deploy*.s.sol`: the deploy loop in `mk/10-forge.mk` runs those with no environment, and
/// this one needs the factory's address. Not part of `deploy` either — the escrow demo is a hand-run
/// step, so `make fixtures` is called after `make deploy` and never from it.
///
///   FACTORY=<factory> forge script scripts/forge/Fixtures.s.sol \
///     --rpc-url $RPC --broadcast --unlocked --sender $SENDER
contract Fixtures is Script {
    /// @dev anvil accounts 1, 2 and 3. Account 0 is the sender, so it is never a beneficiary.
    address constant ACCOUNT_1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address constant OPS = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address constant ACCOUNT_3 = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;

    uint32 constant ESCROW_DELAY = 1 hours;
    uint32 constant VAULT_DELAY = 7 days;
    uint256 constant ESCROW_DEPOSIT = 1 ether;
    uint256 constant VAULT_DEPOSIT = 0.5 ether;
    uint256 constant MINT = 100e18;

    function run() external {
        DistributionFactory factory = DistributionFactory(vm.envAddress("FACTORY"));
        // Same rule as `FEATURED_SALT` (decision 10): the sender in the top 20 bytes, the index in the
        // low 12. Indexes 2 and 3, because the seed holds 1 and a hand-made create takes whatever is free.
        bytes32 escrowSalt = _salt(msg.sender, 2);
        bytes32 vaultSalt = _salt(msg.sender, 3);
        address escrow = factory.predict(escrowSalt);
        address vault = factory.predict(vaultSalt);

        // Idempotent like the seed, and for the same reason: a second `create` on a used salt burns the
        // whole gas limit before `DeploymentFailed` (#22), so the address is read with code first.
        if (escrow.code.length != 0 || vault.code.length != 0) {
            console.log("escrow demo (already there, left alone)", escrow);
            console.log("vault demo  (already there, left alone)", vault);
            return;
        }

        // The featured distribution the seed made, read the way the seed addresses it.
        address featured = factory.predict(vm.envBytes32("FEATURED_SALT"));

        vm.startBroadcast();
        RevertingReceiver receiver = new RevertingReceiver();
        MockERC20 liar = new MockERC20(MockERC20.Ret.False);
        MockVault owner = new MockVault(ACCOUNT_3);

        // The escrow demo. Both halves of both balances are pushed and both pushes fail: the receiver
        // refuses ETH until it is told not to, and the liar reports `false` without moving anything, so
        // `_push` returns `ok == false` either way and `distribute` escrows the share
        // (`src/Distribution.sol:114-134`). `release` is then the only way either moves.
        address escrowed = factory.create{value: ESCROW_DEPOSIT}(
            msg.sender, ESCROW_DELAY, "escrow demo", _half(address(receiver)), escrowSalt
        );
        liar.mint(escrowed, MINT);
        Distribution(payable(escrowed)).distribute(address(0));
        Distribution(payable(escrowed)).distribute(address(liar));

        // The vault demo. Owned by a contract from its first block, which is what decision 10 says a
        // real deployment looks like: one EOA holds the salt, the vault holds the distribution.
        address vaulted =
            factory.create{value: VAULT_DEPOSIT}(address(owner), VAULT_DELAY, "vault demo", _pair(), vaultSalt);

        /* An escrow an EOA can clear itself. Every other escrow on this chain is owed to a contract —
           the receiver refuses ETH, the liar's share is owed to account 1 in a token whose `transfer`
           lies rather than reverting — and `claim` is self-only, so none of them can be pressed from a
           browser wallet. `BlocklistToken` reverts on a transfer to the account it blocks, so
           distributing it on the featured distribution escrows account 1's share of a token account 1
           holds the key to. Account 1's share of the featured table is `Seed.s.sol`'s "treasury" row. */
        BlocklistToken blocker = new BlocklistToken(ACCOUNT_1);
        if (featured.code.length != 0) {
            blocker.mint(featured, MINT);
            Distribution(payable(featured)).distribute(address(blocker));
        }
        vm.stopBroadcast();

        console.log("receiver", address(receiver));
        console.log("liar", address(liar));
        console.log("vault", address(owner));
        console.log("vault signer", ACCOUNT_3);
        console.log("escrow demo", escrowed);
        console.log("vault demo", vaulted);
        console.log("blocklist token", address(blocker));
        console.log("blocked (claims its own escrow)", ACCOUNT_1);
        if (featured.code.length == 0) console.log("featured not seeded, no claim demo", featured);
    }

    /// @dev The sender-bound salt of decision 10, as `Model.salt` builds it in the dapp.
    function _salt(address sender, uint96 n) private pure returns (bytes32) {
        return bytes32((uint256(uint160(sender)) << 96) | uint256(n));
    }

    /// @dev Half to a receiver that refuses, half to an EOA that does not. Sorted here rather than
    /// written in order: the receiver's address comes from this script's own nonce, and `BadTable`
    /// rejects a table that is not ascending by account.
    function _half(address receiver) private pure returns (Distribution.Beneficiary[] memory table) {
        table = new Distribution.Beneficiary[](2);
        bool first = receiver < ACCOUNT_1;
        table[0] = first
            ? Distribution.Beneficiary(receiver, 5000, "receiver", "refuses ETH until told not to")
            : Distribution.Beneficiary(ACCOUNT_1, 5000, "account 1", "");
        table[1] = first
            ? Distribution.Beneficiary(ACCOUNT_1, 5000, "account 1", "")
            : Distribution.Beneficiary(receiver, 5000, "receiver", "refuses ETH until told not to");
    }

    /// @dev The seed's two rows, so the vault demo reads as an ordinary distribution that happens to be
    /// owned by a contract.
    function _pair() private view returns (Distribution.Beneficiary[] memory table) {
        uint96 ops = block.chainid == 31337 ? 6000 : 7000;

        table = new Distribution.Beneficiary[](2);
        table[0] = Distribution.Beneficiary(OPS, ops, "ops", "operations");
        table[1] = Distribution.Beneficiary(ACCOUNT_1, 10_000 - ops, "treasury", "");
    }
}
