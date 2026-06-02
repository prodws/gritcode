import { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { validateUsername, validateEmail, validatePassword } from '../utils/validation';

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

    // Logic
    const clearError = useCallback(() => setError({ field: null, message: null }), []);
    const clearSuccess = useCallback(() => setSuccess({ field: null, message: null }), []);
    const goHome = useCallback(() => navigate('/'), [navigate]);

    useEffect(() => {
        clearError();
        clearSuccess();
    }, [location.pathname, clearError, clearSuccess]);

    const login = (emailOrUsername, password) => {
        clearError();
        fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `mutation { login(emailOrUsername: "${emailOrUsername}", password: "${password}") }` }),
        })
        .then(res => res.json())
        .then(json => {
            if (json.errors) { setError({ field: 'login', message: json.errors[0].message }); return; }
            const token = json.data.login;
            setToken(token);
            localStorage.setItem('token', token);
            fetch('http://localhost:8080/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ query: `{ me { id username totalPoints createdAt } }` }),
            })
            .then(res => res.json())
            .then(userData => {
                if(userData.data?.me) { setCurrentUser(userData.data.me); goHome(); }
            });
        });
    };

    const register = (username, email, password) => {
        clearError();

        const usernameError = validateUsername(username);
        if (usernameError) {
            setError({ field: 'username', message: usernameError });
            return;
        }

        const emailError = validateEmail(email);
        if (emailError) {
            setError({ field: 'email', message: emailError });
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError({ field: 'password', message: passwordError });
            return;
        }

        fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `mutation { register(username: "${username}", email: "${email}", password: "${password}") { id } }` }),
        })
        .then(res => res.json())
        .then(json => {
            if (json.errors) {
                // Handle server-side validation errors (e.g., username taken)
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

        const query = `query { checkAvailability(field: "${field}", value: "${value}") }`;
        const response = await fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
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

    const handleSaveSettings = useCallback(async (newUsername, newPassword) => {
        clearError();
        clearSuccess();
        const promises = [];
        if (newUsername) promises.push(
            fetch('http://localhost:8080/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ query: `mutation { updateUsername(newUsername: "${newUsername}") { username } }` }),
            }).then(r => r.json())
        );
        if (newPassword) promises.push(
            fetch('http://localhost:8080/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ query: `mutation { updatePassword(newPassword: "${newPassword}") { id } }` }),
            }).then(r => r.json())
        );
        const results = await Promise.all(promises);
        results.forEach(json => {
            if (json.errors) {
                const msg = json.errors[0].message;
                const field = msg.toLowerCase().includes('username') ? 'username' : 'password';
                setError({ field, message: msg });
            } else if (json.data?.updateUsername) {
                setCurrentUser(prev => ({ ...prev, username: json.data.updateUsername.username }));
                setSuccess({ field: 'username', message: 'Username updated successfully' });
            } else if (json.data?.updatePassword) {
                setSuccess({ field: 'password', message: 'Password updated successfully' });
            }
        });
    }, [token, clearError, clearSuccess]);

    const logout = useCallback(() => {
        setToken(null);
        setCurrentUser(null);
        localStorage.removeItem('token');
        goHome();
    }, [goHome]);

    const goPractice = useCallback(async () => {
        const res = await fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: `{ randomProblem(difficulty: EASY) { id title difficulty type files { filePath fileName fileRole } } }` }),
        });
        const data = await res.json();
        const problem = data.data?.randomProblem;
        if (!problem) return;

        const descFile = problem.files.find(f => f.fileRole === 'DESCRIPTION');
        const templateFile = problem.files.find(f => f.fileRole === 'TEMPLATE');

        const fetchFile = async (path) => {
            const r = await fetch('http://localhost:8080/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ query: `{ fileContent(path: "${path}") }` }),
            });
            return (await r.json()).data?.fileContent ?? '';
        };

        const description = descFile ? await fetchFile(descFile.filePath) : '';
        const template = templateFile ? await fetchFile(templateFile.filePath) : '';

        setCurrentProblem({ ...problem, description });
        setEditorContent(template);
        navigate('/practice');
    }, [navigate, token]);

    const handleSubmit = useCallback(async () => {
        if (!currentUser || !currentProblem) return;
        setSubmissionLoading(true);
        const res = await fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                query: `mutation { submitSolution(input: { userId: "${currentUser.id}", problemId: "${currentProblem.id}", solutionCode: ${JSON.stringify(editorContent)} }) { id status passed stdout stderr } }`,
            }),
        });
        const data = await res.json();
        if (data.data?.submitSolution) setSubmissionResult(data.data.submitSolution);
        setSubmissionLoading(false);
    }, [token, currentUser, currentProblem, editorContent]);

    const handleRun = useCallback(async () => {
        if (!currentUser || !currentProblem) return;
        setSubmissionLoading(true);
        const res = await fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                query: `mutation { runSolution(input: { userId: "${currentUser.id}", problemId: "${currentProblem.id}", solutionCode: ${JSON.stringify(editorContent)} }) { status passed stdout stderr } }`,
            }),
        });
        const data = await res.json();
        if (data.data?.runSolution) setSubmissionResult(data.data.runSolution);
        setSubmissionLoading(false);
    }, [token, currentUser, currentProblem, editorContent]);

    const fetchSubmissions = useCallback(async () => {
        if (!token) return;
        const res = await fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: `{ mySubmissions { id status passed code problem { title } } }` }),
        });
        const data = await res.json();
        if (data.data?.mySubmissions) setSubmissions(data.data.mySubmissions);
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
            fetch('http://localhost:8080/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${savedToken}` },
                body: JSON.stringify({ query: `{ me { id username totalPoints createdAt } }` }),
            })
            .then(res => res.json())
            .then(userData => {
                if (userData.data?.me) setCurrentUser(userData.data.me);
            })
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
        authMode,
        setAuthMode,
        error,
        clearError,
        success,
        handleSaveSettings,
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
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};