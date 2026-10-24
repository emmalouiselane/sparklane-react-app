import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Card, ListGroup, Spinner, Alert, Modal, Form, Button } from 'react-bootstrap';
import { CheckSquare, Plus, X, Trash3, Flag, Pencil, ArrowClockwise, Calendar3, Clock, GripVertical } from 'react-bootstrap-icons';

import { apiClient } from '../helpers/auth';
import { parseInputDate } from '../helpers/helper';
import { useRefreshOnPageActivation } from '../helpers/page-refresh';
import { TodoListProps } from '../interfaces/TodoListProps';
import { Todo } from '../interfaces/Todo';

import '../assets/styles/todo-list.css';

type CalendarEvent = { id: string; title: string; start: { dateTime?: string; date?: string }; location?: string; status: string };

const TodoList: React.FC<TodoListProps> = ({ heading, eyebrow, subtitle, inlineEditing = false, showAddButton = true, includeCalendarEvents = false, selectedDate, pageModuleId = 'my-week', onManageTasks }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(includeCalendarEvents);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAllTodos, setShowAllTodos] = useState(false);
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: selectedDate || '',
    time: '',
    tag: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasLoadedTodos = useRef(false);
  const hasLoadedCalendar = useRef(false);

  const fetchTodos = useCallback(async () => {
    try {
      if (!hasLoadedTodos.current) 
        setLoading(true);

      setError(null);
      
      const response = await apiClient.get('/api/todos');
      
      // Honor the saved manual order everywhere, with priority order as a fallback.
      const sortedTodos = response.data.todos.sort((a: Todo, b: Todo) => {
        const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : null;
        const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : null;
        if (aOrder !== null && bOrder !== null) 
          return aOrder - bOrder;

        if (aOrder !== null) 
          return -1;

        if (bOrder !== null) 
          return 1;

        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        const priorityOrder = { high: 0, medium: 1, low: 2 };

        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      
      setTodos(sortedTodos);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Something went wrong, try logging out and back in again.');
      } else {
        setError('Failed to fetch todos');
      }
      console.error('Todos fetch error:', err);
    } finally {
      hasLoadedTodos.current = true;
      setLoading(false);
    }
  }, [inlineEditing]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);
  useRefreshOnPageActivation(pageModuleId, fetchTodos);

  useEffect(() => {
    if (selectedDate) 
      setFormData(current => ({ ...current, date: selectedDate }));

  }, [selectedDate]);

  const datedTodos = selectedDate ? todos.filter(todo => !todo.date || todo.date === selectedDate) : todos;
  const visibleTodos = showAllTodos || inlineEditing ? datedTodos : datedTodos.slice(0, 5);

  useEffect(() => {
    if (!includeCalendarEvents) 
      return;

    if (!hasLoadedCalendar.current) 
      setCalendarLoading(true);

    const start = selectedDate ? parseInputDate(selectedDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    apiClient.get('/api/calendar/events', { params: { timeMin: start.toISOString(), timeMax: end.toISOString() } })
      .then(response => {
        setCalendarEvents((response.data.events || []).filter((event: CalendarEvent) => event.status !== 'cancelled'))
      })
      .catch(error => console.error('Calendar priorities could not be fetched:', error))
      .finally(() => { 
        hasLoadedCalendar.current = true; 
        setCalendarLoading(false); 
      });
  }, [includeCalendarEvents, selectedDate]);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingTodo) {
        // Update existing todo
        await apiClient.put(`/api/todos/${editingTodo._id}`, formData);
        toast.success('Task updated.');
      } else {
        // Create new todo
        await apiClient.post('/api/todos', formData);
        toast.success('Task created.');
      }

      resetForm();
      fetchTodos();
    } catch (err: any) {
      console.error('Error saving todo:', err);
      toast.error('Failed to save todo. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    try {
      await apiClient.put(`/api/todos/${todo._id}`, {
        completed: !todo.completed
      });

      fetchTodos();
      toast.success(todo.completed ? 'Task marked as active.' : 'Task completed.');
    } catch (err: any) {
      console.error('Error toggling todo:', err);
      toast.error('Failed to update todo. Please try again.');
    }
  };

  const handleInlineUpdate = async (todo: Todo, updates: Partial<Todo>) => {
    const nextTodo = { ...todo, ...updates };
    if ((nextTodo.title || '').trim() === '') {
      toast.error('A task needs a title.');
      fetchTodos();
      return;
    }
    try {
      const normalizedUpdates = updates.title === undefined ? updates : { ...updates, title: updates.title.trim() };
      await apiClient.put(`/api/todos/${todo._id}`, normalizedUpdates);
      setTodos(current => current.map(item => item._id === todo._id ? { ...item, ...normalizedUpdates } : item));
    } catch (err) {
      console.error('Error updating todo:', err);
      toast.error('Failed to update task. Please try again.');
      fetchTodos();
    }
  };

  const handleInlineAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) 
      return;

    setIsSubmitting(true);
    try {
      await apiClient.post('/api/todos', { ...formData, title: formData.title.trim() });
      setFormData({ title: '', description: '', date: selectedDate || '', time: '', tag: '', priority: 'medium' });
      toast.success('Task created.');
      fetchTodos();
    } catch (err) {
      console.error('Error creating todo:', err);
      toast.error('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveVisibleOrder = async (orderedVisibleTodos: Todo[]) => {
    if (reordering) 
      return;

    const visibleIds = new Set(orderedVisibleTodos.map(todo => todo._id));
    let visibleIndex = 0;
    const previousTodos = todos;
    const orderedTodos = todos
      .map(todo => visibleIds.has(todo._id) ? orderedVisibleTodos[visibleIndex++] : todo)
      .map((todo, sortOrder) => ({ ...todo, sortOrder }));
    setTodos(orderedTodos);
    setReordering(true);

    try {
      await apiClient.patch('/api/todos/reorder', { todoIds: orderedTodos.map(todo => todo._id) });
    } catch {
      setTodos(previousTodos);
      toast.error('Unable to save the task order. Please try again.');
    } finally {
      setReordering(false);
    }
  };

  const moveVisibleTodo = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= visibleTodos.length || fromIndex === toIndex || reordering) 
      return;

    const orderedVisibleTodos = [...visibleTodos];
    const [movedTodo] = orderedVisibleTodos.splice(fromIndex, 1);
    orderedVisibleTodos.splice(toIndex, 0, movedTodo);
    void saveVisibleOrder(orderedVisibleTodos);
  };

  const startTodoDrag = (event: React.DragEvent<HTMLButtonElement>, todoId: string) => {
    setDraggedTodoId(todoId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', todoId);
  };

  const dropTodo = (event: React.DragEvent<HTMLElement>, targetTodoId: string) => {
    event.preventDefault();
    const sourceTodoId = event.dataTransfer.getData('text/plain') || draggedTodoId;
    setDraggedTodoId(null);
    if (!sourceTodoId || sourceTodoId === targetTodoId || reordering) 
      return;

    const fromIndex = visibleTodos.findIndex(todo => todo._id === sourceTodoId);
    const toIndex = visibleTodos.findIndex(todo => todo._id === targetTodoId);
    if (fromIndex < 0 || toIndex < 0) 
      return;
    
    moveVisibleTodo(fromIndex, toIndex);
  };

  const handleDeleteTodo = async (todo: Todo) => {
    try {
      await apiClient.delete(`/api/todos/${todo._id}`);

      fetchTodos();
      toast.success('Task deleted.');
    } catch (err: any) {
      console.error('Error deleting todo:', err);
      toast.error('Failed to delete todo. Please try again.');
    }
  };

  const handleClearCompleted = async () => {
    try {
      const completedTodos = todos.filter(todo => todo.completed && (!selectedDate || !todo.date || todo.date === selectedDate));
      
      // Delete all completed todos
      await Promise.all(
        completedTodos.map(todo =>
          apiClient.delete(`/api/todos/${todo._id}`)
        )
      );

      fetchTodos();
      toast.success('Completed tasks cleared.');
    } catch (err: any) {
      console.error('Error clearing completed todos:', err);
      toast.error('Failed to clear completed todos. Please try again.');
    }
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description,
      date: todo.date || '',
      time: todo.time || '',
      tag: todo.tag || '',
      priority: todo.priority
    });
    setShowModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: selectedDate || '',
      time: '',
      tag: '',
      priority: 'medium'
    });
    setEditingTodo(null);
    setShowModal(false);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Flag className="text-danger" />;
      case 'medium':
        return <Flag className="text-warning" />;
      case 'low':
        return <Flag className="text-info" />;
      default:
        return <Flag className="text-secondary" />;
    }
  };

  return (
    <Card className={`todo-card${inlineEditing ? ' todo-inline-edit' : ''}`}>
      <Card.Header>
        <div className="todo-header">
          <div className="todo-header-left">
            <CheckSquare />
            <div>
              {eyebrow && <span className="todo-card-eyebrow">{eyebrow}</span>}
              
              <Card.Title as="h2">{heading || 'Today’s priorities'}</Card.Title>
              <div className="todo-card-subtitle">
                {subtitle || 'A quick look at what’s on your mind'}
              </div>
            </div>
          </div>
          <div className="todo-header-actions">
            {!inlineEditing && <Button variant="link" size="sm" className="manage-tasks-link" onClick={onManageTasks || (() => setShowAllTodos(current => !current))}>
              {onManageTasks ? 'Manage tasks' : showAllTodos ? 'Show fewer' : 'Manage tasks'} <span aria-hidden="true">→</span>
            </Button>}
            <Button
              variant="secondary" 
              size="sm" 
              onClick={handleClearCompleted}
              className="clear-completed-btn"
              disabled={!inlineEditing && !todos.some(todo => todo.completed)}
              hidden={!showAllTodos && !inlineEditing}
            >
              {!inlineEditing && <ArrowClockwise size={16} />}
              {inlineEditing ? 'Clear done' : 'Clear Completed'}
            </Button>
            {showAddButton && <Button
              variant="primary" 
              size="sm" 
              onClick={() => setShowModal(true)}
              className="quick-add-btn"
            >
              <Plus size={16} />
              Add Task
            </Button>}
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="warning">
            <CheckSquare />
            {error ?? 'Sorry! Something went wrong, try again later.'}
          </Alert>
        )}

        {loading && (
          <div className="loading-message">
            <Spinner animation="border" size="sm" role="status">
              <span className="visually-hidden">Loading todos...</span>
            </Spinner>
            <span>Loading your tasks…</span>
          </div>
        )}

        {!error && !loading && todos.length === 0 && !calendarEvents.length && !calendarLoading && !inlineEditing && (
          <div className="no-todos">
            <CheckSquare size={48} />
            <h3>{heading ? 'Nothing on your list yet' : 'No tasks yet'}</h3>
            <p>{heading ? 'Space for what matters today.' : 'Start by adding your first task!'}</p>
          </div>
        )}
        {!error && !loading && inlineEditing && datedTodos.length === 0 && (
          <p className="todo-inline-empty">Nothing on your list for this day. Enjoy the breathing room.</p>
        )}

        {!loading && !error && (todos.length > 0 || calendarEvents.length > 0) && (
          <ListGroup variant="flush">
            {calendarEvents.map(event => (
              <ListGroup.Item key={`calendar-${event.id}`} className="todo-item calendar-priority-item">
                <div className="todo-content">
                  <div className="todo-left">
                    <span className="calendar-priority-icon">
                      <Calendar3 aria-hidden="true" />
                    </span>
                    <div className="todo-info">
                      <p className="todo-title">{event.title || 'Calendar event'}</p>
                      <p className="todo-description">
                        {event.start.date ? 'All day' : event.start.dateTime ? new Date(event.start.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Time not set'}{event.location ? ` · ${event.location}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="calendar-priority-label"><Clock aria-hidden="true" /> 
                    Calendar priority
                  </span>
                </div>
              </ListGroup.Item>))}
            {visibleTodos.map((todo, todoIndex) => (
              <ListGroup.Item key={todo._id} className={`todo-item ${todo.completed ? 'completed' : ''}${draggedTodoId === todo._id ? ' is-being-dragged' : ''}`} onDragOver={event => { if (inlineEditing && draggedTodoId && draggedTodoId !== todo._id) event.preventDefault(); }} onDrop={event => inlineEditing && dropTodo(event, todo._id)}>
                <div className="todo-content">
                  <div className="todo-left">
                    <Button
                      variant="link"
                      className="checkbox"
                      aria-label={`${todo.completed ? 'Mark incomplete' : 'Complete'} ${todo.title}`}
                      aria-pressed={todo.completed}
                      onClick={() => handleToggleComplete(todo)}
                    >
                      {todo.completed ? '✓' : ''}
                    </Button>
                    <div className="todo-info">
                      <div className="todo-title-row">
                        {inlineEditing ? <Form.Control id={`${pageModuleId}-todo-title-${todo._id}`} name={`${pageModuleId}-todo-title-${todo._id}`} aria-label={`Task name: ${todo.title}`} className="todo-inline-title" type="text" maxLength={120} defaultValue={todo.title} onBlur={event => { if (event.target.value !== todo.title) handleInlineUpdate(todo, { title: event.target.value }); }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /> : <p className={`todo-title ${todo.completed ? 'completed-text' : ''}`}>{todo.title}</p>}
                      </div>
                      {inlineEditing && <div className="todo-inline-fields">
                        <Form.Control id={`${pageModuleId}-todo-date-${todo._id}`} name={`${pageModuleId}-todo-date-${todo._id}`} aria-label={`Task date: ${todo.title}`} className="todo-inline-date" type="date" defaultValue={todo.date || ''} onBlur={event => { if (event.target.value !== (todo.date || '')) handleInlineUpdate(todo, { date: event.target.value }); }} />
                      </div>}
                      {!inlineEditing && <>{todo.description && <p className="todo-description">{todo.description}</p>}</>}
                    </div>
                  </div>
                  {inlineEditing && <Form.Select id={`${pageModuleId}-todo-priority-${todo._id}`} name={`${pageModuleId}-todo-priority-${todo._id}`} aria-label={`Task priority: ${todo.title}`} className="todo-inline-priority" value={todo.priority} onChange={event => { if (event.target.value !== todo.priority) handleInlineUpdate(todo, { priority: event.target.value as Todo['priority'] }); }}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </Form.Select>}
                  <div className="todo-actions">
                    {!inlineEditing && <span className={`priority-label priority-${todo.priority}`}>{todo.tag || todo.priority}</span>}
                    {inlineEditing && <div className="todo-reorder-controls" aria-label={`Reorder ${todo.title}`}>
                      <Button variant="link" className="todo-drag-handle" draggable={!reordering} disabled={reordering} aria-label={`Drag to reorder ${todo.title}`} onDragStart={event => startTodoDrag(event, todo._id)} onDragEnd={() => setDraggedTodoId(null)}><GripVertical aria-hidden="true" /></Button>
                    </div>}
                    {showAllTodos && <>
                      <div className="todo-priority-icon">{getPriorityIcon(todo.priority)}</div>
                      <div className="todo-item-actions">
                        <Button className="custom-btn icon-only" onClick={() => handleEditTodo(todo)} aria-label={`Edit ${todo.title}`}>
                          <Pencil size={16} />
                        </Button>
                        <Button className="custom-btn icon-only" onClick={() => handleDeleteTodo(todo)} aria-label={`Delete ${todo.title}`}>
                          <Trash3 size={16} />
                        </Button>
                      </div>
                    </>}
                    {inlineEditing && <Button className="custom-btn icon-only todo-inline-remove" onClick={() => handleDeleteTodo(todo)} aria-label={`Delete ${todo.title}`}>×</Button>}
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
        {inlineEditing && !loading && !error && <Form className="todo-inline-add" onSubmit={handleInlineAdd}>
          <Form.Control id={`${pageModuleId}-todo-inline-add-title`} name={`${pageModuleId}-new-task-title`} aria-label="New to-do item" type="text" maxLength={120} placeholder="Add a task…" value={formData.title} onChange={event => setFormData(current => ({ ...current, title: event.target.value }))} />
          <Form.Control id={`${pageModuleId}-todo-inline-add-date`} name={`${pageModuleId}-new-task-date`} aria-label="New task date" className="todo-inline-add-date" type="date" value={formData.date} onChange={event => setFormData(current => ({ ...current, date: event.target.value }))} />
          <Button type="submit" variant="outline-primary" disabled={isSubmitting || !formData.title.trim()}>
            <Plus aria-hidden="true" /> Add
          </Button>
        </Form>}
      </Card.Body>

      {/* Add/Edit Todo Modal */}
      <Modal show={showModal} onHide={resetForm} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingTodo ? (
              <>
                <CheckSquare size={20} className="me-2" />
                Edit Task
              </>
            ) : (
              <>
                <Plus size={20} className="me-2" />
                Add New Task
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateTodo}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Task Title *</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter task title"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter task description (optional)"
                rows={3}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Priority</Form.Label>
              <Form.Select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={resetForm}>
              <X size={16} className="me-1" />
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  {editingTodo ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {editingTodo ? (
                    <>
                      <CheckSquare size={16} className="me-1" />
                      Update Task
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="me-1" />
                      Create Task
                    </>
                  )}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
};

export default TodoList;
