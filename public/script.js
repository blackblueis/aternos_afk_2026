// State management
let selectedServer = null;
let botActive = false;
let botInterval = null;
let sessionCookie = '';

// DOM Elements
const sessionInput = document.getElementById('sessionCookie');
const loadServersBtn = document.getElementById('loadServersBtn');
const serversSection = document.getElementById('serversSection');
const serversGrid = document.getElementById('serversGrid');
const controlSection = document.getElementById('controlSection');
const logsSection = document.getElementById('logsSection');
const activityLog = document.getElementById('activityLog');
const botStatus = document.getElementById('botStatus');
const botLog = document.getElementById('botLog');
const lastActionSpan = document.getElementById('lastAction');
const nextCheckSpan = document.getElementById('nextCheck');

// Load servers when button clicked
loadServersBtn.addEventListener('click', async () => {
    sessionCookie = sessionInput.value.trim();
    if (!sessionCookie) {
        alert('Please enter your session cookie');
        return;
    }
    
    await loadServers();
});

// Load servers from API
async function loadServers() {
    serversGrid.innerHTML = '<div class="loading">Loading your servers...</div>';
    serversSection.style.display = 'block';
    
    try {
        const response = await fetch(`/api/servers?cookie=${encodeURIComponent(sessionCookie)}`);
        const data = await response.json();
        
        if (data.success) {
            displayServers(data.servers);
            addActivityLog('✅ Loaded ' + data.servers.length + ' servers');
        } else {
            serversGrid.innerHTML = `<div class="error">Error: ${data.error}</div>`;
        }
    } catch (error) {
        serversGrid.innerHTML = `<div class="error">Failed to load servers: ${error.message}</div>`;
    }
}

// Display servers in grid
function displayServers(servers) {
    serversGrid.innerHTML = '';
    
    servers.forEach(server => {
        const card = document.createElement('div');
        card.className = 'server-card';
        card.innerHTML = `
            <div class="server-name">${server.name || 'Unnamed Server'}</div>
            <div class="server-id">ID: ${server.id}</div>
            <div class="server-software">${server.software || 'Unknown'}</div>
            <span class="server-status-badge ${server.online ? 'status-online' : 'status-offline'}">
                ${server.online ? '🟢 Online' : '🔴 Offline'}
            </span>
        `;
        
        card.addEventListener('click', () => selectServer(server, card));
        serversGrid.appendChild(card);
    });
}

// Select a server
function selectServer(server, card) {
    // Remove selected class from all cards
    document.querySelectorAll('.server-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    
    selectedServer = server;
    document.getElementById('selectedServerName').textContent = server.name || 'Unknown';
    document.getElementById('selectedServerId').textContent = server.id;
    document.getElementById('serverStatus').textContent = server.online ? 'Online' : 'Offline';
    document.getElementById('serverStatus').className = server.online ? 'status-online' : 'status-offline';
    document.getElementById('serverPlayers').textContent = server.players || '0/20';
    document.getElementById('serverSoftware').textContent = server.software || 'Unknown';
    
    controlSection.style.display = 'block';
    logsSection.style.display = 'block';
    
    addActivityLog(`📌 Selected server: ${server.name || server.id}`);
}

// Refresh server status
document.getElementById('refreshStatusBtn').addEventListener('click', async () => {
    if (!selectedServer) return;
    
    try {
        const response = await fetch(`/api/control?action=status&server=${selectedServer.id}&cookie=${encodeURIComponent(sessionCookie)}`);
        const data = await response.json();
        
        if (data.success) {
            selectedServer.online = data.status.online;
            document.getElementById('serverStatus').textContent = data.status.online ? 'Online' : 'Offline';
            document.getElementById('serverStatus').className = data.status.online ? 'status-online' : 'status-offline';
            document.getElementById('serverPlayers').textContent = data.status.players || '0/20';
            
            addActivityLog(`🔄 Refreshed status: ${data.status.online ? 'Online' : 'Offline'}`);
        }
    } catch (error) {
        addActivityLog(`❌ Failed to refresh: ${error.message}`);
    }
});

// Start server
document.getElementById('startServerBtn').addEventListener('click', async () => {
    if (!selectedServer) return;
    
    try {
        addActivityLog('▶️ Starting server...');
        
        const response = await fetch(`/api/control?action=start&server=${selectedServer.id}&cookie=${encodeURIComponent(sessionCookie)}`);
        const data = await response.json();
        
        if (data.success) {
            addActivityLog('✅ Server started successfully');
            setTimeout(() => document.getElementById('refreshStatusBtn').click(), 5000);
        } else {
            addActivityLog(`❌ Failed to start: ${data.error}`);
        }
    } catch (error) {
        addActivityLog(`❌ Error: ${error.message}`);
    }
});

// Stop server
document.getElementById('stopServerBtn').addEventListener('click', async () => {
    if (!selectedServer) return;
    
    if (!confirm('Are you sure you want to stop the server?')) return;
    
    try {
        addActivityLog('⏹️ Stopping server...');
        
        const response = await fetch(`/api/control?action=stop&server=${selectedServer.id}&cookie=${encodeURIComponent(sessionCookie)}`);
        const data = await response.json();
        
        if (data.success) {
            addActivityLog('✅ Server stopped');
            document.getElementById('refreshStatusBtn').click();
        }
    } catch (error) {
        addActivityLog(`❌ Error: ${error.message}`);
    }
});

// Always Online Toggle
document.getElementById('alwaysOnlineToggle').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    
    if (enabled) {
        if (!selectedServer) {
            alert('Please select a server first');
            e.target.checked = false;
            return;
        }
        
        botActive = true;
        document.getElementById('toggleLabel').textContent = '✅ Always Online ACTIVE';
        botStatus.style.display = 'block';
        addActivityLog('🤖 Always Online mode ENABLED');
        
        // Start the bot
        startAlwaysOnlineBot();
    } else {
        botActive = false;
        document.getElementById('toggleLabel').textContent = 'Enable Always Online';
        botStatus.style.display = 'none';
        addActivityLog('🤖 Always Online mode DISABLED');
        
        if (botInterval) {
            clearTimeout(botInterval);
            botInterval = null;
        }
    }
});

// Start the Always Online bot
async function startAlwaysOnlineBot() {
    if (!botActive || !selectedServer) return;
    
    try {
        // Call the bot API
        const response = await fetch(`/api/always-online?server=${selectedServer.id}&cookie=${encodeURIComponent(sessionCookie)}`);
        const data = await response.json();
        
        // Update bot log
        updateBotLog(data);
        
        // Schedule next check (every 30 seconds to catch the +1 button)
        botInterval = setTimeout(startAlwaysOnlineBot, 30000);
        
    } catch (error) {
        addActivityLog(`❌ Bot error: ${error.message}`);
        botInterval = setTimeout(startAlwaysOnlineBot, 60000); // Retry after 1 minute on error
    }
}

// Update bot log
function updateBotLog(data) {
    if (!data.actions) return;
    
    // Clear old logs if too many
    if (botLog.children.length > 10) {
        botLog.innerHTML = '';
    }
    
    // Add new log entry
    data.actions.forEach(action => {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        const time = new Date().toLocaleTimeString();
        const status = action.success ? '✅' : '❌';
        
        entry.innerHTML = `
            <span class="time">[${time}]</span>
            <span class="action">${status} ${action.action}</span>
        `;
        
        botLog.appendChild(entry);
    });
    
    // Auto-scroll to bottom
    botLog.scrollTop = botLog.scrollHeight;
    
    // Update last action
    if (data.actions.length > 0) {
        const lastAction = data.actions[data.actions.length - 1];
        lastActionSpan.textContent = `${lastAction.action} (${lastAction.success ? 'Success' : 'Failed'})`;
    }
    
    // Update next check countdown
    const nextCheck = new Date(Date.now() + 30000);
    nextCheckSpan.textContent = nextCheck.toLocaleTimeString();
}

// Add activity log
function addActivityLog(message) {
    const entry = document.createElement('div');
    entry.className = 'activity-entry';
    
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="time">[${time}]</span> ${message}`;
    
    activityLog.appendChild(entry);
    activityLog.scrollTop = activityLog.scrollHeight;
}

// Load initial cookie from input (pre-filled)
sessionCookie = sessionInput.value;
