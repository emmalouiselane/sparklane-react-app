import React from 'react';
import UpcomingAgenda from '../components/UpcomingAgenda';
import TodoList from '../components/TodoList';

interface HomepageProps {
  enabledModuleCount?: number;
  onOpenModuleSettings?: () => void;
}

function Homepage({ enabledModuleCount, onOpenModuleSettings }: HomepageProps) {
  return (
    <>
      {enabledModuleCount === 0 && (
        <section className="module-guidance" aria-labelledby="module-guidance-title">
          <div>
            <h2 id="module-guidance-title">Choose the modules you want to use</h2>
            <p>All modules are currently off. Open Account Settings to see what is available!</p>
          </div>
          <button type="button" onClick={onOpenModuleSettings}>
            Manage modules
          </button>
        </section>
      )}

      <div className="dashboard-grid homepage-grid">
        <UpcomingAgenda />
        <TodoList />
      </div>
    </>
  );
}

export default Homepage;
