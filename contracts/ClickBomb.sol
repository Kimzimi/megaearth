// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title ClickBomb - Global Click War
 * @dev Interactive Blockchain Game - Countries Compete for Clicks!
 * @notice World Championship Click Battle on MegaETH
 */
contract ClickBomb {
    // Structs
    struct Player {
        string countryCode; // ISO 2-letter code (TH, US, JP, etc.)
        uint256 clicks;
        uint256 lastClickTime;
        bool exists;
    }

    struct Country {
        string name;
        string code;
        uint256 totalClicks;
        uint256 playerCount;
        bool exists;
    }

    // State Variables
    uint256 public globalClicks;

    mapping(address => Player) public players;
    mapping(string => Country) public countries;

    address[] public allPlayers;
    string[] public allCountries;

    mapping(string => address[]) public countryPlayers;

    // Events
    event PlayerClicked(
        address indexed player,
        string countryCode,
        uint256 playerClicks,
        uint256 countryClicks,
        uint256 globalClicks,
        uint256 timestamp
    );

    event NewPlayerJoined(
        address indexed player,
        string countryCode,
        string countryName
    );

    event NewCountryAdded(
        string countryCode,
        string countryName
    );

    /**
     * @dev Main click function with country registration
     */
    function click(string memory countryCode, string memory countryName) public {
        require(bytes(countryCode).length == 2, "Country code must be 2 letters");
        require(bytes(countryName).length > 0, "Country name required");

        // First time player
        if (!players[msg.sender].exists) {
            players[msg.sender] = Player({
                countryCode: countryCode,
                clicks: 0,
                lastClickTime: 0,
                exists: true
            });

            allPlayers.push(msg.sender);
            countryPlayers[countryCode].push(msg.sender);

            emit NewPlayerJoined(msg.sender, countryCode, countryName);
        }

        // First time country
        if (!countries[countryCode].exists) {
            countries[countryCode] = Country({
                name: countryName,
                code: countryCode,
                totalClicks: 0,
                playerCount: 1,
                exists: true
            });

            allCountries.push(countryCode);

            emit NewCountryAdded(countryCode, countryName);
        } else {
            // Check if player switched country
            if (keccak256(bytes(players[msg.sender].countryCode)) != keccak256(bytes(countryCode))) {
                // Remove from old country
                string memory oldCountry = players[msg.sender].countryCode;
                if (countries[oldCountry].playerCount > 0) {
                    countries[oldCountry].playerCount--;
                }

                // Add to new country
                players[msg.sender].countryCode = countryCode;
                countries[countryCode].playerCount++;
                countryPlayers[countryCode].push(msg.sender);
            }
        }

        // Increment counters
        globalClicks++;
        players[msg.sender].clicks++;
        players[msg.sender].lastClickTime = block.timestamp;
        countries[countryCode].totalClicks++;

        emit PlayerClicked(
            msg.sender,
            countryCode,
            players[msg.sender].clicks,
            countries[countryCode].totalClicks,
            globalClicks,
            block.timestamp
        );
    }

    /**
     * @dev Get player info
     */
    function getPlayer(address player) public view returns (
        string memory countryCode,
        uint256 clicks,
        uint256 lastClickTime
    ) {
        Player memory p = players[player];
        return (p.countryCode, p.clicks, p.lastClickTime);
    }

    /**
     * @dev Get country info
     */
    function getCountry(string memory countryCode) public view returns (
        string memory name,
        uint256 totalClicks,
        uint256 playerCount
    ) {
        Country memory c = countries[countryCode];
        return (c.name, c.totalClicks, c.playerCount);
    }

    /**
     * @dev Get top countries leaderboard
     */
    function getTopCountries(uint256 limit) public view returns (
        string[] memory codes,
        string[] memory names,
        uint256[] memory clicks
    ) {
        uint256 length = allCountries.length > limit ? limit : allCountries.length;

        codes = new string[](length);
        names = new string[](length);
        clicks = new uint256[](length);

        // Copy to memory for sorting
        string[] memory countriesCopy = new string[](allCountries.length);
        for (uint256 i = 0; i < allCountries.length; i++) {
            countriesCopy[i] = allCountries[i];
        }

        // Bubble sort by clicks
        for (uint256 i = 0; i < length && i < countriesCopy.length; i++) {
            uint256 maxIndex = i;
            for (uint256 j = i + 1; j < countriesCopy.length; j++) {
                if (countries[countriesCopy[j]].totalClicks > countries[countriesCopy[maxIndex]].totalClicks) {
                    maxIndex = j;
                }
            }
            if (maxIndex != i) {
                string memory temp = countriesCopy[i];
                countriesCopy[i] = countriesCopy[maxIndex];
                countriesCopy[maxIndex] = temp;
            }

            codes[i] = countriesCopy[i];
            names[i] = countries[countriesCopy[i]].name;
            clicks[i] = countries[countriesCopy[i]].totalClicks;
        }

        return (codes, names, clicks);
    }

    /**
     * @dev Get top players in a specific country
     */
    function getTopPlayersInCountry(string memory countryCode, uint256 limit) public view returns (
        address[] memory playerAddresses,
        uint256[] memory playerClicks
    ) {
        address[] memory countryPlayersList = countryPlayers[countryCode];
        uint256 length = countryPlayersList.length > limit ? limit : countryPlayersList.length;

        playerAddresses = new address[](length);
        playerClicks = new uint256[](length);

        if (countryPlayersList.length == 0) {
            return (playerAddresses, playerClicks);
        }

        // Copy to memory
        address[] memory playersCopy = new address[](countryPlayersList.length);
        for (uint256 i = 0; i < countryPlayersList.length; i++) {
            playersCopy[i] = countryPlayersList[i];
        }

        // Bubble sort by clicks
        for (uint256 i = 0; i < length && i < playersCopy.length; i++) {
            uint256 maxIndex = i;
            for (uint256 j = i + 1; j < playersCopy.length; j++) {
                if (players[playersCopy[j]].clicks > players[playersCopy[maxIndex]].clicks) {
                    maxIndex = j;
                }
            }
            if (maxIndex != i) {
                address temp = playersCopy[i];
                playersCopy[i] = playersCopy[maxIndex];
                playersCopy[maxIndex] = temp;
            }

            playerAddresses[i] = playersCopy[i];
            playerClicks[i] = players[playersCopy[i]].clicks;
        }

        return (playerAddresses, playerClicks);
    }

    /**
     * @dev Get top players globally
     */
    function getTopPlayers(uint256 limit) public view returns (
        address[] memory playerAddresses,
        string[] memory countryCodes,
        uint256[] memory playerClicks
    ) {
        uint256 length = allPlayers.length > limit ? limit : allPlayers.length;

        playerAddresses = new address[](length);
        countryCodes = new string[](length);
        playerClicks = new uint256[](length);

        // Copy to memory
        address[] memory playersCopy = new address[](allPlayers.length);
        for (uint256 i = 0; i < allPlayers.length; i++) {
            playersCopy[i] = allPlayers[i];
        }

        // Bubble sort
        for (uint256 i = 0; i < length && i < playersCopy.length; i++) {
            uint256 maxIndex = i;
            for (uint256 j = i + 1; j < playersCopy.length; j++) {
                if (players[playersCopy[j]].clicks > players[playersCopy[maxIndex]].clicks) {
                    maxIndex = j;
                }
            }
            if (maxIndex != i) {
                address temp = playersCopy[i];
                playersCopy[i] = playersCopy[maxIndex];
                playersCopy[maxIndex] = temp;
            }

            playerAddresses[i] = playersCopy[i];
            countryCodes[i] = players[playersCopy[i]].countryCode;
            playerClicks[i] = players[playersCopy[i]].clicks;
        }

        return (playerAddresses, countryCodes, playerClicks);
    }

    /**
     * @dev Get total stats
     */
    function getGlobalStats() public view returns (
        uint256 totalClicks,
        uint256 totalPlayers,
        uint256 totalCountries
    ) {
        return (globalClicks, allPlayers.length, allCountries.length);
    }

    /**
     * @dev Get all countries list
     */
    function getAllCountries() public view returns (string[] memory) {
        return allCountries;
    }

    /**
     * @dev Get player count
     */
    function getTotalPlayers() public view returns (uint256) {
        return allPlayers.length;
    }
}
