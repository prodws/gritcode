import { useState } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import dark from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark';
import light from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light';
import './CodeBlock.css';

SyntaxHighlighter.registerLanguage('java', java);

const darkStyle = {
    ...dark,
    hljs: {
        ...dark.hljs,
        background: 'var(--bg)',
        padding: '14px 16px',
        fontSize: '0.7rem',
        lineHeight: '1.6',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        overflowX: 'auto',
    },
};

const lightStyle = {
    ...light,
    hljs: {
        ...light.hljs,
        background: 'var(--bg)',
        padding: '14px 16px',
        fontSize: '0.7rem',
        lineHeight: '1.6',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        overflowX: 'auto',
    },
};

const CodeBlock = ({ code, theme }) => {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(code ?? '').then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <div className="code-block">
            <button className={`code-block-copy${copied ? ' copied' : ''}`} onClick={copy}>
                {copied ? 'copied' : 'copy'}
            </button>
            <SyntaxHighlighter language="java" style={theme === 'dark' ? darkStyle : lightStyle} wrapLongLines={false}>
                {code ?? ''}
            </SyntaxHighlighter>
        </div>
    );
};

export default CodeBlock;
