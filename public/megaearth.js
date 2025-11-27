// MegaEarth - Nuclear Click War
// Configuration
const CONFIG = {
    CONTRACT_ADDRESS: "0xAcE11cd4190C558524d409FBd16e7D8d650FD983",
    CHAIN_ID: 6343,
    CHAIN_ID_HEX: "0x18C7",
    RPC_URL: "https://timothy.megaeth.com/rpc",
    CHAIN_NAME: "MegaETH Testnet",
    EXPLORER: "https://megaeth-testnet-v2.blockscout.com/"
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

// Countries with coordinates (2D world map percentages - Equirectangular projection)
// x: longitude (0% = -180°, 50% = 0°, 100% = 180°)
// y: latitude (0% = 90°N, 50% = 0°, 100% = 90°S)
const COUNTRIES = [
    { code: "TH", name: "🇹🇭 Thailand", x: 72, y: 58 },        // ~100°E, 15°N
    { code: "US", name: "🇺🇸 United States", x: 25, y: 42 },   // ~95°W, 38°N
    { code: "JP", name: "🇯🇵 Japan", x: 77, y: 45 },           // ~138°E, 36°N
    { code: "KR", name: "🇰🇷 South Korea", x: 74, y: 46 },     // ~127°E, 37°N
    { code: "CN", name: "🇨🇳 China", x: 68, y: 47 },           // ~105°E, 35°N
    { code: "SG", name: "🇸🇬 Singapore", x: 72, y: 51 },       // ~104°E, 1°N
    { code: "GB", name: "🇬🇧 United Kingdom", x: 50, y: 38 },  // ~0°, 52°N
    { code: "DE", name: "🇩🇪 Germany", x: 53, y: 38 },         // ~10°E, 51°N
    { code: "FR", name: "🇫🇷 France", x: 51, y: 41 },          // ~2°E, 46°N
    { code: "IN", name: "🇮🇳 India", x: 66, y: 53 },           // ~77°E, 20°N
    { code: "BR", name: "🇧🇷 Brazil", x: 35, y: 60 },          // ~47°W, 10°S
    { code: "CA", name: "🇨🇦 Canada", x: 25, y: 35 },          // ~95°W, 60°N
    { code: "AU", name: "🇦🇺 Australia", x: 78, y: 68 },       // ~133°E, 25°S
    { code: "RU", name: "🇷🇺 Russia", x: 62, y: 32 },          // ~60°E, 60°N
    { code: "VN", name: "🇻🇳 Vietnam", x: 71, y: 57 },         // ~106°E, 16°N
    { code: "ID", name: "🇮🇩 Indonesia", x: 71, y: 62 },       // ~110°E, 5°S
    { code: "MY", name: "🇲🇾 Malaysia", x: 70, y: 55 },        // ~102°E, 4°N
    { code: "PH", name: "🇵🇭 Philippines", x: 74, y: 56 },     // ~122°E, 12°N
    { code: "IT", name: "🇮🇹 Italy", x: 53, y: 43 },           // ~12°E, 42°N
    { code: "ES", name: "🇪🇸 Spain", x: 49, y: 43 }            // ~4°W, 40°N
];

// Global State
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let userCountry = null;
let targetCountry = null;
let strikeData = {}; // { address: { strikes, country, targets: {} } }
let pendingStrikes = []; // Array of pending strikes to confirm
let isLaunching = false; // Prevent spam during animation

// Initialize
window.addEventListener('load', async () => {
    await waitForEthers();
    initializeSelectors();
    loadStrikeData();
    setupConnectButton();
    startStatsUpdate();
});

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

            setTimeout(() => {
                clearInterval(checkInterval);
                if (typeof ethers === 'undefined') {
                    alert('Failed to load required libraries. Please refresh the page.');
                }
                resolve();
            }, 5000);
        }
    });
}

// Initialize Country Selectors
function initializeSelectors() {
    const countrySelect = document.getElementById('countrySelect');
    const targetSelect = document.getElementById('targetSelect');

    COUNTRIES.forEach(country => {
        // Your country
        const option1 = document.createElement('option');
        option1.value = country.code;
        option1.textContent = country.name;
        countrySelect.appendChild(option1);

        // Target country
        const option2 = document.createElement('option');
        option2.value = country.code;
        option2.textContent = country.name;
        targetSelect.appendChild(option2);
    });

    // Load saved country
    const savedCountry = localStorage.getItem('userCountry');
    if (savedCountry) {
        countrySelect.value = savedCountry;
        userCountry = savedCountry;
    }

    // Event listeners
    countrySelect.addEventListener('change', (e) => {
        userCountry = e.target.value;
        localStorage.setItem('userCountry', userCountry);
        updateLaunchButton();
    });

    targetSelect.addEventListener('change', (e) => {
        targetCountry = e.target.value;
        updateLaunchButton();
    });
}

// Setup Connect Button
function setupConnectButton() {
    const connectBtn = document.getElementById('connectBtn');

    if (typeof window.ethereum === 'undefined') {
        document.getElementById('connectionStatus').textContent = 'METAMASK NOT INSTALLED';
        connectBtn.textContent = 'INSTALL METAMASK';
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

        // Switch network
        await switchToMegaETH();

        // Initialize provider and contract
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        // Update UI
        document.getElementById('connectionStatus').textContent = 'CONNECTED';
        document.getElementById('walletAddress').textContent = `ADDRESS: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        document.getElementById('connectBtn').textContent = 'CONNECTED';
        document.getElementById('connectBtn').disabled = true;

        // Update launch button
        updateLaunchButton();

        // Update stats
        await updateStats();
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

// Update Launch Button State
function updateLaunchButton() {
    const btn = document.getElementById('launchBtn');

    if (contract && userCountry && targetCountry && targetCountry !== userCountry) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

// Launch Nuclear Strike (Instant - No blockchain yet)
document.getElementById('launchBtn').addEventListener('click', async () => {
    if (!userCountry || !targetCountry) {
        alert('Please select your country and target!');
        return;
    }

    if (userCountry === targetCountry) {
        alert('You cannot nuke your own country!');
        return;
    }

    if (!contract) {
        alert('Please connect your wallet!');
        return;
    }

    if (isLaunching) {
        return; // Prevent spam during animation
    }

    isLaunching = true;

    // Add to pending strikes
    pendingStrikes.push({
        from: userCountry,
        to: targetCountry,
        timestamp: Date.now()
    });

    // Update pending count
    document.getElementById('pendingCount').textContent = pendingStrikes.length;

    // Enable confirm button
    document.getElementById('confirmBtn').disabled = false;

    // Animate nuclear missile (instant, no waiting)
    launchNuclearMissileInstant(userCountry, targetCountry);

    // Brief cooldown (500ms) to prevent super spam
    setTimeout(() => {
        isLaunching = false;
    }, 500);
});

// Confirm Button - Send all pending strikes to blockchain
document.getElementById('confirmBtn').addEventListener('click', async () => {
    if (pendingStrikes.length === 0) {
        return;
    }

    if (!contract) {
        alert('Please connect your wallet!');
        return;
    }

    const btn = document.getElementById('confirmBtn');
    const launchBtn = document.getElementById('launchBtn');

    btn.disabled = true;
    btn.textContent = '⏳ SENDING TO BLOCKCHAIN...';
    launchBtn.disabled = true;

    try {
        // Send transactions for each pending strike
        const totalStrikes = pendingStrikes.length;
        let successCount = 0;

        for (let i = 0; i < totalStrikes; i++) {
            const strike = pendingStrikes[i];

            try {
                // Update status
                btn.textContent = `⏳ SENDING ${i + 1}/${totalStrikes}...`;

                // Get current nonce to avoid nonce issues
                const nonce = await provider.getTransactionCount(userAddress, 'latest');

                // Send transaction with explicit nonce
                const tx = await contract.click({
                    nonce: nonce,
                    gasLimit: 30000000,
                    maxFeePerGas: ethers.utils.parseUnits('1', 'gwei'),
                    maxPriorityFeePerGas: ethers.utils.parseUnits('0.5', 'gwei')
                });

                console.log(`Strike ${i + 1}/${totalStrikes} sent:`, tx.hash);

                // Update status while waiting
                btn.textContent = `⏳ CONFIRMING ${i + 1}/${totalStrikes}...`;

                // Wait for confirmation with timeout
                const receipt = await Promise.race([
                    tx.wait(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), 120000)
                    )
                ]);

                if (receipt.status === 1) {
                    console.log(`Strike ${i + 1}/${totalStrikes} confirmed!`);

                    // Save strike data
                    saveStrikeData(userAddress, strike.from, strike.to);
                    successCount++;

                    // Update button
                    btn.textContent = `✅ ${successCount}/${totalStrikes} CONFIRMED`;
                } else {
                    console.error(`Strike ${i + 1} failed (reverted)`);
                }

                // Wait a bit between transactions to avoid RPC rate limit
                if (i < totalStrikes - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (txError) {
                console.error(`Strike ${i + 1} error:`, txError);

                // Continue with next strike
                btn.textContent = `⚠️ ${i + 1} FAILED, CONTINUING...`;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Show results
        if (successCount === totalStrikes) {
            // All success!
            showExplosion();
            btn.textContent = `✅ ALL ${successCount} STRIKES CONFIRMED!`;
        } else if (successCount > 0) {
            // Partial success
            btn.textContent = `⚠️ ${successCount}/${totalStrikes} CONFIRMED`;
            alert(`${successCount} strikes confirmed, ${totalStrikes - successCount} failed.`);
        } else {
            // All failed
            btn.textContent = `❌ ALL STRIKES FAILED`;
            throw new Error('All strikes failed');
        }

        // Update stats
        await updateStats();

        // Clear pending strikes (only successful ones were saved)
        pendingStrikes = [];
        document.getElementById('pendingCount').textContent = '0';

        setTimeout(() => {
            btn.textContent = '✅ CONFIRM & SEND TO BLOCKCHAIN';
            btn.disabled = true;
        }, 3000);

    } catch (error) {
        console.error('Confirmation error:', error);
        alert('Failed to confirm strikes: ' + error.message);

        btn.textContent = '❌ FAILED - TRY AGAIN';
        setTimeout(() => {
            btn.textContent = '✅ CONFIRM & SEND TO BLOCKCHAIN';
            btn.disabled = false;
        }, 2000);
    } finally {
        launchBtn.disabled = false;
    }
});

// Launch Nuclear Missile Animation (Original - with Promise)
async function launchNuclearMissile(fromCountry, toCountry) {
    return new Promise((resolve) => {
        const from = COUNTRIES.find(c => c.code === fromCountry);
        const to = COUNTRIES.find(c => c.code === toCountry);

        if (!from || !to) {
            resolve();
            return;
        }

        // Create missile element
        const missile = document.createElement('div');
        missile.className = 'nuclear-missile';
        missile.textContent = '☢️';
        document.body.appendChild(missile);

        // Start position (from country)
        const mapRect = document.querySelector('.world-map').getBoundingClientRect();
        const startX = mapRect.left + (mapRect.width * from.x / 100);
        const startY = mapRect.top + (mapRect.height * from.y / 100);

        // End position (to country)
        const endX = mapRect.left + (mapRect.width * to.x / 100);
        const endY = mapRect.top + (mapRect.height * to.y / 100);

        missile.style.left = startX + 'px';
        missile.style.top = startY + 'px';

        // Animate
        setTimeout(() => {
            missile.style.transition = 'all 2s cubic-bezier(0.5, 0, 0.5, 1)';
            missile.style.left = endX + 'px';
            missile.style.top = endY + 'px';
            missile.style.transform = 'scale(2)';

            // Remove after animation
            setTimeout(() => {
                missile.remove();
                resolve();
            }, 2000);
        }, 100);
    });
}

// Launch Nuclear Missile Animation (Instant - No await)
function launchNuclearMissileInstant(fromCountry, toCountry) {
    const from = COUNTRIES.find(c => c.code === fromCountry);
    const to = COUNTRIES.find(c => c.code === toCountry);

    if (!from || !to) {
        return;
    }

    // Create missile element
    const missile = document.createElement('div');
    missile.className = 'nuclear-missile';
    missile.textContent = '☢️';
    document.body.appendChild(missile);

    // Start position (from country)
    const mapRect = document.querySelector('.world-map').getBoundingClientRect();
    const startX = mapRect.left + (mapRect.width * from.x / 100);
    const startY = mapRect.top + (mapRect.height * from.y / 100);

    // End position (to country)
    const endX = mapRect.left + (mapRect.width * to.x / 100);
    const endY = mapRect.top + (mapRect.height * to.y / 100);

    missile.style.left = startX + 'px';
    missile.style.top = startY + 'px';

    // Animate (faster - 1 second)
    setTimeout(() => {
        missile.style.transition = 'all 1s cubic-bezier(0.5, 0, 0.5, 1)';
        missile.style.left = endX + 'px';
        missile.style.top = endY + 'px';
        missile.style.transform = 'scale(1.5)';

        // Remove after animation
        setTimeout(() => {
            missile.remove();
        }, 1000);
    }, 10);
}

// Show Explosion Effect
function showExplosion() {
    const explosion = document.createElement('div');
    explosion.className = 'explosion';
    explosion.style.left = '50%';
    explosion.style.top = '50%';
    explosion.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(explosion);

    setTimeout(() => {
        explosion.remove();
    }, 1000);
}

// Save Strike Data
function saveStrikeData(address, country, target) {
    if (!strikeData[address]) {
        strikeData[address] = {
            strikes: 0,
            country: country,
            targets: {}
        };
    }

    strikeData[address].strikes++;
    strikeData[address].country = country;

    if (!strikeData[address].targets[target]) {
        strikeData[address].targets[target] = 0;
    }
    strikeData[address].targets[target]++;

    localStorage.setItem('strikeData', JSON.stringify(strikeData));
}

// Load Strike Data
function loadStrikeData() {
    const saved = localStorage.getItem('strikeData');
    if (saved) {
        strikeData = JSON.parse(saved);
    }
}

// Update Stats
async function updateStats() {
    if (!contract) return;

    try {
        const globalCount = await contract.globalCount();
        const totalPlayers = await contract.getTotalPlayers();

        document.getElementById('totalStrikes').textContent = globalCount.toString();

        // Calculate active nations
        const nations = new Set();
        Object.values(strikeData).forEach(data => {
            if (data.country) nations.add(data.country);
        });
        document.getElementById('activeNations').textContent = nations.size;

        // Update user stats
        if (userAddress && strikeData[userAddress]) {
            const userData = strikeData[userAddress];
            document.getElementById('yourNukes').textContent = userData.strikes || 0;
            document.getElementById('enemiesHit').textContent = Object.keys(userData.targets || {}).length;
        }

        // Update leaderboard
        await updateLeaderboard();

    } catch (error) {
        console.error('Stats update error:', error);
    }
}

// Update Leaderboard
async function updateLeaderboard() {
    if (!contract) return;

    try {
        const [addresses, clicks] = await contract.getTopClickers(10);

        const leaderboard = document.getElementById('leaderboard');
        leaderboard.innerHTML = '';

        for (let i = 0; i < Math.min(10, addresses.length); i++) {
            const address = addresses[i];
            const strikeCount = clicks[i].toNumber();
            const data = strikeData[address];
            const country = data && data.country ? COUNTRIES.find(c => c.code === data.country) : null;

            const item = document.createElement('div');
            item.className = `leaderboard-item rank-${i + 1}`;
            item.innerHTML = `
                <span class="rank">#${i + 1}</span>
                <span class="country-name">${country ? country.name : address.slice(0, 6)}</span>
                <span class="score">${strikeCount}</span>
            `;
            leaderboard.appendChild(item);
        }

    } catch (error) {
        console.error('Leaderboard error:', error);
    }
}

// Listen to Events
function listenToEvents() {
    if (!contract) return;

    contract.on("Clicked", (user, newCount, userTotal, timestamp) => {
        console.log('Nuclear strike detected:', user);
        updateStats();
    });
}

// Auto-update stats
function startStatsUpdate() {
    setInterval(async () => {
        if (contract) {
            await updateStats();
        }
    }, 10000);
}

// Handle account/network changes
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', () => location.reload());
    window.ethereum.on('chainChanged', () => location.reload());
}
