const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// Your credentials
const SESSION_COOKIE = "bRGC1QWQGAR4Fg1dvbtvp5qH9JjXfVn4D7ns6YTV0SimIrO2oOePYJnLd6XsIxR5icCiTk8IjjHxg19pLpLd7NNZMQOdIcGVtGJNgr";
const SERVER_ID = "oFfmBQRB0LWUV4wS";

/**
 * This function clicks everything in sequence:
 * 1. Mongombo (server selection)
 * 2. Start button 
 * 3. +1 minute button
 */
async function clickEverything(page) {
    const results = [];
    
    // Try to click "Mongombo" / server card
    try {
        // Look for server card with your server
        const serverSelected = await page.evaluate((serverId) => {
            // Try different possible selectors
            const selectors = [
                '.server-card',
                '[data-server]',
                '.server-name',
                'div:contains("oFfmBQRB0LWUV4wS")',
                'a[href*="server"]'
            ];
            
            for (const sel of selectors) {
                const elements = document.querySelectorAll(sel);
                for (const el of elements) {
                    if (el.textContent && el.textContent.includes(serverId)) {
                        el.click();
                        return true;
                    }
                }
            }
            return false;
        }, SERVER_ID);
        
        results.push({ action: 'select_server', success: serverSelected });
        await page.waitForTimeout(2000);
    } catch (e) {
        results.push({ action: 'select_server', error: e.message });
    }
    
    // Click Start button
    try {
        const startClicked = await page.evaluate(() => {
            const startButtons = [
                ...document.querySelectorAll('button.start'),
                ...document.querySelectorAll('button:contains("Start")'),
                ...document.querySelectorAll('[class*="start"]')
            ];
            if (startButtons.length > 0) {
                startButtons[0].click();
                return true;
            }
            return false;
        });
        
        results.push({ action: 'click_start', success: startClicked });
        await page.waitForTimeout(3000);
    } catch (e) {
        results.push({ action: 'click_start', error: e.message });
    }
    
    // Click +1 minute button (the most important part!)
    try {
        const plusOneClicked = await page.evaluate(() => {
            const buttons = [
                ...document.querySelectorAll('button[title*="Add time"]'),
                ...document.querySelectorAll('button:contains("+1")'),
                ...document.querySelectorAll('button:contains("minute")'),
                ...document.querySelectorAll('.server-info button'),
                ...document.querySelectorAll('[class*="extend"]')
            ];
            
            // Find button that adds time
            for (const btn of buttons) {
                if (btn.textContent.includes('+') || 
                    btn.textContent.includes('add') || 
                    btn.title?.includes('time')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });
        
        results.push({ action: 'extend_time', success: plusOneClicked });
        await page.waitForTimeout(1000);
    } catch (e) {
        results.push({ action: 'extend_time', error: e.message });
    }
    
    return results;
}

module.exports = async (req, res) => {
    console.log('🚀 Bot started at', new Date().toISOString());
    
    let browser = null;
    let actionResults = [];
    
    try {
        // Launch browser
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920x1080'
            ],
            defaultViewport: { width: 1920, height: 1080 },
            executablePath: await chromium.executablePath(),
            headless: 'new',
            timeout: 45000
        });

        const page = await browser.newPage();
        
        // Set session cookie
        await page.setCookie({
            name: 'ATERNOS_SESSION',
            value: SESSION_COOKIE,
            domain: 'aternos.org',
            path: '/',
            httpOnly: true,
            secure: true
        });

        // Go to server page
        console.log('🌐 Navigating to Aternos...');
        await page.goto(`https://aternos.org/server/#${SERVER_ID}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for page to fully load
        await page.waitForTimeout(5000);
        
        // Take screenshot to see what's happening (optional)
        const screenshot = await page.screenshot({ encoding: 'base64' });
        
        // Click everything in sequence
        actionResults = await clickEverything(page);
        
        console.log('✅ Actions completed:', actionResults);

        // Return results
        res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            actions: actionResults,
            screenshot: screenshot.substring(0, 100) + '...' // Truncated
        });

    } catch (error) {
        console.error('💥 Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            actions: actionResults
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
