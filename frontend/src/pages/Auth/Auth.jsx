import React, { useState, useRef, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { validateUsername, validateEmail, validatePassword } from '../../utils/validation';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const AuthPage = () => {
    const {
        login, register, error, availability,
        checkAvailability, clearFieldState,
        currentUser, authMode, setAuthMode, clearError,
    } = useContext(AppContext);
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [liveErrors, setLiveErrors] = useState({});

    const debouncedUsername = useDebounce(username, 500);

    // Availability check fires after typing stops, only when format is valid
    useEffect(() => {
        if (!debouncedUsername || authMode !== 'register') return;
        if (!validateUsername(debouncedUsername)) {
            checkAvailability('username', debouncedUsername);
        }
    }, [debouncedUsername, authMode, checkAvailability]);

    // Reset all field state on mode switch
    useEffect(() => {
        clearError();
        setUsername('');
        setEmail('');
        setPassword('');
        setEmailOrUsername('');
        setShowPassword(false);
        setSubmitted(false);
        setLiveErrors({});
    }, [authMode, clearError]);

    useEffect(() => {
        if (currentUser) navigate('/');
    }, [currentUser, navigate]);

    const updateLiveError = (field, err) => {
        setLiveErrors(prev => {
            const next = { ...prev };
            if (err) next[field] = err;
            else delete next[field];
            return next;
        });
    };

    const handleUsernameChange = (e) => {
        const value = e.target.value;
        setUsername(value);
        clearFieldState('username');
        updateLiveError('username', validateUsername(value));
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        clearFieldState('email');
        updateLiveError('email', validateEmail(value));
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        updateLiveError('password', validatePassword(value));
    };

    const handleRegister = (e) => {
        e.preventDefault();
        setSubmitted(true);
        register(username, email, password);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        setSubmitted(true);
        login(emailOrUsername, password);
    };

    // Returns border CSS class for an input field
    const getInputClass = (field, value) => {
        if (liveErrors[field] || error.field === field) return 'error';
        if (submitted && !value) return 'error';
        if (availability[field] === true && value && !liveErrors[field]) return 'success';
        return '';
    };

    // Returns the message to display beside a field, or null for none
    // Empty fields on submit get a highlight but no message
    const getErrMsg = (field, value) => {
        if (submitted && !value) return null;
        if (liveErrors[field]) return liveErrors[field];
        if (error.field === field) return error.message;
        return null;
    };

    return (
        <div className="auth-container">
            <form className="auth-box" onSubmit={authMode === 'login' ? handleLogin : handleRegister} noValidate>
                {authMode === 'register' && (
                    <>
                        <div className="auth-field">
                            <p className="auth-label">username</p>
                            <input
                                value={username}
                                onChange={handleUsernameChange}
                                className={getInputClass('username', username)}
                            />
                            {getErrMsg('username', username) && (
                                <p className="field-error">{getErrMsg('username', username)}</p>
                            )}
                            {availability.username === true && !liveErrors.username && error.field !== 'username' && username && (
                                <p className="field-success">available</p>
                            )}
                        </div>
                        <div className="auth-field">
                            <p className="auth-label">email</p>
                            <input
                                type="email"
                                value={email}
                                onChange={handleEmailChange}
                                className={getInputClass('email', email)}
                            />
                            {getErrMsg('email', email) && (
                                <p className="field-error">{getErrMsg('email', email)}</p>
                            )}
                        </div>
                        <div className="auth-field">
                            <p className="auth-label">password</p>
                            <div className="password-field">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={handlePasswordChange}
                                    className={getInputClass('password', password)}
                                />
                                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? '✶' : '✧'}
                                </button>
                                {getErrMsg('password', password) && (
                                    <p className="field-error">{getErrMsg('password', password)}</p>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {authMode === 'login' && (
                    <>
                        <div className="auth-field">
                            <p className="auth-label">username or email</p>
                            <input
                                value={emailOrUsername}
                                onChange={e => { setEmailOrUsername(e.target.value); clearFieldState('login'); }}
                                className={getInputClass('login', emailOrUsername)}
                            />
                            {getErrMsg('login', emailOrUsername) && (
                                <p className="field-error">{getErrMsg('login', emailOrUsername)}</p>
                            )}
                        </div>
                        <div className="auth-field">
                            <p className="auth-label">password</p>
                            <div className="password-field">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className={submitted && !password ? 'error' : ''}
                                />
                                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? '✶' : '✧'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                <button type="submit" className="auth-submit">
                    {authMode === 'login' ? 'sign in' : 'create account'}
                </button>
            </form>

            <button className="auth-link" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                {authMode === 'login' ? 'or sign up' : 'back to login'}
            </button>
        </div>
    );
};

export default AuthPage;
