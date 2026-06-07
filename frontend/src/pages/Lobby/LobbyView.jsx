import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Plus, Crown, Users, User, ListChecks, Timer, Tag, LogOut, ChevronRight, Info } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import { fetchGame, switchTeam, leaveGame, startGame, updateGameSettings, sendChatMessage } from '../../game/api';
import { subscribeGame } from '../../game/socket';
import './Lobby.css';

/* ---------- Spinner glyph for ambient status ---------- */

const SPINNER_FRAMES = ['/', '—', '\\', '|'];
const useSpinner = (intervalMs = 150) => {
    const [i, setI] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setI(n => (n + 1) % SPINNER_FRAMES.length), intervalMs);
        return () => clearInterval(t);
    }, [intervalMs]);
    return SPINNER_FRAMES[i];
};

/* ---------- Deferred-removal hook (used for team/slot exit animations) ---------- */

const useDeferredRemoval = (items, getKey, animationMs = 350) => {
    const [rendered, setRendered] = useState(items);
    const [leaving, setLeaving] = useState(new Set());

    useEffect(() => {
        const currentKeys = new Set(items.map(getKey));
        const renderedKeys = rendered.map(getKey);
        const removed = renderedKeys.filter(k => !currentKeys.has(k));
        const added = items.filter(it => !rendered.some(r => getKey(r) === getKey(it)));

        if (added.length === 0 && removed.length === 0) {
            // Only call setRendered if anything actually changed (by reference) to avoid render loops
            const same = items.length === rendered.length
                && items.every((it, i) => it === rendered[i]);
            if (!same) setRendered(items);
            return;
        }

        // Add/remove: preserve rendered order, append new at end
        const merged = rendered.map(r => items.find(it => getKey(it) === getKey(r)) ?? r);
        const next = [...merged, ...added];
        setRendered(next);

        if (removed.length) {
            setLeaving(prev => {
                const n = new Set(prev);
                removed.forEach(k => n.add(k));
                return n;
            });
            const t = setTimeout(() => {
                setLeaving(prev => {
                    const n = new Set(prev);
                    removed.forEach(k => n.delete(k));
                    return n;
                });
                setRendered(prev => prev.filter(it => currentKeys.has(getKey(it))));
            }, animationMs);
            return () => clearTimeout(t);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    return { rendered, leaving };
};

/* ---------- Settings — UI mode ---------- */

const SettingsRow = ({ icon: Icon, label, value, editable, min, max, onChange, suffix }) => {
    const step = (delta) => {
        const n = Math.max(min, Math.min(max, value + delta));
        if (n !== value) onChange(n);
    };

    return (
        <div className="lobby-config-row">
            <span className="lobby-config-label">
                {Icon && <Icon size={13} className="lobby-config-icon" />}
                <span>{label}</span>
            </span>
            <span className="lobby-config-value-wrap">
                {editable ? (
                    <>
                        <button className="lobby-stepper-btn" onClick={() => step(-1)} disabled={value <= min}>−</button>
                        <span className="lobby-config-value">{value}{suffix}</span>
                        <button className="lobby-stepper-btn" onClick={() => step(1)} disabled={value >= max}>+</button>
                    </>
                ) : (
                    <span className="lobby-config-value">{value}{suffix}</span>
                )}
            </span>
        </div>
    );
};

/* ---------- Command parser ---------- */

const COMMAND_BOUNDS = {
    teams:   { min: 2, max: 5 },
    players: { min: 1, max: 5 },
    tasks:   { min: 1, max: 10 },
    time:    { min: 1, max: 60 },
};
const KNOWN_COMMANDS = Object.keys(COMMAND_BOUNDS);

const parseCommand = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return { error: 'empty input' };

    // Plain text → chat message
    if (!trimmed.startsWith('/')) return { chat: trimmed };

    const m = trimmed.match(/^\/(\w+)(?:\s+(.+))?$/s);
    if (!m) return { error: `unknown command: "${trimmed}"` };
    const key = m[1].toLowerCase();
    const val = m[2];

    if (!KNOWN_COMMANDS.includes(key)) {
        return { error: `unknown command: "/${key}"` };
    }

    if (val === undefined) {
        return { error: `/${key} needs a number, e.g. /${key} 3` };
    }

    const n = parseInt(val, 10);
    if (!Number.isFinite(n)) {
        return { error: `/${key} expects a number, got "${val}"` };
    }

    const { min, max } = COMMAND_BOUNDS[key];
    if (n < min || n > max) {
        return { error: `/${key} must be between ${min} and ${max}` };
    }

    if (key === 'teams') return { patch: { maxTeams: n } };
    if (key === 'players') return { patch: { maxPlayersPerTeam: n } };
    if (key === 'tasks') return { patch: { problemCount: n } };
    if (key === 'time') return { patch: { timeLimitSeconds: n * 60 } };
    return { error: `unknown command: "/${key}"` };
};

/* ---------- Teams ---------- */

const TEAM_COLORS = [
    'var(--accent)',     // team 0 — blue (matches theme accent)
    'var(--diff-easy)',  // team 1 — green
    'var(--diff-medium)',// team 2 — amber
    'var(--diff-hard)',  // team 3 — red/cherry
    '#a78bfa',           // team 4 — purple (fallback for theme-neutral 5th color)
];

const teamColor = (idx) => TEAM_COLORS[idx % TEAM_COLORS.length];

const TeamList = ({ teams, maxPlayers, currentUserId, hostId, onJoin }) => {
    const { rendered, leaving } = useDeferredRemoval(teams, t => t.id, 350);
    return (
        <div className="lobby-teams" style={{ '--team-count': rendered.length }}>
            {rendered.map((team, idx) => {
                const color = teamColor(idx);
                return (
                    <div
                        key={team.id}
                        className={`lobby-team-row${leaving.has(team.id) ? ' leaving' : ''}`}
                        style={{ '--team-color': color }}
                    >
                        <div className="lobby-team-head">
                            <span className="lobby-team-tag">[ team {idx} ]</span>
                            <span className="lobby-team-count">{team.players.length}/{maxPlayers}</span>
                        </div>
                        <div
                            className="lobby-team-slots"
                            style={{ '--max-players': maxPlayers }}
                        >
                            {team.players.map(p => (
                                <div key={p.id} className="lobby-slot-wrap">
                                    <div
                                        className={`lobby-slot lobby-slot-filled${p.player.id === currentUserId ? ' me' : ''}`}
                                        title={p.player.username}
                                    >
                                        <span className="lobby-slot-initial">{p.player.username[0].toUpperCase()}</span>
                                        {p.player.id === hostId && <Crown size={10} className="lobby-host-crown" />}
                                    </div>
                                    <span className="lobby-slot-name">{p.player.username}</span>
                                </div>
                            ))}
                            <RenderEmptySlots
                                count={Math.max(0, maxPlayers - team.players.length)}
                                onJoin={() => onJoin(team.id)}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const RenderEmptySlots = ({ count, onJoin }) => (
    Array.from({ length: count }, (_, i) => (
        <div key={`empty-${i}`} className="lobby-slot-wrap">
            <button
                className="lobby-slot lobby-slot-empty"
                onClick={onJoin}
                title="join this team"
            >
                <Plus size={14} />
            </button>
            <span className="lobby-slot-name">&nbsp;</span>
        </div>
    ))
);

/* ---------- Top bar + strip action ---------- */

const StripAction = ({ isHost, canStart, startHint, onStart }) => {
    const spin = useSpinner();
    return (
        <div className="lobby-strip-action">
            {isHost ? (
                <>
                    <button className="lobby-start" onClick={onStart} disabled={!canStart}>
                        <span>start</span><ChevronRight size={16} />
                    </button>
                    <span className="lobby-bar-status">
                        {startHint ? (
                            <><span className="lobby-status-dot warn" /> {startHint}</>
                        ) : (
                            <><span className="lobby-status-dot ok" /> ready to launch</>
                        )}
                    </span>
                </>
            ) : (
                <span className="lobby-bar-status">
                    <span className="lobby-spinner">{spin}</span> waiting for host...
                </span>
            )}
        </div>
    );
};

const TopBar = ({ game, copied, onCopyCode, onLeave, isHost, settings }) => {
    return (
        <div className="lobby-bar lobby-bar-top">
            <div className="lobby-bar-left">
                {settings}
            </div>

            <div className="lobby-bar-right">
                <button className="lobby-code-pill" onClick={onCopyCode} title="copy invite code">
                    <Copy size={12} />
                    <span className="lobby-code-text">{copied ? 'copied' : game.inviteCode}</span>
                </button>
                <span className="lobby-bar-host">host:&nbsp;<strong>{game.host.username}</strong></span>
                <button className="lobby-leave-icon" onClick={onLeave} title="leave room">
                    <LogOut size={14} />
                </button>
            </div>
        </div>
    );
};


/* ---------- Activity log ---------- */

const formatTime = (ts) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const COMMAND_REFERENCE_HOST = [
    { cmd: '/teams N',   desc: 'set the number of teams (2–5)' },
    { cmd: '/players N', desc: 'set players per team (1–5)' },
    { cmd: '/tasks N',   desc: 'set the number of tasks (1–10)' },
    { cmd: '/time N',    desc: 'set the time limit in minutes (1–60)' },
];

const COMMAND_REFERENCE_GUEST = [];

const ActivityLog = ({ entries, canType, onSubmit, isHost, stripAction }) => {
    const reference = isHost ? COMMAND_REFERENCE_HOST : COMMAND_REFERENCE_GUEST;
    const [draft, setDraft] = useState('');
    const [history, setHistory] = useState([]);
    const [historyIdx, setHistoryIdx] = useState(-1);
    const [helpOpen, setHelpOpen] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [entries]);

    const submit = (e) => {
        e?.preventDefault?.();
        const cmd = draft.trim();
        if (!cmd) return;
        onSubmit(cmd);
        setHistory(h => [cmd, ...h].slice(0, 50));
        setHistoryIdx(-1);
        setDraft('');
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const next = Math.min(historyIdx + 1, history.length - 1);
            if (next >= 0 && history[next] !== undefined) {
                setHistoryIdx(next);
                setDraft(history[next]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = historyIdx - 1;
            if (next < 0) {
                setHistoryIdx(-1);
                setDraft('');
            } else {
                setHistoryIdx(next);
                setDraft(history[next]);
            }
        }
    };

    return (
        <div className="lobby-log">
            <div className="lobby-log-scroll" ref={scrollRef}>
                {entries.length === 0 ? (
                    <div className="lobby-log-empty">waiting for players to join</div>
                ) : entries.map(e => (
                    <div key={e.id} className={`lobby-log-line${e.kind ? ' lobby-log-' + e.kind : ''}`}>
                        <span className="lobby-log-line-prefix">
                            <span className="lobby-log-bracket">[</span>
                            <span className="lobby-log-time">{formatTime(e.ts)}</span>
                            {e.kind === 'cmd' && <span className="lobby-log-arrow"> ›</span>}
                        </span>
                        <span className="lobby-log-line-body">
                            {e.kind === 'chat' ? (
                                <>
                                    <span
                                        className="lobby-log-chat-user"
                                        style={{ color: e.teamColor || 'var(--accent)' }}
                                    >{e.username}:</span>{' '}
                                    <span className="lobby-log-chat-text">{e.text}</span>
                                </>
                            ) : (
                                <span className="lobby-log-msg">{e.msg}</span>
                            )}
                        </span>
                        <span className="lobby-log-bracket lobby-log-bracket-end">]</span>
                    </div>
                ))}
            </div>

            {helpOpen && (
                <div className="lobby-log-help">
                    {reference.map(c => (
                        <div key={c.cmd} className="lobby-log-help-row">
                            <span className="lobby-log-help-cmd">{c.cmd}</span>
                            <span className="lobby-log-help-desc">{c.desc}</span>
                        </div>
                    ))}
                </div>
            )}

            {canType && (
                <form className="lobby-log-prompt" onSubmit={submit}>
                    <span className="lobby-log-arrow">›</span>
                    <input
                        type="text"
                        className="lobby-log-input"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder=""
                        spellCheck={false}
                        autoComplete="off"
                    />
                    {reference.length > 0 && (
                        <button
                            type="button"
                            className={`lobby-log-help-btn${helpOpen ? ' active' : ''}`}
                            onClick={() => setHelpOpen(o => !o)}
                            title="show commands"
                        >
                            <Info size={14} />
                        </button>
                    )}
                </form>
            )}
            {stripAction && (
                <div className="lobby-log-footer">{stripAction}</div>
            )}
        </div>
    );
};

/* ---------- Main ---------- */

const LobbyView = ({ gameId, onLeave }) => {
    const navigate = useNavigate();
    const { token, currentUser, showToast } = useContext(AppContext);
    const [game, setGame] = useState(null);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [log, setLog] = useState([]);
    const prevGameRef = useRef(null);
    const pushVersionRef = useRef(0);
    const leftRef = useRef(false);

    // Confirm before navigating away if the user is the host of a WAITING room with other players in it.
    const { setNavGuard, showConfirm } = useContext(AppContext);
    const totalPlayers = game?.teams?.reduce((sum, t) => sum + t.players.length, 0) ?? 0;
    const isHostOfWaiting = game?.host?.id === currentUser?.id && game?.status === 'WAITING';
    const shouldConfirmLeave = isHostOfWaiting && totalPlayers > 1;
    useEffect(() => {
        if (!shouldConfirmLeave) {
            setNavGuard(null);
            return;
        }
        const guard = async () => {
            if (leftRef.current) return true;
            const ok = await showConfirm({
                title: 'close the room?',
                message: 'leaving now will close the room for everyone in it.',
                confirmLabel: 'leave',
                cancelLabel: 'stay',
                kind: 'danger',
            });
            if (ok) {
                leftRef.current = true;
                leaveGame(token, gameId).catch(() => {});
                return true;
            }
            return false;
        };
        setNavGuard(guard);
        return () => setNavGuard(null);
    }, [shouldConfirmLeave, token, gameId, setNavGuard, showConfirm]);

    const appendLog = useCallback((msg, kind) => {
        setLog(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, ts: Date.now(), msg, kind }].slice(-50));
    }, []);

    const runCommand = useCallback((raw) => {
        const parsed = parseCommand(raw);
        if (parsed.chat !== undefined) {
            // chat is its own log entry from the broadcast — don't echo locally
            sendChatMessage(token, gameId, parsed.chat).catch(e => appendLog(e.message, 'err'));
            return;
        }
        if (parsed.error) {
            appendLog(raw, 'cmd');
            appendLog(parsed.error, 'err');
            return;
        }
        // slash commands require host
        const isHostNow = game?.host?.id === currentUser?.id;
        if (!isHostNow) {
            appendLog(raw, 'cmd');
            appendLog('only the host can change settings', 'err');
            return;
        }
        appendLog(raw, 'cmd');
        updateGameSettings(token, gameId, parsed.patch).then(setGame).catch(e => appendLog(e.message, 'err'));
    }, [appendLog, token, gameId, game, currentUser]);

    // Generate log entries by diffing game snapshots
    useEffect(() => {
        if (!game) return;
        const prev = prevGameRef.current;
        prevGameRef.current = game;
        if (!prev) {
            setLog(prevLog => [...prevLog, { id: Date.now(), ts: Date.now(), msg: `room created with code ${game.inviteCode}` }]);
            return;
        }
        const entries = [];
        const stamp = () => ({ id: `${Date.now()}-${Math.random()}`, ts: Date.now() });
        if (prev.maxTeams !== game.maxTeams) entries.push({ ...stamp(), msg: `teams = ${game.maxTeams}` });
        if (prev.maxPlayersPerTeam !== game.maxPlayersPerTeam) entries.push({ ...stamp(), msg: `players = ${game.maxPlayersPerTeam}` });
        if (prev.problems.length !== game.problems.length) entries.push({ ...stamp(), msg: `tasks = ${game.problems.length}` });
        if (prev.timeLimitSeconds !== game.timeLimitSeconds) entries.push({ ...stamp(), msg: `time = ${Math.round(game.timeLimitSeconds / 60)}m` });

        const prevPlayersByTeam = new Map(prev.teams.map(t => [t.id, new Set(t.players.map(p => p.player.id))]));
        const newPlayersByTeam = new Map(game.teams.map(t => [t.id, new Set(t.players.map(p => p.player.id))]));
        game.teams.forEach((t, idx) => {
            const before = prevPlayersByTeam.get(t.id) ?? new Set();
            const after = newPlayersByTeam.get(t.id);
            t.players.forEach(p => {
                if (!before.has(p.player.id)) {
                    entries.push({ ...stamp(), msg: `${p.player.username} joined team ${idx}` });
                }
            });
            before.forEach(uid => {
                if (!after.has(uid)) {
                    const prevPlayer = prev.teams.flatMap(t2 => t2.players).find(p => p.player.id === uid);
                    if (prevPlayer) {
                        // skip if they moved to another team — captured by the join
                        const movedTo = game.teams.find(t2 => t2.players.some(p => p.player.id === uid));
                        if (!movedTo) {
                            entries.push({ ...stamp(), msg: `${prevPlayer.player.username} left` });
                        }
                    }
                }
            });
        });

        if (entries.length) setLog(prev => [...prev, ...entries].slice(-30));
    }, [game]);

    const refresh = useCallback(async () => {
        try {
            const g = await fetchGame(token, gameId);
            setGame(g);
            if (g.status === 'IN_PROGRESS') navigate(`/game/${gameId}`);
            if (g.status === 'FINISHED') navigate(`/game/${gameId}/results`);
            if (g.status === 'CANCELLED') {
                const isHost = g.host.id === currentUser?.id;
                if (!isHost) showToast('the host left and the room was closed', 'warning');
                // If we triggered the leave ourselves, let the original navigation proceed.
                if (leftRef.current) return;
                if (onLeave) onLeave();
                else navigate('/forge');
            }
        } catch (e) {
            setError(e.message);
        }
    }, [token, gameId, navigate, currentUser, showToast, onLeave]);

    useEffect(() => { refresh(); }, [refresh]);
    useEffect(() => subscribeGame(gameId, (event) => {
        if (event?.type === 'CHAT') {
            const color = teamColor(event.teamIndex ?? 0);
            setLog(prev => [...prev, {
                id: `${event.ts}-${Math.random()}`,
                ts: new Date(event.ts).getTime(),
                kind: 'chat',
                username: event.username,
                text: event.text,
                teamColor: color,
            }].slice(-50));
            return;
        }
        // default: STATE_CHANGED — refetch
        refresh();
    }), [gameId, refresh]);

    // Auto-leave on tab close / refresh / pagehide so the host's lobby updates.
    useEffect(() => {
        if (!token || !gameId) return;
        const sendLeave = () => {
            if (leftRef.current) return;
            leftRef.current = true;
            const body = JSON.stringify({
                query: `mutation($g: ID!) { leaveGame(gameId: $g) { id } }`,
                variables: { g: gameId },
            });
            fetch('http://localhost:8080/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body,
                keepalive: true,
            }).catch(() => {});
        };
        window.addEventListener('beforeunload', sendLeave);
        window.addEventListener('pagehide', sendLeave);
        return () => {
            window.removeEventListener('beforeunload', sendLeave);
            window.removeEventListener('pagehide', sendLeave);
        };
    }, [token, gameId]);

    if (error) return <div className="lobby-error">{error}</div>;
    if (!game) return <div className="lobby-loading">loading...</div>;

    const isHost = game.host.id === currentUser?.id;
    const myTeam = game.teams.find(t => t.players.some(p => p.player.id === currentUser?.id));
    const teamsWithAtLeastOne = game.teams.filter(t => t.players.length > 0).length;
    const canStart = isHost && teamsWithAtLeastOne >= game.teams.length;
    const startHint = teamsWithAtLeastOne < game.teams.length
        ? 'every team needs at least one player'
        : null;

    const copyCode = () => {
        navigator.clipboard.writeText(game.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleSwitchTeam = async (teamId) => {
        if (myTeam?.id === teamId) return;
        try {
            const updated = await switchTeam(token, gameId, teamId);
            setGame(updated);
        } catch (e) { setError(e.message); }
    };

    const handleLeave = async () => {
        leftRef.current = true;
        await leaveGame(token, gameId);
        if (onLeave) onLeave();
        else navigate('/forge');
    };

    const handleStart = async () => {
        try { await startGame(token, gameId); }
        catch (e) { setError(e.message); }
    };

    const pushSettings = (patch) => {
        const version = ++pushVersionRef.current;
        return updateGameSettings(token, gameId, patch)
            .then(g => {
                // Only apply if this is still the most recent push
                if (version === pushVersionRef.current) setGame(g);
            })
            .catch(e => setError(e.message));
    };

    return (
        <div className="lobby-window">
            <TopBar
                game={game}
                copied={copied}
                onCopyCode={copyCode}
                onLeave={handleLeave}
                settings={
                    <>
                        <SettingsRow
                            icon={Users}
                            label="teams"
                            value={game.maxTeams}
                            editable={isHost}
                            min={2} max={5}
                            onChange={v => pushSettings({ maxTeams: v })}
                        />
                        <SettingsRow
                            icon={User}
                            label="players per team"
                            value={game.maxPlayersPerTeam}
                            editable={isHost}
                            min={1} max={5}
                            onChange={v => {
                                setGame(g => ({ ...g, maxPlayersPerTeam: v }));
                                pushSettings({ maxPlayersPerTeam: v });
                            }}
                        />
                        <SettingsRow
                            icon={ListChecks}
                            label="tasks"
                            value={game.problems.length}
                            editable={isHost}
                            min={1} max={10}
                            onChange={v => pushSettings({ problemCount: v })}
                        />
                        <SettingsRow
                            icon={Timer}
                            label="time limit"
                            value={Math.round(game.timeLimitSeconds / 60)}
                            editable={isHost}
                            min={1} max={60}
                            suffix="m"
                            onChange={v => {
                                setGame(g => ({ ...g, timeLimitSeconds: v * 60 }));
                                pushSettings({ timeLimitSeconds: v * 60 });
                            }}
                        />
                    </>
                }
            />

            <div className="lobby-window-body">
                <div className="lobby-pane lobby-pane-teams">
                    <TeamList
                        teams={game.teams}
                        maxPlayers={game.maxPlayersPerTeam}
                        currentUserId={currentUser?.id}
                        hostId={game.host.id}
                        onJoin={handleSwitchTeam}
                    />
                </div>
                <ActivityLog
                    entries={log}
                    canType={true}
                    onSubmit={runCommand}
                    isHost={isHost}
                    stripAction={<StripAction isHost={isHost} canStart={canStart} startHint={startHint} onStart={handleStart} />}
                />
            </div>
        </div>
    );
};

export default LobbyView;
