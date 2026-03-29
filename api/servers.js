const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { cookie } = req.query;
    
    if (!cookie) {
        return res.status(400).json({ success: false, error: 'No cookie provided' });
    }
    
    try {
        const response = await axios.get('https://aternos.org/servers/', {
            headers: {
                'Cookie': `ATERNOS_SESSION=${cookie}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const servers = [];

        $('.server-card, [data-server], .server-item').each((i, el) => {
            const name = $(el).find('.server-name, .name, h3').text().trim() || 'Unnamed';
            const id = $(el).find('.server-id, .id, small').text().trim() || $(el).attr('data-server') || 'unknown';
            const isOnline = $(el).find('.status, .online').length > 0;

            servers.push({
                name: name,
                id: id,
                online: isOnline,
                software: 'Minecraft Server'
            });
        });

        res.json({
            success: true,
            servers: servers
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar servidores: ' + error.message
        });
    }
};
