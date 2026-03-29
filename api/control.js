const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

module.exports = async (req, res) => {
    const action = req.query.action || 'status';
    const server = req.query.server || 'CFLands'; 
    const cookie = req.query.cookie;
    
    if (!cookie) {
        return res.status(400).json({ success: false, error: 'Faltou o COOKIE!' });
    }
    
    let browser = null;
    
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });
        
        const page = await browser.newPage();
        
        await page.setCookie({
            name: 'ATERNOS_SESSION',
            value: cookie,
            domain: 'aternos.org',
            path: '/'
        });
        
        await page.goto(`https://aternos.org/server/#${server}`, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        let result = {};
        
        if (action === 'start') {
            const started = await page.evaluate(() => {
                const btn = document.querySelector('#start');
                if (btn) { btn.click(); return true; }
                return false;
            });
            result = { started };
        } else {
            const status = await page.evaluate(() => {
                return document.querySelector('.status-label')?.textContent || 'Desconhecido';
            });
            result = { status };
        }
        
        res.json({ success: true, server: server, ...result });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (browser) await browser.close();
    }
};
