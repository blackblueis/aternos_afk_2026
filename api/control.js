const axios = require('axios');

module.exports = async (req, res) => {
    const action = req.query.action || 'status';
    const serverId = req.query.serverId || 'CFLands'; // Use o ID interno do Aternos se souber
    const cookie = req.query.cookie;

    if (!cookie) {
        return res.status(400).json({ success: false, error: 'Faltou o COOKIE!' });
    }

    try {
        // Configuração da requisição para o Aternos
        const config = {
            headers: {
                'Cookie': `ATERNOS_SESSION=${cookie}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        };

        if (action === 'start') {
            // Comando direto para ligar o servidor sem abrir navegador
            await axios.get(`https://aternos.org/panel/ajax/start.php?head-server=0`, config);
            return res.json({ success: true, message: 'Comando START enviado!' });
        } else {
            // Apenas checa o status
            const response = await axios.get(`https://aternos.org/server/`, config);
            const status = response.data.includes('online') ? 'Online' : 'Offline/Iniciando';
            return res.json({ success: true, status: status });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro na conexão com Aternos' });
    }
};
