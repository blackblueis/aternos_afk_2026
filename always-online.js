const mineflayer = require('mineflayer');

const botArgs = {
    host: 'CFLands.aternos.me', 
    port: 55817,                
    username: 'Crafting_AFK',   
    version: '1.26.3.1'
};

function createBot() {
    const bot = mineflayer.createBot(botArgs);

    bot.on('spawn', () => {
        console.log('✅ [Crafting Lands] Bot AFK Online!');

        // Ação para o Aternos não dar Kick
        setInterval(() => {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
            bot.look(bot.entity.yaw + 0.2, bot.entity.pitch);
        }, 30000); 
    });

    bot.on('end', () => {
        console.log('⚠️ Tentando reconectar...');
        setTimeout(createBot, 30000);
    });

    bot.on('error', (err) => {
        console.log('❌ Erro:', err.message);
    });
}

createBot();
