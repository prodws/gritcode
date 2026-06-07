import React, { useContext, useState, useRef, useEffect } from 'react';
import { Navigate, useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { JavaOriginal } from 'devicons-react';
import { AppContext } from '../../context/AppContext';
import Spinner from '../../components/Spinner/Spinner';
import CodeBlock from '../../components/CodeBlock/CodeBlock';
import './Practice.css';

const STATUS_COLOR = {
    PASSED: 'var(--success)',
    TESTS_FAILED: 'var(--error)',
    COMPILE_ERROR: 'var(--error)',
    RUNTIME_ERROR: 'var(--error)',
    TIMEOUT: 'var(--error)',
    INVALID_SUBMISSION: 'var(--text-muted)',
    SYSTEM_ERROR: 'var(--text-muted)',
};

const PASS_QUIPS = [
    'clean run.',
    'all tests green.',
    'no failures.',
    'looking good.',
    'nice work.',
    'ship it.',
    'flawless.',
];

const parseRunTime = (stdout) => {
    const match = stdout?.match(/Test run finished after (\d+) ms/);
    return match ? `${match[1]}ms` : null;
};

const SubmissionResult = ({ result }) => {
    const color = STATUS_COLOR[result.status] || 'var(--text-muted)';
    const isPassed = result.status === 'PASSED';
    const quip = isPassed ? PASS_QUIPS[Math.floor(Math.random() * PASS_QUIPS.length)] : null;
    const runTime = parseRunTime(result.stdout);

    return (
        <div className="result-card" style={{ borderColor: color }}>
            <div className="result-status" style={{ color }}>
                {result.status.replace(/_/g, ' ')}
            </div>
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

const PracticePage = () => {
    const { problemId } = useParams();
    const {
        token,
        theme,
        currentProblem,
        goPracticeById,
        editorContent,
        setEditorContent,
        submissionResult,
        submissionLoading,
        handleSubmit,
        handleRun,
        submissions,
        fetchSubmissions,
    } = useContext(AppContext);

    // If we land directly on /solve/:problemId without state (e.g. refresh), load the problem
    useEffect(() => {
        if (problemId && (!currentProblem || String(currentProblem.id) !== String(problemId))) {
            goPracticeById(problemId);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [problemId]);

    const [activeTab, setActiveTab] = useState('description');
    const [commSolutions, setCommSolutions] = useState(null); // null = not loaded
    const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('editor-font-size') ?? '13', 10));

    const changeFontSize = (delta) => {
        setFontSize(prev => {
            const next = Math.max(10, Math.min(22, prev + delta));
            localStorage.setItem('editor-font-size', String(next));
            return next;
        });
    };

    useEffect(() => { fetchSubmissions(); }, [fetchSubmissions, submissionResult]);

    const isSolved = submissions.some(s => s.problem?.id === currentProblem?.id && s.passed);

    useEffect(() => {
        if (activeTab !== 'solutions' || !isSolved || !currentProblem?.id || !token) return;
        if (commSolutions !== null) return; // already loaded for this problem
        fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: `query($id:ID!){passedSubmissionsByProblem(problemId:$id){id code createdAt user{id username avatarBase64}}}`, variables: { id: currentProblem.id } }),
        }).then(r => r.json()).then(d => setCommSolutions(d.data?.passedSubmissionsByProblem ?? []));
    }, [activeTab, isSolved, currentProblem?.id, token, commSolutions]);

    // Reset community solutions when problem changes
    useEffect(() => { setCommSolutions(null); setActiveTab('description'); }, [currentProblem?.id]);

    const monacoTheme = theme === 'dark' ? 'dark-surface' : 'light-surface';

    const [terminalHeight, setTerminalHeight] = useState(180);
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(0);

    const onMouseDown = (e) => {
        setIsDragging(true);
        startYRef.current = e.clientY;
        startHeightRef.current = terminalHeight;
    };

    useEffect(() => {
        const onMouseMove = (e) => {
            if (!isDragging) return;
            const delta = startYRef.current - e.clientY;
            const newHeight = Math.max(0, startHeightRef.current + delta);
            setTerminalHeight(newHeight);
        };
        const onMouseUp = () => setIsDragging(false);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging]);

    if (!currentProblem) return problemId ? <Spinner /> : <Navigate to="/forge" replace />;

    const description = currentProblem?.description ?? '';
    const diff = currentProblem?.difficulty?.toLowerCase();

    return (
        <div className="practice-page">
            <div className="practice-topbar">
                <div className="practice-tabs">
                    <button
                        className={`practice-tab ${activeTab === 'description' ? 'active' : ''}`}
                        onClick={() => setActiveTab('description')}
                    >description</button>
                    <button
                        className={`practice-tab ${activeTab === 'submissions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('submissions')}
                    >submissions</button>
                    {isSolved && (
                        <button
                            className={`practice-tab ${activeTab === 'solutions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('solutions')}
                        >solutions</button>
                    )}
                </div>
            </div>
            <div className="practice-body">
                <div className="practice-left">
                    <div className="practice-problem-header">
                        <p className="practice-problem-title">{currentProblem?.title}</p>
                        {activeTab === 'description' && (
                            <div className="practice-badges">
                                <span className="practice-diff-stars" title={diff}>
                                    {['easy', 'medium', 'hard'].map((d, i) => (
                                        <span key={i} className={`star ${i < { easy: 1, medium: 2, hard: 3 }[diff] ? `filled ${diff}` : ''}`}>★</span>
                                    ))}
                                </span>
                            </div>
                        )}
                    </div>
                    {activeTab === 'description' && (
                        <div className="practice-desc"><ReactMarkdown>{description}</ReactMarkdown></div>
                    )}
                    {activeTab === 'submissions' && (
                        <div className="practice-subs">
                            {(() => {
                                const mine = submissions.filter(s => s.problem?.id === currentProblem.id);
                                if (mine.length === 0) {
                                    return <div className="practice-subs-empty">no submissions yet for this problem</div>;
                                }
                                return mine.map((s, i) => (
                                    <div key={s.id} className="practice-sub-row">
                                        <div className="practice-sub-head">
                                            <span className="practice-sub-num">#{mine.length - i}</span>
                                            <span className="practice-sub-status"
                                                style={{ color: s.passed ? 'var(--success)' : 'var(--error)' }}>
                                                {s.status.replace(/_/g, ' ').toLowerCase()}
                                            </span>
                                            {s.createdAt && (
                                                <span className="practice-sub-date">
                                                    {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                        <CodeBlock code={s.code} theme={theme} />
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                    {activeTab === 'solutions' && (
                        <div className="practice-subs">
                            {commSolutions === null ? (
                                <div className="practice-subs-empty">loading...</div>
                            ) : commSolutions.length === 0 ? (
                                <div className="practice-subs-empty">no community solutions yet</div>
                            ) : commSolutions.map((s) => (
                                <div key={s.id} className="practice-sub-row">
                                    <div className="practice-sub-head">
                                        <Link to={`/users/${s.user?.username}`} className="practice-comm-author-link">
                                            <span className="practice-comm-avatar"
                                                style={s.user?.avatarBase64 ? {} : { background: 'var(--accent)' }}>
                                                {s.user?.avatarBase64
                                                    ? <img src={s.user.avatarBase64} alt={s.user.username} />
                                                    : (s.user?.username?.[0] ?? '?').toUpperCase()}
                                            </span>
                                            <span className="practice-comm-author">{s.user?.username ?? 'unknown'}</span>
                                        </Link>
                                        {s.createdAt && (
                                            <span className="practice-sub-date">
                                                {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                    <CodeBlock code={s.code} theme={theme} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="practice-right">
                    <div className="practice-editor-bar">
                        <span className="practice-editor-label">solution.java</span>
                        <div className="practice-actions">
                            <div className="practice-lang">
                                <JavaOriginal size={18} />
                                <span>java</span>
                            </div>
                            <div className="editor-font-controls">
                                <button className="editor-font-btn" onClick={() => changeFontSize(-1)} title="decrease font size">−</button>
                                <span className="editor-font-size">{fontSize}</span>
                                <button className="editor-font-btn" onClick={() => changeFontSize(1)} title="increase font size">+</button>
                            </div>
                            <button className="practice-run" onClick={handleRun}>run</button>
                            <button className="practice-submit" onClick={handleSubmit}>submit</button>
                        </div>
                    </div>
                    <div className="practice-editor-wrap">
                        <div className="editor-terminal-container">
                            <div
                                className="monaco-container"
                                style={{ height: `calc(100% - ${terminalHeight}px)` }}
                            >
                                <Editor
                                    key={currentProblem?.id}
                                    height="100%"
                                    defaultLanguage="java"
                                    value={editorContent}
                                    theme={monacoTheme}
                                    onChange={(v) => setEditorContent(v || '')}
                                    options={{ renderLineHighlight: 'none', fontSize }}
                                />
                            </div>

                            <div
                                className="terminal-resize-handle"
                                onMouseDown={onMouseDown}
                            />

                            <div
                                className="terminal-panel"
                                style={{ height: terminalHeight }}
                            >
                                <div className="terminal-header">
                                    <span>submission</span>
                                </div>
                                <div className="terminal-content">
                                    {submissionLoading ? (
                                        <div className="terminal-running">
                                            <Spinner inline />
                                            <span>running tests</span>
                                        </div>
                                    ) : submissionResult ? (
                                        <SubmissionResult result={submissionResult} />
                                    ) : (
                                        <div className="terminal-empty">
                                            no submission yet
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PracticePage;
