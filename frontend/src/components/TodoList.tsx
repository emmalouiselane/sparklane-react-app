import React, { useState, useEffect, useCallback } from 'react';
import { Card, ListGroup, Badge, Spinner, Alert, Modal, Form, Button } from 'react-bootstrap';
import { CheckSquare, Square, Plus, X, Trash3, Flag, Pencil, ArrowClockwise } from 'react-bootstrap-icons';
import { apiClient } from '../helpers/auth';

import './TodoList.css';

interface Todo {
  _id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TodoListProps {
}

const TodoList: React.FC<TodoListProps> = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/api/todos');
      
      // Sort todos by priority and completion status
      const sortedTodos = response.data.todos.sort((a: Todo, b: Todo) => {
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingTodo) {
        // Update existing todo
        await apiClient.put(`/api/todos/${editingTodo._id}`, formData);
      } else {
        // Create new todo
        await apiClient.post('/api/todos', formData);
      }

      resetForm();
      fetchTodos();
    } catch (err: any) {
      console.error('Error saving todo:', err);
      setError('Failed to save todo. Please try again.');
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
    } catch (err: any) {
      console.error('Error toggling todo:', err);
      setError('Failed to update todo. Please try again.');
    }
  };

  const handleDeleteTodo = async (todo: Todo) => {
    try {
      await apiClient.delete(`/api/todos/${todo._id}`);

      fetchTodos();
    } catch (err: any) {
      console.error('Error deleting todo:', err);
      setError('Failed to delete todo. Please try again.');
    }
  };

  const handleClearCompleted = async () => {
    try {
      const completedTodos = todos.filter(todo => todo.completed);
      
      // Delete all completed todos
      await Promise.all(
        completedTodos.map(todo =>
          apiClient.delete(`/api/todos/${todo._id}`)
        )
      );

      fetchTodos();
    } catch (err: any) {
      console.error('Error clearing completed todos:', err);
      setError('Failed to clear completed todos. Please try again.');
    }
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description,
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
      priority: 'medium'
    });
    setEditingTodo(null);
    setShowModal(false);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge bg="danger">High</Badge>;
      case 'medium':
        return <Badge bg="warning">Medium</Badge>;
      case 'low':
        return <Badge bg="info">Low</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
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
    <Card className="todo-card">
      <Card.Header>
        <div className="todo-header">
          <div className="todo-header-left">
            <CheckSquare />
            <Card.Title>
              To-Do List
            </Card.Title>
          </div>
          <div className="todo-header-actions">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleClearCompleted}
              className="clear-completed-btn"
              disabled={!todos.some(todo => todo.completed)}
            >
              <ArrowClockwise size={16} />
              Clear Completed
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setShowModal(true)}
              className="quick-add-btn"
            >
              <Plus size={16} />
              Add Task
            </Button>
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
          <div className='loading-container'>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading todos...</span>
            </Spinner>
            <p>Loading your tasks...</p>
          </div>
        )}

        {!error && !loading && todos.length === 0 && (
          <div className="no-todos">
            <CheckSquare size={48} />
            <h2>No tasks yet</h2>
            <p>Start by adding your first task!</p>
          </div>
        )}

        {!loading && !error && todos.length > 0 && (
          <ListGroup variant="flush">
            {todos.map((todo) => (
              <ListGroup.Item key={todo._id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                <div className="todo-content">
                  <div className="todo-left">
                    <Button
                      variant="link"
                      className="checkbox"
                      onClick={() => handleToggleComplete(todo)}
                    >
                      {todo.completed ? (
                        <CheckSquare size={20} className="text-success" />
                      ) : (
                        <Square size={20} className="text-muted" />
                      )}
                    </Button>
                    <div className="todo-info">
                      <div className="todo-title-row">
                        <h6 className={`todo-title ${todo.completed ? 'completed-text' : ''}`}>
                          {todo.title}
                        </h6>
                        
                      </div>
                      {todo.description && (
                        <p className="todo-description">{todo.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="todo-actions">
                    <div className="todo-priority">
                      <div className="todo-badges">
                        {getPriorityBadge(todo.priority)}
                      </div>
                      <div className="todo-priority-icon">
                        {getPriorityIcon(todo.priority)}
                      </div>
                    </div>

                    <div className="todo-item-actions">
                      <Button className="custom-btn icon-only" onClick={() => handleEditTodo(todo)}>
                        <Pencil size={16} />
                      </Button>
                      <Button className="custom-btn icon-only" onClick={() => handleDeleteTodo(todo)}>
                        <Trash3 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
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
