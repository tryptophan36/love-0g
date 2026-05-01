// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Reputation {
    struct MatchRecord {
        string matchId;
        uint256 winnerId;
        uint256 timestamp;
    }

    mapping(uint256 => int256) public scores;        // tokenId => cumulative score
    mapping(string => MatchRecord) public matchRecords;

    event ScoreUpdated(uint256 indexed tokenId, int256 delta, int256 newScore);
    event MatchRecorded(string matchId, uint256 winnerId);

    function recordMatch(
        string calldata matchId,
        uint256 winnerId,
        uint256[] calldata loserIds
    ) external {
        scores[winnerId] += 10;
        emit ScoreUpdated(winnerId, 10, scores[winnerId]);

        for (uint i = 0; i < loserIds.length; i++) {
            scores[loserIds[i]] -= 3;
            emit ScoreUpdated(loserIds[i], -3, scores[loserIds[i]]);
        }

        matchRecords[matchId] = MatchRecord(matchId, winnerId, block.timestamp);
        emit MatchRecorded(matchId, winnerId);
    }

    function getScore(uint256 tokenId) external view returns (int256) {
        return scores[tokenId];
    }
}