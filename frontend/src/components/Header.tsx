import React from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import './Header.css';
import ConnectionStatus from './ConnectionStatus';
import { PersonCircle } from 'react-bootstrap-icons';

interface HeaderProps {
  user: any;
  error: string | null;
}

function Header({ user, error }: HeaderProps) {
  const { handleLogout } = useAuthContext();

  console.log(user);

  // Get user initials for fallback
  const getUserInitials = (user: any) => {
    if (user?.name?.givenName) {
      return user.name.givenName.charAt(0).toUpperCase();
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
            <div className="user-profile">
              {user.photos?.[0]?.value ? (
                <img 
                  src={user.photos[0].value} 
                  alt={user.name?.givenName || user.given_name} 
                  className="user-avatar"
                />
              ) : (
                <div className="user-avatar-fallback">
                  {getUserInitials(user)}
                </div>
              )}
              <span className="user-name">{user.name?.givenName || user.given_name}</span>
            </div>

            <ConnectionStatus />

            <button onClick={handleLogout} className="logout-btn">
              Logout
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
