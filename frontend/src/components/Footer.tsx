import React from 'react';
import './Footer.css';

const Footer: React.FC = () => (
  <footer className="site-footer">
    <span>© {new Date().getFullYear()} Spark Lane Dev</span>
    <nav aria-label="Legal">
      <a href="/privacy.html">Privacy Policy</a>
      <a href="/terms.html">Terms of Service</a>
    </nav>
  </footer>
);

export default Footer;
