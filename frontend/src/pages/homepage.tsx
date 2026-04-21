import React from 'react';
import UpcomingAgenda from '../components/UpcomingAgenda';
import TodoList from '../components/TodoList';

function Homepage() {
  return (
    <div className="dashboard-grid homepage-grid">
      <UpcomingAgenda />
      <TodoList />
    </div>
  );
}

export default Homepage;
