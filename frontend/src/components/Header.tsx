import React from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import './Header.css';
import ConnectionStatus from './ConnectionStatus';
import { BoxArrowRight, List } from 'react-bootstrap-icons';

interface HeaderProps {
  user: any;
  error: string | null;
  isMobileMenuOpen: boolean;
  onOpenMobileMenu: () => void;
}

function Header({ user, error, isMobileMenuOpen, onOpenMobileMenu }: HeaderProps) {
  const { handleLogout } = useAuthContext();

  // Get user initials for fallback
  const getUserInitials = (user: any) => {
    if (user?.name?.givenName) {
      return user.name.givenName.charAt(0).toUpperCase();
    }
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.given_name) {
      return user.given_name.charAt(0).toUpperCase();
    }
    return 'U'; // Default fallback
  };

  return (
    <>
      <div className="toolbar">
        {user && (
          <>
            <div className="toolbar-left">
              <button
                type="button"
                className="mobile-menu-btn"
                aria-label="Open navigation menu"
                aria-controls="module-navigation"
                aria-expanded={isMobileMenuOpen}
                onClick={onOpenMobileMenu}
              >
                <List size={20} />
              </button>
              <div className="user-profile">
                {user.picture || user.photos?.[0]?.value ? (
                  <img
                    src={user.picture || user.photos[0].value}
                    alt={user.name?.givenName || user.given_name}
                    className="user-avatar"
                  />
                ) : (
                  <div className="user-avatar-fallback">
                    {getUserInitials(user)}
                  </div>
                )}
                <span className="user-name">{user.name?.givenName || user.name || user.given_name}</span>
              </div>
            </div>

            <ConnectionStatus />

            <button onClick={handleLogout} className="logout-btn" aria-label="Logout">
              <span className="logout-btn-text"><BoxArrowRight size={14} /> Logout</span>
              <span className="logout-btn-emoji" aria-hidden="true">
                <BoxArrowRight size={18} />
              </span>
            </button>
          </>
        )}
      </div>
      <header className="app-header" role="banner">
        <div className="header-content">
          <h1>Personal Assistant</h1>
          <i>Spark Lane Dev</i>
        </div>
        {error && <div className="error" role="alert" aria-live="polite">{error}</div>}
      </header>
    </>
  );
}

export default Header;
