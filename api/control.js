const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

module.exports = async (req, res) => {
    const { action, server, cookie } = req.query;
    
    if (!cookie || !server) {
        return res.status(400).json({ success: false, error: 'Missing parameters' });
    }
    
    let browser = null;
    
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
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
        await page.goto(`https://aternos.org/server/#${server}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        await page.waitForTimeout(3000);
        
        let result = {};
        
        if (action === 'status') {
            // Get server status
            const status = await page.evaluate(() => {
                const statusEl = document.querySelector('.server-status, .status-indicator');
                const playersEl = document.querySelector('.players-count');
                
                return {
                    online: statusEl ? statusEl.classList.contains('online') : false,
                    players: playersEl ? playersEl.textContent : '0/20'
                };
            });
            
            result = { status };
            
        } else if (action === 'start') {
            // Click start button
            const started = await page.evaluate(() => {
                const startBtn = document.querySelector('button.start, .start-server, [title*="Start"]');
                if (startBtn) {
                    startBtn.click();
                    return true;
                }
                return false;
            });
            
            result = { started };
            
        } else if (action === 'stop') {
            // Click stop button
            const stopped = await page.evaluate(() => {
                const stopBtn = document.querySelector('button.stop, .stop-server, [title*="Stop"]');
                if (stopBtn) {
                    stopBtn.click();
                    return true;
                }
                return false;
            });
            
            result = { stopped };
        }
        
        res.json({
            success: true,
            action: action,
            ...result
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (browser) await browser.close();
    }
};
