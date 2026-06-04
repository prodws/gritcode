import React from 'react';
import { useParams } from 'react-router-dom';
import LobbyView from './LobbyView';
import './Lobby.css';

const Lobby = () => {
    const { gameId } = useParams();
    return (
        <div className="lobby-page">
            <div className="lobby-page-frame">
                <LobbyView gameId={gameId} />
            </div>
        </div>
    );
};

export default Lobby;
