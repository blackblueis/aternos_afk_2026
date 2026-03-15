const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== YOUR CONFIGURATION =====
const CONFIG = {
    SESSION_COOKIE: "bRGC1QWQGAR4Fg1dvbtvp5qH9JjXfVn4D7ns6YTV0SimIrO2oOePYJnLd6XsIxR5icCiTk8IjjHxg19pLd7NNZMQOdIcGVtGJNgr",
    SERVER_ID: "oFfmBQRB0LWUV4wS",
    SERVER_URL: "https://aternos.org/server/",
    
    // Click pattern: after page loads, click these elements in order
    CLICK_SEQUENCE: [
        { selector: 'button[aria-label="Close"]', optional: true }, // Close any popups
        { selector: '.server-card', optional: true }, // Select server if needed
        { selector: 'button.start', waitAfter: 2000 }, // Start button
        { selector: 'button.continue', waitAfter: 1000 }, // Confirm start
        { selector: '.server-info', optional: true }, // Wait for server info
        { selector: 'button[title="Add time"]', waitAfter: 59000 } // Click +1 min (59 seconds before shutdown)
    ]
};

// Bot status tracking
let botStatus = {
    running: false,
    lastAction: null,
    errors: [],
    uptime: 0,
    startTime: null
};

/**
 * Launch browser and automate Aternos
 */
async function runAternosBot() {
    let browser = null;
    
    try {
        console.log('🚀 Launching browser...');
        
        // Launch browser (configured for cloud hosting)
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080'
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: 'new',
            timeout: 60000
        });

        const page = await browser.newPage();
        
        // Set the session cookie
        await page.setCookie({
            name: 'ATERNOS_SESSION',
            value: CONFIG.SESSION_COOKIE,
            domain: 'aternos.org',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax'
        });

        console.log('🌐 Navigating to Aternos...');
        await page.goto(CONFIG.SERVER_URL, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Check if we need to select specific server
        const currentUrl = page.url();
        if (!currentUrl.includes(CONFIG.SERVER_ID)) {
            console.log('🔍 Looking for server...');
            
            // Try to find and click your server
            await page.evaluate((serverId) => {
                const serverElements = document.querySelectorAll('.server-card, [data-server]');
                for (const el of serverElements) {
                    if (el.textContent.includes(serverId) || el.getAttribute('data-server') === serverId) {
                        el.click();
                        return true;
                    }
                }
                return false;
            }, CONFIG.SERVER_ID);
            
            await page.waitForTimeout(3000);
        }

        console.log('✅ Page loaded, starting automation loop...');
        
        // Main automation loop
        while (true) {
            for (const action of CONFIG.CLICK_SEQUENCE) {
                try {
                    const element = await page.$(action.selector);
                    
                    if (element) {
                        await element.click();
                        console.log(`👆 Clicked: ${action.selector}`);
                        botStatus.lastAction = `Clicked ${action.selector} at ${new Date().toISOString()}`;
                        
                        if (action.waitAfter) {
                            await page.waitForTimeout(action.waitAfter);
                        }
                    } else if (!action.optional) {
                        console.log(`⚠️ Element not found: ${action.selector}`);
                    }
                } catch (clickError) {
                    if (!action.optional) {
                        console.error(`Error clicking ${action.selector}:`, clickError.message);
                    }
                }
            }
            
            // Wait a bit before checking again (30 seconds)
            await page.waitForTimeout(30000);
            
            // Check if page needs refresh (sometimes it hangs)
            try {
                await page.evaluate(() => document.title);
            } catch (e) {
                console.log('🔄 Page crashed, reloading...');
                await page.reload({ waitUntil: 'networkidle2' });
            }
        }

    } catch (error) {
        console.error('💥 Bot error:', error);
        botStatus.errors.push({
            time: new Date().toISOString(),
            error: error.message
        });
        
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Start the bot with auto-restart
 */
function startBot() {
    if (botStatus.running) {
        console.log('Bot already running');
        return;
    }
    
    botStatus.running = true;
    botStatus.startTime = new Date().toISOString();
    
    console.log('🎮 Aternos 24/7 Bot Starting...');
    console.log(`Server ID: ${CONFIG.SERVER_ID}`);
    
    // Run the bot
    runAternosBot().catch(error => {
        console.error('Bot crashed:', error);
        botStatus.running = false;
        
        // Wait 30 seconds and restart
        setTimeout(() => {
            console.log('🔄 Restarting bot...');
            startBot();
        }, 30000);
    });
}

// Express endpoints
app.get('/', (req, res) => {
    const uptime = botStatus.startTime 
        ? Math.floor((new Date() - new Date(botStatus.startTime)) / 1000)
        : 0;
    
    res.json({
        status: botStatus.running ? 'running' : 'stopped',
        server: 'Aternos 24/7 Bot',
        uptime: uptime + ' seconds',
        lastAction: botStatus.lastAction || 'None',
        errors: botStatus.errors.slice(-5), // Last 5 errors
        config: {
            serverId: CONFIG.SERVER_ID,
            sessionSet: !!CONFIG.SESSION_COOKIE
        }
    });
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Start bot when server starts
if (require.main === module) {
    // Start the bot
    startBot();
    
    // Start express server
    app.listen(PORT, () => {
        console.log(`📊 Status page: http://localhost:${PORT}`);
    });
}

// For Vercel serverless
module.exports = app;
