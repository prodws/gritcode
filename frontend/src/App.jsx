import { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AppContext } from './context/AppContext';

import Navbar from './components/Navbar/Navbar';
import Spinner from './components/Spinner/Spinner';
import HomePage from './pages/Home/Home';
import AuthPage from './pages/Auth/Auth';
import ProfilePage from './pages/Profile/Profile';
import SettingsPage from './pages/Settings/Settings';
import PracticePage from './pages/Practice/Practice';
import ProblemsPage from './pages/Problems/Problems';

const ProtectedRoute = ({ children }) => {
    const { currentUser } = useContext(AppContext);
    return currentUser ? children : <Navigate to="/auth" replace />;
};

function App() {
    const { authLoading } = useContext(AppContext);

    if (authLoading) return <Spinner />;

    return (
        <div className="app-fade">
            <Navbar />
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/solve" element={<ProtectedRoute><PracticePage /></ProtectedRoute>} />
                <Route path="/practice" element={<ProtectedRoute><ProblemsPage /></ProtectedRoute>} />
            </Routes>
        </div>
    );
}

export default App;