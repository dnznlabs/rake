// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Placeholder contract. Replace it; the dev stack only needs something to deploy.
contract Counter {
    uint256 public number;

    event Incremented(address indexed by, uint256 number);

    function increment() external {
        uint256 n = ++number;
        emit Incremented(msg.sender, n);
    }
}
