import React, { useContext, useState, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { JavaOriginal } from 'devicons-react';
import { AppContext } from '../../context/AppContext';
import Spinner from '../../components/Spinner/Spinner';
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
    const {
        theme,
        currentProblem,
        editorContent,
        setEditorContent,
        submissionResult,
        submissionLoading,
        handleSubmit,
        handleRun,
    } = useContext(AppContext);

    const [terminalHeight, setTerminalHeight] = useState(260);
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

    if (!currentProblem) return <Navigate to="/" replace />;

    const description = currentProblem?.description ?? '';
    const diff = currentProblem?.difficulty?.toLowerCase();

    return (
        <div className="practice-page">
            <div className="practice-topbar">
                <div className="practice-tabs">
                    <button className="practice-tab active">description</button>
                    <button className="practice-tab">submissions</button>
                </div>
            </div>
            <div className="practice-body">
                <div className="practice-left">
                    <div className="practice-problem-header">
                        <p className="practice-problem-title">{currentProblem?.title}</p>
                        <div className="practice-badges">
                            <span className="practice-diff-stars" title={diff}>
                                {['easy', 'medium', 'hard'].map((d, i) => (
                                    <span key={i} className={`star ${i < { easy: 1, medium: 2, hard: 3 }[diff] ? `filled ${diff}` : ''}`}>★</span>
                                ))}
                            </span>
                        </div>
                    </div>
                    <div className="practice-desc"><ReactMarkdown>{description}</ReactMarkdown></div>
                </div>
                <div className="practice-right">
                    <div className="practice-editor-bar">
                        <span className="practice-editor-label">solution.java</span>
                        <div className="practice-actions">
                            <div className="practice-lang">
                                <JavaOriginal size={18} />
                                <span>java</span>
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
                                    theme={theme === 'dark' ? 'dark-surface' : 'light-surface'}
                                    onChange={(v) => setEditorContent(v || '')}
                                    options={{ renderLineHighlight: 'none' }}
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
