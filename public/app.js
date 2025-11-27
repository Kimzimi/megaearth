// MegaClicker - Frontend Application
// Configuration
const CONFIG = {
    // ✅ Contract Deployed Successfully!
    CONTRACT_ADDRESS: "0xAcE11cd4190C558524d409FBd16e7D8d650FD983",
    CHAIN_ID: 6343, // MegaETH Testnet (timothy)
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

// Global State
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let latencies = [];
let isConnected = false;

// Initialize on page load
window.addEventListener('load', () => {
    addLog('🚀 ระบบพร้อมใช้งาน', 'info');
    checkWalletConnection();
    startDemoMode();
});

// Check if wallet is already connected
async function checkWalletConnection() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_accounts'
            });
            if (accounts.length > 0) {
                await connectWallet();
            }
        } catch (error) {
            console.error('Error checking wallet:', error);
        }
    }
}

// Connect Wallet
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('กรุณาติดตั้ง MetaMask หรือ Wallet อื่นๆ ก่อนใช้งาน');
        addLog('❌ ไม่พบ Wallet Extension', 'error');
        return;
    }

    try {
        // Request account access
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();

        // Update UI
        document.getElementById('wallet-btn').textContent =
            userAddress.substring(0, 6) + '...' + userAddress.substring(38);

        addLog(`✅ เชื่อมต่อสำเร็จ: ${userAddress.substring(0, 10)}...`, 'success');

        // Check network
        const network = await provider.getNetwork();
        if (network.chainId !== CONFIG.CHAIN_ID) {
            addLog(`⚠️ กรุณาเปลี่ยนไปยัง ${CONFIG.CHAIN_NAME}`, 'error');
            await switchNetwork();
        } else {
            await initContract();
            isConnected = true;
            stopDemoMode();
        }

    } catch (error) {
        console.error('Connection error:', error);
        addLog('❌ การเชื่อมต่อล้มเหลว: ' + error.message, 'error');
    }
}

// Switch to MegaETH Network
async function switchNetwork() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CONFIG.CHAIN_ID_HEX }],
        });
        addLog('✅ เปลี่ยน Network สำเร็จ', 'success');
        await initContract();
        isConnected = true;
    } catch (switchError) {
        // Network not added, try adding it
        if (switchError.code === 4902) {
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
                        blockExplorerUrls: null
                    }]
                });
                addLog('✅ เพิ่ม Network สำเร็จ', 'success');
                await initContract();
                isConnected = true;
            } catch (addError) {
                addLog('❌ ไม่สามารถเพิ่ม Network ได้', 'error');
            }
        } else {
            addLog('❌ การเปลี่ยน Network ล้มเหลว', 'error');
        }
    }
}

// Initialize Contract
async function initContract() {
    try {
        contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        addLog('✅ เชื่อมต่อ Smart Contract สำเร็จ', 'success');

        // Listen to events
        contract.on("Clicked", (user, newCount, userTotal, timestamp) => {
            updateGlobalCount(newCount.toNumber());
            if (user.toLowerCase() === userAddress.toLowerCase()) {
                updateUserCount(userTotal.toNumber());
            }
            addLog(`🎯 Click ใหม่จาก ${user.substring(0, 8)}... | Total: ${newCount}`, 'success');
        });

        // Load initial data
        await loadContractData();

    } catch (error) {
        console.error('Contract init error:', error);
        addLog('⚠️ โหมดทดสอบ: ใช้ข้อมูลจำลอง', 'info');
    }
}

// Load data from contract
async function loadContractData() {
    try {
        const globalCount = await contract.globalCount();
        const userClicks = await contract.getUserClicks(userAddress);
        const totalPlayers = await contract.getTotalPlayers();

        updateGlobalCount(globalCount.toNumber());
        updateUserCount(userClicks.toNumber());
        updatePlayerCount(totalPlayers.toNumber());

        // Load leaderboard
        await loadLeaderboard();

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        const [addresses, counts] = await contract.getTopClickers(3);
        const leaderboardHTML = addresses.map((addr, index) => `
            <div class="leaderboard-item">
                <span class="rank">#${index + 1}</span>
                <span class="address">${addr.substring(0, 6)}...${addr.substring(38)}</span>
                <span class="clicks">${counts[index].toNumber()} clicks</span>
            </div>
        `).join('');

        document.getElementById('leaderboard-list').innerHTML = leaderboardHTML;
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Handle Click
async function handleClick() {
    const button = document.getElementById('click-btn');

    if (!isConnected) {
        addLog('⚠️ กรุณาเชื่อมต่อ Wallet ก่อน', 'error');
        return;
    }

    if (!contract) {
        addLog('⚠️ ไม่สามารถเชื่อมต่อ Contract ได้', 'error');
        return;
    }

    try {
        button.disabled = true;
        const startTime = Date.now();

        // Create ripple effect
        createRipple(event);

        // Send transaction
        addLog('📡 กำลังส่ง Transaction...', 'info');
        const tx = await contract.click();

        addLog(`⏳ รอการยืนยัน... (TX: ${tx.hash.substring(0, 10)}...)`, 'info');

        const receipt = await tx.wait();
        const latency = Date.now() - startTime;

        // Update latency stats
        latencies.push(latency);
        if (latencies.length > 10) latencies.shift();
        const avgLatency = Math.round(latencies.reduce((a, b) => a + b) / latencies.length);
        document.getElementById('latency').textContent = avgLatency + 'ms';

        addLog(`✅ สำเร็จ! ใช้เวลา ${latency}ms`, 'success');

        // Reload data
        await loadContractData();

    } catch (error) {
        console.error('Click error:', error);
        addLog('❌ เกิดข้อผิดพลาด: ' + (error.message || 'Unknown error'), 'error');
    } finally {
        button.disabled = false;
    }
}

// Create ripple effect on button
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
}

// Update UI functions
function updateGlobalCount(count) {
    document.getElementById('global-count').textContent = count.toLocaleString();
}

function updateUserCount(count) {
    document.getElementById('user-count').textContent = count.toLocaleString();
}

function updatePlayerCount(count) {
    document.getElementById('player-count').textContent = count.toLocaleString();
}

// Add log entry
function addLog(message, type = 'info') {
    const logsContainer = document.getElementById('logs');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString('th-TH')}] ${message}`;

    logsContainer.insertBefore(logEntry, logsContainer.firstChild);

    // Keep only last 20 logs
    while (logsContainer.children.length > 20) {
        logsContainer.removeChild(logsContainer.lastChild);
    }
}

// Demo Mode (when not connected)
let demoInterval = null;

function startDemoMode() {
    let demoCount = 0;
    demoInterval = setInterval(() => {
        demoCount += Math.floor(Math.random() * 5) + 1;
        updateGlobalCount(demoCount);
        document.getElementById('player-count').textContent = Math.floor(demoCount / 10);
        document.getElementById('latency').textContent = (Math.floor(Math.random() * 50) + 10) + 'ms';
    }, 2000);
}

function stopDemoMode() {
    if (demoInterval) {
        clearInterval(demoInterval);
        demoInterval = null;
    }
}

// Handle account changes
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            addLog('⚠️ Wallet ถูกตัดการเชื่อมต่อ', 'error');
            isConnected = false;
            startDemoMode();
        } else {
            location.reload();
        }
    });

    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}
