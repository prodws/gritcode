import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { myActiveGames, myFinishedGames } from '../../game/api';
import { validateUsername, validatePassword } from '../../utils/validation';
import './Profile.css';

const DIFF_COLOR = { EASY: 'var(--diff-easy)', MEDIUM: 'var(--diff-medium)', HARD: 'var(--diff-hard)' };
const DIFF_COUNT = { EASY: 1, MEDIUM: 2, HARD: 3 };

const STATUS_LABEL = {
    PASSED: 'passed', TESTS_FAILED: 'tests failed', COMPILE_ERROR: 'compile error',
    RUNTIME_ERROR: 'runtime error', TIMEOUT: 'timeout', INVALID_SUBMISSION: 'invalid', SYSTEM_ERROR: 'system error',
};

const TEAM_COLORS = ['var(--accent)', '#e05c5c', '#5cb85c', '#e0a85c', '#a78bfa'];

const DiffStars = ({ difficulty }) => (
    <span className="prof-diff-stars">
        {[0,1,2].map(i => (
            <span key={i} style={{ color: i < (DIFF_COUNT[difficulty] ?? 0) ? DIFF_COLOR[difficulty] : 'var(--border)' }}>★</span>
        ))}
    </span>
);

const ACTIVITY_DAYS = 30;
const buildActivity = (submissions) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const counts = new Array(ACTIVITY_DAYS).fill(0);
    submissions.forEach(s => {
        if (!s.createdAt) return;
        const d = new Date(s.createdAt); d.setHours(0,0,0,0);
        const daysAgo = Math.floor((today - d) / 86400000);
        if (daysAgo >= 0 && daysAgo < ACTIVITY_DAYS) counts[ACTIVITY_DAYS - 1 - daysAgo]++;
    });
    return counts;
};

const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const diffDays = Math.floor((Date.now() - d) / 86400000);
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const gql = (token, query, variables) => fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
}).then(r => r.json());

/* ---------- Level progress bar ---------- */
const LevelBar = ({ xp, level, xpForNextLevel }) => {
    // xp for current level start
    let xpForCurrent = 0;
    for (let i = 1; i <= level; i++) xpForCurrent += 100 * i;
    const segmentXp = xpForNextLevel - xpForCurrent;
    const progressXp = xp - xpForCurrent;
    const pct = Math.min(100, segmentXp > 0 ? (progressXp / segmentXp) * 100 : 0);
    return (
        <div className="prof-level-wrap">
            <div className="prof-level-row">
                <span className="prof-level-label">level {level}</span>
                <span className="prof-level-xp">{xp} / {xpForNextLevel} xp</span>
            </div>
            <div className="prof-level-bar">
                <div className="prof-level-fill" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

/* ---------- Avatar component ---------- */
const Avatar = ({ user, size = 64, editable = false, onUpload }) => {
    const inputRef = useRef();
    const [uploading, setUploading] = useState(false);

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 512 * 1024) { alert('Image must be smaller than 512 KB'); return; }
        if (!file.type.startsWith('image/')) { alert('File must be an image'); return; }
        setUploading(true);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try { await onUpload(ev.target.result); }
            catch (err) { alert(err.message); }
            finally { setUploading(false); }
        };
        reader.readAsDataURL(file);
    };

    const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??';

    return (
        <div className="prof-avatar-wrap" style={{ width: size, height: size }}
            onClick={editable ? () => inputRef.current?.click() : undefined}
            title={editable ? 'click to change avatar' : undefined}>
            {user?.avatarBase64
                ? <img src={user.avatarBase64} alt={user.username} className="prof-avatar-img" />
                : <div className="prof-avatar-initials">{uploading ? '…' : initials}</div>
            }
            {editable && <div className="prof-avatar-overlay">edit</div>}
            {editable && <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />}
        </div>
    );
};

/* ---------- Settings panel ---------- */
const SettingsPanel = () => {
    const { token, currentUser, handleSaveUsername, handleSavePassword, handleSaveAvatar } = useContext(AppContext);

    // Username section
    const [newUsername, setNewUsername] = useState('');
    const [usernameErr, setUsernameErr] = useState('');
    const [usernameOk, setUsernameOk] = useState(false);
    const [usernameAvail, setUsernameAvail] = useState(null); // true/false/null
    const [usernameSaving, setUsernameSaving] = useState(false);
    const [usernameSuccess, setUsernameSuccess] = useState('');

    // Password section
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwErr, setPwErr] = useState('');
    const [pwSuccess, setPwSuccess] = useState('');
    const [pwSaving, setPwSaving] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const debounceRef = useRef(null);

    const onUsernameChange = (val) => {
        setNewUsername(val);
        setUsernameOk(false);
        setUsernameAvail(null);
        setUsernameSuccess('');
        const err = validateUsername(val);
        setUsernameErr(err ?? '');
        if (!err && val && val !== currentUser?.username) {
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(async () => {
                const res = await gql(token, `query($v:String!){checkAvailability(field:"username",value:$v)}`, { v: val });
                const avail = res.data?.checkAvailability;
                setUsernameAvail(avail);
                if (avail === false) setUsernameErr('Username already taken');
                else if (avail === true) setUsernameOk(true);
            }, 500);
        }
    };

    const onSaveUsername = async (e) => {
        e.preventDefault();
        if (usernameErr || !newUsername) return;
        setUsernameSaving(true);
        try {
            await handleSaveUsername(newUsername);
            setNewUsername('');
            setUsernameSuccess('Username updated');
            setUsernameOk(false);
            setTimeout(() => setUsernameSuccess(''), 2000);
        } catch (err) {
            setUsernameErr(err.message);
        } finally { setUsernameSaving(false); }
    };

    const onSavePassword = async (e) => {
        e.preventDefault();
        setPwErr('');
        if (!currentPw) { setPwErr('Enter your current password'); return; }
        const err = validatePassword(newPw);
        if (err) { setPwErr(err); return; }
        if (newPw !== confirmPw) { setPwErr('Passwords do not match'); return; }
        setPwSaving(true);
        try {
            await handleSavePassword(currentPw, newPw);
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
            setPwSuccess('Password updated');
            setTimeout(() => setPwSuccess(''), 2000);
        } catch (err) {
            setPwErr(err.message ?? 'Failed to update password');
        } finally { setPwSaving(false); }
    };

    const pwRules = [
        { label: '8+ characters', ok: newPw.length >= 8 },
        { label: 'a letter', ok: /[a-zA-Z]/.test(newPw) },
        { label: 'a number', ok: /[0-9]/.test(newPw) },
        { label: 'a special character', ok: /[^a-zA-Z0-9]/.test(newPw) },
    ];

    return (
        <div className="prof-settings">
            {/* Avatar */}
            <div className="prof-settings-section">
                <p className="prof-settings-label">profile picture</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Avatar user={currentUser} size={64} editable onUpload={handleSaveAvatar} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                        jpeg or png, max 512 kb
                    </p>
                </div>
            </div>

            {/* Username */}
            <form className="prof-settings-section" onSubmit={onSaveUsername}>
                <p className="prof-settings-label">change username</p>
                <div className="prof-settings-row">
                    <div className="prof-settings-input-wrap">
                        <input
                            className={`prof-settings-input${usernameErr ? ' input-error' : usernameOk ? ' input-success' : ''}`}
                            placeholder={`current: ${currentUser?.username ?? ''}`}
                            value={newUsername}
                            onChange={e => onUsernameChange(e.target.value)}
                            autoComplete="username"
                        />
                        {usernameAvail === true && !usernameErr && <span className="prof-input-tick">✓</span>}
                        {usernameErr && <span className="prof-input-cross">✗</span>}
                    </div>
                    {usernameErr && <p className="prof-settings-error">{usernameErr}</p>}
                    {usernameSuccess && <p className="prof-settings-success">{usernameSuccess}</p>}
                    <button type="submit" className="prof-settings-save" disabled={!!usernameErr || !newUsername || usernameSaving}>
                        {usernameSaving ? 'saving…' : 'update username'}
                    </button>
                </div>
            </form>

            {/* Password */}
            <form className="prof-settings-section" onSubmit={onSavePassword}>
                <p className="prof-settings-label">change password</p>
                <div className="prof-settings-row">
                    <input
                        className="prof-settings-input"
                        type={showPw ? 'text' : 'password'}
                        placeholder="current password"
                        value={currentPw}
                        onChange={e => { setCurrentPw(e.target.value); setPwErr(''); }}
                        autoComplete="current-password"
                    />
                    <div className="prof-settings-input-wrap">
                        <input
                            className={`prof-settings-input${newPw && validatePassword(newPw) ? ' input-error' : newPw && !validatePassword(newPw) ? ' input-success' : ''}`}
                            type={showPw ? 'text' : 'password'}
                            placeholder="new password"
                            value={newPw}
                            onChange={e => { setNewPw(e.target.value); setPwErr(''); }}
                            autoComplete="new-password"
                        />
                    </div>
                    <input
                        className={`prof-settings-input${confirmPw && confirmPw !== newPw ? ' input-error' : confirmPw && confirmPw === newPw && !validatePassword(newPw) ? ' input-success' : ''}`}
                        type={showPw ? 'text' : 'password'}
                        placeholder="confirm new password"
                        value={confirmPw}
                        onChange={e => { setConfirmPw(e.target.value); setPwErr(''); }}
                        autoComplete="new-password"
                    />
                    {newPw && (
                        <div className="prof-pw-rules">
                            {pwRules.map(r => (
                                <span key={r.label} className={`prof-pw-rule ${r.ok ? 'ok' : 'fail'}`}>
                                    {r.ok ? '✓' : '✗'} {r.label}
                                </span>
                            ))}
                        </div>
                    )}
                    {pwErr && <p className="prof-settings-error">{pwErr}</p>}
                    {pwSuccess && <p className="prof-settings-success">{pwSuccess}</p>}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button type="submit" className="prof-settings-save" disabled={pwSaving}>
                            {pwSaving ? 'saving…' : 'update password'}
                        </button>
                        <button type="button" className="prof-settings-toggle" onClick={() => setShowPw(v => !v)}>
                            {showPw ? 'hide' : 'show'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

/* ---------- Achievements tab ---------- */
const MOCK_ACHIEVEMENTS = [
    { id: 'first_solve', icon: '⚡', title: 'First Blood', desc: 'Solve your first problem', unlocked: true },
    { id: 'win_game', icon: '🏆', title: 'Champion', desc: 'Win a multiplayer game', unlocked: false },
    { id: 'solve_10', icon: '📚', title: 'Grinder', desc: 'Solve 10 problems', unlocked: false },
    { id: 'solve_hard', icon: '🔥', title: 'Hard Mode', desc: 'Solve a hard problem', unlocked: false },
    { id: 'play_5', icon: '🎮', title: 'Regular', desc: 'Play 5 games', unlocked: false },
    { id: 'fast_solve', icon: '⏱', title: 'Speed Demon', desc: 'Solve a problem in under 2 minutes', unlocked: false },
];

const AchievementsPanel = ({ submissions, games }) => {
    const solvedCount = Object.values(
        submissions.reduce((acc, s) => { if (s.passed && s.problem?.id) acc[s.problem.id] = true; return acc; }, {})
    ).length;
    const wonGame = games.some(g => g.teams.some(t => t.isWinner));
    const solvedHard = submissions.some(s => s.passed && s.problem?.difficulty === 'HARD');
    const playedGames = games.length;

    const isUnlocked = (id) => {
        switch (id) {
            case 'first_solve': return solvedCount >= 1;
            case 'win_game': return wonGame;
            case 'solve_10': return solvedCount >= 10;
            case 'solve_hard': return solvedHard;
            case 'play_5': return playedGames >= 5;
            default: return false;
        }
    };

    return (
        <div className="prof-achievements">
            <div className="prof-achievements-note">achievements are coming soon — here's a preview of what's planned.</div>
            <div className="prof-achievements-grid">
                {MOCK_ACHIEVEMENTS.map(a => {
                    const unlocked = isUnlocked(a.id);
                    return (
                        <div key={a.id} className={`prof-achievement${unlocked ? ' unlocked' : ''}`}>
                            <span className="prof-achievement-icon">{a.icon}</span>
                            <span className="prof-achievement-title">{a.title}</span>
                            <span className="prof-achievement-desc">{a.desc}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ---------- Activity feed ---------- */
const FeedItem = ({ item }) => {
    const navigate = useNavigate();

    if (item.kind === 'problem') {
        const solved = item.status === 'PASSED';
        return (
            <div className="feed-item">
                <div className="feed-item-left">
                    <DiffStars difficulty={item.difficulty} />
                    <span className="feed-item-title">{item.title}</span>
                    <span className={`prof-badge ${solved ? 'badge-solved' : 'badge-attempted'}`}>
                        {solved ? 'solved' : (STATUS_LABEL[item.status] ?? 'attempted')}
                    </span>
                </div>
                <span className="feed-item-date">{fmtDate(item.ts)}</span>
            </div>
        );
    }

    if (item.kind === 'game') {
        const verdictClass = item.noWinner ? 'draw' : (item.won ? 'won' : 'lost');
        const verdictText  = item.noWinner ? 'draw' : (item.won ? 'victory' : 'defeat');
        return (
            <div className="feed-item feed-item-clickable" onClick={() => navigate(`/game/${item.id}/results`)}>
                <div className="feed-item-left">
                    <span className="feed-item-tag">{item.layout}</span>
                    <span className="feed-item-teams">
                        {item.teamGroups.map((grp, gi) => (
                            <React.Fragment key={gi}>
                                {gi > 0 && <span className="feed-vs">vs</span>}
                                {grp.players.map((p, pi) => (
                                    <Link key={pi} to={`/profile/${p.username}`} className="feed-avatar"
                                        style={{ background: grp.color }} onClick={e => e.stopPropagation()} title={p.username}>
                                        {p.initial}
                                    </Link>
                                ))}
                            </React.Fragment>
                        ))}
                    </span>
                    <span className={`games-verdict ${verdictClass}`}>{verdictText}</span>
                    {item.score != null && <span className="feed-item-score">+{item.score} xp</span>}
                </div>
                <span className="feed-item-date">{fmtDate(item.ts)}</span>
            </div>
        );
    }
    return null;
};

const buildFeed = (submissions, games, currentUserId) => {
    const items = [];
    const byProblem = {};
    for (const s of submissions) {
        const pid = s.problem?.id;
        if (!pid) continue;
        if (!byProblem[pid] || s.createdAt > byProblem[pid].createdAt) byProblem[pid] = s;
    }
    for (const s of Object.values(byProblem)) {
        items.push({ kind: 'problem', id: s.problem.id, title: s.problem.title, difficulty: s.problem.difficulty, status: s.status, ts: s.createdAt });
    }
    for (const g of games) {
        const myTeam = g.teams.find(t => t.players.some(p => p.player.id === currentUserId));
        const noWinner = !g.teams.some(t => t.isWinner);
        const won = myTeam?.isWinner;
        const opponents = g.teams.filter(t => t.id !== myTeam?.id);
        const orderedTeams = myTeam ? [myTeam, ...opponents] : g.teams;
        const teamGroups = orderedTeams.map((t, i) => ({
            color: TEAM_COLORS[i % TEAM_COLORS.length],
            players: t.players.map(p => ({ initial: p.player.username[0].toUpperCase(), username: p.player.username })),
        }));
        items.push({
            kind: 'game', id: g.id,
            layout: `${myTeam?.players.length ?? 0}v${opponents.map(t => t.players.length).join('v')}`,
            teamGroups, won, noWinner,
            score: myTeam?.score ?? 0,
            ts: g.endedAt ?? g.createdAt,
        });
    }
    return items.sort((a, b) => (b.ts ?? '').localeCompare(a.ts ?? ''));
};

/* ---------- Overview panel ---------- */
const OverviewPanel = ({ submissions, allProblems, games, activeGames, currentUser, displayUser, isSelf }) => {
    const navigate = useNavigate();

    const byProblem = submissions.reduce((acc, s) => {
        const pid = s.problem?.id ?? 'unknown';
        if (!acc[pid]) acc[pid] = { problem: s.problem, subs: [] };
        acc[pid].subs.push(s);
        return acc;
    }, {});
    const problemGroups = Object.values(byProblem);
    const totalsByDiff = allProblems.reduce((acc, p) => { acc[p.difficulty] = (acc[p.difficulty] ?? 0) + 1; return acc; }, { EASY: 0, MEDIUM: 0, HARD: 0 });
    const solvedByDiff = problemGroups.reduce((acc, g) => {
        if (g.subs.some(s => s.passed) && g.problem?.difficulty) acc[g.problem.difficulty] = (acc[g.problem.difficulty] ?? 0) + 1;
        return acc;
    }, { EASY: 0, MEDIUM: 0, HARD: 0 });
    const totalSolved = solvedByDiff.EASY + solvedByDiff.MEDIUM + solvedByDiff.HARD;
    const totalProblems = totalsByDiff.EASY + totalsByDiff.MEDIUM + totalsByDiff.HARD;
    const totalSubmissions = submissions.length;
    const passedSubmissions = submissions.filter(s => s.passed).length;
    const passRate = totalSubmissions > 0 ? Math.round((passedSubmissions / totalSubmissions) * 100) + '%' : '—';

    const activity = buildActivity(submissions);
    const maxActivity = Math.max(1, ...activity);
    const feed = buildFeed(submissions, games, displayUser?.id ?? currentUser?.id);

    return (
        <div className="prof-overview">
            <div className="prof-stats-row">
                <div className="prof-stat">
                    <span className="prof-stat-value">{totalSolved || '—'}{totalProblems > 0 && <span className="prof-stat-suffix"> / {totalProblems}</span>}</span>
                    <span className="prof-stat-label">solved</span>
                </div>
                <div className="prof-stat">
                    <span className="prof-stat-value">{totalSubmissions || '—'}</span>
                    <span className="prof-stat-label">submissions</span>
                </div>
                <div className="prof-stat">
                    <span className="prof-stat-value">{passRate}</span>
                    <span className="prof-stat-label">pass rate</span>
                </div>
                <div className="prof-stat">
                    <span className="prof-stat-value">{games.length || '—'}</span>
                    <span className="prof-stat-label">games</span>
                </div>
            </div>

            <div className="prof-section">
                <p className="prof-section-title">activity · last 30 days</p>
                <div className="activity-strip">
                    {activity.map((c, i) => {
                        const intensity = c === 0 ? 0 : 0.2 + (c / maxActivity) * 0.8;
                        return (
                            <div key={i} className="activity-cell"
                                style={{ background: c === 0 ? 'var(--border)' : `color-mix(in srgb, var(--accent) ${intensity * 100}%, transparent)` }}
                                title={c > 0 ? `${c} submission${c > 1 ? 's' : ''}` : 'no activity'}
                            />
                        );
                    })}
                </div>
            </div>

            {isSelf && activeGames.length > 0 && (
                <div className="prof-section">
                    <p className="prof-section-title">active games</p>
                    <div className="prof-list">
                        {activeGames.map(game => {
                            const vs = game.teams.map(t => t.teamName).join(' vs ');
                            const elapsed = game.startedAt ? Math.floor((Date.now() - new Date(game.startedAt)) / 1000) : 0;
                            const remaining = Math.max(0, game.timeLimitSeconds - elapsed);
                            const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
                            const ss = String(remaining % 60).padStart(2, '0');
                            return (
                                <div key={game.id} className="prof-row prof-row-clickable" onClick={() => navigate(`/game/${game.id}`)}>
                                    <span className="feed-item-tag" style={{ color: 'var(--accent)' }}>live</span>
                                    <span className="prof-row-main">{vs}</span>
                                    <span style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem' }}>{mm}:{ss}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="prof-section">
                <p className="prof-section-title">activity</p>
                {feed.length === 0 ? (
                    <div className="prof-empty">no activity yet</div>
                ) : (
                    <div className="prof-list">
                        {feed.map((item, i) => <FeedItem key={i} item={item} />)}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ---------- Follow button ---------- */
const FollowButton = ({ token, username, isSelf }) => {
    const [following, setFollowing] = useState(null);
    const [followers, setFollowers] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isSelf || !token || !username) return;
        Promise.all([
            gql(token, `query($u:String!){isFollowing(targetUsername:$u)}`, { u: username }),
            gql(token, `query($u:String!){followerCount(username:$u)}`, { u: username }),
        ]).then(([fr, cr]) => {
            setFollowing(fr.data?.isFollowing ?? false);
            setFollowers(cr.data?.followerCount ?? 0);
            setLoading(false);
        });
    }, [token, username, isSelf]);

    const toggle = async () => {
        setLoading(true);
        const mutation = following ? 'unfollowUser' : 'followUser';
        await gql(token, `mutation($u:String!){${mutation}(username:$u)}`, { u: username });
        setFollowing(f => !f);
        setFollowers(c => following ? c - 1 : c + 1);
        setLoading(false);
    };

    if (isSelf || loading) return null;

    return (
        <div className="prof-follow-row">
            <button className={`prof-follow-btn${following ? ' following' : ''}`} onClick={toggle} disabled={loading}>
                {following ? 'following' : 'follow'}
            </button>
            <span className="prof-follow-count">{followers} follower{followers !== 1 ? 's' : ''}</span>
        </div>
    );
};

/* ---------- Main ---------- */
const ProfilePage = () => {
    const { token, currentUser, submissions, fetchSubmissions, handleSaveAvatar } = useContext(AppContext);
    const location = useLocation();
    const { username } = useParams();
    const isSelf = !username || username === currentUser?.username;

    const [tab, setTab] = useState(() => new URLSearchParams(location.search).get('tab') || 'overview');
    const [allProblems, setAllProblems] = useState([]);
    const [games, setGames] = useState([]);
    const [activeGames, setActiveGames] = useState([]);
    const [otherUser, setOtherUser] = useState(null);
    const [otherSubmissions, setOtherSubmissions] = useState([]);
    const [otherGames, setOtherGames] = useState([]);
    const [loading, setLoading] = useState(!isSelf);

    useEffect(() => {
        const t = new URLSearchParams(location.search).get('tab');
        if (t && isSelf) setTab(t);
    }, [location.search, isSelf]);

    useEffect(() => { if (isSelf) fetchSubmissions(); }, [fetchSubmissions, isSelf]);
    useEffect(() => {
        if (!token || !isSelf) return;
        myFinishedGames(token).then(setGames).catch(() => setGames([]));
        myActiveGames(token)
            .then(gs => setActiveGames((gs ?? []).filter(g =>
                g.status === 'IN_PROGRESS' && g.startedAt && !g.endedAt &&
                g.teams.some(t => t.players.some(p => p.status === 'ACTIVE'))
            ))).catch(() => {});
    }, [token, isSelf]);

    useEffect(() => {
        if (!token || isSelf) return;
        setLoading(true);
        Promise.all([
            gql(token, `query($u:String!){userByUsername(username:$u){id username totalPoints createdAt avatarBase64 level xpForNextLevel}}`, { u: username }),
            gql(token, `query($u:String!){submissionsByUsername(username:$u){id status passed createdAt problem{id title difficulty}}}`, { u: username }),
            gql(token, `{myFinishedGames{id endedAt createdAt timeLimitSeconds teams{id teamName score isWinner players{id player{id username}status}}}}`),
        ]).then(([ud, sd, gd]) => {
            const u = ud.data?.userByUsername ?? null;
            setOtherUser(u);
            setOtherSubmissions(sd.data?.submissionsByUsername ?? []);
            const uid = u?.id;
            const allG = gd.data?.myFinishedGames ?? [];
            setOtherGames(allG.filter(g => g.teams.some(t => t.players.some(p => p.player.id === uid))));
        }).finally(() => setLoading(false));
    }, [token, username, isSelf]);

    useEffect(() => {
        if (!token) return;
        gql(token, `{problems{id difficulty type}}`)
            .then(d => setAllProblems((d.data?.problems ?? []).filter(p => p.type === 'CODING')));
    }, [token]);

    const displayUser = isSelf ? currentUser : otherUser;
    const displaySubmissions = isSelf ? submissions : otherSubmissions;
    const displayGames = isSelf ? games : otherGames;

    const xp = displayUser?.totalPoints ?? 0;
    const level = displayUser?.level ?? 0;
    const xpForNextLevel = displayUser?.xpForNextLevel ?? 100;
    const joined = displayUser?.createdAt
        ? new Date(displayUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase()
        : null;

    if (!isSelf && loading) return <div className="prof-loading">loading...</div>;
    if (!isSelf && !otherUser) return <div className="prof-loading">user not found</div>;

    const tabs = isSelf
        ? [{ id: 'overview', label: 'overview' }, { id: 'achievements', label: 'achievements' }, { id: 'settings', label: 'settings' }]
        : [{ id: 'overview', label: 'overview' }, { id: 'achievements', label: 'achievements' }];

    return (
        <div className="profile-page">
            <div className="profile-layout">
                <aside className="profile-sidebar">
                    <Avatar user={displayUser} size={64} editable={isSelf} onUpload={handleSaveAvatar} />
                    <p className="profile-username">{displayUser?.username}</p>
                    <LevelBar xp={xp} level={level} xpForNextLevel={xpForNextLevel} />
                    {joined && <p className="profile-joined">joined {joined}</p>}
                    <FollowButton token={token} username={displayUser?.username} isSelf={isSelf} />
                    <nav className="profile-nav">
                        {tabs.map(t => (
                            <button key={t.id} className={`profile-nav-item${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
                                {t.label}
                            </button>
                        ))}
                    </nav>
                </aside>
                <main className="profile-content">
                    {tab === 'overview' && (
                        <OverviewPanel
                            submissions={displaySubmissions}
                            allProblems={allProblems}
                            games={displayGames}
                            activeGames={activeGames}
                            currentUser={currentUser}
                            displayUser={displayUser}
                            isSelf={isSelf}
                        />
                    )}
                    {tab === 'achievements' && (
                        <AchievementsPanel submissions={displaySubmissions} games={displayGames} />
                    )}
                    {tab === 'settings' && isSelf && <SettingsPanel />}
                </main>
            </div>
        </div>
    );
};

export default ProfilePage;
