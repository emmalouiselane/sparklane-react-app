import React from 'react';
import { Stars } from 'react-bootstrap-icons';

import '../assets/styles/footer.css';

const Footer: React.FC = () => (
  <footer className="site-footer">
    <span className="site-footer-tagline">
      Made for a life that feels like yours <Stars aria-hidden="true" className="site-footer-spark" />
    </span>
    <span>
      © {new Date().getFullYear()}{' '}
      <a
        href="https://sparklane.dev"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Spark Lane website (opens in a new tab)"
      >
        Spark Lane
      </a>
    </span>
    <nav aria-label="Legal">
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Service</a>
    </nav>
  </footer>
);

export default Footer;
