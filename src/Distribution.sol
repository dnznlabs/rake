// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice A sink that splits what it receives between a fixed table of beneficiaries, escrows the
/// shares it cannot push, and puts every change to itself behind one timelock.
/// @dev Deployed once as an implementation and used through PUSH0 clones. `factory` and `self` live
/// in the implementation's bytecode, so a clone reads the implementation's deployer and the
/// implementation's own address — which is how the implementation rejects ETH while a clone accepts it.
contract Distribution {
    struct Beneficiary {
        address account;
        uint96 bps;
        string name;
        string note;
    }

    struct Pending {
        bytes32 hash;
        uint256 eta;
        bytes action;
    }

    struct Snapshot {
        address owner;
        uint32 delay;
        uint32 nonce;
        string description;
        Beneficiary[] table;
        Pending[] pending;
    }

    event Received(address indexed from, uint256 amount);
    event Distributed(address indexed token, uint256 amount);
    event Escrowed(address indexed token, address indexed account, uint256 amount);
    event Released(address indexed token, address indexed account, uint256 amount);
    event Queued(bytes32 indexed hash, uint32 nonce, uint256 eta, bytes action);
    event Applied(bytes32 indexed hash);
    event Cancelled(bytes32 indexed hash);

    error NotOwner();
    error BadTable();
    error NotReady(uint256 eta);
    error NothingToDo();
    error Locked();
    error Unauthorized();
    error ReleaseFailed(address token);

    /// @dev Measured in m03-t01 (`test/PushGas.t.sol`, cold): a Safe v1.4.1 proxy receives in 4,029
    /// gas and a multisig.software vault clone in 404, so 100_000 is 23x the larger need and was kept
    /// under decision 30.
    uint256 private constant PUSH_GAS = 100_000;
    uint256 private constant BPS_TOTAL = 10_000;

    /// @dev Measured in m03-t01 (`test/TableCap.t.sol`): a worst-case row, where the recipient burns
    /// the whole push cap and then fails, costs 138,917 gas, so 107 rows distribute in 14,896,325 and
    /// 108 need 15,035,242. The rule enforced is that a worst-case `distribute` stays under half a
    /// 30M block.
    ///
    /// Those three figures are of the tree t01 measured, which is `main` at `b055bc3`. On this
    /// revision a row costs 138,877 and 107 rows come to 14,892,067 — 40 gas a row cheaper, from
    /// `via_ir` codegen moving under the members added here, not from any change to `distribute`.
    /// The 15,035,242 has no counterpart here by construction: `_set` refuses 108 rows, so that
    /// figure stays a t01 reading and `test_capPlusOneRowIsRefused` pins the refusal instead.
    uint256 public constant MAX_BENEFICIARIES = 107;
    bytes4 private constant TRANSFER = 0xa9059cbb;
    bytes4 private constant BALANCE_OF = 0x70a08231;

    address public owner;
    uint32 public delay;
    uint32 public nonce;

    /// @dev After `nonce`, not after `owner`: `owner`, `delay` and `nonce` pack into one slot and a
    /// 20-byte address cannot join them, so placing it here leaves that slot whole and `propose` and
    /// `snapshot` keep their single read of it.
    address public pendingOwner;
    string public description;

    /// @dev Stored in the order given, which table validation forces to be ascending by account.
    Beneficiary[] private _table;
    Pending[] private _pending;
    /// @dev 1-based index into `_pending`; 0 means absent.
    mapping(bytes32 => uint256) private _pendingIndex;

    /// @notice Queued action hash to the timestamp it becomes applicable.
    mapping(bytes32 => uint256) public queued;
    /// @notice Token (0 for ETH) to the total this contract holds on behalf of failed pushes.
    mapping(address => uint256) public reserved;
    /// @notice Token (0 for ETH) to account to the amount escrowed for it.
    mapping(address => mapping(address => uint256)) public escrowed;

    bool private transient locked;

    address private immutable factory;
    address private immutable self;

    constructor() {
        factory = msg.sender;
        self = address(this);
    }

    modifier nonReentrant() {
        if (locked) revert Locked();
        locked = true;
        _;
        locked = false;
    }

    /// @dev The timelock reaches state only through a self-call, so every mutator is `onlySelf`.
    modifier onlySelf() {
        if (msg.sender != address(this)) revert Unauthorized();
        _;
    }

    /// @notice Initialise a clone. Callable once, by whoever deployed the implementation.
    function init(address owner_, uint32 delay_, string calldata description_, Beneficiary[] calldata table_)
        external
        payable
    {
        if (msg.sender != factory || _table.length != 0) revert Unauthorized();
        owner = owner_;
        delay = delay_;
        description = description_;
        _set(table_);
    }

    /// @dev Must run under a 2,300-gas `transfer` stipend, so it does nothing but the guard and the log.
    receive() external payable {
        if (address(this) == self) revert Unauthorized();
        emit Received(msg.sender, msg.value);
    }

    /// @notice Split everything not already escrowed between the table, in table order.
    /// @param token The ERC-20 to split, or `address(0)` for ETH.
    function distribute(address token) external nonReentrant {
        uint256 amount = _balance(token) - reserved[token];
        if (amount == 0) revert NothingToDo();

        uint256 n = _table.length;
        uint256 paid;
        for (uint256 i; i < n; ++i) {
            Beneficiary storage b = _table[i];
            // The last row takes the remainder, so the shares always sum to `amount`.
            uint256 share = i + 1 == n ? amount - paid : (uint256(b.bps) * amount) / BPS_TOTAL;
            paid += share;
            address account = b.account;
            (bool ok,) = _push(token, account, share);
            if (!ok) {
                escrowed[token][account] += share;
                reserved[token] += share;
                emit Escrowed(token, account, share);
            }
        }
        emit Distributed(token, amount);
    }

    /// @notice Retry the escrowed amount for one account. Reverts if the retry fails, leaving the escrow.
    function release(address token, address account) external nonReentrant {
        uint256 amount = escrowed[token][account];
        if (amount == 0) revert NothingToDo();

        escrowed[token][account] = 0;
        reserved[token] -= amount;
        (bool ok, bytes memory data) = _push(token, account, amount);
        // A word or less is the bare `false` of a non-reverting token, empty revert data, or an
        // argument-less custom error: no reason worth bubbling, so name the failure instead
        // (decision 24). Anything longer carries its own reason and keeps it.
        if (!ok) {
            if (data.length <= 32) revert ReleaseFailed(token);
            _bubble(data);
        }
        emit Released(token, account, amount);
    }

    /// @notice Queue a self-call, or run it now when `delay` is zero.
    /// @param action Calldata for one of this contract's `onlySelf` functions.
    function propose(bytes calldata action) external returns (bytes32 hash) {
        if (msg.sender != owner) revert NotOwner();

        uint32 n = ++nonce;
        hash = keccak256(abi.encode(action, n));
        uint32 d = delay;
        if (d == 0) {
            emit Queued(hash, n, block.timestamp, action);
            _selfCall(action);
            emit Applied(hash);
        } else {
            uint256 eta = block.timestamp + d;
            queued[hash] = eta;
            _pendingIndex[hash] = _pending.length + 1;
            _pending.push(Pending({hash: hash, eta: eta, action: action}));
            emit Queued(hash, n, eta, action);
        }
    }

    /// @notice Run a queued action once its eta has passed. A failing action stays queued for a retry.
    function applyQueued(bytes calldata action, uint32 nonce_) external {
        bytes32 hash = keccak256(abi.encode(action, nonce_));
        uint256 eta = queued[hash];
        // A timelock is a timestamp comparison; a validator's few seconds of drift is not the threat.
        // forge-lint: disable-next-line(block-timestamp)
        if (eta == 0 || block.timestamp < eta) revert NotReady(eta);

        delete queued[hash];
        _remove(hash);
        _selfCall(action);
        emit Applied(hash);
    }

    /// @notice Drop a queued action. Immediate: the delay guards applying, not cancelling.
    function cancel(bytes32 hash) external {
        if (msg.sender != owner) revert NotOwner();
        if (queued[hash] == 0) revert NothingToDo();

        delete queued[hash];
        _remove(hash);
        emit Cancelled(hash);
    }

    function setBeneficiaries(Beneficiary[] calldata table_) external onlySelf {
        _set(table_);
    }

    function setDescription(string calldata description_) external onlySelf {
        description = description_;
    }

    function setDelay(uint32 delay_) external onlySelf {
        delay = delay_;
    }

    /// @notice Name the next owner, who must call `acceptOwnership()` before anything changes; until
    /// then the current owner keeps every power. `address(0)` renounces at once — nothing can be
    /// proposed or cancelled again — and drops any pending transfer with it. Naming the current owner
    /// withdraws a pending transfer.
    function transferOwnership(address owner_) external onlySelf {
        if (owner_ == address(0)) {
            owner = address(0);
            pendingOwner = address(0);
            return;
        }
        pendingOwner = owner_ == owner ? address(0) : owner_;
    }

    /// @notice Take ownership after the owner named you with `transferOwnership`.
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert Unauthorized();

        owner = msg.sender;
        pendingOwner = address(0);
    }

    /// @notice Everything a reader needs in one call.
    function snapshot() external view returns (Snapshot memory) {
        return Snapshot({
            owner: owner, delay: delay, nonce: nonce, description: description, table: _table, pending: _pending
        });
    }

    /// @dev Not `table()`: forge reserves the `table` prefix for table tests and fails the suite.
    function beneficiaries() external view returns (Beneficiary[] memory) {
        return _table;
    }

    function pendingCount() external view returns (uint256) {
        return _pending.length;
    }

    /// @dev Ascending accounts make duplicates impossible and keep the first row above `address(0)`.
    function _set(Beneficiary[] calldata table_) private {
        uint256 n = table_.length;
        if (n == 0 || n > MAX_BENEFICIARIES) revert BadTable();

        delete _table;
        uint256 sum;
        address prev;
        for (uint256 i; i < n; ++i) {
            Beneficiary calldata b = table_[i];
            if (b.bps == 0 || b.account <= prev) revert BadTable();
            prev = b.account;
            sum += b.bps;
            _table.push(b);
        }
        if (sum != BPS_TOTAL) revert BadTable();
    }

    /// @dev Swap-and-pop, so `_pending` stays iterable and the surviving order is stable otherwise.
    function _remove(bytes32 hash) private {
        uint256 i = _pendingIndex[hash];
        if (i == 0) return;

        uint256 last = _pending.length;
        if (i != last) {
            Pending storage moved = _pending[last - 1];
            _pending[i - 1] = moved;
            _pendingIndex[moved.hash] = i;
        }
        _pending.pop();
        delete _pendingIndex[hash];
    }

    function _selfCall(bytes calldata action) private {
        (bool ok, bytes memory data) = address(this).call(action);
        if (!ok) _bubble(data);
    }

    /// @dev A token with no code returns nothing here, which does not decode — so it fails.
    function _balance(address token) private view returns (uint256) {
        if (token == address(0)) return address(this).balance;

        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSelector(BALANCE_OF, address(this)));
        if (!ok) _bubble(data);
        return abi.decode(data, (uint256));
    }

    /// @dev ETH is capped so one hostile recipient cannot burn the whole distribution; an ERC-20 push
    /// is bounded by the token. A no-return token (mainnet USDT) counts as success; anything else must
    /// answer with a word equal to one, decoded as a `uint256` so hostile return data cannot revert here.
    function _push(address token, address to, uint256 amount) private returns (bool ok, bytes memory data) {
        if (token == address(0)) {
            (ok, data) = to.call{value: amount, gas: PUSH_GAS}("");
            return (ok, data);
        }
        (ok, data) = token.call(abi.encodeWithSelector(TRANSFER, to, amount));
        ok = ok && (data.length == 0 || (data.length >= 32 && abi.decode(data, (uint256)) == 1));
    }

    function _bubble(bytes memory data) private pure {
        assembly ("memory-safe") {
            revert(add(data, 0x20), mload(data))
        }
    }
}

/// @notice Deploys `Distribution` clones to an address that depends on this factory and a salt alone.
/// @dev No `receive` and no `fallback`, so ETH sent to the factory itself reverts; the implementation
/// rejects it too. Clones are PUSH0 minimal proxies placed with CREATE2, so the same factory reaches
/// the same clone address on every chain.
contract DistributionFactory {
    event Created(address indexed distribution, address indexed owner);

    error DeploymentFailed();
    error SaltDoesNotStartWith();

    /// @dev Deployed by the factory, so `Distribution.factory` is this contract on every clone.
    address public immutable implementation = address(new Distribution{salt: bytes32(0)}());

    /// @notice Deploy and initialise a clone at `predict(salt)`.
    /// @param salt Its top 20 bytes must equal `msg.sender`. `msg.value` rides the CREATE2, so a
    /// deposit lands in the clone without a `Received` log.
    /// @dev Three properties the dapp has to know about this address:
    /// 1. It depends on this factory and `salt` only — not on the owner, delay, description or table.
    ///    So the sender fixes the address; the owner does not enter it. One EOA calls `create` with
    ///    the same salt on every chain and passes the vault as `owner_`, and the clone is owned by
    ///    that vault from its first block at one address, with no ownership transfer ever needed.
    ///    Each chain is a separate contract: transferring ownership on one changes neither the salt
    ///    nor any other chain, so the deploying key never needs to own anything.
    /// 2. A second `create` with a used salt burns the whole gas limit before `DeploymentFailed`: a
    ///    CREATE2 collision consumes every unit forwarded to it. Read `predict(salt)` with
    ///    `eth_getCode` first and refuse a non-empty answer.
    /// 3. Same-address-everywhere is this factory's address, not a clone's claim on its own. The
    ///    factory is nonce-addressed where it is deployed; a byte-identical deploy through a
    ///    deterministic deployer is a later milestone's one-way door.
    function create(
        address owner_,
        uint32 delay_,
        string calldata description_,
        Distribution.Beneficiary[] calldata table_,
        bytes32 salt
    ) external payable returns (address distribution) {
        address impl = implementation;
        uint256 prefix = uint256(salt) >> 96;
        if (prefix != uint256(uint160(msg.sender))) revert SaltDoesNotStartWith();

        // The PUSH0 minimal-proxy init code, byte for byte as solady's `LibClone.initCode_PUSH0`
        // writes it. The two `mstore`s at 0x24 overlap the free memory pointer and restore it.
        assembly ("memory-safe") {
            mstore(0x24, 0x5af43d5f5f3e6029573d5ffd5b3d5ff3)
            mstore(0x14, impl)
            mstore(0x00, 0x602d5f8160095f39f35f5f365f5f37365f73)
            distribution := create2(callvalue(), 0x0e, 0x36, salt)
            if iszero(distribution) {
                mstore(0x00, 0x30116425) // DeploymentFailed()
                revert(0x1c, 0x04)
            }
            mstore(0x24, 0)
        }
        Distribution(payable(distribution)).init(owner_, delay_, description_, table_);
        emit Created(distribution, owner_);
    }

    /// @notice The address `create(..., salt)` would reach.
    /// @dev No prefix check: the dapp predicts before it knows who will send.
    function predict(bytes32 salt) external view returns (address) {
        address impl = implementation;
        bytes32 initCodeHash;
        assembly ("memory-safe") {
            mstore(0x24, 0x5af43d5f5f3e6029573d5ffd5b3d5ff3)
            mstore(0x14, impl)
            mstore(0x00, 0x602d5f8160095f39f35f5f365f5f37365f73)
            initCodeHash := keccak256(0x0e, 0x36)
            mstore(0x24, 0)
        }
        return address(uint160(uint256(keccak256(abi.encodePacked(hex"ff", address(this), salt, initCodeHash)))));
    }
}
