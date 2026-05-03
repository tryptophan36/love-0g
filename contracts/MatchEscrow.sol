// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IINFT {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract MatchEscrow is Ownable, ReentrancyGuard {
    uint256 private constant WINNER_BPS   = 6000;
    uint256 private constant CHOOSER_BPS  = 2000;
    uint256 private constant RUNNER_UP_BPS = 1500;
    uint256 private constant PROTOCOL_BPS = 500;
    uint256 private constant BPS_DENOMINATOR = 10000;

    enum MatchStatus {
        OPEN,       // 0
        FULL,       // 1
        RUNNING,    // 2
        SETTLED,    // 3
        CANCELLED,  // 4
        FAILED      // 5 — engine crashed; retryMatch() resets to FULL
    }

    struct Contestant {
        address wallet;
        uint256 agentId;
    }

    struct MatchData {
        address chooser;
        uint256 chooserAgentId;
        uint96  fee;
        uint32  maxContestants;
        uint32  seatsTaken;
        uint64  createdAt;
        uint64  joinDeadline;
        MatchStatus status;
        bytes32 proofHash;
        uint256 winnerAgentId;
        uint256 runnerUpAgentId;
        Contestant[] contestants;
    }

    struct PayoutAmounts {
        uint256 winnerAmount;
        uint256 chooserAmount;
        uint256 runnerUpAmount;
        uint256 protocolAmount;
    }

    IINFT   public inftContract;
    address public orchestrator;
    address public protocolFeeRecipient;
    uint64  public joinTimeoutSeconds;
    uint256 public nextMatchId;

    mapping(uint256 => MatchData) private matchesById;
    /// @dev agentId => active matchId (0 = not in any match)
    mapping(uint256 => uint256) public agentCurrentMatch;
    uint256[] private allMatchIds;

    // ── Events ──────────────────────────────────────────────────────────────

    event MatchCreated(
        uint256 indexed matchId,
        address indexed chooser,
        uint256         chooserAgentId,
        uint256         fee,
        uint256         maxContestants,
        uint256         joinDeadline
    );
    event MatchJoined(
        uint256 indexed matchId,
        address indexed contestant,
        uint256         agentId,
        uint32          seatsTaken,
        uint32          maxContestants
    );
    event MatchFull(
        uint256 indexed matchId,
        Contestant[]    contestants,
        address         chooser,
        uint256         chooserAgentId
    );
    event MatchStarted(uint256 indexed matchId);
    event MatchFailed(uint256 indexed matchId);
    event MatchRetried(uint256 indexed matchId);
    event MatchSettled(
        uint256 indexed matchId,
        uint256         winnerAgentId,
        uint256         runnerUpAgentId,
        bytes32         proofHash
    );
    event MatchCancelled(uint256 indexed matchId, bytes32 reason);
    event OrchestratorUpdated(address indexed newOrchestrator);
    event ProtocolFeeRecipientUpdated(address indexed newRecipient);
    event JoinTimeoutUpdated(uint64 newTimeoutSeconds);
    event InftContractUpdated(address indexed newContract);

    // ── Errors ───────────────────────────────────────────────────────────────

    error InvalidAddress();
    error InvalidFee();
    error InvalidContestantLimit();
    error InvalidStatus();
    error MatchExpired();
    error MatchNotFound();
    error NotOrchestrator();
    error AgentAlreadyInMatch();
    error ChooserCannotJoin();
    error NotYourAgent();

    // ── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOrchestrator() {
        if (msg.sender != orchestrator) revert NotOrchestrator();
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address _orchestrator,
        address _protocolFeeRecipient,
        uint64  _joinTimeoutSeconds,
        address _inftContract
    ) Ownable(msg.sender) {
        if (
            _orchestrator == address(0) ||
            _protocolFeeRecipient == address(0) ||
            _inftContract == address(0)
        ) revert InvalidAddress();
        if (_joinTimeoutSeconds == 0) revert InvalidContestantLimit();

        orchestrator          = _orchestrator;
        protocolFeeRecipient  = _protocolFeeRecipient;
        joinTimeoutSeconds    = _joinTimeoutSeconds;
        inftContract          = IINFT(_inftContract);
    }

    // ── Core functions ────────────────────────────────────────────────────────

    /// @notice Chooser creates a match and locks in their own agent.
    /// @param maxSeats  2 or 3 contestants allowed.
    /// @param agentId   Chooser's iNFT tokenId — must be owned by msg.sender.
    function createMatch(
        uint8   maxSeats,
        uint256 agentId
    ) external payable nonReentrant returns (uint256 matchId) {
        if (maxSeats == 0 || maxSeats > 3) revert InvalidContestantLimit();
        if (msg.value == 0) revert InvalidFee();
        if (inftContract.ownerOf(agentId) != msg.sender) revert NotYourAgent();

        matchId = ++nextMatchId;
        MatchData storage m = matchesById[matchId];
        m.chooser        = msg.sender;
        m.chooserAgentId = agentId;
        m.fee            = uint96(msg.value);
        m.maxContestants = uint32(maxSeats);
        m.seatsTaken     = 0;
        m.createdAt      = uint64(block.timestamp);
        m.joinDeadline   = uint64(block.timestamp + joinTimeoutSeconds);
        m.status         = MatchStatus.OPEN;

        allMatchIds.push(matchId);
        agentCurrentMatch[agentId] = matchId;

        emit MatchCreated(matchId, msg.sender, agentId, msg.value, maxSeats, m.joinDeadline);
    }

    /// @notice Contestant joins an open match with their agent.
    /// @param matchId  On-chain match ID.
    /// @param agentId  Contestant's iNFT tokenId — must be owned by msg.sender.
    function joinMatch(
        uint256 matchId,
        uint256 agentId
    ) external payable nonReentrant {
        MatchData storage m = _getMatch(matchId);
        _cancelIfExpired(matchId, m);

        if (m.status != MatchStatus.OPEN)            revert InvalidStatus();
        if (msg.sender == m.chooser)                 revert ChooserCannotJoin();
        if (msg.value != m.fee)                      revert InvalidFee();
        if (inftContract.ownerOf(agentId) != msg.sender) revert NotYourAgent();
        if (_agentInMatch(matchId, agentId))         revert AgentAlreadyInMatch();

        m.contestants.push(Contestant({ wallet: msg.sender, agentId: agentId }));
        m.seatsTaken += 1;
        agentCurrentMatch[agentId] = matchId;

        emit MatchJoined(matchId, msg.sender, agentId, m.seatsTaken, m.maxContestants);

        if (m.seatsTaken == m.maxContestants) {
            m.status = MatchStatus.FULL;
            emit MatchFull(matchId, m.contestants, m.chooser, m.chooserAgentId);
        }
    }

    function startMatch(uint256 matchId) external onlyOrchestrator {
        MatchData storage m = _getMatch(matchId);
        _cancelIfExpired(matchId, m);

        if (m.status != MatchStatus.FULL) revert InvalidStatus();
        m.status = MatchStatus.RUNNING;
        emit MatchStarted(matchId);
    }

    /// @notice Mark a RUNNING match as FAILED (called by orchestrator on engine crash).
    function failMatch(uint256 matchId) external onlyOrchestrator {
        MatchData storage m = _getMatch(matchId);
        if (m.status != MatchStatus.RUNNING) revert InvalidStatus();
        m.status = MatchStatus.FAILED;
        emit MatchFailed(matchId);
    }

    /// @notice Reset a FAILED match back to FULL so the scheduler can restart it.
    function retryMatch(uint256 matchId) external onlyOrchestrator {
        MatchData storage m = _getMatch(matchId);
        if (m.status != MatchStatus.FAILED) revert InvalidStatus();
        m.status = MatchStatus.FULL;
        emit MatchRetried(matchId);
    }

    /// @notice Settle a match — winner/runner-up are now agentIds, not wallet indices.
    function settleMatch(
        uint256 matchId,
        uint256 winnerAgentId,
        uint256 runnerUpAgentId,
        bytes32 proofHash
    ) external onlyOrchestrator nonReentrant {
        MatchData storage m = _getMatch(matchId);
        if (m.status != MatchStatus.RUNNING) revert InvalidStatus();

        address winnerWallet   = inftContract.ownerOf(winnerAgentId);

        m.status          = MatchStatus.SETTLED;
        m.winnerAgentId   = winnerAgentId;
        m.runnerUpAgentId = runnerUpAgentId;
        m.proofHash       = proofHash;

        // Clear agent match tracking
        agentCurrentMatch[m.chooserAgentId] = 0;
        for (uint256 i = 0; i < m.contestants.length; i++) {
            agentCurrentMatch[m.contestants[i].agentId] = 0;
        }

        uint256 pot = uint256(m.fee) * (uint256(m.seatsTaken) + 1); // contestants + chooser
        PayoutAmounts memory payout = _calculatePayouts(pot);

        bool hasRunnerUp = runnerUpAgentId != 0;

        // If no runner-up (1-contestant match), fold their share into winner
        _safeTransferEth(winnerWallet, payout.winnerAmount + (hasRunnerUp ? 0 : payout.runnerUpAmount));
        _safeTransferEth(m.chooser, payout.chooserAmount);
        if (hasRunnerUp) {
            address runnerUpWallet = inftContract.ownerOf(runnerUpAgentId);
            _safeTransferEth(runnerUpWallet, payout.runnerUpAmount);
        }
        _safeTransferEth(protocolFeeRecipient, payout.protocolAmount);

        emit MatchSettled(matchId, winnerAgentId, runnerUpAgentId, proofHash);
    }

    // ── View functions ────────────────────────────────────────────────────────

    function getAllFullMatches() external view returns (uint256[] memory fullMatchIds) {
        uint256 count = 0;
        uint256 total = allMatchIds.length;

        for (uint256 i = 0; i < total; i++) {
            if (matchesById[allMatchIds[i]].status == MatchStatus.FULL) count++;
        }

        fullMatchIds = new uint256[](count);
        uint256 writeIdx = 0;
        for (uint256 i = 0; i < total; i++) {
            uint256 id = allMatchIds[i];
            if (matchesById[id].status == MatchStatus.FULL) {
                fullMatchIds[writeIdx++] = id;
            }
        }
    }

    function getAllRunningMatches() external view returns (uint256[] memory runningMatchIds) {
        uint256 count = 0;
        uint256 total = allMatchIds.length;

        for (uint256 i = 0; i < total; i++) {
            if (matchesById[allMatchIds[i]].status == MatchStatus.RUNNING) count++;
        }

        runningMatchIds = new uint256[](count);
        uint256 writeIdx = 0;
        for (uint256 i = 0; i < total; i++) {
            uint256 id = allMatchIds[i];
            if (matchesById[id].status == MatchStatus.RUNNING) {
                runningMatchIds[writeIdx++] = id;
            }
        }
    }

    function getContestants(uint256 matchId) external view returns (Contestant[] memory) {
        return _getMatch(matchId).contestants;
    }

    function getMatch(uint256 matchId)
        external
        view
        returns (
            address     chooser,
            uint256     chooserAgentId,
            uint96      fee,
            uint32      maxContestants,
            uint32      seatsTaken,
            uint64      createdAt,
            uint64      joinDeadline,
            MatchStatus status,
            bytes32     proofHash,
            uint256     winnerAgentId,
            uint256     runnerUpAgentId
        )
    {
        MatchData storage m = _getMatch(matchId);
        return (
            m.chooser,
            m.chooserAgentId,
            m.fee,
            m.maxContestants,
            m.seatsTaken,
            m.createdAt,
            m.joinDeadline,
            m.status,
            m.proofHash,
            m.winnerAgentId,
            m.runnerUpAgentId
        );
    }

    /// @notice Returns the active match status for a given agent (0 matchId means not in any match).
    function getAgentMatchStatus(uint256 agentId)
        external
        view
        returns (
            uint256 matchId,
            uint8   status,
            uint32  seatsTaken,
            uint32  maxContestants
        )
    {
        matchId = agentCurrentMatch[agentId];
        if (matchId == 0) return (0, 0, 0, 0);

        MatchData storage m = matchesById[matchId];
        status        = uint8(m.status);
        seatsTaken    = m.seatsTaken;
        maxContestants = m.maxContestants;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setOrchestrator(address newOrchestrator) external onlyOwner {
        if (newOrchestrator == address(0)) revert InvalidAddress();
        orchestrator = newOrchestrator;
        emit OrchestratorUpdated(newOrchestrator);
    }

    function setProtocolFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidAddress();
        protocolFeeRecipient = newRecipient;
        emit ProtocolFeeRecipientUpdated(newRecipient);
    }

    function setJoinTimeoutSeconds(uint64 newTimeoutSeconds) external onlyOwner {
        if (newTimeoutSeconds == 0) revert InvalidContestantLimit();
        joinTimeoutSeconds = newTimeoutSeconds;
        emit JoinTimeoutUpdated(newTimeoutSeconds);
    }

    function setInftContract(address newContract) external onlyOwner {
        if (newContract == address(0)) revert InvalidAddress();
        inftContract = IINFT(newContract);
        emit InftContractUpdated(newContract);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _agentInMatch(uint256 matchId, uint256 agentId) internal view returns (bool) {
        if (matchesById[matchId].chooserAgentId == agentId) return true;
        Contestant[] storage contestants = matchesById[matchId].contestants;
        for (uint256 i = 0; i < contestants.length; i++) {
            if (contestants[i].agentId == agentId) return true;
        }
        return false;
    }

    function _calculatePayouts(uint256 pot) internal pure returns (PayoutAmounts memory payout) {
        payout.winnerAmount   = (pot * WINNER_BPS)    / BPS_DENOMINATOR;
        payout.chooserAmount  = (pot * CHOOSER_BPS)   / BPS_DENOMINATOR;
        payout.runnerUpAmount = (pot * RUNNER_UP_BPS) / BPS_DENOMINATOR;
        payout.protocolAmount = pot - payout.winnerAmount - payout.chooserAmount - payout.runnerUpAmount;
    }

    function _getMatch(uint256 matchId) internal view returns (MatchData storage m) {
        m = matchesById[matchId];
        if (m.chooser == address(0)) revert MatchNotFound();
    }

    function _cancelIfExpired(uint256 matchId, MatchData storage m) internal {
        if (m.status != MatchStatus.OPEN) return;
        if (block.timestamp <= m.joinDeadline) return;

        m.status = MatchStatus.CANCELLED;

        _safeTransferEth(m.chooser, m.fee);
        agentCurrentMatch[m.chooserAgentId] = 0;

        for (uint256 i = 0; i < m.contestants.length; i++) {
            _safeTransferEth(m.contestants[i].wallet, m.fee);
            agentCurrentMatch[m.contestants[i].agentId] = 0;
        }

        emit MatchCancelled(matchId, "JOIN_TIMEOUT");
        revert MatchExpired();
    }

    function _safeTransferEth(address to, uint256 amount) internal {
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "ETH_TRANSFER_FAILED");
    }
}
