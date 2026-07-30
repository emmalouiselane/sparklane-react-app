import React, { useState } from 'react';
import './meal-planner.css';
import { ModuleNavItem } from '../components/Sidebar';
import MealPlanner from '../components/MealPlanner';
import PCOSReferenceGuide from '../components/PCOSReferenceGuide';

const QUICK_LINKS = [
  {
    title: 'Spark Lane Recipes',
    href: 'https://sparklane.dev/digital-garden/recipes/'
  }
];

function MealPlannerPage() {
  const [activePage, setActivePage] = useState("meal-planner");

  return (
    <section className="meal-planner-page" aria-label="Meal Planner module">
      <div className="meal-planner-main module-placeholder">

        {activePage == "meal-planner" && (
          <MealPlanner />
        )}
        {activePage == "pcos-reference-guide" && (
          <PCOSReferenceGuide />
        )}  
      </div>

      <aside className="meal-planner-sidebar" aria-label="Reference guides">
        <div className="meal-planner-sidebar-card">
          <ul className="meal-planner-links">
            <button
              type="button"
              onClick={() => setActivePage("meal-planner")}
            >
              <span>Meal Planner</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePage("pcos-reference-guide")}
            >
              <span>PCOS Reference Guide</span>
            </button>
          </ul>

          <p>Useful external links to keep nearby while planning meals.</p>

          <ul className="meal-planner-links">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} rel="noreferrer">
                  {link.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </section>
  );
}

export default MealPlannerPage;
