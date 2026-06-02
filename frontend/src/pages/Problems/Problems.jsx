import React, { useContext, useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { JavaOriginal } from 'devicons-react';
import { Eye, EyeClosed } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import './Problems.css';

const DIFF_COLOR = {
    EASY: 'var(--diff-easy)',
    MEDIUM: 'var(--diff-medium)',
    HARD: 'var(--diff-hard)',
};

const DIFF_COUNT = { EASY: 1, MEDIUM: 2, HARD: 3 };
const DIFF_XP = { EASY: 50, MEDIUM: 100, HARD: 200 };

const PROBLEM_TAGS = {
    'Reverse String':        ['strings'],
    'Palindrome Check':      ['strings'],
    'FizzBuzz':              ['math', 'loops'],
    'Maximum Subarray':      ['arrays', 'dp'],
    'Valid Parentheses':     ['stack', 'strings'],
    'Binary Search':         ['arrays', 'search'],
    'Merge Sorted Arrays':   ['arrays', 'sorting'],
    'Climbing Stairs':       ['dp', 'math'],
    'Longest Common Prefix': ['strings', 'arrays'],
    'Single Number':         ['arrays', 'bit ops'],
    'Three Sum':             ['arrays', 'sorting'],
    'Two Sum':               ['arrays', 'hash map'],
    'Stack Basics':          ['stack'],
    'Word Break':            ['dp', 'strings'],
};

const ALL_TAGS = [...new Set(Object.values(PROBLEM_TAGS).flat())].sort();

const DIFF_BY_COUNT = { 1: 'EASY', 2: 'MEDIUM', 3: 'HARD' };

const DiffStarPicker = ({ value, onChange, onColor, offColor }) => {
    const [hovered, setHovered] = useState(null);
    const activeCount = value ? DIFF_COUNT[value] : 0;
    const displayCount = hovered ?? activeCount;
    const displayDiff = DIFF_BY_COUNT[displayCount];
    const color = onColor ?? (displayDiff ? DIFF_COLOR[displayDiff] : (offColor ?? 'var(--border)'));
    const emptyColor = offColor ?? 'var(--border)';

    return (
        <div
            className="diff-star-picker"
            onMouseLeave={() => setHovered(null)}
        >
            {[1, 2, 3].map(i => (
                <span
                    key={i}
                    className="diff-star-pick"
                    style={{ color: i <= displayCount ? color : emptyColor }}
                    onMouseEnter={() => setHovered(i)}
                    onClick={() => onChange(v => v === DIFF_BY_COUNT[i] ? null : DIFF_BY_COUNT[i])}
                >★</span>
            ))}
        </div>
    );
};

const DiffStars = ({ difficulty }) => (
    <span className="diff-stars">
        {[0,1,2].map(i => (
            <span key={i} style={{ color: i < (DIFF_COUNT[difficulty] ?? 0) ? DIFF_COLOR[difficulty] : 'var(--border)' }}>★</span>
        ))}
    </span>
);

const ProblemsPage = () => {
    const { token, goPracticeById } = useContext(AppContext);
    const [view, setView] = useState('problems');
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortDir, setSortDir] = useState(() => localStorage.getItem('problems-sortdir') ?? 'asc');
    const [search, setSearch] = useState('');
    const [tagFilter, setTagFilter] = useState(null);
    const [diffFilter, setDiffFilter] = useState(null);
    const [hidden, setHidden] = useState(() => {
        try { return new Set(JSON.parse(localStorage.getItem('problems-hidden') ?? '[]')); }
        catch { return new Set(); }
    });
    const [descs, setDescs] = useState({});
    const [statuses, setStatuses] = useState({});
    const [attemptCounts, setAttemptCounts] = useState({});
    const [selected, setSelected] = useState(null);
    const listRef = useRef(null);

    useEffect(() => {
        if (!selected || !listRef.current) return;
        const row = listRef.current.querySelector('.quest-row.selected');
        if (row) row.scrollIntoView({ block: 'nearest' });
    }, [selected]);

    useEffect(() => {
        fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: `{ problems { id title difficulty type files { filePath fileRole } } }` }),
        })
        .then(r => r.json())
        .then(data => {
            const list = (data.data?.problems ?? []).filter(p => p.type === 'CODING');
            setProblems(list);
            setLoading(false);
            loadDescs(list);
            loadStatuses();
        });
    }, [token]);


    const loadDescs = async (list) => {
        const entries = await Promise.all(list.map(async p => {
            const descFile = p.files.find(f => f.fileRole === 'DESCRIPTION');
            if (!descFile) return [p.id, ''];
            const r = await fetch('http://localhost:8080/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ query: `{ fileContent(path: "${descFile.filePath}") }` }),
            });
            const d = await r.json();
            return [p.id, d.data?.fileContent ?? ''];
        }));
        setDescs(Object.fromEntries(entries));
    };

    const loadStatuses = async () => {
        const r = await fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: `{ mySubmissions { status problem { id } } }` }),
        });
        const d = await r.json();
        const subs = d.data?.mySubmissions ?? [];
        const map = {};
        const attempts = {};
        subs.forEach(s => {
            const pid = s.problem.id;
            attempts[pid] = (attempts[pid] ?? 0) + 1;
            if (s.status === 'PASSED') map[pid] = 'completed';
            else if (!map[pid]) map[pid] = 'attempted';
        });
        setStatuses(map);
        setAttemptCounts(attempts);
    };


    const sorted = [...problems]
        .filter(p => {
            const s = statuses[p.id];
            if (hidden.has('solved') && s === 'completed') return false;
            if (hidden.has('attempted') && s === 'attempted') return false;
            if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
            if (tagFilter && !(PROBLEM_TAGS[p.title] ?? []).includes(tagFilter)) return false;
            if (diffFilter && p.difficulty !== diffFilter) return false;
            return true;
        })
        .sort((a, b) => {
            const order = { EASY: 0, MEDIUM: 1, HARD: 2 };
            const diff = order[a.difficulty] - order[b.difficulty];
            return sortDir === 'asc' ? diff : -diff;
        });

    return (
        <div className="problems-page">
            <div className="problems-main">
                {view !== 'problems' && (
                    <div className="problems-placeholder">
                        <span>{view === 'create-room' ? 'create room' : 'join room'}</span>
                        <span className="placeholder-sub">coming soon</span>
                    </div>
                )}
                {view === 'problems' && (
                    <div className="quest-wrap">
                        <div className="problems-filter-bar">
                            <div className="filter-bar-search-wrap">
                                <input
                                    className="filter-bar-search"
                                    type="text"
                                    placeholder="search..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="filter-bar-divider" />
                            {['solved', 'attempted'].map(opt => {
                                const isHidden = hidden.has(opt);
                                const toggle = () => setHidden(prev => {
                                    const next = new Set(prev);
                                    isHidden ? next.delete(opt) : next.add(opt);
                                    localStorage.setItem('problems-hidden', JSON.stringify([...next]));
                                    return next;
                                });
                                return (
                                    <button key={opt} className={`filter-bar-btn ${isHidden ? '' : 'active'}`} onClick={toggle} title={opt}>
                                        {isHidden ? <EyeClosed size={14} /> : <Eye size={14} />}
                                        <span>{opt}</span>
                                    </button>
                                );
                            })}
                            <div className="filter-bar-divider" />
                            <button className="filter-bar-sort" onClick={() => setSortDir(d => { const next = d === 'asc' ? 'desc' : 'asc'; localStorage.setItem('problems-sortdir', next); return next; })}>
                                difficulty {sortDir === 'asc' ? '↑' : '↓'}
                            </button>
                            <DiffStarPicker value={diffFilter} onChange={setDiffFilter} />
                            <div className="filter-bar-divider" />
                            {ALL_TAGS.map(tag => (
                                <button
                                    key={tag}
                                    className={`filter-bar-tag ${tagFilter === tag ? 'active' : ''}`}
                                    onClick={() => setTagFilter(t => t === tag ? null : tag)}
                                >{tag}</button>
                            ))}
                        </div>
                        <div className="quest-layout">
                        <div className="quest-list" ref={listRef} onWheel={e => {
                            e.preventDefault();
                            const idx = sorted.findIndex(p => p.id === selected?.id);
                            const next = e.deltaY > 0
                                ? sorted[Math.min(idx + 1, sorted.length - 1)]
                                : sorted[Math.max(idx - 1, 0)];
                            if (next) setSelected(next);
                        }}>
                            {loading ? null : sorted.map(p => {
                                const status = statuses[p.id];
                                const isSelected = selected?.id === p.id;
                                return (
                                    <div
                                        key={p.id}
                                        className={`quest-row${isSelected ? ' selected' : ''}${status ? ` status-${status}` : ''}`}
                                        style={{ '--diff-color': DIFF_COLOR[p.difficulty], borderLeft: `3px solid ${DIFF_COLOR[p.difficulty]}` }}
                                        onClick={() => setSelected(p)}
                                    >
                                        <div className="quest-row-left">
                                            <span className="quest-row-title">{p.title}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {(() => {
                                const total = problems.length;
                                const solved = Object.values(statuses).filter(s => s === 'completed').length;
                                const pct = total ? Math.round(solved / total * 100) : 0;
                                return (
                                    <div className="problems-progress">
                                        <div className="problems-progress-bar">
                                            <div className="problems-progress-fill" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="problems-progress-label">{solved}/{total}</span>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="quest-detail">
                            {!selected ? (
                                <div className="quest-detail-empty">select a challenge</div>
                            ) : (
                                <div className="quest-detail-content" key={selected.id} style={{ '--diff-color': DIFF_COLOR[selected.difficulty] }}>
                                    <div className="quest-detail-section">
                                        <div className="quest-detail-header">
                                            <h1 className="quest-detail-title">{selected.title}</h1>
                                            <div className="quest-detail-meta">
                                                <div className="quest-detail-tags">
                                                    <DiffStars difficulty={selected.difficulty} />
                                                    {(PROBLEM_TAGS[selected.title] ?? []).map(t => (
                                                        <span key={t} className="problem-tag">{t}</span>
                                                    ))}
                                                    <span className="problem-tag quest-lang-tag"><JavaOriginal size={12} /><span>java</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="quest-detail-section">
                                        <div className="quest-detail-desc">
                                            <ReactMarkdown>{descs[selected.id] ?? ''}</ReactMarkdown>
                                        </div>
                                    </div>
                                    <div className="quest-detail-section">
                                        <div className="quest-detail-reward">
                                            <span className="quest-reward-label">reward</span>
                                            <span className="quest-reward-xp" style={{ color: DIFF_COLOR[selected.difficulty] }}>
                                                +{DIFF_XP[selected.difficulty]} xp
                                            </span>
                                            {statuses[selected.id] === 'completed' && (
                                                <span className="quest-solved-info">
                                                    ✓ solved · {attemptCounts[selected.id] ?? 0} submission{attemptCounts[selected.id] !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {statuses[selected.id] === 'attempted' && (
                                                <span className="quest-attempted-info">
                                                    {attemptCounts[selected.id] ?? 0} attempt{attemptCounts[selected.id] !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            className="quest-attempt-btn"
                                            onClick={() => goPracticeById(selected.id)}
                                        >
                                            {statuses[selected.id] === 'attempted' ? 'continue' : 'attempt'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="problems-sidebar">
                <button className={`sidebar-action${view === 'problems' ? ' active' : ''}`} onClick={() => setView('problems')}>practice</button>
                <button className={`sidebar-action${view === 'create-room' ? ' active' : ''}`} onClick={() => setView('create-room')}>create room</button>
                <button className={`sidebar-action${view === 'join-room' ? ' active' : ''}`} onClick={() => setView('join-room')}>join room</button>
            </div>
        </div>
    );
};

export default ProblemsPage;
