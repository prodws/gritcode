import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

const HomePage = () => {
    const { currentUser, goPractice } = useContext(AppContext);
    const navigate = useNavigate();

    if (currentUser) {
        navigate('/practice');
        return null;
    }

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
};

export default HomePage;
