// ClickBomb - World Championship Frontend
// Configuration
const CONFIG = {
    CONTRACT_ADDRESS: "0xAcE11cd4190C558524d409FBd16e7D8d650FD983",
    CHAIN_ID: 6343,
    CHAIN_ID_HEX: "0x18C7",
    RPC_URL: "https://timothy.megaeth.com/rpc",
    CHAIN_NAME: "MegaETH Testnet",
    EXPLORER: "https://megaeth-testnet-v2.blockscout.com/",
    FAUCET: "https://docs.megaeth.com/faucet"
};

// Contract ABI
const CONTRACT_ABI = [
    "function click() public",
    "function globalCount() public view returns (uint256)",
    "function getUserClicks(address user) public view returns (uint256)",
    "function getTotalPlayers() public view returns (uint256)",
    "function getTopClickers(uint256 limit) public view returns (address[] memory, uint256[] memory)",
    "event Clicked(address indexed user, uint256 newCount, uint256 userTotal, uint256 timestamp)"
];

// Country list with flags
const COUNTRIES = [
    { code: "TH", name: "Thailand", flag: "🇹🇭" },
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "JP", name: "Japan", flag: "🇯🇵" },
    { code: "KR", name: "South Korea", flag: "🇰🇷" },
    { code: "CN", name: "China", flag: "🇨🇳" },
    { code: "SG", name: "Singapore", flag: "🇸🇬" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
    { code: "DE", name: "Germany", flag: "🇩🇪" },
    { code: "FR", name: "France", flag: "🇫🇷" },
    { code: "IN", name: "India", flag: "🇮🇳" },
    { code: "BR", name: "Brazil", flag: "🇧🇷" },
    { code: "CA", name: "Canada", flag: "🇨🇦" },
    { code: "AU", name: "Australia", flag: "🇦🇺" },
    { code: "RU", name: "Russia", flag: "🇷🇺" },
    { code: "VN", name: "Vietnam", flag: "🇻🇳" },
    { code: "ID", name: "Indonesia", flag: "🇮🇩" },
    { code: "MY", name: "Malaysia", flag: "🇲🇾" },
    { code: "PH", name: "Philippines", flag: "🇵🇭" },
    { code: "IT", name: "Italy", flag: "🇮🇹" },
    { code: "ES", name: "Spain", flag: "🇪🇸" }
];

// Global State
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let userCountry = null;
let clickData = {}; // { address: { clicks, country, timestamp } }

// Wait for ethers to load
function waitForEthers() {
    return new Promise((resolve) => {
        if (typeof ethers !== 'undefined') {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (typeof ethers !== 'undefined') {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);

            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                if (typeof ethers === 'undefined') {
                    console.error('Ethers.js failed to load');
                    alert('Failed to load required libraries. Please refresh the page.');
                }
                resolve();
            }, 5000);
        }
    });
}

// Initialize on load
window.addEventListener('load', async () => {
    await waitForEthers();
    initializeCountrySelector();
    loadClickData();
    setupConnectButton();
    startStatsUpdate();
});

// Initialize Country Selector
function initializeCountrySelector() {
    const select = document.getElementById('countrySelect');

    COUNTRIES.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = `${country.flag} ${country.name}`;
        select.appendChild(option);
    });

    // Load saved country
    const saved = localStorage.getItem('userCountry');
    if (saved) {
        select.value = saved;
        userCountry = saved;
        updateYourCountryDisplay();
    }

    select.addEventListener('change', (e) => {
        userCountry = e.target.value;
        localStorage.setItem('userCountry', userCountry);
        updateYourCountryDisplay();

        if (userAddress) {
            updatePlayerStats();
        }
    });
}

// Setup Connect Button
function setupConnectButton() {
    const connectBtn = document.getElementById('connectBtn');

    if (typeof window.ethereum === 'undefined') {
        document.getElementById('connectionStatus').textContent = 'MetaMask not installed';
        connectBtn.textContent = 'Install MetaMask';
        connectBtn.onclick = () => {
            window.open('https://metamask.io/download/', '_blank');
        };
    } else {
        connectBtn.onclick = connectWallet;
    }
}

// Connect Wallet
async function connectWallet() {
    try {
        // Check ethers
        if (typeof ethers === 'undefined') {
            alert('Ethers library not loaded. Please refresh the page.');
            return;
        }

        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask!');
            return;
        }

        // Request accounts
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        userAddress = accounts[0];

        // Check and switch network
        await switchToMegaETH();

        // Initialize provider and contract
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        // Update UI
        document.getElementById('connectionStatus').textContent = 'Connected';
        document.getElementById('walletAddress').textContent = `Address: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        document.getElementById('connectBtn').textContent = 'Connected';
        document.getElementById('connectBtn').disabled = true;

        // Enable click button if country selected
        if (userCountry) {
            document.getElementById('clickBtn').disabled = false;
        }

        // Show your rank section
        document.getElementById('yourRank').style.display = 'block';

        // Update stats
        await updateStats();
        await updatePlayerStats();

        // Listen to events
        listenToEvents();

    } catch (error) {
        console.error('Connection error:', error);
        alert('Failed to connect wallet: ' + error.message);
    }
}

// Switch to MegaETH Network
async function switchToMegaETH() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CONFIG.CHAIN_ID_HEX }],
        });
    } catch (error) {
        // Network not added, add it
        if (error.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: CONFIG.CHAIN_ID_HEX,
                        chainName: CONFIG.CHAIN_NAME,
                        nativeCurrency: {
                            name: 'ETH',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: [CONFIG.RPC_URL],
                        blockExplorerUrls: [CONFIG.EXPLORER]
                    }],
                });
            } catch (addError) {
                throw new Error('Failed to add MegaETH network');
            }
        } else {
            throw error;
        }
    }
}

// Click Button Handler
document.getElementById('clickBtn').addEventListener('click', async () => {
    if (!userCountry) {
        alert('Please select your country first!');
        return;
    }

    if (!contract) {
        alert('Please connect your wallet!');
        return;
    }

    const btn = document.getElementById('clickBtn');
    btn.disabled = true;
    btn.textContent = '💥 BOOM! 💥';

    try {
        const tx = await contract.click();
        console.log('Transaction sent:', tx.hash);

        await tx.wait();
        console.log('Transaction confirmed!');

        // Save click data
        saveClickData(userAddress, userCountry);

        // Update stats
        await updateStats();
        await updatePlayerStats();

        // Animation
        btn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            btn.style.transform = 'scale(1)';
            btn.textContent = '💣\nCLICK!\n💥';
        }, 300);

    } catch (error) {
        console.error('Click error:', error);
        alert('Click failed: ' + error.message);
    } finally {
        btn.disabled = false;
    }
});

// Save Click Data to localStorage
function saveClickData(address, country) {
    if (!clickData[address]) {
        clickData[address] = { clicks: 0, country: country, timestamp: Date.now() };
    }
    clickData[address].clicks++;
    clickData[address].country = country;
    clickData[address].timestamp = Date.now();

    localStorage.setItem('clickData', JSON.stringify(clickData));
}

// Load Click Data from localStorage
function loadClickData() {
    const saved = localStorage.getItem('clickData');
    if (saved) {
        clickData = JSON.parse(saved);
    }
}

// Update Stats
async function updateStats() {
    if (!contract) return;

    try {
        const globalCount = await contract.globalCount();
        const totalPlayers = await contract.getTotalPlayers();

        document.getElementById('globalClicks').textContent = globalCount.toString();
        document.getElementById('totalPlayers').textContent = totalPlayers.toString();

        // Calculate total countries
        const countries = new Set();
        Object.values(clickData).forEach(data => {
            if (data.country) countries.add(data.country);
        });
        document.getElementById('totalCountries').textContent = countries.size;

        // Update leaderboards
        await updateLeaderboards();

    } catch (error) {
        console.error('Stats update error:', error);
    }
}

// Update Player Stats
async function updatePlayerStats() {
    if (!contract || !userAddress) return;

    try {
        const userClicks = await contract.getUserClicks(userAddress);
        document.getElementById('yourClicks').textContent = userClicks.toString();

        // Calculate ranks (will implement properly later)
        document.getElementById('yourCountryRank').textContent = '-';
        document.getElementById('yourGlobalRank').textContent = '-';

    } catch (error) {
        console.error('Player stats error:', error);
    }
}

// Update Leaderboards
async function updateLeaderboards() {
    if (!contract) return;

    try {
        // Get top players from contract
        const [addresses, clicks] = await contract.getTopClickers(10);

        // Build country leaderboard
        const countryStats = {};

        for (let i = 0; i < addresses.length; i++) {
            const address = addresses[i];
            const clickCount = clicks[i].toNumber();
            const data = clickData[address];

            if (data && data.country) {
                if (!countryStats[data.country]) {
                    countryStats[data.country] = 0;
                }
                countryStats[data.country] += clickCount;
            }
        }

        // Sort countries
        const sortedCountries = Object.entries(countryStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // Display country leaderboard
        const countryLeaderboard = document.getElementById('countryLeaderboard');
        countryLeaderboard.innerHTML = '';

        sortedCountries.forEach(([code, clicks], index) => {
            const country = COUNTRIES.find(c => c.code === code);
            if (!country) return;

            const item = document.createElement('div');
            item.className = `leaderboard-item rank-${index + 1}`;
            item.innerHTML = `
                <div>
                    <span class="flag">${country.flag}</span>
                    <strong>#${index + 1}</strong> ${country.name}
                </div>
                <div style="font-size: 20px; font-weight: bold;">
                    ${clicks.toLocaleString()} clicks
                </div>
            `;
            countryLeaderboard.appendChild(item);
        });

        // Display player leaderboard
        const playerLeaderboard = document.getElementById('playerLeaderboard');
        playerLeaderboard.innerHTML = '';

        for (let i = 0; i < Math.min(10, addresses.length); i++) {
            const address = addresses[i];
            const clickCount = clicks[i].toNumber();
            const data = clickData[address];
            const country = data && data.country ? COUNTRIES.find(c => c.code === data.country) : null;

            const item = document.createElement('div');
            item.className = `leaderboard-item rank-${i + 1}`;
            item.innerHTML = `
                <div>
                    ${country ? `<span class="flag">${country.flag}</span>` : ''}
                    <strong>#${i + 1}</strong> ${address.slice(0, 6)}...${address.slice(-4)}
                </div>
                <div style="font-size: 20px; font-weight: bold;">
                    ${clickCount.toLocaleString()} clicks
                </div>
            `;
            playerLeaderboard.appendChild(item);
        }

    } catch (error) {
        console.error('Leaderboard error:', error);
    }
}

// Update Your Country Display
function updateYourCountryDisplay() {
    if (userCountry) {
        const country = COUNTRIES.find(c => c.code === userCountry);
        if (country) {
            document.getElementById('yourCountry').textContent = `${country.flag} ${country.name}`;
        }

        // Enable click button if wallet connected
        if (contract) {
            document.getElementById('clickBtn').disabled = false;
        }
    }
}

// Listen to Contract Events
function listenToEvents() {
    if (!contract) return;

    contract.on("Clicked", (user, newCount, userTotal, timestamp) => {
        console.log('Click event:', user, newCount.toString());

        // Update stats
        updateStats();

        if (user.toLowerCase() === userAddress.toLowerCase()) {
            updatePlayerStats();
        }
    });
}

// Auto-update stats every 10 seconds
function startStatsUpdate() {
    setInterval(async () => {
        if (contract) {
            await updateStats();
        }
    }, 10000);
}

// Handle account/network changes
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
            location.reload();
        }
    });

    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}
