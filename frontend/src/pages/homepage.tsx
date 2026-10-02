import React from 'react';
import UpcomingAgenda from '../components/UpcomingAgenda';
import TodoList from '../components/TodoList';
import { Button, Card, Tab, Tabs } from 'react-bootstrap';
import RecurringRoutines from '../components/RecurringRoutines';

interface HomepageProps {
  enabledModuleCount?: number;
  onOpenModuleSettings?: () => void;
  routinesEnabled?: boolean;
  defaultHomepageTab?: 'events' | 'routines';
}

function Homepage({ enabledModuleCount, onOpenModuleSettings, routinesEnabled = false, defaultHomepageTab = 'events' }: HomepageProps) {
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
        <div className="homepage-agenda-panel">
          <Tabs key={defaultHomepageTab} defaultActiveKey={defaultHomepageTab} id="homepage-agenda-tabs" mountOnEnter unmountOnExit>
            <Tab eventKey="events" title="Upcoming Events"><UpcomingAgenda /></Tab>
            <Tab eventKey="routines" title="Recurring Routines">
              {routinesEnabled ? <RecurringRoutines todayOnly /> : (
                <Card><Card.Body>
                  <Card.Title as="h2">Recurring Routines</Card.Title>
                  <p>Enable Recurring Routines in Account Settings to create reusable checklists and see today’s steps here.</p>
                  <Button onClick={onOpenModuleSettings}>Manage modules</Button>
                </Card.Body></Card>
              )}
            </Tab>
          </Tabs>
        </div>
        <TodoList />
      </div>
    </>
  );
}

export default Homepage;
