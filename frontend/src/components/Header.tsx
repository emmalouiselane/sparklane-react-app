import React, { useEffect, useRef, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import './Header.css';
import ConnectionStatus from './ConnectionStatus';
import { BoxArrowRight, Gear, List } from 'react-bootstrap-icons';

interface HeaderProps {
  user: any;
  error: string | null;
  isMobileMenuOpen: boolean;
  onOpenMobileMenu: () => void;
  onOpenAccountSettings: () => void;
}

interface Quote {
  text: string;
  author?: string;
}

const getQuotes = (payload: unknown): Quote[] => {
  let entries: unknown[] = [];

  if (Array.isArray(payload)) {
    entries = payload;
  } else if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>;
    const nestedEntries = data.quotes || data.items || data.data;
    entries = Array.isArray(nestedEntries) ? nestedEntries : [payload];
  }

  return entries.reduce<Quote[]>((quotes, entry) => {
    if (typeof entry === 'string' && entry.trim()) {
      quotes.push({ text: entry.trim() });
      return quotes;
    }

    if (!entry || typeof entry !== 'object') return quotes;

    const item = entry as Record<string, unknown>;
    const text = item.quote || item.text || item.content;
    if (typeof text !== 'string' || !text.trim()) return quotes;

    const author = item.author || item.by || item.source;
    quotes.push({
      text: text.trim(),
      ...(typeof author === 'string' && author.trim() ? { author: author.trim() } : {}),
    });
    return quotes;
  }, []);
};

function Header({ user, error, isMobileMenuOpen, onOpenMobileMenu, onOpenAccountSettings }: HeaderProps) {
  const { handleLogout } = useAuthContext();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('https://sparklane.dev/api/quotes.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load quotes');
        return response.json();
      })
      .then((payload: unknown) => {
        const quotes = getQuotes(payload);
        if (quotes.length) {
          setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
        }
      })
      .catch(() => {
        // The quote is optional; keep the header usable when the feed is unavailable.
      });

    return () => controller.abort();
  }, []);

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

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileMenuOpen]);

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
              <div className="profile-menu" ref={profileMenuRef}>
                <button
                  type="button"
                  className="user-profile"
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                  onClick={() => setIsProfileMenuOpen((current) => !current)}
                >
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
                </button>

                {isProfileMenuOpen && (
                  <div className="profile-menu-popover" role="menu" aria-label="Account menu">
                    <button
                      type="button"
                      className="profile-menu-item"
                      role="menuitem"
                      onClick={() => {
                        onOpenAccountSettings();
                        setIsProfileMenuOpen(false);
                      }}
                    >
                      <Gear size={15} />
                      <span>Account Settings</span>
                    </button>
                  </div>
                )}
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
        <img src="/images/pressed-sprig.svg" alt="" aria-hidden="true" className="header-botanical" />
        <div className="header-content">
          <h1>Spark Lane</h1>
          <span className="brand-tag">Personal Assistant</span>
          {quote && (
            <blockquote className="header-quote">
              <p>“{quote.text}”</p>
              {quote.author && <cite>— {quote.author}</cite>}
            </blockquote>
          )}
        </div>
        {error && <div className="error" role="alert" aria-live="polite">{error}</div>}
      </header>
    </>
  );
}

export default Header;
