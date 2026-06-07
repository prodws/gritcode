export const TEAM_COLORS = ['var(--accent)', '#e05c5c', '#5cb85c', '#e0a85c', '#a78bfa'];
export const teamColor = (idx) => TEAM_COLORS[idx % TEAM_COLORS.length];

export const STATUS_COLOR = {
    PASSED: 'var(--success)',
    TESTS_FAILED: 'var(--error)',
    COMPILE_ERROR: 'var(--error)',
    RUNTIME_ERROR: 'var(--error)',
    TIMEOUT: 'var(--error)',
    SYSTEM_ERROR: 'var(--text-muted)',
    INVALID_SUBMISSION: 'var(--text-muted)',
};

export const PASS_QUIPS = ['clean run.', 'all tests green.', 'no failures.', 'looking good.', 'nice work.', 'ship it.', 'flawless.'];

export const formatTime = (ts) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
