// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Reputation {
    struct MatchRecord {
        string matchId;
        uint256 winnerId;
        uint256 timestamp;
    }

    /// @notice Cumulative reputation score (+/- from match outcomes)
    mapping(uint256 => int256) public scores;

    /// @notice Matches finished (contestant or chooser role — both increment this)
    mapping(uint256 => uint256) public matchesPlayed;

    /// @notice Wins as a contestant (chooser role does not increment wins here)
    mapping(uint256 => uint256) public wins;

    mapping(string => MatchRecord) public matchRecords;

    /// @dev Prevents double-counting if recordMatch is called twice for the same matchId
    mapping(bytes32 => bool) private matchRecorded;

    event ScoreUpdated(uint256 indexed tokenId, int256 delta, int256 newScore);
    event StatsUpdated(uint256 indexed tokenId, uint256 matchesPlayed, uint256 wins);
    event MatchRecorded(string matchId, uint256 winnerId);

    error MatchAlreadyRecorded();

    /// @param chooserAgentId  Chooser's iNFT tokenId (+10 rep, +1 played; wins unchanged)
    function recordMatch(
        string calldata matchId,
        uint256 winnerId,
        uint256[] calldata loserIds,
        uint256 chooserAgentId
    ) external {
        bytes32 mid = keccak256(bytes(matchId));
        if (matchRecorded[mid]) revert MatchAlreadyRecorded();
        matchRecorded[mid] = true;

        // Winner (contestant): +10 reputation, +1 played, +1 win
        matchesPlayed[winnerId] += 1;
        wins[winnerId] += 1;
        scores[winnerId] += 10;
        emit StatsUpdated(winnerId, matchesPlayed[winnerId], wins[winnerId]);
        emit ScoreUpdated(winnerId, 10, scores[winnerId]);

        // Losers: +5 reputation, +1 played
        for (uint256 i = 0; i < loserIds.length; i++) {
            uint256 lid = loserIds[i];
            if (lid == winnerId) continue;
            matchesPlayed[lid] += 1;
            scores[lid] += 5;
            emit StatsUpdated(lid, matchesPlayed[lid], wins[lid]);
            emit ScoreUpdated(lid, 5, scores[lid]);
        }

        // Chooser: +10 reputation, +1 played (same rep as winner; wins unchanged)
        if (chooserAgentId != 0 && chooserAgentId != winnerId) {
            matchesPlayed[chooserAgentId] += 1;
            scores[chooserAgentId] += 10;
            emit StatsUpdated(chooserAgentId, matchesPlayed[chooserAgentId], wins[chooserAgentId]);
            emit ScoreUpdated(chooserAgentId, 10, scores[chooserAgentId]);
        }

        matchRecords[matchId] = MatchRecord(matchId, winnerId, block.timestamp);
        emit MatchRecorded(matchId, winnerId);
    }

    function getScore(uint256 tokenId) external view returns (int256) {
        return scores[tokenId];
    }

    function getStats(uint256 tokenId)
        external
        view
        returns (int256 reputationScore, uint256 played, uint256 winCount)
    {
        return (scores[tokenId], matchesPlayed[tokenId], wins[tokenId]);
    }
}
