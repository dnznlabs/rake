// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Distribution} from "../../src/Distribution.sol";

/// @notice A beneficiary that refuses ETH until it is told not to, so a push can be made to fail and
/// then to succeed on release.
contract RevertingReceiver {
    error Refused();

    bool public accepting;

    function setAccepting(bool accepting_) external {
        accepting = accepting_;
    }

    receive() external payable {
        if (!accepting) revert Refused();
    }
}

/// @notice A beneficiary that calls back into `distribute` while it is running.
contract ReentrantDistributor {
    Distribution private immutable target;

    constructor(Distribution target_) {
        target = target_;
    }

    receive() external payable {
        target.distribute(address(0));
    }
}

/// @notice A beneficiary that calls back into `release` while `distribute` is running.
contract ReentrantReleaser {
    Distribution private immutable target;

    constructor(Distribution target_) {
        target = target_;
    }

    receive() external payable {
        target.release(address(0), address(this));
    }
}

/// @notice An ERC-20 whose `transfer` re-enters the distribution before it moves the balance, so the
/// lock is proved against a token with hooks and not only against an ETH recipient (#21).
/// @dev The callback's outcome is recorded rather than bubbled: the outer `distribute` then takes its
/// success path, and the test reads the lock straight out of `hookData`.
contract HookToken {
    enum Hook {
        Distribute,
        Release
    }

    error InsufficientBalance();

    bool public hookOk;
    bytes public hookData;

    mapping(address => uint256) public balanceOf;

    Distribution private immutable target;
    Hook private immutable hook;

    constructor(Distribution target_, Hook hook_) {
        target = target_;
        hook = hook_;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        bytes memory action = hook == Hook.Distribute
            ? abi.encodeCall(Distribution.distribute, (address(this)))
            : abi.encodeCall(Distribution.release, (address(this), to));
        (hookOk, hookData) = address(target).call(action);

        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @notice Sends ETH with `transfer`, which forwards only the 2,300-gas stipend.
contract PlainSender {
    function send(address to, uint256 amount) external {
        payable(to).transfer(amount);
    }

    receive() external payable {}
}

/// @notice ERC-20 with the three return shapes a real token can have on `transfer`.
contract MockERC20 {
    /// @dev `None` is mainnet USDT: it moves the balance and returns no data at all. `False` reports
    /// failure, so it must not move the balance either.
    enum Ret {
        True,
        None,
        False
    }

    error InsufficientBalance();

    Ret public immutable ret;

    mapping(address => uint256) public balanceOf;

    constructor(Ret ret_) {
        ret = ret_;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (ret == Ret.False) return false;
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        if (ret == Ret.None) {
            assembly ("memory-safe") {
                return(0, 0)
            }
        }
        return true;
    }
}

/// @notice Enough of a multisig to answer the dapp's owner probe: `isOwner(address)` is the one call
/// decision 7 makes, and a distribution owned by this contract renders the owner view with
/// copy-calldata for every signer it names.
contract MockVault {
    address public immutable signer;

    constructor(address signer_) {
        signer = signer_;
    }

    function isOwner(address account) external view returns (bool) {
        return account == signer;
    }
}

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 id, bytes calldata data) external returns (bytes4);
}

/// @notice Enough ERC-721 to prove a safe transfer into a contract with no receiver shim reverts.
contract MockERC721 {
    error NotOwner();
    error BadReceiver();

    mapping(uint256 => address) public ownerOf;

    function mint(address to, uint256 id) external {
        ownerOf[id] = to;
    }

    function safeTransferFrom(address from, address to, uint256 id) external {
        if (ownerOf[id] != from) revert NotOwner();
        ownerOf[id] = to;
        if (to.code.length != 0) {
            bytes4 answer = IERC721Receiver(to).onERC721Received(msg.sender, from, id, "");
            if (answer != IERC721Receiver.onERC721Received.selector) revert BadReceiver();
        }
    }
}
