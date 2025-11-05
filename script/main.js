(() => {
    const storage = window.pptStorage || {
        getHistory: () => [],
        addHistoryEntry: () => false,
        clearHistory: () => false,
        saveSnapshot: () => false,
        loadSnapshot: () => null,
        clearSnapshot: () => false
    };

    const GameCtor = window.PPTGame;
    const cardTypes = Array.isArray(window.PPT_TYPES) && window.PPT_TYPES.length
        ? window.PPT_TYPES
        : ['piedra', 'papel', 'tijera'];

    if (typeof GameCtor !== 'function') {
        console.error('PPTGame no esta disponible: revisa la carga de script/ppt.js');
        return;
    }

    const game = new GameCtor();

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
        borrarHistorial: document.getElementById('borrar-historial'),
        toggleHistorial: document.getElementById('toggle-historial'),
        temporizador: document.getElementById('temporizador')
    };

    const COUNTDOWN_DURATION = 3000;
    const COUNTDOWN_TICK = 100;

    let countdownInterval = null;
    let countdownRemainingMs = 0;
    let resumePending = false;

    const showToast = (text, background = '#333') => {
        if (typeof Toastify !== 'function') return;
        Toastify({
            text,
            duration: 2000,
            gravity: 'top',
            position: 'right',
            close: true,
            stopOnFocus: true,
            style: { background }
        }).showToast();
    };

    const renderHistory = () => {
        if (!ui.histPartidas) return;

        const history = storage.getHistory();
        ui.histPartidas.innerHTML = '';

        history.forEach((match, index) => {
            const row = document.createElement('div');
            row.className = 'item';
            const player = (match && match.player) || 'Jugador';
            const playerScore = match && Number.isFinite(match.playerScore) ? match.playerScore : 0;
            const cpuScore = match && Number.isFinite(match.cpuScore) ? match.cpuScore : 0;
            row.textContent = `${index + 1}. ${player} ${playerScore} puntos y CPU ${cpuScore} puntos`;
            ui.histPartidas.appendChild(row);
        });

        const collapsed = ui.toggleHistorial && ui.toggleHistorial.getAttribute('aria-expanded') === 'false';
        ui.histPartidas.classList.toggle('is-collapsed', collapsed);
        ui.histPartidas.hidden = collapsed;
    };

    const setCountdownVisible = (visible) => {
        if (!ui.temporizador) return;
        ui.temporizador.classList.toggle('temporizador--hidden', !visible);
    };

    const updateCountdownDisplay = () => {
        if (!ui.temporizador) return;
        const seconds = Math.max(0, Math.ceil(countdownRemainingMs / 1000));
        ui.temporizador.textContent = `Tiempo: ${seconds}`;
    };

    const clearCountdownInterval = () => {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    };

    const stopCountdown = () => {
        clearCountdownInterval();
        countdownRemainingMs = 0;
        setCountdownVisible(false);
    };

    const startCountdown = (duration = COUNTDOWN_DURATION) => {
        if (resumePending) {
            stopCountdown();
            return;
        }
        if (!game.getState().isActive) {
            stopCountdown();
            return;
        }
        countdownRemainingMs = duration;
        setCountdownVisible(true);
        updateCountdownDisplay();
        clearCountdownInterval();
        countdownInterval = setInterval(() => {
            countdownRemainingMs -= COUNTDOWN_TICK;
            if (countdownRemainingMs <= 0) {
                clearCountdownInterval();
                setCountdownVisible(false);
                handleTimeout();
                return;
            }
            updateCountdownDisplay();
        }, COUNTDOWN_TICK);
    };

    const persistSnapshot = () => {
        const state = game.getState();
        if (state.isActive) {
            storage.saveSnapshot(game.getSnapshot());
        } else {
            storage.clearSnapshot();
        }
    };

    const render = () => {
        const state = game.getState();
        const counts = game.getCounts();

        if (ui.nombre) {
            ui.nombre.value = state.playerName;
            ui.nombre.disabled = state.isActive && !resumePending;
        }

        if (ui.manoJugador) {
            ui.manoJugador.innerHTML = cardTypes
                .map((type) => {
                    const label = type[0].toUpperCase() + type.slice(1);
                    return `<div class="card-count">${label}: ${counts[type] || 0}</div>`;
                })
                .join('');
        }

        if (ui.manoCpu) ui.manoCpu.textContent = state.cpuHand.length;
        if (ui.scoreP) ui.scoreP.textContent = state.playerScore;
        if (ui.scoreC) ui.scoreC.textContent = state.cpuScore;
        if (ui.jugadaP) ui.jugadaP.textContent = state.lastPlayerChoice;
        if (ui.jugadaC) ui.jugadaC.textContent = state.lastCpuChoice;
        if (ui.res) ui.res.textContent = state.lastMessage;

        if (ui.elecciones) {
            ui.elecciones.querySelectorAll('button').forEach((button) => {
                const choice = button.dataset.eleccion;
                const hasCards = !!counts[choice];
                const shouldDisable = resumePending || !state.isActive || !hasCards;
                button.disabled = shouldDisable;
                button.classList.toggle('no-cards', !hasCards);
            });
        }

        if (ui.repartir) {
            ui.repartir.textContent = resumePending ? 'Seguir jugando' : 'Repartir';
            ui.repartir.disabled = resumePending ? false : state.isActive;
        }

        renderHistory();
    };

    const handleTimeout = () => {
        const penalty = game.applyTimeoutPenalty();
        if (!penalty) return;

        if (penalty.cpuChoice) {
            showToast(`Se acabo el tiempo. CPU jugo ${penalty.cpuChoice} (+1 punto)`, '#c62828');
        } else {
            showToast('Se acabo el tiempo (-1 punto)', '#757575');
        }
        render();

        if (penalty.finished && penalty.summary) {
            const finalState = game.getState();
            storage.addHistoryEntry({
                player: finalState.playerName,
                playerScore: penalty.summary.playerScore,
                cpuScore: penalty.summary.cpuScore
            });
            persistSnapshot();
            stopCountdown();
        } else {
            persistSnapshot();
            startCountdown();
        }
    };

    const handleStart = () => {
        if (resumePending) {
            resumePending = false;
            render();
            startCountdown();
            persistSnapshot();
            return;
        }

        const currentState = game.getState();
        if (currentState.isActive) return;

        game.start();
        render();
        startCountdown();
        persistSnapshot();
    };

    const handlePlay = (choice) => {
        if (resumePending) return;

        if (game.getState().isActive) stopCountdown();

        const result = game.play(choice);
        if (!result) {
            if (game.getState().isActive) startCountdown();
            return;
        }

        const currentState = game.getState();
        if (result.winner === 'player') {
            showToast(`Punto para ${currentState.playerName}`, '#2e7d32');
        } else if (result.winner === 'cpu') {
            showToast('Punto para CPU', '#c62828');
        } else if (result.winner === 'tie') {
            showToast('Empate, nadie suma', '#616161');
        }

        if (result.finished && result.summary) {
            storage.addHistoryEntry({
                player: currentState.playerName,
                playerScore: result.summary.playerScore,
                cpuScore: result.summary.cpuScore
            });
            render();
            persistSnapshot();
            stopCountdown();
            return;
        }

        render();
        persistSnapshot();
        if (game.getState().isActive) startCountdown();
    };

    const handleNameCommit = () => {
        if (!ui.nombre) return;
        const previous = game.getState().playerName;
        const applied = game.setPlayerName(ui.nombre.value);
        ui.nombre.value = applied;
        if (applied !== previous) showToast(`Nombre guardado: ${applied}`, '#1565c0');
        render();
        persistSnapshot();
    };

    const handleHistoryClear = () => {
        storage.clearHistory();
        renderHistory();
        showToast('Se elimino el historial', '#424242');
    };

    const toggleHistory = () => {
        if (!ui.toggleHistorial) return;
        const expanded = ui.toggleHistorial.getAttribute('aria-expanded') !== 'true';
        ui.toggleHistorial.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        renderHistory();
    };

    const bindEvents = () => {
        if (ui.elecciones) {
            ui.elecciones.addEventListener('click', (event) => {
                if (event.target.tagName === 'BUTTON' && event.target.dataset.eleccion) {
                    handlePlay(event.target.dataset.eleccion);
                }
            });
        }

        if (ui.repartir) ui.repartir.addEventListener('click', handleStart);

        if (ui.nombre) {
            ui.nombre.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    ui.nombre.blur();
                }
            });
            ui.nombre.addEventListener('blur', handleNameCommit);
        }

        if (ui.borrarHistorial) ui.borrarHistorial.addEventListener('click', handleHistoryClear);
        if (ui.toggleHistorial) ui.toggleHistorial.addEventListener('click', toggleHistory);
    };

    const init = () => {
        setCountdownVisible(false);

        const snapshot = storage.loadSnapshot();
        if (snapshot && snapshot.isActive) {
            const restored = game.restore(snapshot);
            resumePending = Boolean(restored);
        }

        if (resumePending && ui.repartir) ui.repartir.textContent = 'Seguir jugando';

        bindEvents();
        render();
    };

    init();
})();
