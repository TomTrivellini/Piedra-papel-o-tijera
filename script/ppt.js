(() => {
    const ppt = ['piedra', 'papel', 'tijera'];
    const deck = ppt.flatMap((type) => Array(4).fill(type));

    const buildDeck = () => [...deck].sort(() => Math.random() - 0.5);

    const sanitizeName = (name) => (name || '').toString().trim().slice(0, 15) || 'Jugador';

    const pptWin = (player, cpu) => {
        if (player === cpu) return 'tie';
        if (
            (player === 'piedra' && cpu === 'tijera') ||
            (player === 'papel' && cpu === 'piedra') ||
            (player === 'tijera' && cpu === 'papel')
        ) return 'player';
        return 'cpu';
    };

    const initialState = () => ({
        playerName: 'Jugador',
        playerScore: 0,
        cpuScore: 0,
        playerHand: [],
        cpuHand: [],
        rounds: [],
        isActive: false,
        lastPlayerChoice: '',
        lastCpuChoice: '',
        lastWinner: '',
        lastMessage: ''
    });

    class PPTGame {
        constructor() {
            this.state = initialState();
        }

        getState() {
            return {
                playerName: this.state.playerName,
                playerScore: this.state.playerScore,
                cpuScore: this.state.cpuScore,
                playerHand: [...this.state.playerHand],
                cpuHand: [...this.state.cpuHand],
                rounds: this.state.rounds.map((round) => ({ ...round })),
                isActive: this.state.isActive,
                lastPlayerChoice: this.state.lastPlayerChoice,
                lastCpuChoice: this.state.lastCpuChoice,
                lastWinner: this.state.lastWinner,
                lastMessage: this.state.lastMessage
            };
        }

        getCounts() {
            return this.state.playerHand.reduce((acc, card) => {
                if (!ppt.includes(card)) return acc;
                acc[card] = (acc[card] || 0) + 1;
                return acc;
            }, { piedra: 0, papel: 0, tijera: 0 });
        }

        start() {
            const deck = buildDeck();
            const nextState = initialState();
            nextState.playerName = this.state.playerName;
            nextState.playerHand = deck.slice(0, 6);
            nextState.cpuHand = deck.slice(6, 12);
            nextState.isActive = true;
            this.state = nextState;
            return this.getState();
        }

        play(choice) {
            if (!this.state.isActive) return null;
            if (!ppt.includes(choice)) return null;

            const idx = this.state.playerHand.indexOf(choice);
            if (idx === -1) return null;

            this.state.playerHand.splice(idx, 1);
            if (this.state.cpuHand.length === 0) {
                const summary = this.finish();
                return { winner: 'cpu', cpuChoice: '', finished: true, summary };
            }

            const cpuIndex = Math.floor(Math.random() * this.state.cpuHand.length);
            const cpuChoice = this.state.cpuHand.splice(cpuIndex, 1)[0];

            this.state.lastPlayerChoice = choice;
            this.state.lastCpuChoice = cpuChoice;

            const winner = pptWin(choice, cpuChoice);
            this.state.lastWinner = winner;

            if (winner === 'player') this.state.playerScore += 1;
            if (winner === 'cpu') this.state.cpuScore += 1;

            this.state.rounds.push({ playerChoice: choice, cpuChoice, winner });

            this.state.lastMessage = winner === 'player'
                ? ':)'
                : winner === 'cpu'
                    ? ':('
                    : 'Chicle!';

            const finished = this.state.playerHand.length === 0 || this.state.cpuHand.length === 0;
            if (finished) {
                const summary = this.finish();
                return { winner, cpuChoice, finished: true, summary };
            }

            return { winner, cpuChoice, finished: false };
        }

        applyTimeoutPenalty() {
            if (!this.state.isActive) return { finished: false };

            const hasPlayerCards = this.state.playerHand.length > 0;
            const hasCpuCards = this.state.cpuHand.length > 0;
            if (!hasPlayerCards && !hasCpuCards) return { finished: false };

            let removedCard = null;
            if (hasPlayerCards) {
                const randomIndex = Math.floor(Math.random() * this.state.playerHand.length);
                removedCard = this.state.playerHand.splice(randomIndex, 1)[0];
            }

            let cpuChoice = '';
            if (hasCpuCards) {
                const cpuIndex = Math.floor(Math.random() * this.state.cpuHand.length);
                cpuChoice = this.state.cpuHand.splice(cpuIndex, 1)[0];
                this.state.cpuScore += 1;
            }

            this.state.playerScore = Math.max(0, this.state.playerScore - 1);
            this.state.lastPlayerChoice = '';
            this.state.lastCpuChoice = cpuChoice;
            this.state.lastWinner = cpuChoice ? 'cpu' : 'timeout';
            this.state.lastMessage = cpuChoice
                ? `Te quedaste pensando... CPU jugo ${cpuChoice}.`
                : 'Te quedaste pensando...';
            this.state.rounds.push({
                playerChoice: null,
                cpuChoice: cpuChoice || null,
                winner: this.state.lastWinner
            });

            const finished = this.state.playerHand.length === 0 || this.state.cpuHand.length === 0;
            if (finished) {
                const summary = this.finish();
                return { finished: true, removedCard, cpuChoice, summary };
            }

            return { finished: false, removedCard, cpuChoice };
        }

        finish() {
            if (!this.state.isActive) {
                return {
                    message: this.state.lastMessage,
                    playerScore: this.state.playerScore,
                    cpuScore: this.state.cpuScore
                };
            }

            const { playerScore, cpuScore } = this.state;
            let resultMessage;
            if (playerScore > cpuScore) resultMessage = 'Ganaste! :)';
            else if (cpuScore > playerScore) resultMessage = 'Perdedor! >:(';
            else resultMessage = 'Empate!';

            this.state.isActive = false;
            this.state.lastWinner = 'finished';
            this.state.lastMessage = `Fin del juego! ${resultMessage}`;
            return {
                message: this.state.lastMessage,
                playerScore,
                cpuScore
            };
        }

        setPlayerName(name) {
            this.state.playerName = sanitizeName(name);
            return this.state.playerName;
        }

        getSnapshot() {
            return {
                playerName: this.state.playerName,
                playerHand: [...this.state.playerHand],
                cpuHand: [...this.state.cpuHand],
                playerScore: this.state.playerScore,
                cpuScore: this.state.cpuScore,
                rounds: this.state.rounds.map((round) => ({ ...round })),
                isActive: this.state.isActive,
                lastPlayerChoice: this.state.lastPlayerChoice,
                lastCpuChoice: this.state.lastCpuChoice,
                lastWinner: this.state.lastWinner,
                lastMessage: this.state.lastMessage
            };
        }

        restore(snapshot) {
            if (!snapshot || typeof snapshot !== 'object') return false;
            const clean = {
                ...initialState(),
                playerName: sanitizeName(snapshot.playerName)
            };
            clean.playerHand = Array.isArray(snapshot.playerHand) ? [...snapshot.playerHand] : [];
            clean.cpuHand = Array.isArray(snapshot.cpuHand) ? [...snapshot.cpuHand] : [];
            clean.playerScore = Number.isFinite(snapshot.playerScore) ? snapshot.playerScore : 0;
            clean.cpuScore = Number.isFinite(snapshot.cpuScore) ? snapshot.cpuScore : 0;
            clean.rounds = Array.isArray(snapshot.rounds)
                ? snapshot.rounds.map((round) => ({
                    playerChoice: typeof round.playerChoice === 'string' ? round.playerChoice : null,
                    cpuChoice: typeof round.cpuChoice === 'string' ? round.cpuChoice : null,
                    winner: typeof round.winner === 'string' ? round.winner : ''
                }))
                : [];
            clean.isActive = Boolean(snapshot.isActive) && (clean.playerHand.length > 0 || clean.cpuHand.length > 0);
            clean.lastPlayerChoice = typeof snapshot.lastPlayerChoice === 'string' ? snapshot.lastPlayerChoice : '';
            clean.lastCpuChoice = typeof snapshot.lastCpuChoice === 'string' ? snapshot.lastCpuChoice : '';
            clean.lastWinner = typeof snapshot.lastWinner === 'string' ? snapshot.lastWinner : '';
            clean.lastMessage = typeof snapshot.lastMessage === 'string' ? snapshot.lastMessage : '';

            this.state = clean;
            return true;
        }
    }

    window.PPTGame = PPTGame;
    window.PPT_TYPES = ppt;
})();
