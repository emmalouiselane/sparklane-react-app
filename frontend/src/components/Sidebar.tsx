import React from 'react';
import { PiggyBank, ForkKnife, HouseDoor, PersonGear, ClockHistory } from 'react-bootstrap-icons';
import './Sidebar.css';

export type ModuleId = 'home' | 'time-logs' | 'monthly-budget' | 'meal-planner' | 'account-settings';

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
}: SidebarProps) {
  return (
    <aside className={`app-sidebar${isCollapsed ? ' is-collapsed' : ''}${isMobileOpen ? ' is-mobile-open' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">Modules</h2>
        <button
          type="button"
          className="sidebar-collapse-toggle"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          onClick={onToggleCollapsed}
        >
          {isCollapsed ? '>' : '<'}
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
    </aside>
  );
}

export default Sidebar;
