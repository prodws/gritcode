import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import './Settings.css';

const SettingsPage = () => {
    const { handleSaveSettings, error, success, showConfirm, deleteAccount } = useContext(AppContext);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const onSave = (e) => {
        e.preventDefault();
        handleSaveSettings(newUsername, newPassword);
        setNewUsername('');
        setNewPassword('');
    };

    const onDeleteAccount = async () => {
        const confirmed = await showConfirm({
            message: 'delete your account? this cannot be undone.',
            confirmLabel: 'delete',
        });
        if (confirmed) deleteAccount();
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
            <div className="settings-box settings-danger">
                <p className="settings-danger-label">danger zone</p>
                <button className="settings-delete-btn" onClick={onDeleteAccount}>delete account</button>
            </div>
        </div>
    );
};

export default SettingsPage;
