interface Player {    
    id: string;
    name: string;
    isHost: boolean;
    isDisconnected: boolean;
    isReady: boolean;
    isPlaying: boolean;
    metadata: {
        color: string;
        avatar: {
            type: string;
            value: any;
        };
        gameStats: {
            wins: number;
            losses: number;
            lastGameResult: string;
        };
        totalStats: {
            wins: number;
            losses: number;
            timeInGame: number;
            timeMyTurn: number;
            piecesPlaced: number;
            timesHacked: number;
        }
    }
}