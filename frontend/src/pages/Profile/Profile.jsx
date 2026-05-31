import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const ProfilePage = () => {
    const { currentUser } = useContext(AppContext);
    const initials = currentUser?.username?.slice(0, 2).toUpperCase();
    const score = currentUser?.totalPoints ?? 0;
    const maxScore = 1000;
    const progress = score % maxScore;

    const circumference = 2 * Math.PI * 36;
    const offset = circumference - (progress / maxScore) * circumference;

    const joined = currentUser?.createdAt
        ? new Date(currentUser.createdAt)
              .toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
              })
              .toLowerCase()
        : null;

    return (
        <div className="profile-container">
            <div className="profile-layout">
                <div className="profile-card">
                    <div className="profile-header">
                        <div className="profile-ring-wrap">
                            <svg
                                width="88"
                                height="88"
                                viewBox="0 0 88 88"
                                style={{ transform: 'rotate(-90deg)' }}
                            >
                                <circle
                                    cx="44"
                                    cy="44"
                                    r="36"
                                    fill="none"
                                    stroke="var(--border)"
                                    strokeWidth="3"
                                />
                                <circle
                                    cx="44"
                                    cy="44"
                                    r="36"
                                    fill="none"
                                    stroke="var(--text-muted)"
                                    strokeWidth="3"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="profile-ring-inner">
                                <span className="profile-initials">
                                    {initials}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="profile-info">
                        <p className="profile-username">
                            {currentUser?.username}
                        </p>
                        <p className="profile-score">
                            {score} / {maxScore}
                        </p>
                    </div>

                    <hr className="profile-divider" />

                    {joined && (
                        <div className="profile-row">
                            <span className="profile-label">
                                joined
                            </span>
                            <span className="profile-value">
                                {joined}
                            </span>
                        </div>
                    )}
                </div>

                <div className="profile-stats">
                    <p className="profile-section-title">
                        stats
                    </p>
                    <div className="stats-grid">
                        <div className="stat-box">
                            <span className="stat-label">attempted</span>
                            <span className="stat-value">—</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-label">passed</span>
                            <span className="stat-value">—</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-label">pass rate</span>
                            <span className="stat-value">—</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-label">best streak</span>
                            <span className="stat-value">—</span>
                        </div>
                    </div>
                </div>

                <div className="profile-submissions">
                    <hr className="profile-divider submissions-divider" />
                    <p className="profile-section-title">
                        recent submissions
                    </p>
                    <div className="profile-empty-box">
                        <p className="profile-empty">
                            no submissions yet
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
