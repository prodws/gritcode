import React, { useContext, useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { AppContext } from '../../context/AppContext';

const PracticePage = () => {
    const {
        theme,
        currentProblem,
        editorContent,
        setEditorContent,
        submissionResult,
        handleSubmit,
    } = useContext(AppContext);

    const [terminalOpen, setTerminalOpen] = useState(true);
    const [terminalHeight, setTerminalHeight] = useState(200);
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(0);
    const terminalMinHeight = 0;

    const onMouseDown = (e) => {
        setIsDragging(true);
        startYRef.current = e.clientY;
        startHeightRef.current = terminalHeight;
    };

    useEffect(() => {
        const onMouseMove = (e) => {
            if (!isDragging) return;
            const delta = startYRef.current - e.clientY;
            const newHeight = Math.max(terminalMinHeight, startHeightRef.current + delta);
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

    if (!currentProblem) {
        return <div>Loading problem...</div>;
    }

    const description = currentProblem?.description ?? '';
    const diff = currentProblem?.difficulty?.toLowerCase();

    return (
        <div className="practice-page">
            <div className="practice-topbar">
                <div className="practice-tabs">
                    <button className="practice-tab active">description</button>
                    <button className="practice-tab">submissions</button>
                </div>
                <div className="practice-actions">
                    <select className="practice-lang"><option>java</option></select>
                    <button className="practice-run">run</button>
                    <button className="practice-submit" onClick={handleSubmit}>submit</button>
                </div>
            </div>
            <div className="practice-body">
                <div className="practice-left">
                    <div className="practice-problem-header">
                        <p className="practice-problem-title">{currentProblem?.title}</p>
                        <div className="practice-badges">
                            <span className={`practice-diff ${diff}`}>{diff}</span>
                            <span className="practice-type">{currentProblem?.type?.toLowerCase()}</span>
                        </div>
                    </div>
                    <div className="practice-desc"><ReactMarkdown>{description}</ReactMarkdown></div>
                </div>
                <div className="practice-right">
                    <div className="practice-editor-bar">
                        <span className="practice-editor-label">solution.java</span>
                    </div>
                    <div className="practice-editor-wrap">
                        <div className="editor-terminal-container">
                            <div
                                className="monaco-container"
                                style={{
                                    height: terminalOpen
                                        ? `calc(100% - ${terminalHeight}px)`
                                        : '100%'
                                }}
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

                            {terminalOpen && (
                                <div
                                    className="terminal-resize-handle"
                                    onMouseDown={onMouseDown}
                                />
                            )}

                            <div
                                className="terminal-panel"
                                style={{ height: terminalOpen ? terminalHeight : 0 }}
                            >
                                {terminalOpen && (
                                    <>
                                        <div className="terminal-header">
                                            <span>submission</span>
                                            <button
                                                className="terminal-toggle"
                                                onClick={() => setTerminalOpen(false)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="terminal-content">
                                            {submissionResult ? (
                                                <>
                                                    <div>ID: {submissionResult.id}</div>
                                                    <div>Status: {submissionResult.status}</div>
                                                    <div>stdout:</div>
                                                    <pre>{submissionResult.stdout || 'no stdout'}</pre>
                                                    <div>stderr:</div>
                                                    <pre>{submissionResult.stderr || 'no stderr'}</pre>
                                                    <div>passed:</div>
                                                    <pre>{submissionResult.passed ? 'true' : 'false'}</pre>
                                                </>
                                            ) : (
                                                <div className="terminal-empty">
                                                    no submission yet
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {!terminalOpen && (
                                <div
                                    className="terminal-reopen-handle"
                                    onClick={() => setTerminalOpen(true)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PracticePage;
