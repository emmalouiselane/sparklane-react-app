import React from 'react';
import './meal-planner.css';

const REFERENCE_GUIDES = [
  {
    title: 'Spark Lane Recipes',
    href: 'https://sparklane.dev/digital-garden/recipes/'
  },
  {
    title: 'PCOS Reference Guide',
    href: '#'
  }
];

function MealPlannerPage() {
  return (
    <section className="meal-planner-page" aria-label="Meal Planner module">
      <div className="meal-planner-main module-placeholder">
        <p>Meal Planner module coming soon.</p>
      </div>

      <aside className="meal-planner-sidebar" aria-label="Reference guides">
        <div className="meal-planner-sidebar-card">
          <h3>Reference Guides</h3>
          <p>Useful links to keep nearby while planning meals.</p>

          <ul className="meal-planner-links">
            {REFERENCE_GUIDES.map((guide) => (
              <li key={guide.href}>
                <a href={guide.href} rel="noreferrer">
                  {guide.title}
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
