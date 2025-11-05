(() => {
    const KEYS = {
        history: 'ppt_history',
        snapshot: 'ppt_snapshot'
    };

    const readJSON = (key, fallback) => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            return parsed ?? fallback;
        } catch {
            return fallback;
        }
    };

    const writeJSON = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    };

    const sanitizeHistoryEntry = (entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const playerName = (entry.player || 'Jugador').toString().slice(0, 40);
        const playerScore = Number.isFinite(entry.playerScore) ? entry.playerScore : 0;
        const cpuScore = Number.isFinite(entry.cpuScore) ? entry.cpuScore : 0;
        return {
            id: entry.id || Date.now(),
            player: playerName,
            playerScore,
            cpuScore
        };
    };

    const sanitizeSnapshot = (snapshot) => {
        if (!snapshot || typeof snapshot !== 'object') return null;
        const playerName = (snapshot.playerName || 'Jugador').toString().slice(0, 15);
        const playerHand = Array.isArray(snapshot.playerHand) ? [...snapshot.playerHand] : [];
        const cpuHand = Array.isArray(snapshot.cpuHand) ? [...snapshot.cpuHand] : [];
        const playerScore = Number.isFinite(snapshot.playerScore) ? snapshot.playerScore : 0;
        const cpuScore = Number.isFinite(snapshot.cpuScore) ? snapshot.cpuScore : 0;
        const rounds = Array.isArray(snapshot.rounds)
            ? snapshot.rounds.map((round) => ({
                playerChoice: typeof round.playerChoice === 'string' ? round.playerChoice : null,
                cpuChoice: typeof round.cpuChoice === 'string' ? round.cpuChoice : null,
                winner: typeof round.winner === 'string' ? round.winner : ''
            }))
            : [];
        const lastPlayerChoice = typeof snapshot.lastPlayerChoice === 'string' ? snapshot.lastPlayerChoice : '';
        const lastCpuChoice = typeof snapshot.lastCpuChoice === 'string' ? snapshot.lastCpuChoice : '';
        const lastWinner = typeof snapshot.lastWinner === 'string' ? snapshot.lastWinner : '';
        const lastMessage = typeof snapshot.lastMessage === 'string' ? snapshot.lastMessage : '';
        const isActive = Boolean(snapshot.isActive) && (playerHand.length > 0 || cpuHand.length > 0);

        return {
            playerName,
            playerHand,
            cpuHand,
            playerScore,
            cpuScore,
            rounds,
            isActive,
            lastPlayerChoice,
            lastCpuChoice,
            lastWinner,
            lastMessage
        };
    };

    const storage = {
        getHistory() {
            const history = readJSON(KEYS.history, []);
            return Array.isArray(history) ? history : [];
        },
        addHistoryEntry(entry) {
            const sanitized = sanitizeHistoryEntry(entry);
            if (!sanitized) return false;
            const history = this.getHistory();
            history.push(sanitized);
            return writeJSON(KEYS.history, history);
        },
        clearHistory() {
            try {
                localStorage.removeItem(KEYS.history);
                return true;
            } catch {
                return false;
            }
        },
        saveSnapshot(snapshot) {
            const clean = sanitizeSnapshot(snapshot);
            if (!clean) return false;
            return writeJSON(KEYS.snapshot, clean);
        },
        loadSnapshot() {
            const raw = readJSON(KEYS.snapshot, null);
            return sanitizeSnapshot(raw);
        },
        clearSnapshot() {
            try {
                localStorage.removeItem(KEYS.snapshot);
                return true;
            } catch {
                return false;
            }
        }
    };

    window.pptStorage = storage;
})();
