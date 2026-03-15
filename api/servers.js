const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

module.exports = async (req, res) => {
    const { cookie } = req.query;
    
    if (!cookie) {
        return res.status(400).json({ success: false, error: 'No cookie provided' });
    }
    
    let browser = null;
    
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: 'new',
            timeout: 30000
        });
        
        const page = await browser.newPage();
        
        // Set cookie
        await page.setCookie({
            name: 'ATERNOS_SESSION',
            value: cookie,
            domain: 'aternos.org',
            path: '/'
        });
        
        // Go to servers page
        await page.goto('https://aternos.org/servers/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Extract server list
        const servers = await page.evaluate(() => {
            const serverElements = document.querySelectorAll('.server-card, [data-server], .server-item');
            const servers = [];
            
            serverElements.forEach(el => {
                const nameEl = el.querySelector('.server-name, .name, h3');
                const idEl = el.querySelector('.server-id, .id, small');
                const statusEl = el.querySelector('.status, .online, .offline');
                
                servers.push({
                    name: nameEl ? nameEl.textContent.trim() : 'Unnamed',
                    id: idEl ? idEl.textContent.trim() : el.getAttribute('data-server') || 'unknown',
                    online: statusEl ? statusEl.classList.contains('online') : false,
                    software: 'Minecraft Server'
                });
            });
            
            return servers;
        });
        
        res.json({
            success: true,
            servers: servers
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
