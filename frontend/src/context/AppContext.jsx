import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { validateUsername, validateEmail, validatePassword } from '../utils/validation';
import { GRAPHQL_URL, gql } from '../game/api';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // State
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [authLoading, setAuthLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [authMode, setAuthMode] = useState('login');
    const [error, setError] = useState({ field: null, message: null });
    const [success, setSuccess] = useState({ field: null, message: null });
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const [currentProblem, setCurrentProblem] = useState(null);
    const [editorContent, setEditorContent] = useState('');
    const [submissionResult, setSubmissionResult] = useState(null);
    const [submissionLoading, setSubmissionLoading] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [availability, setAvailability] = useState({});
    const [toast, setToast] = useState(null);
    const [confirmState, setConfirmState] = useState(null);
    const navGuardRef = useRef(null);

    const showConfirm = useCallback((opts) => {
        return new Promise((resolve) => {
            setConfirmState({
                title: opts.title,
                message: opts.message,
                confirmLabel: opts.confirmLabel || 'confirm',
                cancelLabel: opts.cancelLabel || 'cancel',
                kind: opts.kind || 'default',
                resolve,
            });
        });
    }, []);

    const closeConfirm = useCallback((result) => {
        if (confirmState) {
            confirmState.resolve(result);
            setConfirmState(null);
        }
    }, [confirmState]);

    const setNavGuard = useCallback((fn) => { navGuardRef.current = fn; }, []);
    const guardedNavigate = useCallback(async (to, opts) => {
        const guard = navGuardRef.current;
        if (guard) {
            const allowed = await guard(to);
            if (!allowed) return;
        }
        navigate(to, opts);
    }, [navigate]);

    const showToast = useCallback((message, kind = 'info') => {
        setToast({ message, kind, id: Date.now() });
    }, []);

    const dismissToast = useCallback(() => setToast(null), []);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(t);
    }, [toast]);

    const clearError = useCallback(() => setError({ field: null, message: null }), []);
    const clearSuccess = useCallback(() => setSuccess({ field: null, message: null }), []);
    const goHome = useCallback(() => navigate('/'), [navigate]);

    useEffect(() => {
        clearError();
        clearSuccess();
    }, [location.pathname, clearError, clearSuccess]);

    const login = (emailOrUsername, password) => {
        clearError();
        fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `mutation($u: String!, $p: String!) { login(emailOrUsername: $u, password: $p) }`,
                variables: { u: emailOrUsername, p: password },
            }),
        })
        .then(res => res.json())
        .then(json => {
            if (json.errors) { setError({ field: 'login', message: json.errors[0].message }); return; }
            const token = json.data.login;
            setToken(token);
            localStorage.setItem('token', token);
            gql(token, `{ me { id username totalPoints createdAt avatarBase64 level xpForNextLevel } }`)
                .then(d => { if (d.me) { setCurrentUser(d.me); goHome(); } })
                .catch(() => {});
        });
    };

    const register = (username, email, password) => {
        clearError();

        const usernameError = validateUsername(username);
        if (usernameError) { setError({ field: 'username', message: usernameError }); return; }

        const emailError = validateEmail(email);
        if (emailError) { setError({ field: 'email', message: emailError }); return; }

        const passwordError = validatePassword(password);
        if (passwordError) { setError({ field: 'password', message: passwordError }); return; }

        fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `mutation($u: String!, $e: String!, $p: String!) { register(username: $u, email: $e, password: $p) { id } }`,
                variables: { u: username, e: email, p: password },
            }),
        })
        .then(res => res.json())
        .then(json => {
            if (json.errors) {
                const errorMessage = json.errors[0].message;
                if (errorMessage.includes('username')) {
                    setError({ field: 'username', message: errorMessage });
                } else if (errorMessage.includes('email')) {
                    setError({ field: 'email', message: errorMessage });
                } else {
                    setError({ field: 'password', message: errorMessage });
                }
                return;
            }
            setAuthMode('login');
            navigate('/auth');
        });
    };

    const clearFieldState = useCallback((field) => {
        setAvailability(prev => ({ ...prev, [field]: undefined }));
        setError(prev => prev.field === field ? { field: null, message: null } : prev);
    }, []);

    const checkAvailability = useCallback(async (field, value) => {
        setAvailability(prev => ({ ...prev, [field]: undefined }));
        if (!value) return;

        const validationError = field === 'username' ? validateUsername(value) : validateEmail(value);
        if (validationError) {
            setError({ field, message: validationError });
            return;
        }

        const response = await fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `query($f: String!, $v: String!) { checkAvailability(field: $f, value: $v) }`,
                variables: { f: field, v: value },
            }),
        });
        const result = await response.json();
        const isAvailable = result.data?.checkAvailability;
        if (isAvailable === undefined) return;

        setAvailability(prev => ({ ...prev, [field]: isAvailable }));
        if (!isAvailable) {
            setError({ field, message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken.` });
        } else {
            setError({ field: null, message: null });
        }
    }, []);

    const handleSaveUsername = useCallback(async (newUsername) => {
        clearError(); clearSuccess();
        try {
            const d = await gql(token, `mutation($u: String!) { updateUsername(newUsername: $u) { id username } }`, { u: newUsername });
            setCurrentUser(prev => ({ ...prev, username: d.updateUsername.username }));
            setSuccess({ field: 'username', message: 'Username updated' });
        } catch (err) {
            setError({ field: 'username', message: err.message });
        }
    }, [token, clearError, clearSuccess]);

    const handleSavePassword = useCallback(async (currentPassword, newPassword) => {
        clearError(); clearSuccess();
        try {
            await gql(token, `mutation($c: String!, $n: String!) { updatePassword(currentPassword: $c, newPassword: $n) { id } }`, { c: currentPassword, n: newPassword });
            setSuccess({ field: 'password', message: 'Password updated' });
        } catch (err) {
            setError({ field: 'password', message: err.message });
            throw err;
        }
    }, [token, clearError, clearSuccess]);

    const handleSaveAvatar = useCallback(async (base64Data) => {
        const d = await gql(token, `mutation($b: String!) { updateAvatar(base64Data: $b) { id avatarBase64 } }`, { b: base64Data });
        setCurrentUser(prev => ({ ...prev, avatarBase64: d.updateAvatar.avatarBase64 }));
    }, [token]);

    const logout = useCallback(() => {
        setToken(null);
        setCurrentUser(null);
        localStorage.removeItem('token');
        goHome();
    }, [goHome]);

    const deleteAccount = useCallback(async () => {
        await gql(token, `mutation { deleteAccount }`);
        setToken(null);
        setCurrentUser(null);
        localStorage.removeItem('token');
        goHome();
    }, [token, goHome]);

    const loadProblem = useCallback(async (problem) => {
        const fetchFile = async (path) => {
            const d = await gql(token, `query($p: String!) { fileContent(path: $p) }`, { p: path });
            return d.fileContent ?? '';
        };
        const descFile = problem.files.find(f => f.fileRole === 'DESCRIPTION');
        const templateFile = problem.files.find(f => f.fileRole === 'TEMPLATE');
        const description = descFile ? await fetchFile(descFile.filePath) : '';
        const template = templateFile ? await fetchFile(templateFile.filePath) : '';
        setCurrentProblem({ ...problem, description });
        setEditorContent(template);
        setSubmissionResult(null);
        navigate(`/forge/${problem.id}`);
    }, [navigate, token]);

    const goPractice = useCallback(() => {
        navigate('/forge');
    }, [navigate]);

    const goPracticeById = useCallback(async (id) => {
        const d = await gql(token, `query($id: ID!) { problemById(id: $id) { id title difficulty type files { filePath fileName fileRole } } }`, { id });
        const problem = d.problemById;
        if (!problem) return;
        await loadProblem(problem);
    }, [token, loadProblem]);

    const handleSubmit = useCallback(async () => {
        if (!currentUser || !currentProblem) return;
        setSubmissionLoading(true);
        try {
            const d = await gql(token,
                `mutation($input: SubmitSolutionInput!) { submitSolution(input: $input) { id status passed stdout stderr } }`,
                { input: { userId: currentUser.id, problemId: currentProblem.id, solutionCode: editorContent } }
            );
            if (d.submitSolution) setSubmissionResult(d.submitSolution);
        } finally {
            setSubmissionLoading(false);
        }
    }, [token, currentUser, currentProblem, editorContent]);

    const handleRun = useCallback(async () => {
        if (!currentUser || !currentProblem) return;
        setSubmissionLoading(true);
        try {
            const d = await gql(token,
                `mutation($input: SubmitSolutionInput!) { runSolution(input: $input) { status passed stdout stderr } }`,
                { input: { userId: currentUser.id, problemId: currentProblem.id, solutionCode: editorContent } }
            );
            if (d.runSolution) setSubmissionResult(d.runSolution);
        } finally {
            setSubmissionLoading(false);
        }
    }, [token, currentUser, currentProblem, editorContent]);

    const fetchSubmissions = useCallback(async () => {
        if (!token) return;
        const d = await gql(token, `{ mySubmissions { id status passed code createdAt problem { id title difficulty } } }`);
        if (d.mySubmissions) setSubmissions(d.mySubmissions);
    }, [token]);

    const toggleTheme = useCallback(() => {
        setTheme(currentTheme => (currentTheme === 'dark' ? 'light' : 'dark'));
    }, []);

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        if (success.message) {
            const timer = setTimeout(() => clearSuccess(), 1500);
            return () => clearTimeout(timer);
        }
    }, [success, clearSuccess]);

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            gql(savedToken, `{ me { id username totalPoints createdAt avatarBase64 level xpForNextLevel } }`)
                .then(d => { if (d.me) setCurrentUser(d.me); })
                .catch(() => {})
                .finally(() => setTimeout(() => setAuthLoading(false), 600));
        } else {
            setTimeout(() => setAuthLoading(false), 600);
        }
    }, []);

    const value = {
        token,
        currentUser,
        authLoading,
        theme,
        toggleTheme,
        login,
        register,
        logout,
        goPractice,
        goPracticeById,
        authMode,
        setAuthMode,
        error,
        clearError,
        success,
        availability,
        checkAvailability,
        clearFieldState,
        currentProblem,
        editorContent,
        setEditorContent,
        submissionResult,
        handleSubmit,
        handleRun,
        submissionLoading,
        submissions,
        fetchSubmissions,
        toast,
        showToast,
        dismissToast,
        setNavGuard,
        guardedNavigate,
        showConfirm,
        confirmState,
        closeConfirm,
        handleSaveUsername,
        handleSavePassword,
        handleSaveAvatar,
        deleteAccount,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
