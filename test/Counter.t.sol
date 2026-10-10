// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Counter} from "../src/Counter.sol";

contract CounterTest is Test {
    Counter counter;

    function setUp() public {
        counter = new Counter();
    }

    function test_incrementAddsOne() public {
        uint256 before = counter.number();

        counter.increment();

        assertEq(counter.number(), before + 1);
    }

    function test_incrementEmits() public {
        address caller = makeAddr("caller");
        vm.expectEmit(address(counter));
        emit Counter.Incremented(caller, 1);

        vm.prank(caller);
        counter.increment();
    }
}
