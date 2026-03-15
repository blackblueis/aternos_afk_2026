const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

module.exports = async (req, res) => {
    const { server, cookie } = req.query;
    
    if (!cookie || !server) {
        return res.status(400).json({ success: false, error: 'Missing parameters' });
    }
    
    let browser = null;
    const actions = [];
    
    try {
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=1920x1080'
            ],
            executablePath: await chromium.executablePath(),
            headless: 'new',
            timeout: 45000
        });
        
        const page = await browser.newPage();
        
        // Set cookie
        await page.setCookie({
            name: 'ATERNOS_SESSION',
            value: cookie,
            domain: 'aternos.org',
            path: '/'
        });
        
        // Go to server page
        actions.push({ action: 'navigate', success: true });
        await page.goto(`https://aternos.org/server/#${server}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        await page.waitForTimeout(5000);
        
        // Look for +1 minute button
        const plusOneClicked = await page.evaluate(() => {
            // Try multiple selectors for the +1 button
            const selectors = [
                'button[title*="Add time"]',
                'button[title*="extend"]',
                'button:contains("+1")',
                'button:contains("minute")',
                '.server-info button:last-child',
                '.countdown button',
                'button:not([disabled])'
            ];
            
            for (const sel of selectors) {
                try {
                    const buttons = document.querySelectorAll(sel);
                    for (const btn of buttons) {
                        const text = btn.textContent.toLowerCase();
                        if (text.includes('+') || text.includes('add') || text.includes('extend')) {
                            btn.click();
                            return true;
                        }
                    }
                } catch (e) {}
            }
            
            // If no specific button found, click any button that might add time
            const allButtons = document.querySelectorAll('button');
            for (const btn of allButtons) {
                const text = btn.textContent.toLowerCase();
                if (text.includes('+') || text.includes('add') || text.includes('minute') || text.includes('time')) {
                    btn.click();
                    return true;
                }
            }
            
            return false;
        });
        
        actions.push({ 
            action: plusOneClicked ? 'clicked_+1_button' : 'no_+1_button_found', 
            success: plusOneClicked 
        });
        
        // Also check if server needs to be started
        const serverStarted = await page.evaluate(() => {
            const startBtn = document.querySelector('button.start, .start-server, [class*="start"]');
            if (startBtn && startBtn.textContent.includes('Start')) {
                startBtn.click();
                return true;
            }
            return false;
        });
        
        if (serverStarted) {
            actions.push({ action: 'started_server', success: true });
        }
        
        // Get server status
        const status = await page.evaluate(() => {
            const statusEl = document.querySelector('.status, .server-status');
            return statusEl ? statusEl.textContent : 'unknown';
        });
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            server: server,
            status: status,
            actions: actions,
            message: plusOneClicked ? '✅ +1 minute clicked!' : '⏳ Waiting for +1 button to appear'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            actions: actions
        });
    } finally {
        if (browser) await browser.close();
    }
};
