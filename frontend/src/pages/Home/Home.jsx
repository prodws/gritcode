import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

const HomePage = () => {
    const { currentUser, goPractice } = useContext(AppContext);
    const navigate = useNavigate();

    if (!currentUser) {
        return (
            <div className="home-container">
                <h1 className="landing-title">
                    appname
                </h1>
                <button
                    className="compete-btn"
                    onClick={() => navigate('/auth')}
                >
                    compete
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-inner">
                <div className="dashboard-actions">
                    <button className="dashboard-command" onClick={goPractice}>
                        practice
                    </button>
                    <button className="dashboard-command">
                        create room
                    </button>
                    <button className="dashboard-command">
                        join room
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
