import React from 'react';
import { List } from 'react-bootstrap-icons';

import { HeaderProps } from '../interfaces/HeaderProps';

import '../assets/styles/header.css';

function Header({ error, activeModuleLabel, isMobileMenuOpen, onOpenMobileMenu }: HeaderProps) {
  return (
    <header className="app-header" role="banner">
      <div className="header-leading">
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
        <div className="header-breadcrumb">
          <span>My planner</span>
          <span aria-hidden="true">/</span>
          <strong>{activeModuleLabel}</strong>
        </div>
      </div>
    
      {error && (
        <div className="error" role="alert" aria-live="polite">
          {error}
        </div>
      )}
    </header>
  )
}

export default Header;
