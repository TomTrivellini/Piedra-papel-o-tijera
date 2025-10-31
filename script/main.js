const PPT = ['piedra', 'papel', 'tijera'];
const mazo = PPT.flatMap(type => Array(4).fill(type));

const ui = {
    manoJugador: document.getElementById('mano-jugador'),
    manoCpu: document.getElementById('mano-cpu'),
    scoreP: document.getElementById('puntuacion-jugador'),
    scoreC: document.getElementById('puntuacion-cpu'),
    res: document.getElementById('resultado-ronda'),
    repartir: document.getElementById('repartir'),
    elecciones: document.getElementById('elecciones'),
    jugadaP: document.getElementById('eleccion-jugador'),
    jugadaC: document.getElementById('eleccion-cpu'),
    nombre: document.getElementById('nombre-jugador'),
    histPartidas: document.getElementById('historial-partidas'),
    borrarHistorial: document.getElementById('borrar-historial')
};

// Estado del juego
const estado = {
    playerName: 'Jugador',
    playerScore: 0,
    cpuScore: 0,
    mano: [],
    manoCpu: [],
    rounds: [],
    juegoactivo: false,
    lastPlayerChoice: '',
    lastCpuChoice: '',
    lastMessage: ''
};

const guardado = {
    currentPlayer: 'ppt_current_player',
    players: 'ppt_players',
    history: 'ppt_history',
    juegoActual: 'ppt_juego_actual'
};


const clampName = (name) => (name || '').trim().slice(0, 15);


const validName = (name) => {
    const n = clampName(name);
    if (!n) return false;
    return n.toLowerCase() !== 'cpu';
};

const salvarPartida = () => {
    try { localStorage.setItem(guardado.juegoActual, JSON.stringify(estado)); } catch {}
};


const cargarPartida = () => {
    try {
    const usuarioGuardado = localStorage.getItem(guardado.currentPlayer);
    if (usuarioGuardado) estado.playerName = clampName(usuarioGuardado);

    const partidaGuardada = localStorage.getItem(guardado.juegoActual);
    if (!partidaGuardada) return false;
    Object.assign(estado, JSON.parse(partidaGuardada));
    estado.playerName = clampName(estado.playerName);
    return true;
} catch { return false; }
};

const guardarHistorial = () => {
    const match = {
    id: Date.now(),
    player: estado.playerName,
    playerScore: estado.playerScore,
    cpuScore: estado.cpuScore
};
    try {
    const list = JSON.parse(localStorage.getItem(guardado.history) || '[]');
    list.push(match);
    localStorage.setItem(guardado.history, JSON.stringify(list));
    const players = JSON.parse(localStorage.getItem(guardado.players) || '[]');
    if (!players.includes(estado.playerName)) {
        players.push(estado.playerName);
        localStorage.setItem(guardado.players, JSON.stringify(players));
    }
    } catch {}
};

const setPlayer = (name) => {
    if (!validName(name)) { if (ui.nombre) ui.nombre.value = estado.playerName; return; }
    estado.playerName = clampName(name);
    try {
    localStorage.setItem(guardado.currentPlayer, estado.playerName);
    const players = JSON.parse(localStorage.getItem(guardado.players) || '[]');
    if (!players.includes(estado.playerName)) {
        players.push(estado.playerName);
        localStorage.setItem(guardado.players, JSON.stringify(players));
    }
    } catch {}
    render();
    salvarPartida();
};


const renderHistory = () => {
    if (!ui.histPartidas) return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem(guardado.history) || '[]'); } catch {}
    ui.histPartidas.innerHTML = '';
    list.forEach((m, i) => {
    const d = document.createElement('div');
    d.className = 'item';
    d.textContent = `${i + 1}. ${m.player || 'Jugador'} ${m.playerScore || 0} puntos y CPU ${m.cpuScore || 0} puntos`;
    ui.histPartidas.appendChild(d);
    });
};

const render = () => {
    if (ui.nombre) {
    ui.nombre.value = estado.playerName;
    ui.nombre.disabled = estado.juegoactivo;
    }

// Mano del jugador (conteo)
    const counts = {}; for (const c of estado.mano) counts[c] = (counts[c] || 0) + 1;
    if (ui.manoJugador) {
    ui.manoJugador.innerHTML = PPT
        .map(t => `<div class="card-count">${t[0].toUpperCase() + t.slice(1)}: ${counts[t] || 0}</div>`)
        .join('');
}
    if (ui.manoCpu) ui.manoCpu.textContent = estado.manoCpu.length;

    if (ui.scoreP) ui.scoreP.textContent = estado.playerScore;
    if (ui.scoreC) ui.scoreC.textContent = estado.cpuScore;

    if (ui.jugadaP) ui.jugadaP.textContent = estado.lastPlayerChoice;
    if (ui.jugadaC) ui.jugadaC.textContent = estado.lastCpuChoice;
    if (ui.res) ui.res.textContent = estado.lastMessage;

    if (ui.elecciones) {
    ui.elecciones.querySelectorAll('button').forEach(b => {
        const choice = b.dataset.eleccion;
        b.disabled = !estado.juegoactivo || (counts[choice] || 0) === 0;
    });
}
    if (ui.repartir) ui.repartir.disabled = estado.juegoactivo;

    renderHistory();
};


const winnerOf = (p, c) => p === c ? 'tie' : (
    (p === 'piedra' && c === 'tijera') ||
    (p === 'papel' && c === 'piedra') ||
    (p === 'tijera' && c === 'papel')
) ? 'player' : 'cpu';

const start = () => {
    const deck = [...mazo].sort(() => Math.random() - 0.5);
    Object.assign(estado, {
    playerScore: 0,
    cpuScore: 0,
    mano: deck.slice(0, 6),
    manoCpu: deck.slice(6, 12),
    rounds: [],
    juegoactivo: true,
    lastPlayerChoice: '',
    lastCpuChoice: '',
    lastMessage: ''
    });
    render();
    salvarPartida();
};

const play = (choice) => {
    if (!estado.juegoactivo) return;
    const idx = estado.mano.indexOf(choice);
    if (idx === -1) return;
    estado.mano.splice(idx, 1);
    if (estado.manoCpu.length === 0) return end();
  const ci = Math.floor(Math.random() * estado.manoCpu.length);
    const cpu = estado.manoCpu.splice(ci, 1)[0];
    estado.lastPlayerChoice = choice;
    estado.lastCpuChoice = cpu;
    const w = winnerOf(choice, cpu);
    estado.lastMessage = w === 'player' ? ':)' : w === 'cpu' ? ':(' : 'Chicle!';
    if (w === 'player') estado.playerScore++; else if (w === 'cpu') estado.cpuScore++;
    estado.rounds.push({ playerChoice: choice, cpuChoice: cpu, winner: w });
    if (estado.mano.length === 0 || estado.manoCpu.length === 0) return end();
    render();
    salvarPartida();
};

const end = () => {
    estado.juegoactivo = false;
    const msg = estado.playerScore > estado.cpuScore ? 'Ganaste! :)' : estado.cpuScore > estado.playerScore ? 'Perdedor! >:(' : 'Empate!';
    estado.lastMessage = `Fin del juego! ${msg}`;
    guardarHistorial();
    render();
    salvarPartida();
};

// Eventos
if (ui.elecciones) ui.elecciones.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON' && e.target.dataset.eleccion) play(e.target.dataset.eleccion);
});
if (ui.repartir) ui.repartir.addEventListener('click', start);
if (ui.nombre) {
    const commitName = () => {
    if (estado.juegoactivo) { ui.nombre.disabled = true; render(); return; }
    const nuevo = clampName(ui.nombre.value || '');
    if (!validName(nuevo)) { ui.nombre.value = estado.playerName; return; } ui.nombre.value = estado.playerName;
        
        return;
    }
    if (nuevo !== estado.playerName) setPlayer(nuevo); else render();
    };
    ui.nombre.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        ui.nombre.blur();
    }
    });
    ui.nombre.addEventListener('blur', commitName);

if (ui.borrarHistorial) {
    ui.borrarHistorial.addEventListener('click', (e) => {
        e.preventDefault();
        try {
            // Limpiar almacenamiento del historial
            localStorage.removeItem(guardado.history);
        } catch {}
        // Vaciar la lista en pantalla de inmediato y re-renderizar por si acaso
        if (ui.histPartidas) ui.histPartidas.innerHTML = '';
        renderHistory();
    });
}

const restored = cargarPartida();
render();
window.addEventListener('beforeunload', salvarPartida);
