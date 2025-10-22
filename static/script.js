document.addEventListener('DOMContentLoaded', function() {
    const networksContainer = document.getElementById('networks-container');
    const scanBtn = document.getElementById('scan-btn');
    const simulateAttackBtn = document.getElementById('simulate-attack');
    const resetBtn = document.getElementById('reset');
    const totalNetworks = document.getElementById('total-networks');
    const safeNetworks = document.getElementById('safe-networks');
    const suspiciousNetworks = document.getElementById('suspicious-networks');
    const dangerousNetworks = document.getElementById('dangerous-networks');
    const scanProgress = document.getElementById('scan-progress');
    
    let currentNetworks = [];
    let scanInProgress = false;
    
    // Function to update statistics
    function updateStats() {
        const total = currentNetworks.length;
        const safe = currentNetworks.filter(n => n.status === 'safe').length;
        const suspicious = currentNetworks.filter(n => n.status === 'warning').length;
        const dangerous = currentNetworks.filter(n => n.status === 'danger').length;
        
        totalNetworks.textContent = total;
        safeNetworks.textContent = safe;
        suspiciousNetworks.textContent = suspicious;
        dangerousNetworks.textContent = dangerous;
    }
    
    // Function to render networks
    function renderNetworks() {
        networksContainer.innerHTML = '';
        
        if (currentNetworks.length === 0) {
            networksContainer.innerHTML = '<p style="text-align: center; padding: 20px;"><i class="fas fa-info-circle"></i> No networks detected. Click "Scan Networks" to begin.</p>';
            return;
        }
        
        currentNetworks.forEach(network => {
            const networkEl = document.createElement('div');
            networkEl.className = `network-item ${network.status === 'warning' ? 'suspicious' : network.status === 'danger' ? 'danger' : ''}`;
            
            // Create signal strength bars
            let signalBars = '';
            const barCount = Math.floor(network.signal / 20);
            for (let i = 0; i < 5; i++) {
                const height = 5 + (i * 3);
                const opacity = i < barCount ? 1 : 0.2;
                const color = network.status === 'safe' ? 'var(--success)' : network.status === 'warning' ? 'var(--warning)' : 'var(--danger)';
                signalBars += `<div class="signal-bar" style="height: ${height}px; opacity: ${opacity}; background-color: ${color};"></div>`;
            }
            
            networkEl.innerHTML = `
                <div class="network-info">
                    <div class="network-name">
                        <i class="fas fa-wifi"></i> ${network.ssid}
                    </div>
                    <div class="signal-strength">
                        ${signalBars}
                        <span>${network.signal}%</span>
                    </div>
                    <div class="network-details">
                        <span class="network-detail"><i class="fas fa-address-card"></i> MAC: ${network.mac}</span>
                        <span class="network-detail"><i class="fas fa-shield-alt"></i> ${network.security}</span>
                        <span class="network-detail"><i class="fas fa-microchip"></i> ${network.vendor}</span>
                        <span class="network-detail"><i class="fas fa-signal"></i> Channel: ${network.channel}</span>
                    </div>
                    ${network.reason ? `<div class="network-detail" style="background: rgba(243, 156, 18, 0.2); margin-top: 10px; color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> ${network.reason}</div>` : ''}
                </div>
                <div class="status status-${network.status}">
                    <i class="fas ${network.status === 'safe' ? 'fa-check-circle' : network.status === 'warning' ? 'fa-exclamation-triangle' : 'fa-radiation'}"></i>
                    ${network.status === 'safe' ? 'SAFE' : network.status === 'warning' ? 'SUSPICIOUS' : 'EVIL TWIN'}
                </div>
            `;
            
            networksContainer.appendChild(networkEl);
        });
        
        updateStats();
    }
    
    // Function to fetch networks from the Python backend
    async function fetchNetworks(endpoint) {
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching networks:', error);
            showNotification('Error connecting to the backend server. Using simulated data.', 'danger');
            
            // Return simulated data if the backend is not available
            return [
                {
                    "ssid": "CafeFreeWiFi",
                    "mac": "A4:56:02:3F:8C:71",
                    "signal": 85,
                    "security": "WPA2",
                    "vendor": "Cisco",
                    "status": "safe",
                    "channel": 6
                },
                {
                    "ssid": "Airport_Guest",
                    "mac": "B8:27:EB:D5:A1:9C",
                    "signal": 72,
                    "security": "Open",
                    "vendor": "TP-Link",
                    "status": "safe",
                    "channel": 11
                },
                {
                    "ssid": "Library_Public",
                    "mac": "9C:5C:8E:12:F3:A7",
                    "signal": 65,
                    "security": "WPA2",
                    "vendor": "Netgear",
                    "status": "safe",
                    "channel": 1
                }
            ];
        }
    }
    
    // Function to simulate network scanning
    async function simulateScan() {
        if (scanInProgress) return;
        
        scanInProgress = true;
        scanBtn.innerHTML = '<div class="scan-animation"></div> Scanning...';
        scanBtn.disabled = true;
        
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            scanProgress.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(progressInterval);
                
                // Fetch real networks from the Python backend
                fetchNetworks('/api/scan')
                    .then(networks => {
                        currentNetworks = networks;
                        renderNetworks();
                        scanBtn.innerHTML = '<i class="fas fa-search"></i> Scan Networks';
                        scanBtn.disabled = false;
                        scanInProgress = false;
                        
                        showNotification('Network scan completed. Found ' + currentNetworks.length + ' networks.', 'success');
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        scanBtn.innerHTML = '<i class="fas fa-search"></i> Scan Networks';
                        scanBtn.disabled = false;
                        scanInProgress = false;
                    });
            }
        }, 100);
    }
    
    // Function to simulate evil twin attack
    async function simulateEvilTwin() {
        // Fetch networks with simulated evil twins from the Python backend
        fetchNetworks('/api/simulate_attack')
            .then(networks => {
                currentNetworks = networks;
                renderNetworks();
                
                // Show alert for detected evil twin
                setTimeout(() => {
                    showNotification('Evil Twin detected! Network "CafeFreeWiFi" appears to be spoofed.', 'danger');
                    
                    // Pulse the danger stat
                    const dangerStat = document.getElementById('dangerous-networks');
                    dangerStat.parentElement.style.animation = 'pulse 2s infinite';
                    setTimeout(() => {
                        dangerStat.parentElement.style.animation = '';
                    }, 6000);
                }, 1000);
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
    
    // Function to show notification
    function showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'danger' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 5000);
    }
    
    // Event listeners
    scanBtn.addEventListener('click', simulateScan);
    
    simulateAttackBtn.addEventListener('click', function() {
        if (currentNetworks.length === 0) {
            simulateScan();
            setTimeout(simulateEvilTwin, 1200);
        } else {
            simulateEvilTwin();
        }
    });
    
    resetBtn.addEventListener('click', function() {
        currentNetworks = [];
        renderNetworks();
        scanProgress.style.width = '0%';
        
        showNotification('Results cleared. Ready to scan again.', 'success');
    });
    
    // Initialize with a demo scan after a short delay
    setTimeout(() => {
        simulateScan();
    }, 1500);
});