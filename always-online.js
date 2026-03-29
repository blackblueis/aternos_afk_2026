const mineflayer = require('mineflayer');
const express = require('express');
const app = express();

const botArgs = {
    host: 'CFLands.aternos.me', 
    port: 55817,                
    username: 'Crafting_AFK',   
    version: '1.20.0',
    protocol: 'bedrock' 
};

function createBot() {
    const bot = mineflayer.createBot(botArgs);

    bot.on('spawn', () => {
        console.log('Bot Online');
        setInterval(() => {
            if (bot.entity) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);
                bot.look(bot.entity.yaw + 0.2, bot.entity.pitch);
            }
        }, 30000); 
    });

    bot.on('end', () => {
        setTimeout(createBot, 30000);
    });

    bot.on('error', (err) => {
        console.log(err.message);
    });
}

app.get('/', (req, res) => res.send('Online'));
app.listen(3000);

createBot();
