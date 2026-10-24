import React, { useState } from 'react';

import { useAuthContext } from '../contexts/auth-context';
import MealPlanner from '../components/meal-planner';
import PMOSReferenceGuide from '../components/pmos-reference-guide';

import '../assets/styles/meal-planner.css';

const QUICK_LINKS = [
  {
    title: 'Spark Lane Recipes',
    href: 'https://sparklane.dev/digital-garden/recipes/'
  }
];

function MealPlannerPage() {
  const { user } = useAuthContext();
  const [activePage, setActivePage] = useState("meal-planner");

  return (
    <section className="page-container meal-planner-page" aria-label="Meals and Home module">
      <div className="meal-planner-main">

        <div hidden={activePage !== 'meal-planner'}>
          <MealPlanner key={user.id} />
        </div>
        {activePage === "pmos-reference-guide" && (
          <PMOSReferenceGuide />
        )}  
      </div>

      <section className="meal-planner-ctas" aria-label="More meals and home resources">
        <button
          className="meal-planner-cta"
          type="button"
          aria-pressed={activePage === 'meal-planner'}
          onClick={() => setActivePage('meal-planner')}
        >
          <span className="meal-planner-cta-copy"><strong>Meals &amp; Home</strong><span>Return to your meal plan and home reset.</span></span>
          <span aria-hidden="true">→</span>
        </button>
        <button
          className="meal-planner-cta"
          type="button"
          aria-pressed={activePage === 'pmos-reference-guide'}
          onClick={() => setActivePage('pmos-reference-guide')}
        >
          <span className="meal-planner-cta-copy"><strong>PMOS Reference Guide</strong><span>Open your reference guide for practical support.</span></span>
          <span aria-hidden="true">→</span>
        </button>
        {QUICK_LINKS.map((link) => (
          <a className="meal-planner-cta" key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
            <span className="meal-planner-cta-copy"><strong>{link.title}</strong><span>Need inspiration? Explore recipes.</span></span>
            <span aria-hidden="true">↗</span>
          </a>
        ))}
      </section>
    </section>
  );
}

export default MealPlannerPage;
