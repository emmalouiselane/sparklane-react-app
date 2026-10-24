import React, { useEffect, useRef, useState } from 'react';
import { PiggyBank, ForkKnife, HouseDoor, PersonGear, ClockHistory, ArrowRepeat, CalendarWeek, HeartPulse, BoxArrowRight } from 'react-bootstrap-icons';

import { SidebarModuleId } from '../config/modules';
import { SidebarProps } from '../interfaces/SidebarProps';

import '../assets/styles/sidebar.css';

export type ModuleId = SidebarModuleId | 'account-settings';

function getNavIcon(moduleId: ModuleId) {
  switch (moduleId) {
    case 'home':
      return <HouseDoor size={16} />;
    case 'my-week':
      return <CalendarWeek size={16} />;
    case 'wellness':
      return <HeartPulse size={16} />;
    case 'time-logs':
      return <ClockHistory size={16} />;
    case 'monthly-budget':
      return <PiggyBank size={16} />;
    case 'meal-planner':
      return <ForkKnife size={16} />;
    case 'account-settings':
      return <PersonGear size={16} />;
    case 'recurring-routines':
      return <ArrowRepeat size={16} />;
    default:
      return null;
  }
}

function Sidebar({
  items,
  activeModule,
  onSelectModule,
  isCollapsed,
  onToggleCollapsed,
  isMobileOpen,
  onCloseMobile,
  width,
  minWidth,
  maxWidth,
  onResize,
  user,
  onOpenAccountSettings,
  onLogout,
}: SidebarProps) {
  const dragStart = useRef<{ pointerId: number; x: number; width: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [quote, setQuote] = useState<string | null>(null);
  const resizeTo = (nextWidth: number) => onResize(Math.min(maxWidth, Math.max(minWidth, nextWidth)));
  const stopResizing = () => {
    dragStart.current = null;
    setIsResizing(false);
  };

  useEffect(() => {
    if (typeof window.fetch !== 'function') 
      return undefined;
    
    const controller = new AbortController();
    window.fetch('https://sparklane.dev/api/quotes.json', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Unable to load quotes');
        return response.json();
      })
      .then((payload: unknown) => {
        const quotes = payload && typeof payload === 'object' ? (payload as { quotes?: unknown }).quotes : null;

        if (Array.isArray(quotes)) {
          const available = quotes.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
          if (available.length) 
            setQuote(available[Math.floor(Math.random() * available.length)]);
        }
      })
      .catch(() => { /* The sidebar remains useful when the quote feed is unavailable. */ });
    return () => controller.abort();
  }, []);

  const getUserInitial = () => {
    const name = user?.name?.givenName || user?.name || user?.given_name || '';
    return name ? String(name).charAt(0).toUpperCase() : 'U';
  };

  return (
    <aside className={`app-sidebar${isCollapsed ? ' is-collapsed' : ''}${isMobileOpen ? ' is-mobile-open' : ''}${isResizing ? ' is-resizing' : ''}`}>
      <div className="sidebar-header">
        <button type="button" className="sidebar-brand" onClick={() => onSelectModule('home')} aria-label="Sparklane Today">
          <img src="/sparklane-mark.png" alt="" aria-hidden="true" className="sidebar-brand-icon" />
          {!isCollapsed && (
            <span className="sidebar-brand-wordmark">
              sparklane
              <small>Your day, your pace</small>
            </span>
          )}
        </button>
        <button
          type="button"
          className="sidebar-collapse-toggle"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          onClick={onToggleCollapsed}
        >
          {isCollapsed ? '\u21AA' : '\u21A9'}
        </button>
        <button
          type="button"
          className="sidebar-mobile-close"
          aria-label="Close navigation menu"
          onClick={onCloseMobile}
        >
          Close
        </button>
      </div>

      {!isCollapsed && <div className="sidebar-workspace-label">Your planner</div>}
      <nav id="module-navigation" aria-label="Module navigation">
        <ul className="sidebar-nav-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`sidebar-link${activeModule === item.id ? ' is-active' : ''}`}
                aria-current={activeModule === item.id ? 'page' : undefined}
                onClick={() => onSelectModule(item.id)}
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  {getNavIcon(item.id)}
                </span>
                <span className="sidebar-link-text">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {!isCollapsed && <div className="sidebar-bottom">
        {quote && (
          <blockquote className="sidebar-quote">“{quote}”</blockquote>
        )}
        <div className="sidebar-note">
          <span className="sidebar-note-spark" aria-hidden="true">✳</span>
          <strong>A little progress<br />is still progress.</strong>
          <span>Take today one step at a time.</span>
        </div>
        <div className="sidebar-profile-row">
          <button type="button" className="sidebar-profile" onClick={onOpenAccountSettings} aria-label="Open account settings">
            {user?.picture || user?.photos?.[0]?.value ? <img src={user.picture || user.photos[0].value} alt="" /> : <span className="sidebar-avatar-fallback">{getUserInitial()}</span>}
            <span className="sidebar-profile-details">
              <strong>{user?.name?.givenName || user?.name || user?.given_name || 'Your profile'}</strong>
              <small>Account settings</small>
            </span>
          </button>
          <button type="button" className="sidebar-logout" onClick={onLogout} aria-label="Logout" title="Logout">
            <BoxArrowRight size={17} />
          </button>
        </div>
      </div>}
      {isCollapsed && <div className="sidebar-collapsed-actions">
        <button type="button" onClick={onOpenAccountSettings} aria-label="Open account settings" title="Account settings">
          <PersonGear size={16} />
        </button>
        <button type="button" onClick={onLogout} aria-label="Logout" title="Logout">
          <BoxArrowRight size={16} />
        </button>
      </div>}
      {!isCollapsed && (
        <div
          className="sidebar-resize-handle"
          role="separator"
          tabIndex={0}
          aria-label="Resize sidebar"
          aria-controls="module-navigation"
          aria-orientation="vertical"
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          aria-valuenow={width}
          aria-valuetext={`${width} pixels`}
          title="Drag to resize, or use the left and right arrow keys"
          onPointerDown={(event) => {
            if (event.button !== 0) 
              return;

            event.preventDefault();
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            dragStart.current = { pointerId: event.pointerId, x: event.clientX, width };
            setIsResizing(true);
          }}
          onPointerMove={(event) => {
            const start = dragStart.current;
            if (start && start.pointerId === event.pointerId) {
              resizeTo(start.width + event.clientX - start.x);
            }
          }}
          onPointerUp={(event) => {
            if (dragStart.current?.pointerId !== event.pointerId) 
              return;
            
            event.currentTarget.releasePointerCapture(event.pointerId);
            stopResizing();
          }}
          onPointerCancel={stopResizing}
          onLostPointerCapture={stopResizing}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 50 : 10;
            switch (event.key) {
              case 'ArrowLeft': resizeTo(width - step); break;
              case 'ArrowRight': resizeTo(width + step); break;
              case 'Home': resizeTo(minWidth); break;
              case 'End': resizeTo(maxWidth); break;
              default: return;
            }
            event.preventDefault();
          }}
        />
      )}
    </aside>
  );
}

export default Sidebar;
