import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { fetchGame, fetchGameSubmissions } from '../../game/api';
import Spinner from '../../components/Spinner/Spinner';
import './Results.css';

const TEAM_COLORS = ['var(--accent)', '#e05c5c', '#5cb85c', '#e0a85c', '#a78bfa'];

const Results = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { token, currentUser } = useContext(AppContext);
    const [game, setGame] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [activeProblemIdx, setActiveProblemIdx] = useState(0);

    useEffect(() => {
        fetchGame(token, gameId).then(setGame);
        fetchGameSubmissions(token, gameId).then(setSubmissions).catch(() => {});
    }, [token, gameId]);

    if (!game) return <Spinner />;

    const sortedTeams = [...game.teams].sort((a, b) => b.score - a.score);
    const myTeam = game.teams.find(t => t.players.some(p => p.player.id === currentUser?.id));
    const noWinner = !game.teams.some(t => t.isWinner);
    const won = myTeam?.isWinner;
    const verdict = !myTeam ? 'GAME OVER' : noWinner ? 'DRAW' : (won ? 'VICTORY' : 'DEFEAT');
    const verdictClass = noWinner ? 'draw' : (won ? 'won' : 'lost');

    const problems = [...game.problems].sort((a, b) => a.sortOrder - b.sortOrder);
    const activeProblem = problems[activeProblemIdx];

    const teamColorMap = {};
    sortedTeams.forEach((t, i) => { teamColorMap[t.id] = TEAM_COLORS[i % TEAM_COLORS.length]; });

    const codePanels = sortedTeams.map(team => {
        const teamSubs = submissions.filter(
            s => s.team?.id === team.id && String(s.problem?.id) === String(activeProblem?.problem?.id)
        );
        const best = teamSubs.find(s => s.passed) || teamSubs[0] || null;
        return { team, submission: best };
    });

    const hasCode = codePanels.some(p => p.submission);
    const xpEarned = myTeam?.score ?? 0;

    return (
        <div className="results-page">
            <div className="results-wrap">

                {/* Verdict banner */}
                <div className={`results-verdict-banner ${verdictClass}`}>
                    <span className={`results-verdict ${verdictClass}`}>{verdict}</span>
                    {myTeam && (
                        <span className="results-xp-earned">
                            +{xpEarned} xp
                        </span>
                    )}
                </div>

                {/* Score card */}
                <div className="results-card">
                    <div className="results-teams">
                        {sortedTeams.map((team, idx) => (
                            <React.Fragment key={team.id}>
                                <div className={`results-team${team.isWinner ? ' winner' : ''}`}
                                    style={{ '--team-color': teamColorMap[team.id] }}>
                                    <div className="results-team-color-bar" />
                                    <div className="results-team-name">{team.teamName}</div>
                                    <div className="results-team-avatars">
                                        {team.players.map(p => (
                                            <Link key={p.id} to={`/profile/${p.player.username}`}
                                                className="results-avatar"
                                                title={p.player.username}
                                                style={{ background: teamColorMap[team.id] }}
                                                onClick={e => e.stopPropagation()}>
                                                {p.player.username[0].toUpperCase()}
                                            </Link>
                                        ))}
                                    </div>
                                    <div className="results-team-score"
                                        style={team.isWinner ? { color: teamColorMap[team.id] } : {}}>
                                        {team.score}
                                    </div>
                                    {team.isWinner && <div className="results-winner-label">winner</div>}
                                </div>
                                {idx < sortedTeams.length - 1 && <div className="results-vs">vs</div>}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Problem summary */}
                    {problems.length > 0 && (
                        <div className="results-problem-summary">
                            {problems.map((gp, i) => {
                                const mySubs = myTeam
                                    ? submissions.filter(s => s.team?.id === myTeam.id && String(s.problem?.id) === String(gp.problem.id))
                                    : [];
                                const solved = mySubs.some(s => s.passed);
                                const attempted = mySubs.length > 0;
                                return (
                                    <div key={gp.id} className={`results-prob-pill ${solved ? 'solved' : attempted ? 'attempted' : 'unsolved'}`}>
                                        <span className="results-prob-pill-num">{i + 1}</span>
                                        <span className="results-prob-pill-title">{gp.problem.title}</span>
                                        <span className="results-prob-pill-status">
                                            {solved ? '✓' : attempted ? '✗' : '—'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <button className="results-back" onClick={() => navigate('/forge')}>back to practice</button>
                </div>

                {/* Code section */}
                {hasCode && (
                    <div className="results-code-section">
                        {problems.length > 1 && (
                            <div className="results-prob-tabs">
                                {problems.map((gp, i) => (
                                    <button key={gp.id}
                                        className={`results-prob-tab${i === activeProblemIdx ? ' active' : ''}`}
                                        onClick={() => setActiveProblemIdx(i)}>
                                        <span className="results-prob-tab-num">{i + 1}</span>
                                        {gp.problem.title}
                                    </button>
                                ))}
                            </div>
                        )}
                        {problems.length === 1 && (
                            <div className="results-code-title">{activeProblem?.problem?.title}</div>
                        )}
                        <div className="results-code-panels"
                            style={{ gridTemplateColumns: `repeat(${Math.min(codePanels.length, 3)}, 1fr)` }}>
                            {codePanels.map(({ team, submission }) => (
                                <div key={team.id} className="results-code-panel">
                                    <div className="results-code-panel-header"
                                        style={{ borderTopColor: teamColorMap[team.id] }}>
                                        <div className="results-code-panel-team">
                                            <span className="results-code-panel-dot"
                                                style={{ background: teamColorMap[team.id] }} />
                                            {team.teamName}
                                        </div>
                                        {submission && (
                                            <span className={`results-code-status ${submission.passed ? 'passed' : 'failed'}`}>
                                                {submission.passed ? 'passed' : submission.status.toLowerCase().replace(/_/g, ' ')}
                                            </span>
                                        )}
                                    </div>
                                    <pre className="results-code-body">
                                        {submission
                                            ? submission.code
                                            : <span className="results-code-none">no submission</span>
                                        }
                                    </pre>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Results;
