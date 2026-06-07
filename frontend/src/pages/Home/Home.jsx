import React, { useContext } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { APP_NAME } from '../../utils/constants';

const HomePage = () => {
    const { currentUser } = useContext(AppContext);
    const navigate = useNavigate();

    if (currentUser) {
        return <Navigate to="/forge" replace />;
    }

    return (
        <div className="home-container">
            <h1 className="landing-title">
                {APP_NAME}
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
