import { useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, PlusCircle, LogIn } from 'lucide-react';
import { APP_NAME } from '../../utils/constants';
import { AppContext } from '../../context/AppContext';
import './Navbar.css';

const NAV_ITEMS = [
    { path: '/forge', label: 'forge', icon: BookOpen },
    { path: '/host',     label: 'host', icon: PlusCircle },
    { path: '/join',     label: 'join', icon: LogIn },
];

const Navbar = () => {
    const { currentUser, theme, toggleTheme, logout, guardedNavigate } = useContext(AppContext);
    const [showMenu, setShowMenu] = useState(false);
    const location = useLocation();

    const handleNavigation = (path) => {
        setShowMenu(false);
        guardedNavigate(path);
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
                {APP_NAME}
            </button>

            {currentUser && (
                <div className="navbar-nav">
                    {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
                        const active = location.pathname === path;
                        return (
                            <button
                                key={path}
                                className={`navbar-nav-btn${active ? ' active' : ''}`}
                                onClick={() => handleNavigation(path)}
                            >
                                <Icon size={13} />
                                {label}
                            </button>
                        );
                    })}
                </div>
            )}

            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <button className="navbar-link" onClick={toggleTheme} style={{ fontSize: 23 }}>
                    {theme === 'dark' ? '☼' : '☾'}
                </button>
                {currentUser ? (
                    <div style={{ position: 'relative' }}>
                        <button className="navbar-avatar" onClick={() => handleNavigation('/users')} onContextMenu={handleContextMenu}>
                            {currentUser.avatarBase64
                                ? <img src={currentUser.avatarBase64} alt={currentUser.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : currentUser.username[0].toUpperCase()
                            }
                        </button>
                        {showMenu && (
                            <div className="user-menu">
                                <button onClick={() => handleNavigation('/users?tab=settings')}>settings</button>
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