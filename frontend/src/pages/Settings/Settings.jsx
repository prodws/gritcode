import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const SettingsPage = () => {
    const { handleSaveSettings, error, success } = useContext(AppContext);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const onSave = (e) => {
        e.preventDefault();
        handleSaveSettings(newUsername, newPassword);
        setNewUsername('');
        setNewPassword('');
    };

    return (
        <div className="settings-container">
            <form className="settings-box" onSubmit={onSave}>
                <div className="auth-field">
                    <p className="auth-label">New Username</p>
                    <input
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        className={error.field === 'username' ? 'error' : ''}
                    />
                    {error.field === 'username' && <p className="field-error">{error.message}</p>}
                    {success.field === 'username' && <p className="field-success">{success.message}</p>}
                </div>
                <div className="auth-field">
                    <p className="auth-label">New Password</p>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className={error.field === 'password' ? 'error' : ''}
                    />
                    {error.field === 'password' && <p className="field-error">{error.message}</p>}
                    {success.field === 'password' && <p className="field-success">{success.message}</p>}
                </div>
                <button type="submit" className="auth-submit">Save</button>
            </form>
        </div>
    );
};

export default SettingsPage;
