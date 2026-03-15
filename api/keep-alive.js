const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== CONFIGURATION - REPLACE WITH YOUR DETAILS =====
const CONFIG = {
    // Your Aternos session cookie (the long string you shared)
    SESSION_COOKIE: "bRGC1QWQGAR4Fg1dvbtvp5qH9JjXfVn4D7ns6YTV0SimIrO2oOePYJnLd6XsIxR5icCiTk8IjjHxg19pLd7NNZMQOdIcGVtGJNgr",
    
    // Your server ID (find it from URL: https://aternos.org/server/#YOUR_SERVER_ID)
    SERVER_ID: "oFfmBQRB0LWUV4wS",
    
    // How often to check server (in milliseconds)
    // 300000 = 5 minutes (Aternos gives ~5-10 minutes before shutdown warning)
    CHECK_INTERVAL: 300000,
    
    // Whether to auto-start if server is offline
    AUTO_START: true
};
// =====================================================

// Headers to mimic a real browser
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json;charset=UTF-8',
    'Origin': 'https://aternos.org',
    'Referer': 'https://aternos.org/server/',
    'Cookie': `ATERNOS_SESSION=${CONFIG.SESSION_COOKIE}`
};

// Keep track of bot status
let botStatus = {
    lastCheck: null,
    lastAction: null,
    serverOnline: false,
    checksPerformed: 0
};

/**
 * Get server status from Aternos API
 */
async function getServerStatus() {
    try {
        const response = await axios.get(
            `https://aternos.org/panel/ajax/server.php?action=info&id=${CONFIG.SERVER_ID}`,
            { headers: HEADERS }
        );
        
        return response.data;
    } catch (error) {
        console.error('Error getting server status:', error.message);
        return null;
    }
}

/**
 * Start the server
 */
async function startServer() {
    try {
        const response = await axios.get(
            `https://aternos.org/panel/ajax/server.php?action=start&id=${CONFIG.SERVER_ID}`,
            { headers: HEADERS }
        );
        
        botStatus.lastAction = `Server start attempted at ${new Date().toISOString()}`;
        return response.data;
    } catch (error) {
        console.error('Error starting server:', error.message);
        return null;
    }
}

/**
 * Keep the server alive (main function)
 */
async function keepServerAlive() {
    console.log(`[${new Date().toISOString()}] Checking server status...`);
    
    const status = await getServerStatus();
    botStatus.lastCheck = new Date().toISOString();
    botStatus.checksPerformed++;
    
    if (status) {
        console.log('Server status response received');
        
        // Check if server is online (you may need to adjust this based on actual response)
        const isOnline = status.status === 'online' || status.online === true;
        botStatus.serverOnline = isOnline;
        
        if (isOnline) {
            console.log('✅ Server is online! Keeping it alive...');
            
            // The act of checking may keep it alive, but you could add additional
            // API calls here if needed
            
        } else if (CONFIG.AUTO_START) {
            console.log('⚠️ Server is offline. Attempting to start...');
            await startServer();
        } else {
            console.log('❌ Server is offline and auto-start is disabled');
        }
    } else {
        console.log('Failed to get server status');
    }
}

/**
 * Start the bot and set up interval
 */
function startBot() {
    console.log('🚀 Aternos 24/7 Bot Started');
    console.log(`Session cookie: ${CONFIG.SESSION_COOKIE.substring(0, 20)}...`);
    console.log(`Server ID: ${CONFIG.SERVER_ID}`);
    console.log(`Check interval: ${CONFIG.CHECK_INTERVAL/1000} seconds`);
    
    // Run immediately on start
    keepServerAlive();
    
    // Then run at regular intervals
    setInterval(keepServerAlive, CONFIG.CHECK_INTERVAL);
}

// Express route for health checks (required for Vercel/Render)
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        bot: 'Aternos 24/7 Keeper',
        uptime: process.uptime(),
        lastCheck: botStatus.lastCheck,
        lastAction: botStatus.lastAction,
        serverOnline: botStatus.serverOnline,
        checksPerformed: botStatus.checksPerformed
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Start the bot when this file is run directly
if (require.main === module) {
    startBot();
    
    app.listen(PORT, () => {
        console.log(`Health check server running on port ${PORT}`);
    });
}

// For Vercel serverless deployment
module.exports = app;
