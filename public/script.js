// Gerenciamento de Estado
let selectedServer = null;
let botActive = false;
let botInterval = null;
let sessionCookie = '';

// Elementos do DOM (Sincronizados com seu CSS)
const sessionInput = document.getElementById('sessionCookie');
const serversSection = document.getElementById('serversSection');
const serversGrid = document.getElementById('serversGrid');
const controlSection = document.getElementById('controlSection');
const logsSection = document.getElementById('logsSection');
const activityLogs = document.getElementById('activityLogs');
const botStatus = document.getElementById('botStatus');
const botLog = document.getElementById('botLog');

// Carregar servidores
async function loadServers() {
    sessionCookie = sessionInput.value.trim();
    if (!sessionCookie) {
        alert('Por favor, cole o seu cookie ATERNOS_SESSION');
        return;
    }
    
    serversGrid.innerHTML = '<div class="loading">Buscando servidores na Aternos...</div>';
    serversSection.style.display = 'block';
    
    try {
        const response = await fetch(`/api/servidores?cookie=${encodeURIComponent(sessionCookie)}`);
        const data = await response.json();
        
        if (data.success) {
            displayServers(data.servers);
            addActivityLog(`✅ ${data.servers.length} servidores encontrados.`);
        } else {
            serversGrid.innerHTML = `<div class="error">Erro: ${data.error}</div>`;
        }
    } catch (error) {
        serversGrid.innerHTML = `<div class="error">Falha na conexão: ${error.message}</div>`;
    }
}

// Exibir os cards (usando as classes do seu CSS)
function displayServers(servers) {
    serversGrid.innerHTML = '';
    servers.forEach(server => {
        const card = document.createElement('div');
        card.className = 'server-card';
        card.innerHTML = `
            <div class="server-name">${server.name || 'Server'}</div>
            <div class="server-id">ID: ${server.id}</div>
            <div class="server-software">${server.software || 'Vanilla'}</div>
            <span class="server-status-badge ${server.online ? 'status-online' : 'status-offline'}">
                ${server.online ? '🟢 Online' : '🔴 Offline'}
            </span>
        `;
        card.onclick = () => selectServer(server, card);
        serversGrid.appendChild(card);
    });
}

// Selecionar Servidor
function selectServer(server, card) {
    document.querySelectorAll('.server-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    
    selectedServer = server;
    
    // Atualiza Painel de Detalhes
    document.getElementById('selectedServerName').textContent = server.name;
    document.getElementById('selectedServerId').textContent = server.id;
    document.getElementById('serverStatus').textContent = server.online ? 'Online' : 'Offline';
    document.getElementById('serverStatus').className = `status-badge ${server.online ? 'status-online' : 'status-offline'}`;
    document.getElementById('serverPlayers').textContent = server.players || '0/20';
    document.getElementById('serverSoftware').textContent = server.software || 'Aternos';
    
    controlSection.style.display = 'block';
    logsSection.style.display = 'block';
    addActivityLog(`📌 Servidor selecionado: ${server.name}`);
}

// Funções de Controle (Start/Stop)
async function startServer() {
    if (!selectedServer) return;
    addActivityLog(`▶️ Iniciando ${selectedServer.name}...`);
    const res = await fetch(`/api/control?action=start&server=${selectedServer.id}&cookie=${encodeURIComponent(sessionCookie)}`);
    const data = await res.json();
    if(data.success) addActivityLog("✅ Comando de início enviado!");
    else addActivityLog(`❌ Erro: ${data.error}`);
}

async function stopServer() {
    if (!selectedServer || !confirm("Desligar o servidor agora?")) return;
    addActivityLog(`⏹️ Desligando ${selectedServer.name}...`);
    const res = await fetch(`/api/control?action=stop&server=${selectedServer.id}&cookie=${encodeURIComponent(sessionCookie)}`);
    const data = await res.json();
    if(data.success) addActivityLog("✅ Servidor desligado.");
}

// Lógica do Bot Always Online
document.getElementById('alwaysOnlineToggle').addEventListener('change', (e) => {
    botActive = e.target.checked;
    if (botActive) {
        botStatus.style.display = 'block';
        addActivityLog("🤖 Bot Always Online ATIVADO");
        runBot();
    } else {
        botStatus.style.display = 'none';
        clearTimeout(botInterval);
        addActivityLog("🤖 Bot Always Online DESATIVADO");
    }
});

async function runBot() {
    if (!botActive || !selectedServer) return;
    
    try {
        const res = await fetch(`/api/control?action=status&server=${selectedServer.id}&cookie=${encodeURIComponent(sessionCookie)}`);
        const data = await res.json();
        
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const time = new Date().toLocaleTimeString();
        
        entry.innerHTML = `<span class="time">[${time}]</span> <span class="action">Verificação: ${data.status.online ? 'Online' : 'Offline'}</span>`;
        botLog.prepend(entry);
        
        document.getElementById('lastAction').textContent = "Status verificado";
        document.getElementById('nextCheck').textContent = new Date(Date.now() + 30000).toLocaleTimeString();
        
    } catch (e) { console.error("Erro no bot", e); }
    
    botInterval = setTimeout(runBot, 30000); // Roda a cada 30 segundos
}

function addActivityLog(message) {
    const entry = document.createElement('div');
    entry.className = 'activity-entry';
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="time">[${time}]</span> ${message}`;
    activityLogs.prepend(entry);
}
