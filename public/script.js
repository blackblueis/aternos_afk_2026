// Gerenciamento de Estado
let selectedServer = null;
let botActive = false;
let botInterval = null;
let sessionCookie = '';

// Elementos do DOM
const sessionInput = document.getElementById('sessionCookie');
const serversSection = document.getElementById('serversSection');
const serversGrid = document.getElementById('serversGrid');
const controlSection = document.getElementById('controlSection');
const activityLog = document.getElementById('activityLogs'); // Ajustado para o ID do seu HTML

// Carregar servidores ao clicar
async function loadServers() {
    sessionCookie = sessionInput.value.trim();
    if (!sessionCookie) {
        alert('Por favor, insira seu cookie de sessão');
        return;
    }
    
    serversGrid.innerHTML = '<div class="loading">Buscando seus servidores...</div>';
    serversSection.style.display = 'block';
    
    try {
        // Chamando sua API da Vercel
        const response = await fetch(`/api/servidores?cookie=${encodeURIComponent(sessionCookie)}`);
        const data = await response.json();
        
        if (data.success) {
            displayServers(data.servers);
            addActivityLog('✅ ' + data.servers.length + ' servidores carregados');
        } else {
            serversGrid.innerHTML = `<div style="color:#f56565">Erro: ${data.error}</div>`;
        }
    } catch (error) {
        serversGrid.innerHTML = `<div style="color:#f56565">Falha ao conectar: ${error.message}</div>`;
    }
}

// Exibir servidores no grid
function displayServers(servers) {
    serversGrid.innerHTML = '';
    
    servers.forEach(server => {
        const card = document.createElement('div');
        card.className = 'server-card';
        card.innerHTML = `
            <div style="font-weight:bold">${server.name || 'Sem nome'}</div>
            <div style="font-size:0.8em; color:#aaa">ID: ${server.id}</div>
            <span class="status-badge ${server.online ? 'status-online' : 'status-offline'}">
                ${server.online ? '🟢 Online' : '🔴 Offline'}
            </span>
        `;
        
        card.addEventListener('click', () => selectServer(server, card));
        serversGrid.appendChild(card);
    });
}

// Selecionar um servidor
function selectServer(server, card) {
    document.querySelectorAll('.server-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    
    selectedServer = server;
    
    // Atualiza os nomes no painel de controle
    const targetName = document.getElementById('targetName'); // ID do seu HTML
    if(targetName) targetName.textContent = server.name;
    
    controlSection.style.display = 'block';
    addActivityLog(`📌 Selecionado: ${server.name}`);
}

// Ligar Servidor
async function startServer() {
    if (!selectedServer) return;
    
    try {
        addActivityLog('▶️ Iniciando servidor...');
        const response = await fetch(`/api/control?action=start&server=${selectedServer.id}&cookie=${encodeURIComponent(sessionCookie)}`);
        const data = await response.json();
        
        if (data.success) {
            addActivityLog('✅ Comando enviado! Aguarde o início.');
            setTimeout(refreshStatus, 5000); // Atualiza após 5 seg
        } else {
            addActivityLog(`❌ Erro: ${data.error}`, 'error');
        }
    } catch (error) {
        addActivityLog(`❌ Erro: ${error.message}`, 'error');
    }
}

// Desligar Servidor
async function stopServer() {
    if (!selectedServer) return;
    if (!confirm('Tem certeza que quer desligar?')) return;
    
    try {
        addActivityLog('⏹️ Desligando servidor...');
        const response = await fetch(`/api/control?action=stop&server=${selectedServer.id}&cookie=${encodeURIComponent(sessionCookie)}`);
        const data = await response.json();
        
        if (data.success) {
            addActivityLog('✅ Servidor desligado');
            refreshStatus();
        }
    } catch (error) {
        addActivityLog(`❌ Erro: ${error.message}`, 'error');
    }
}

// Atualizar Status
async function refreshStatus() {
    if (!selectedServer) return;
    try {
        const response = await fetch(`/api/control?action=status&server=${selectedServer.id}&cookie=${encodeURIComponent(sessionCookie)}`);
        const data = await response.json();
        if (data.success) {
            addActivityLog(`🔄 Status atual: ${data.status.online ? 'Online' : 'Offline'}`);
            loadServers(); // Recarrega a lista para atualizar as cores
        }
    } catch (e) { console.error(e); }
}

// Log de atividades
function addActivityLog(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    const color = type === 'error' ? '#f56565' : '#4299e1';
    
    entry.innerHTML = `<span style="color:#48bb78">[${time}]</span> <span style="color:${color}">${message}</span>`;
    
    activityLog.appendChild(entry);
    activityLog.scrollTop = activityLog.scrollHeight;
}
