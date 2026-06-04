import { useContext, useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import './Confirm.css';

const Confirm = () => {
    const { confirmState, closeConfirm } = useContext(AppContext);

    useEffect(() => {
        if (!confirmState) return;
        const onKey = (e) => {
            if (e.key === 'Escape') closeConfirm(false);
            if (e.key === 'Enter')  closeConfirm(true);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [confirmState, closeConfirm]);

    if (!confirmState) return null;

    return (
        <div className="confirm-overlay" onClick={() => closeConfirm(false)}>
            <div className={`confirm-card confirm-${confirmState.kind}`} onClick={e => e.stopPropagation()} role="dialog">
                <div className="confirm-icon"><TriangleAlert size={18} strokeWidth={2.4} /></div>
                {confirmState.title && <div className="confirm-title">{confirmState.title}</div>}
                <div className="confirm-message">{confirmState.message}</div>
                <div className="confirm-actions">
                    <button className="confirm-cancel" onClick={() => closeConfirm(false)}>
                        {confirmState.cancelLabel}
                    </button>
                    <button className="confirm-ok" onClick={() => closeConfirm(true)} autoFocus>
                        {confirmState.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Confirm;
