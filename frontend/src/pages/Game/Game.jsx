import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { AppContext } from '../../context/AppContext';
import { fetchGame, submitGameSolution, finishGame, sendChatMessage } from '../../game/api';
import { subscribeGame } from '../../game/socket';
import Spinner from '../../components/Spinner/Spinner';
import './Game.css';
import '../Practice/Practice.css';

const TEAM_COLORS = [
    'var(--accent)',
    'var(--diff-easy)',
    'var(--diff-medium)',
    'var(--diff-hard)',
    '#a78bfa',
];
const teamColor = (idx) => TEAM_COLORS[idx % TEAM_COLORS.length];

const formatChatTime = (ts) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const STATUS_COLOR = {
    PASSED: 'var(--success)',
    TESTS_FAILED: 'var(--error)',
    COMPILE_ERROR: 'var(--error)',
    RUNTIME_ERROR: 'var(--error)',
    TIMEOUT: 'var(--error)',
    INVALID_SUBMISSION: 'var(--text-muted)',
    SYSTEM_ERROR: 'var(--text-muted)',
};

const PASS_QUIPS = ['clean run.', 'all tests green.', 'no failures.', 'looking good.', 'nice work.', 'ship it.', 'flawless.'];

const parseRunTime = (stdout) => {
    const m = stdout?.match(/Test run finished after (\d+) ms/);
    return m ? `${m[1]}ms` : null;
};

const ResultPanel = ({ result }) => {
    const color = STATUS_COLOR[result.status] || 'var(--text-muted)';
    const isPassed = result.status === 'PASSED';
    const quip = isPassed ? PASS_QUIPS[Math.floor(Math.random() * PASS_QUIPS.length)] : null;
    const runTime = parseRunTime(result.stdout);
    return (
        <div className="result-card" style={{ borderColor: color }}>
            <div className="result-status" style={{ color }}>{result.status.replace(/_/g, ' ')}</div>
            {isPassed && (
                <div className="result-meta">
                    {runTime && <span>{runTime}</span>}
                    <span className="result-quip">{quip}</span>
                </div>
            )}
            {!isPassed && result.stdout && (
                <div className="result-section">
                    <span className="result-label">stdout</span>
                    <pre className="result-pre">{result.stdout}</pre>
                </div>
            )}
            {result.stderr && (
                <div className="result-section">
                    <span className="result-label">stderr</span>
                    <pre className="result-pre result-pre--err">{result.stderr}</pre>
                </div>
            )}
        </div>
    );
};

const GRAPHQL_URL = 'http://localhost:8080/graphql';

const Game = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { token, currentUser, theme, showToast } = useContext(AppContext);
    const [game, setGame] = useState(null);
    const [problemIndex, setProblemIndex] = useState(0);
    const [descs, setDescs] = useState({});
    const [templates, setTemplates] = useState({});
    const [codeByProblem, setCodeByProblem] = useState({});
    const [result, setResult] = useState(null);
    const [running, setRunning] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [chatMessages, setChatMessages] = useState([]);
    const [chatDraft, setChatDraft] = useState('');
    const [chatHeight, setChatHeight] = useState(180);
    const [isChatDragging, setIsChatDragging] = useState(false);
    const chatStartYRef = useRef(0);
    const chatStartHeightRef = useRef(0);
    const chatScrollRef = useRef(null);
    const middleRef = useRef(null);

    const CHAT_MIN = 32;            // always at least the prompt row, never fully gone
    const DESC_MIN_FALLBACK = 160;  // fallback before desc content measures
    const RESIZE_HANDLE = 6;
    const descRef = useRef(null);
    const terminalPanelRef = useRef(null);

    // On mount, line up chat top with terminal top
    useEffect(() => {
        const align = () => {
            const tPanel = terminalPanelRef.current;
            const mCol = middleRef.current;
            if (!tPanel || !mCol) return;
            const tTop = tPanel.getBoundingClientRect().top;
            const mBottom = mCol.getBoundingClientRect().bottom;
            const newH = Math.max(CHAT_MIN, mBottom - tTop);
            setChatHeight(newH);
        };
        const id = requestAnimationFrame(align);
        return () => cancelAnimationFrame(id);
    }, []);

    const onChatDragStart = (e) => {
        setIsChatDragging(true);
        chatStartYRef.current = e.clientY;
        chatStartHeightRef.current = chatHeight;
    };

    useEffect(() => {
        const onMove = (e) => {
            if (!isChatDragging) return;
            const delta = chatStartYRef.current - e.clientY;
            const middleH = middleRef.current?.getBoundingClientRect().height ?? Infinity;
            // The visible inner height of the description (excluding padding) needs to fit content.
            const descEl = descRef.current;
            // scrollHeight includes content; offsetHeight is the visible box.
            // If content overflows the box, give the description enough room to show it.
            const contentNeeded = descEl
                ? Math.max(DESC_MIN_FALLBACK, descEl.scrollHeight + 4)
                : DESC_MIN_FALLBACK;
            // Don't let descMin exceed half the middle column — otherwise the user can't ever grow chat.
            const descMin = Math.min(contentNeeded, Math.max(DESC_MIN_FALLBACK, middleH * 0.5));
            const max = Math.max(CHAT_MIN, middleH - descMin - RESIZE_HANDLE);
            const next = Math.min(max, Math.max(CHAT_MIN, chatStartHeightRef.current + delta));
            setChatHeight(next);
        };
        const onUp = () => setIsChatDragging(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isChatDragging]);
    const [terminalHeight, setTerminalHeight] = useState(180);
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(0);

    const onTerminalDragStart = (e) => {
        setIsDragging(true);
        startYRef.current = e.clientY;
        startHeightRef.current = terminalHeight;
    };

    useEffect(() => {
        const onMove = (e) => {
            if (!isDragging) return;
            const delta = startYRef.current - e.clientY;
            setTerminalHeight(Math.max(0, startHeightRef.current + delta));
        };
        const onUp = () => setIsDragging(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isDragging]);

    const monacoTheme = theme === 'dark' ? 'dark-surface' : 'light-surface';

    const refresh = useCallback(async () => {
        const g = await fetchGame(token, gameId);
        const hostStillIn = g.teams.some(t => t.players.some(p => p.player.id === g.host.id));
        setGame(g);
        if (g.status === 'FINISHED') {
            const isHost = g.host.id === currentUser?.id;
            if (!isHost && !hostStillIn) {
                showToast('the host left and the game ended', 'warning');
            }
            navigate(`/game/${gameId}/results`);
        }
        if (g.status === 'WAITING') navigate(`/lobby/${gameId}`);
        if (g.status === 'CANCELLED') {
            if (g.host.id !== currentUser?.id) showToast('the host left and the room was closed', 'warning');
            navigate('/practice');
        }
    }, [token, gameId, navigate, currentUser, showToast]);

    useEffect(() => { refresh(); }, [refresh]);
    useEffect(() => subscribeGame(gameId, (event) => {
        if (event?.type === 'CHAT') {
            setChatMessages(prev => [...prev, {
                id: `${event.ts}-${Math.random()}`,
                ts: new Date(event.ts).getTime(),
                kind: 'chat',
                username: event.username,
                text: event.text,
                teamColor: teamColor(event.teamIndex ?? 0),
            }].slice(-100));
            return;
        }
        if (event?.type === 'ACTIVITY') {
            setChatMessages(prev => [...prev, {
                id: `${event.ts}-${Math.random()}`,
                ts: new Date(event.ts).getTime(),
                kind: 'activity',
                username: event.username,
                teamColor: teamColor(event.teamIndex ?? 0),
                problemTitle: event.problemTitle,
                problemIndex: event.problemIndex,
                passed: event.passed,
                points: event.points,
            }].slice(-100));
            refresh(); // also refresh state for scoreboard
            return;
        }
        refresh();
    }), [gameId, refresh]);

    useEffect(() => {
        if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }, [chatMessages]);

    const sendChat = (e) => {
        e?.preventDefault?.();
        const text = chatDraft.trim();
        if (!text) return;
        sendChatMessage(token, gameId, text).catch(() => {});
        setChatDraft('');
    };

    // load problem descriptions + templates once
    useEffect(() => {
        if (!game || !token) return;
        (async () => {
            const newDescs = {};
            const newTemplates = {};
            for (const gp of game.problems) {
                if (descs[gp.problem.id] !== undefined) continue;
                const r = await fetch(GRAPHQL_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ query: `{ problemById(id: "${gp.problem.id}") { files { filePath fileRole } } }` }),
                });
                const d = await r.json();
                const files = d.data?.problemById?.files ?? [];
                const desc = files.find(f => f.fileRole === 'DESCRIPTION');
                const tpl = files.find(f => f.fileRole === 'TEMPLATE');
                if (desc) {
                    const c = await fetch(GRAPHQL_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ query: `{ fileContent(path: "${desc.filePath}") }` }),
                    });
                    newDescs[gp.problem.id] = (await c.json()).data?.fileContent ?? '';
                }
                if (tpl) {
                    const c = await fetch(GRAPHQL_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ query: `{ fileContent(path: "${tpl.filePath}") }` }),
                    });
                    newTemplates[gp.problem.id] = (await c.json()).data?.fileContent ?? '';
                }
            }
            if (Object.keys(newDescs).length) setDescs(prev => ({ ...prev, ...newDescs }));
            if (Object.keys(newTemplates).length) {
                setTemplates(prev => ({ ...prev, ...newTemplates }));
                setCodeByProblem(prev => {
                    const next = { ...prev };
                    Object.entries(newTemplates).forEach(([id, tpl]) => {
                        if (!(id in next)) next[id] = tpl;
                    });
                    return next;
                });
            }
        })();
    }, [game, token, descs]);

    // ticker for timer
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    // auto-finish when time runs out
    useEffect(() => {
        if (!game || game.status !== 'IN_PROGRESS' || !game.startedAt) return;
        const elapsed = (Date.now() - new Date(game.startedAt).getTime()) / 1000;
        if (elapsed >= game.timeLimitSeconds && game.host.id === currentUser?.id) {
            finishGame(token, gameId).catch(() => {});
        }
    }, [game, now, currentUser, token, gameId]);

    if (!game) return <Spinner />;

    const myTeam = game.teams.find(t => t.players.some(p => p.player.id === currentUser?.id));
    const sortedProblems = [...game.problems].sort((a, b) => a.sortOrder - b.sortOrder);
    const currentGp = sortedProblems[problemIndex];
    const currentProblemId = currentGp?.problem.id;
    const code = codeByProblem[currentProblemId] ?? templates[currentProblemId] ?? '';

    const solvedSet = new Set();
    // Determining solved-per-team requires submissions data — for now, infer from team score by problem
    // We rely on the result-driven approach: when a submission passes, mark locally.
    if (result?.passed && currentProblemId) solvedSet.add(currentProblemId);

    const startedAtMs = game.startedAt ? new Date(game.startedAt).getTime() : now;
    const elapsedSec = Math.max(0, Math.floor((now - startedAtMs) / 1000));
    const remainingSec = Math.max(0, game.timeLimitSeconds - elapsedSec);
    const mm = Math.floor(remainingSec / 60);
    const ss = remainingSec % 60;
    const totalMm = Math.floor(game.timeLimitSeconds / 60);
    const totalSs = game.timeLimitSeconds % 60;

    const runTests = async () => {
        setRunning(true);
        setResult(null);
        try {
            const r = await submitGameSolution(token, gameId, currentProblemId, code);
            setResult(r);
        } catch (e) {
            setResult({ status: 'SYSTEM_ERROR', passed: false, stderr: e.message });
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="game-page">
            <div className="game-rail">
                <div className="game-timer">
                    {String(mm).padStart(1, '0')}:{String(ss).padStart(2, '0')}
                    <span className="game-timer-total">/{String(totalMm).padStart(1, '0')}:{String(totalSs).padStart(2, '0')}</span>
                </div>
                <div className="game-task-dots">
                    {sortedProblems.map((gp, i) => {
                        const isCur = i === problemIndex;
                        const isSolved = solvedSet.has(gp.problem.id);
                        const diff = gp.problem.difficulty;
                        return (
                            <button
                                key={gp.id}
                                className={`game-task-dot${isCur ? ' active' : ''}${isSolved ? ' solved' : ''}`}
                                onClick={() => { setProblemIndex(i); setResult(null); }}
                                title={gp.problem.title}
                                style={{ '--diff-color': `var(--diff-${diff.toLowerCase()})` }}
                            >
                                {isSolved ? '✓' : '×'}
                            </button>
                        );
                    })}
                </div>
                {myTeam && (
                    <div className="game-team-info">
                        <div className="game-team-label">{myTeam.teamName}</div>
                        <div className="game-team-score">{myTeam.score}</div>
                    </div>
                )}
            </div>

            <div className="game-middle" ref={middleRef}>
                <div
                    ref={descRef}
                    className={`game-desc${chatHeight === 0 ? ' chat-hidden' : ''}`}
                    style={{ height: `calc(100% - ${chatHeight}px)` }}
                >
                    <div className="game-desc-meta">task {problemIndex + 1} of {sortedProblems.length}</div>
                    <h1 className="game-desc-title">{currentGp?.problem.title}</h1>
                    <div className="game-desc-body">
                        <ReactMarkdown>{descs[currentProblemId] ?? ''}</ReactMarkdown>
                    </div>
                </div>

                <div className="game-chat-resize-handle" onMouseDown={onChatDragStart} />

                <div className="game-chat-embed" style={{ height: chatHeight }}>
                    <div className="game-chat-head">
                        <span>chat</span>
                    </div>
                    <div className="game-chat-scroll" ref={chatScrollRef}>
                        {chatMessages.map(m => {
                            if (m.kind === 'activity') {
                                return (
                                    <div key={m.id} className="game-chat-line game-chat-activity">
                                        <span className="game-chat-time">{formatChatTime(m.ts)}</span>
                                        <span className="game-chat-user" style={{ color: m.teamColor }}>{m.username}</span>
                                        <span className="game-chat-sep">›</span>
                                        <span className="game-chat-activity-text">
                                            {m.passed ? 'solved' : 'failed'}{' '}
                                            <span className="game-chat-activity-task">#{m.problemIndex + 1} {m.problemTitle}</span>
                                            {m.passed && m.points > 0 && <span className="game-chat-activity-points"> +{m.points}</span>}
                                        </span>
                                        <span className={`game-chat-activity-dot ${m.passed ? 'ok' : 'fail'}`} />
                                    </div>
                                );
                            }
                            return (
                                <div key={m.id} className="game-chat-line">
                                    <span className="game-chat-time">[{formatChatTime(m.ts)}</span>
                                    <span className="game-chat-user" style={{ color: m.teamColor }}>{m.username}:</span>
                                    <span className="game-chat-text">{m.text}</span>
                                    <span className="game-chat-bracket">]</span>
                                </div>
                            );
                        })}
                    </div>
                    <form className="game-chat-prompt" onSubmit={sendChat}>
                        <span className="game-chat-arrow">›</span>
                        <input
                            type="text"
                            className="game-chat-input"
                            value={chatDraft}
                            onChange={e => setChatDraft(e.target.value)}
                            placeholder=""
                            spellCheck={false}
                            autoComplete="off"
                            maxLength={500}
                        />
                    </form>
                </div>
            </div>

            <div className="game-right">
                <div className="game-editor-bar">
                    <span className="game-editor-label">solution.java</span>
                    <button className="game-run" onClick={runTests} disabled={running || !code.trim()}>
                        {running ? 'running...' : 'run tests'}
                    </button>
                </div>
                <div className="practice-editor-wrap">
                    <div className="editor-terminal-container">
                        <div
                            className="monaco-container"
                            style={{ height: `calc(100% - ${terminalHeight}px)` }}
                        >
                            {templates[currentProblemId] === undefined ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                    loading template...
                                </div>
                            ) : (
                                <Editor
                                    key={currentProblemId}
                                    height="100%"
                                    defaultLanguage="java"
                                    value={code}
                                    theme={monacoTheme}
                                    onChange={(v) => setCodeByProblem(prev => ({ ...prev, [currentProblemId]: v || '' }))}
                                    options={{ renderLineHighlight: 'none' }}
                                />
                            )}
                        </div>

                        <div className="terminal-resize-handle" onMouseDown={onTerminalDragStart} />

                        <div ref={terminalPanelRef} className="terminal-panel" style={{ height: terminalHeight }}>
                            <div className="terminal-header">
                                <span>submission</span>
                            </div>
                            <div className="terminal-content">
                                {running ? (
                                    <div className="terminal-running">
                                        <Spinner inline />
                                        <span>running tests</span>
                                    </div>
                                ) : result ? (
                                    <ResultPanel result={result} />
                                ) : (
                                    <div className="terminal-empty">no submission yet</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Game;
