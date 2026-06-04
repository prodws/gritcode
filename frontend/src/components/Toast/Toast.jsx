import { useContext } from 'react';
import { TriangleAlert, Info, CircleX } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import './Toast.css';

const ICONS = {
    info:    Info,
    warning: TriangleAlert,
    error:   CircleX,
};

const Toast = () => {
    const { toast, dismissToast } = useContext(AppContext);
    if (!toast) return null;
    const Icon = ICONS[toast.kind] || Info;
    return (
        <div className={`toast toast-${toast.kind}`} onClick={dismissToast} role="alert">
            <span className="toast-icon"><Icon size={16} strokeWidth={2.4} /></span>
            <span className="toast-text">{toast.message}</span>
        </div>
    );
};

export default Toast;
