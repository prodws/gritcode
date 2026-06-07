import React, { useState, useRef, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { validateUsername, validateEmail, validatePassword } from '../../utils/validation';
import PasswordRules from '../../components/PasswordRules/PasswordRules';
import './Auth.css';

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

    const isRegister = authMode === 'register';

    return (
        <div className="auth-container">
            <div className="auth-card">
                <form className="auth-box" onSubmit={isRegister ? handleRegister : handleLogin} noValidate>

                    <div className={`auth-field auth-field--slide${isRegister ? ' visible' : ''}`}>
                        <input
                            placeholder="username"
                            value={username}
                            onChange={handleUsernameChange}
                            className={getInputClass('username', username)}
                            tabIndex={isRegister ? 0 : -1}
                        />
                        {getErrMsg('username', username) && <p className="field-error">{getErrMsg('username', username)}</p>}
                        {availability.username === true && !liveErrors.username && error.field !== 'username' && username && (
                            <p className="field-success">available</p>
                        )}
                    </div>

                    <div className={`auth-field auth-field--slide${isRegister ? ' visible' : ''}`} style={{ transitionDelay: isRegister ? '0.05s' : '0s' }}>
                        <input
                            type="email"
                            placeholder="email"
                            value={email}
                            onChange={handleEmailChange}
                            className={getInputClass('email', email)}
                            tabIndex={isRegister ? 0 : -1}
                        />
                        {getErrMsg('email', email) && <p className="field-error">{getErrMsg('email', email)}</p>}
                    </div>

                    <div className={`auth-field auth-field--slide${!isRegister ? ' visible' : ''}`}>
                        <input
                            placeholder="username or email"
                            value={emailOrUsername}
                            onChange={e => { setEmailOrUsername(e.target.value); clearFieldState('login'); }}
                            className={getInputClass('login', emailOrUsername)}
                            tabIndex={isRegister ? -1 : 0}
                        />
                        {getErrMsg('login', emailOrUsername) && <p className="field-error">{getErrMsg('login', emailOrUsername)}</p>}
                    </div>

                    <div className="auth-field">
                        <div className="password-field">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="password"
                                value={password}
                                onChange={isRegister ? handlePasswordChange : e => setPassword(e.target.value)}
                                className={isRegister ? getInputClass('password', password) : (submitted && !password ? 'error' : '')}
                            />
                            <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? '✶' : '✧'}
                            </button>
                        </div>
                        {isRegister && <PasswordRules password={password} />}
                    </div>

                    <button type="submit" className="auth-submit">
                        {isRegister ? 'create account' : 'sign in'}
                    </button>
                </form>

                <button className="auth-link" onClick={() => setAuthMode(isRegister ? 'login' : 'register')}>
                    {isRegister ? 'back to sign in' : 'or sign up'}
                </button>
            </div>
        </div>
    );
};

export default AuthPage;
