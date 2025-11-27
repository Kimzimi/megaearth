// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title MegaClicker
 * @dev Interactive Latency Benchmark Tool for MegaETH
 * @notice This contract demonstrates real-time blockchain capabilities
 */
contract MegaClicker {
    // State Variables
    uint256 public globalCount;
    mapping(address => uint256) public userClicks;
    address[] public players;
    mapping(address => bool) public hasPlayed;

    // Events
    event Clicked(address indexed user, uint256 newCount, uint256 userTotal, uint256 timestamp);

    /**
     * @dev Main click function - increments global and user counters
     */
    function click() public {
        // Track new players
        if (!hasPlayed[msg.sender]) {
            hasPlayed[msg.sender] = true;
            players.push(msg.sender);
        }

        // Increment counters
        globalCount++;
        userClicks[msg.sender]++;

        // Emit event for real-time updates
        emit Clicked(msg.sender, globalCount, userClicks[msg.sender], block.timestamp);
    }

    /**
     * @dev Get user's click count
     */
    function getUserClicks(address user) public view returns (uint256) {
        return userClicks[user];
    }

    /**
     * @dev Get total number of unique players
     */
    function getTotalPlayers() public view returns (uint256) {
        return players.length;
    }

    /**
     * @dev Get top clickers (leaderboard function)
     */
    function getTopClickers(uint256 limit) public view returns (address[] memory, uint256[] memory) {
        uint256 length = players.length > limit ? limit : players.length;
        address[] memory topAddresses = new address[](length);
        uint256[] memory topCounts = new uint256[](length);
        address[] memory playersCopy = new address[](players.length);

        // Copy players array to memory
        for (uint256 i = 0; i < players.length; i++) {
            playersCopy[i] = players[i];
        }

        // Simple bubble sort for top players (in memory)
        for (uint256 i = 0; i < playersCopy.length && i < limit; i++) {
            uint256 maxIndex = i;
            for (uint256 j = i + 1; j < playersCopy.length; j++) {
                if (userClicks[playersCopy[j]] > userClicks[playersCopy[maxIndex]]) {
                    maxIndex = j;
                }
            }
            if (maxIndex != i) {
                address temp = playersCopy[i];
                playersCopy[i] = playersCopy[maxIndex];
                playersCopy[maxIndex] = temp;
            }
            topAddresses[i] = playersCopy[i];
            topCounts[i] = userClicks[playersCopy[i]];
        }

        return (topAddresses, topCounts);
    }
}
