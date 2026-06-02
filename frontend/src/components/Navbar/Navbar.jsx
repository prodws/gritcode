import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import './Navbar.css';

const Navbar = () => {
    const { currentUser, theme, toggleTheme, logout } = useContext(AppContext);
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);

    const handleNavigation = (path) => {
        setShowMenu(false);
        navigate(path);
    };

    const handleLogout = () => {
        setShowMenu(false);
        logout();
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        setShowMenu(!showMenu);
    };

    return (
        <nav className="navbar">
            <button className="navbar-logo" onClick={() => handleNavigation('/')}>
                appname
            </button>

            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <button className="navbar-link" onClick={toggleTheme} style={{ fontSize: 23 }}>
                    {theme === 'dark' ? '☼' : '☾'}
                </button>
                {currentUser ? (
                    <div style={{ position: 'relative' }}>
                        <button className="navbar-avatar" onClick={() => handleNavigation('/profile')} onContextMenu={handleContextMenu}>
                            {currentUser.username[0].toUpperCase()}
                        </button>
                        {showMenu && (
                            <div className="user-menu">
                                <button onClick={() => handleNavigation('/settings')}>settings</button>
                                <button onClick={handleLogout}>log out</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button className="navbar-link" onClick={() => handleNavigation('/auth')}>sign in</button>
                )}
            </div>
        </nav>
    );
};

export default Navbar;