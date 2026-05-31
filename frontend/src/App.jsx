import { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AppContext } from './context/AppContext';

import Navbar from './components/Navbar/Navbar';
import HomePage from './pages/Home/Home';
import AuthPage from './pages/Auth/Auth';
import ProfilePage from './pages/Profile/Profile';
import SettingsPage from './pages/Settings/Settings';
import PracticePage from './pages/Practice/Practice';

// A component to protect routes that require a logged-in user.
const ProtectedRoute = ({ children }) => {
    const { currentUser } = useContext(AppContext);
    return currentUser ? children : <Navigate to="/auth" replace />;
};

function App() {
    return (
        <>
            <Navbar />
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />

                {/* Protected Routes */}
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/practice" element={<ProtectedRoute><PracticePage /></ProtectedRoute>} />
            </Routes>
        </>
    );
}

export default App;