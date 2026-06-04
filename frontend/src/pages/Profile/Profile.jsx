import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { myFinishedGames } from '../../game/api';
import './Profile.css';

const DIFF_COLOR = {
    EASY:   'var(--diff-easy)',
    MEDIUM: 'var(--diff-medium)',
    HARD:   'var(--diff-hard)',
};

const DIFF_COUNT = { EASY: 1, MEDIUM: 2, HARD: 3 };
const DIFF_ORDER = ['EASY', 'MEDIUM', 'HARD'];

const STATUS_LABEL = {
    PASSED:             'passed',
    TESTS_FAILED:       'failed',
    COMPILE_ERROR:      'compile error',
    RUNTIME_ERROR:      'runtime error',
    TIMEOUT:            'timeout',
    INVALID_SUBMISSION: 'invalid',
    SYSTEM_ERROR:       'system error',
};

const DiffStars = ({ difficulty }) => (
    <span className="prof-diff-stars">
        {[0,1,2].map(i => (
            <span key={i} style={{ color: i < (DIFF_COUNT[difficulty] ?? 0) ? DIFF_COLOR[difficulty] : 'var(--border)' }}>★</span>
        ))}
    </span>
);

const ACTIVITY_DAYS = 30;

const buildActivity = (submissions) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const counts = new Array(ACTIVITY_DAYS).fill(0);
    submissions.forEach(s => {
        if (!s.createdAt) return;
        const d = new Date(s.createdAt);
        d.setHours(0, 0, 0, 0);
        const daysAgo = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (daysAgo >= 0 && daysAgo < ACTIVITY_DAYS) {
            counts[ACTIVITY_DAYS - 1 - daysAgo]++;
        }
    });
    return counts;
};

const ProfilePage = () => {
    const { token, currentUser, submissions, fetchSubmissions, goPracticeById } = useContext(AppContext);
    const [expandedProblem, setExpandedProblem] = useState(null);
    const [expandedSub, setExpandedSub] = useState(null);
    const [allProblems, setAllProblems] = useState([]);
    const [games, setGames] = useState([]);
    const navigate = useNavigate();

    useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

    useEffect(() => {
        if (!token) return;
        myFinishedGames(token).then(setGames).catch(() => setGames([]));
    }, [token]);

    useEffect(() => {
        if (!token) return;
        fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: `{ problems { id difficulty type } }` }),
        })
        .then(r => r.json())
        .then(d => setAllProblems((d.data?.problems ?? []).filter(p => p.type === 'CODING')));
    }, [token]);

    const initials = currentUser?.username?.slice(0, 2).toUpperCase();
    const score = currentUser?.totalPoints ?? 0;
    const maxScore = 1000;
    const progress = score % maxScore;
    const circumference = 2 * Math.PI * 36;
    const offset = circumference - (progress / maxScore) * circumference;

    const joined = currentUser?.createdAt
        ? new Date(currentUser.createdAt)
              .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              .toLowerCase()
        : null;

    // Group submissions by problem (newest first within each group)
    const byProblem = submissions.reduce((acc, s) => {
        const pid = s.problem?.id ?? 'unknown';
        if (!acc[pid]) acc[pid] = { problem: s.problem, subs: [] };
        acc[pid].subs.push(s);
        return acc;
    }, {});
    const problemGroups = Object.values(byProblem)
        .sort((a, b) => {
            const da = a.subs[0]?.createdAt ?? '';
            const db = b.subs[0]?.createdAt ?? '';
            return db.localeCompare(da);
        });

    // Difficulty breakdown — solved per difficulty / total per difficulty
    const totalsByDiff = allProblems.reduce((acc, p) => {
        acc[p.difficulty] = (acc[p.difficulty] ?? 0) + 1;
        return acc;
    }, { EASY: 0, MEDIUM: 0, HARD: 0 });

    const solvedByDiff = problemGroups.reduce((acc, g) => {
        if (g.subs.some(s => s.passed) && g.problem?.difficulty) {
            acc[g.problem.difficulty] = (acc[g.problem.difficulty] ?? 0) + 1;
        }
        return acc;
    }, { EASY: 0, MEDIUM: 0, HARD: 0 });

    const totalSolved = solvedByDiff.EASY + solvedByDiff.MEDIUM + solvedByDiff.HARD;
    const totalProblems = totalsByDiff.EASY + totalsByDiff.MEDIUM + totalsByDiff.HARD;
    const totalSubmissions = submissions.length;
    const passedSubmissions = submissions.filter(s => s.passed).length;
    const passRate = totalSubmissions > 0 ? Math.round((passedSubmissions / totalSubmissions) * 100) + '%' : '—';

    // Activity strip
    const activity = buildActivity(submissions);
    const maxActivity = Math.max(1, ...activity);

    return (
        <div className="profile-container">
            <div className="profile-layout">

                {/* LEFT: identity card */}
                <div className="profile-card">
                    <div className="profile-header">
                        <div className="profile-ring-wrap">
                            <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="44" cy="44" r="36" fill="none" stroke="var(--border)" strokeWidth="3" />
                                <circle cx="44" cy="44" r="36" fill="none" stroke="var(--accent)" strokeWidth="3"
                                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
                            </svg>
                            <div className="profile-ring-inner">
                                <span className="profile-initials">{initials}</span>
                            </div>
                        </div>
                    </div>
                    <div className="profile-info">
                        <p className="profile-username">{currentUser?.username}</p>
                        <p className="profile-score">{score} xp</p>
                    </div>
                    <hr className="profile-divider" />
                    {joined && (
                        <div className="profile-row">
                            <span className="profile-label">joined</span>
                            <span className="profile-value">{joined}</span>
                        </div>
                    )}
                </div>

                {/* RIGHT: stats + activity */}
                <div className="profile-stats">
                    <p className="profile-section-title">stats</p>
                    <div className="stats-grid">
                        <div className="stat-box">
                            <span className="stat-label">solved</span>
                            <span className="stat-value">
                                {totalSolved || '—'}
                                {totalProblems > 0 && (
                                    <span className="stat-value-suffix"> / {totalProblems}</span>
                                )}
                            </span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-label">submissions</span>
                            <span className="stat-value">{totalSubmissions || '—'}</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-label">pass rate</span>
                            <span className="stat-value">{passRate}</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-label">best streak</span>
                            <span className="stat-value">—</span>
                        </div>
                    </div>

                    <p className="profile-section-title profile-section-title-spaced">activity · last 30 days</p>
                    <div className="activity-strip" title={`${submissions.length} total submissions`}>
                        {activity.map((c, i) => {
                            const intensity = c === 0 ? 0 : 0.2 + (c / maxActivity) * 0.8;
                            return (
                                <div
                                    key={i}
                                    className="activity-cell"
                                    style={{
                                        background: c === 0
                                            ? 'var(--border)'
                                            : `color-mix(in srgb, var(--accent) ${intensity * 100}%, transparent)`,
                                    }}
                                    title={c > 0 ? `${c} submission${c > 1 ? 's' : ''}` : 'no activity'}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* BOTTOM: problems with grouped submissions */}
                <div className="profile-submissions">
                    <hr className="profile-divider submissions-divider" />
                    <p className="profile-section-title">problems</p>
                    {problemGroups.length === 0 ? (
                        <div className="profile-empty-box">
                            <p className="profile-empty">no submissions yet</p>
                        </div>
                    ) : (
                        <div className="submissions-list">
                            {problemGroups.map(({ problem, subs }) => {
                                const pid = problem?.id ?? 'unknown';
                                const isSolved = subs.some(s => s.passed);
                                const isOpen = expandedProblem === pid;
                                const diff = problem?.difficulty;

                                return (
                                    <div key={pid} className="prob-group">
                                        <div
                                            className="prob-group-header"
                                            style={{ '--diff-color': DIFF_COLOR[diff] }}
                                            onClick={() => setExpandedProblem(isOpen ? null : pid)}
                                        >
                                            <div className="prob-group-left">
                                                <DiffStars difficulty={diff} />
                                                <button
                                                    className="prob-group-title"
                                                    onClick={e => { e.stopPropagation(); pid !== 'unknown' && goPracticeById(pid); }}
                                                >
                                                    {problem?.title ?? 'unknown'}
                                                </button>
                                            </div>
                                            <div className="prob-group-right">
                                                <span className={`prob-group-badge ${isSolved ? 'badge-solved' : 'badge-attempted'}`}>
                                                    {isSolved ? 'solved' : `${subs.length} attempt${subs.length !== 1 ? 's' : ''}`}
                                                </span>
                                                <span className="prob-group-chevron">{isOpen ? '▲' : '▼'}</span>
                                            </div>
                                        </div>

                                        {isOpen && (
                                            <div className="prob-group-subs">
                                                {subs.map((s, i) => (
                                                    <div key={s.id} className="sub-item">
                                                        <div
                                                            className="sub-item-header"
                                                            onClick={() => setExpandedSub(expandedSub === s.id ? null : s.id)}
                                                        >
                                                            <span className="sub-item-num">#{subs.length - i}</span>
                                                            <span
                                                                className="sub-item-status"
                                                                style={{ color: s.passed ? 'var(--success)' : 'var(--error)' }}
                                                            >
                                                                {STATUS_LABEL[s.status] ?? s.status.toLowerCase()}
                                                            </span>
                                                            {s.createdAt && (
                                                                <span className="sub-item-date">
                                                                    {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                </span>
                                                            )}
                                                            <span className="sub-item-toggle">{expandedSub === s.id ? '▲' : '▼'}</span>
                                                        </div>
                                                        {expandedSub === s.id && (
                                                            <pre className="submission-code">{s.code}</pre>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="profile-submissions">
                    <hr className="profile-divider submissions-divider" />
                    <p className="profile-section-title">games</p>
                    {games.length === 0 ? (
                        <div className="profile-empty-box">
                            <p className="profile-empty">no games played yet</p>
                        </div>
                    ) : (
                        <div className="games-list">
                            {games.map(g => {
                                const myTeam = g.teams.find(t => t.players.some(p => p.player.id === currentUser?.id));
                                const noWinner = !g.teams.some(t => t.isWinner);
                                const won = myTeam?.isWinner;
                                const opponents = g.teams.filter(t => t.id !== myTeam?.id);
                                const layout = `${myTeam?.players.length ?? 0}v${opponents.map(t => t.players.length).join('v')}`;
                                const date = g.endedAt ? new Date(g.endedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                                const verdictClass = noWinner ? 'draw' : (won ? 'won' : 'lost');
                                const verdictText = noWinner ? 'draw' : (won ? 'victory' : 'defeat');
                                return (
                                    <div key={g.id} className="games-row" onClick={() => navigate(`/game/${g.id}/results`)}>
                                        <span className="games-layout">{layout}</span>
                                        <span className="games-avatars">
                                            {myTeam?.players.map(p => (
                                                <span key={p.id} className="games-avatar">{p.player.username[0].toUpperCase()}</span>
                                            ))}
                                        </span>
                                        <span className={`games-verdict ${verdictClass}`}>
                                            {verdictText}
                                        </span>
                                        <span className="games-score">{myTeam?.score ?? 0}</span>
                                        <span className="games-date">{date}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ProfilePage;
