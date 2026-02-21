import React from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import './Header.css';
import ConnectionStatus from './ConnectionStatus';

interface HeaderProps {
  user: any;
  error: string | null;
}

function Header({ user, error }: HeaderProps) {
  const { handleLogout } = useAuthContext();

  return (
    <>
     <div className="toolbar">
        {user && (
          <>
            <div className="user-profile">
              <img 
                src={user.picture} 
                alt={user.given_name} 
                className="user-avatar"
              />
              <span className="user-name">{user.given_name}</span>
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
