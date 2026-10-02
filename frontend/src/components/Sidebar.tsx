import React, { useRef, useState } from 'react';
import { PiggyBank, ForkKnife, HouseDoor, PersonGear, ClockHistory, ArrowRepeat } from 'react-bootstrap-icons';
import './Sidebar.css';

export type ModuleId = 'home' | 'time-logs' | 'monthly-budget' | 'meal-planner' | 'recurring-routines' | 'account-settings';

export interface ModuleNavItem {
  id: ModuleId;
  label: string;
}

interface SidebarProps {
  items: ModuleNavItem[];
  activeModule: ModuleId;
  onSelectModule: (module: ModuleId) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  width: number;
  minWidth: number;
  maxWidth: number;
  onResize: (width: number) => void;
}

function getNavIcon(moduleId: ModuleId) {
  switch (moduleId) {
    case 'home':
      return <HouseDoor size={16} />;
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
}: SidebarProps) {
  const dragStart = useRef<{ pointerId: number; x: number; width: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeTo = (nextWidth: number) => onResize(Math.min(maxWidth, Math.max(minWidth, nextWidth)));
  const stopResizing = () => {
    dragStart.current = null;
    setIsResizing(false);
  };

  return (
    <aside className={`app-sidebar${isCollapsed ? ' is-collapsed' : ''}${isMobileOpen ? ' is-mobile-open' : ''}${isResizing ? ' is-resizing' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">Modules</h2>
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
            if (event.button !== 0) return;
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
            if (dragStart.current?.pointerId !== event.pointerId) return;
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
