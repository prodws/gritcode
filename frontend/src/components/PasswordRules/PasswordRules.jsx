const RULES = [
    { label: '5+ characters', test: pw => pw.length >= 5 },
    { label: 'a special char', test: pw => /[^a-zA-Z0-9]/.test(pw) },
];

const PasswordRules = ({ password, className = '' }) => {
    if (!password) return null;
    return (
        <div className={`pw-rules ${className}`}>
            {RULES.map(r => {
                const ok = r.test(password);
                return (
                    <span key={r.label} className={`pw-rule ${ok ? 'ok' : 'fail'}`}>
                        {ok ? '✓' : '✗'} {r.label}
                    </span>
                );
            })}
        </div>
    );
};

export default PasswordRules;
