import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { fetchGame } from '../../game/api';
import Spinner from '../../components/Spinner/Spinner';
import './Results.css';

const Results = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { token, currentUser } = useContext(AppContext);
    const [game, setGame] = useState(null);

    useEffect(() => {
        fetchGame(token, gameId).then(setGame);
    }, [token, gameId]);

    if (!game) return <Spinner />;

    const sortedTeams = [...game.teams].sort((a, b) => b.score - a.score);
    const myTeam = game.teams.find(t => t.players.some(p => p.player.id === currentUser?.id));
    const noWinner = !game.teams.some(t => t.isWinner);
    const won = myTeam?.isWinner;
    const verdict = !myTeam
        ? 'GAME OVER'
        : noWinner
            ? 'DRAW'
            : (won ? 'VICTORY' : 'DEFEAT');
    const verdictClass = noWinner ? 'draw' : (won ? 'won' : 'lost');

    return (
        <div className="results-page">
            <div className="results-card">
                <div className="results-teams">
                    {sortedTeams.map((team, idx) => (
                        <React.Fragment key={team.id}>
                            <div className={`results-team${team.id === myTeam?.id ? ' me' : ''}${team.isWinner ? ' winner' : ''}`}>
                                <div className="results-team-name">{team.teamName}</div>
                                <div className="results-team-avatars">
                                    {team.players.map(p => (
                                        <div key={p.id} className="results-avatar" title={p.player.username}>
                                            {p.player.username[0].toUpperCase()}
                                        </div>
                                    ))}
                                </div>
                                <div className="results-team-score">{team.score}</div>
                            </div>
                            {idx < sortedTeams.length - 1 && <div className="results-vs">vs</div>}
                        </React.Fragment>
                    ))}
                </div>
                <h1 className={`results-verdict ${verdictClass}`}>{verdict}</h1>
                <button className="results-back" onClick={() => navigate('/practice')}>back to practice</button>
            </div>
        </div>
    );
};

export default Results;
