// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {Distribution, DistributionFactory} from "../src/Distribution.sol";
import {GasBurner, PlainSender} from "./mocks/Mocks.sol";

/// @notice What a row costs `distribute` in the worst case, and therefore how long the table may be.
/// @dev The worst case is not a row that refuses ETH — that reverts in a few hundred gas and escrows
/// just the same. It is a row that spends the whole `PUSH_GAS` cap and *then* fails, so the caller
/// pays the cap, pays the escrow writes, and keeps going. `GasBurner` is that row; its runtime code
/// is etched at `n` ascending addresses, so a long table costs `n` etches rather than `n` deploys.
///
/// Every figure here is a cold measurement, and getting that right drove the shape of this file. A
/// real `distribute` is the first call of its own transaction: the clone, its table slots, the
/// implementation it delegates into and every recipient are cold, and EIP-2929 charges 2,600 for the
/// first touch of an account and 2,100 for the first read of a slot. Measured warm, a row comes out
/// 2,500 cheaper and the cap one row too long. Two things about this harness follow:
///
/// 1. **The tables are built in `setUp`, not in the test.** `vm.etch`, `create` and the funding all
///    warm what they touch, and `vm.cool` only half undoes it: on forge 1.7.1-dev it cools an
///    account's slots but leaves the account itself warm — measured, a CALL to a cooled address
///    still costs 179 where a pristine one costs 2,685, whatever the docstring says. The access list
///    *is* reset between `setUp` and each test, so preparing there is what makes the rows cold here,
///    and it needs no cheatcode to be honest.
/// 2. **Each table owns a disjoint range of row addresses.** The three points of
///    `test_perRowAndFixedCost` share one transaction, so a range shared between tables would find
///    the `n = 8` rows already warm from the `n = 1` measurement and would flatten the line.
contract TableCapTest is Test {
    /// @dev Mirrors the `private constant` in `Distribution`; t02 is what makes it readable, under
    /// D11. Used only to sanity-check that the burner really spends the cap.
    uint256 internal constant PUSH_GAS = 100_000;

    /// @dev `uint96` to match `Beneficiary.bps`, so `_prepare` divides the table up in that type.
    uint96 internal constant BPS_TOTAL = 10_000;

    /// @dev Half of a 30M block, the budget the overview gives one `distribute`.
    uint256 internal constant HALF_BLOCK = 15_000_000;

    /// @dev The longest table whose worst-case `distribute` stays under `HALF_BLOCK`. Pinned by
    /// `test_capRowsStayUnderHalfABlock` and `test_capPlusOneRowsExceedHalfABlock` running it, not
    /// by a formula. t02 moves this constant into `src/Distribution.sol` under D8 and this test
    /// reads it from there.
    uint256 internal constant CAP = 107;

    /// @dev Clear of the precompiles. `_set` needs each table's accounts ascending and distinct.
    uint160 internal constant FIRST_ROW = 0x10000;

    address internal constant OWNER = address(0xB0B);

    /// @dev Large enough that every row's `bps` share is non-zero at every `n` this test reaches.
    uint256 internal constant FUNDING = 1 ether;

    DistributionFactory internal factory;
    PlainSender internal sender;

    /// @dev `GasBurner`'s runtime code, deployed once and etched everywhere.
    bytes internal burner;

    /// @dev Row count to a funded clone whose table is that many burners, all built in `setUp`.
    mapping(uint256 => Distribution) internal prepared;

    /// @dev Hands out each table's disjoint range of row addresses.
    uint160 internal nextRow = FIRST_ROW;

    /// @dev Feeds `_salt()`'s low 12 bytes, so every clone lands at its own address.
    uint96 internal salts;

    function setUp() public {
        factory = new DistributionFactory();
        sender = new PlainSender();
        vm.deal(address(sender), 1000 ether);
        burner = address(new GasBurner()).code;
        assertGt(burner.length, 0, "the burner has runtime code to etch");

        _prepare(1);
        _prepare(8);
        _prepare(64);
        _prepare(CAP);
        _prepare(CAP + 1);
    }

    /// @notice The three points, the per-row cost between the two larger, and the fixed cost under them.
    function test_perRowAndFixedCost() public {
        // The implementation's own cold-access charge is a one-time 2,500 that only the first
        // measurement in a transaction pays. Spend it here, before any of the three, so all three
        // share one basis and it cannot tilt the line. The pinning tests below leave it cold, which
        // is why their figures sit 2,500 above this line.
        assertTrue(_warmImplementation() != bytes32(0), "the implementation is warm from here on");

        // Act
        uint256 g1 = _measure(1);
        uint256 g8 = _measure(8);
        uint256 g64 = _measure(64);

        emit log_named_uint("gas at n=1 ", g1);
        emit log_named_uint("gas at n=8 ", g8);
        emit log_named_uint("gas at n=64", g64);

        // Assert — the slope of the line through the two larger points, and its intercept.
        uint256 perRow = (g64 - g8) / 56;
        uint256 fixed_ = g8 - perRow * 8;
        emit log_named_uint("per-row gas ", perRow);
        emit log_named_uint("fixed gas   ", fixed_);

        // A row that merely reverted would cost about 36,500 — the escrow writes, the log and the
        // call, with none of the cap spent. Anything that cheap here would mean the burner never ran
        // and the figure is of the wrong thing.
        assertGt(perRow, PUSH_GAS, "a row spends the whole push cap and then the escrow writes");
        assertLt(perRow, PUSH_GAS + 45_000, "and the escrow writes are all it spends beyond it");

        // Assert — where the knee went. The plan expected one: the first row's `reserved[token]`
        // write is a cold zero-to-nonzero SSTORE (22,100) where every later row's is a warm dirty
        // write (100). The surcharge is real, and it is most of `fixed` — but it is paid once at
        // every `n >= 1`, so it lands in the intercept rather than the slope, and the line through
        // the two larger points hits `n = 1` instead of bending at it. The tolerance is for the
        // last row, which takes the remainder by subtraction where every other row multiplies and
        // divides: that puts a few gas of wobble on each point (the first differences measured
        // across n = 1..65 run 138,914 to 138,920).
        uint256 predicted1 = fixed_ + perRow;
        emit log_named_uint("n=1 on the line through n=8 and n=64", predicted1);
        assertApproxEqAbs(g1, predicted1, 16, "the first row's surcharge is in the intercept, not a knee");
    }

    /// @notice `CAP` rows of the worst case fit in half a block, measured with everything cold.
    function test_capRowsStayUnderHalfABlock() public {
        uint256 gasUsed = _measure(CAP);
        emit log_named_uint("rows        ", CAP);
        emit log_named_uint("gas at CAP  ", gasUsed);
        assertLt(gasUsed, HALF_BLOCK, "CAP rows stay under half a 30M block");
    }

    /// @notice One more row does not.
    function test_capPlusOneRowsExceedHalfABlock() public {
        uint256 gasUsed = _measure(CAP + 1);
        emit log_named_uint("rows         ", CAP + 1);
        emit log_named_uint("gas at CAP+1 ", gasUsed);
        assertGt(gasUsed, HALF_BLOCK, "CAP is the longest table that does");
    }

    /// @dev The `gasleft()` delta across one `distribute` over the prepared table of `n` burners,
    /// asserted to have escrowed every row: the figure is worthless if a push succeeded or a row was
    /// skipped. Nothing stands between the two `gasleft()` reads but the call itself.
    function _measure(uint256 n) internal returns (uint256 gasUsed) {
        Distribution d = prepared[n];

        vm.recordLogs();
        uint256 before = gasleft();
        d.distribute(address(0));
        gasUsed = before - gasleft();

        this.assertAllEscrowed(d, n);
    }

    /// @dev `external`, and called through `this`, on purpose: inlined into `_measure`, decoding
    /// `Vm.Log[]` puts `via_ir` one slot past the stack limit. It runs after the measurement, so it
    /// cannot touch the figure.
    function assertAllEscrowed(Distribution d, uint256 n) external view {
        uint256 count;
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i; i < logs.length; ++i) {
            // `distribute` also emits `Distributed`, so the rows are counted by topic and emitter.
            if (logs[i].emitter == address(d) && logs[i].topics[0] == Distribution.Escrowed.selector) {
                ++count;
            }
        }
        assertEq(count, n, "every row was escrowed");
        assertEq(d.reserved(address(0)), FUNDING, "the whole amount is reserved");
        assertEq(address(d).balance, FUNDING, "and none of it left the contract");
    }

    /// @dev A funded clone whose table is `n` burners at their own range of addresses, with equal
    /// `bps` and the remainder on the last row.
    function _prepare(uint256 n) internal {
        // One cast, so that the row loop and the `bps` split can both stay in a type narrow enough
        // to add to `uint160` addresses and to fill `Beneficiary.bps` without three more.
        // forge-lint: disable-next-line(unsafe-typecast)
        uint96 rows = uint96(n);

        uint160 base = nextRow;
        nextRow = base + rows;

        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](rows);
        uint96 each = BPS_TOTAL / rows;
        for (uint96 i; i < rows; ++i) {
            address account = address(base + i);
            vm.etch(account, burner);
            // The last row carries the remainder, so the table sums to 10,000 at any `n`.
            uint96 bps = i + 1 == rows ? BPS_TOTAL - each * (rows - 1) : each;
            t[i] = Distribution.Beneficiary({account: account, bps: bps, name: "", note: ""});
        }

        Distribution d = Distribution(payable(factory.create(OWNER, 0, "burners", t, _salt())));
        sender.send(address(d), FUNDING);
        prepared[n] = d;
    }

    /// @dev The codehash is returned, and asserted on by the caller, so that the touch cannot be
    /// optimised away: as a discarded return value the `EXTCODEHASH` disappears and the account
    /// stays cold, which is a 2,500-gas hole in whatever is measured next.
    function _warmImplementation() internal view returns (bytes32) {
        return factory.implementation().codehash;
    }

    function _salt() internal returns (bytes32) {
        return bytes32(uint256(uint160(address(this))) << 96) | bytes32(uint256(++salts));
    }
}
