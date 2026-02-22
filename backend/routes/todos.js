const express = require('express');
const jwt = require('jsonwebtoken');
const Todo = require('../models/Todo');

const router = express.Router();

// JWT middleware for protected routes
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        console.log('Todos JWT verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      req.user = user;
      next();
    });
  } else {
    console.log('Todos - No authorization header found');
    res.status(401).json({ error: 'No token provided' });
  }
};

// Apply JWT middleware to all todo routes
router.use(authenticateJWT);

// Get user-specific todos
router.get('/', async (req, res) => {
  try {
    const userTodos = await Todo.find({ userId: req.user.id }).sort({ completed: 1, priority: 1, createdAt: -1 });
    res.json({ todos: userTodos });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// Create new todo
router.post('/', async (req, res) => {
  try {
    const { title, description, priority } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const todo = new Todo({
      userId: req.user.id,
      title,
      description: description || '',
      priority: priority || 'medium'
    });

    const savedTodo = await todo.save();

    res.status(201).json({ 
      message: 'Todo created successfully',
      todo: savedTodo
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// Update todo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, completed } = req.body;

    const todo = await Todo.findOne({ _id: id, userId: req.user.id });
    
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (completed !== undefined) updateData.completed = completed;

    const updatedTodo = await Todo.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({ 
      message: 'Todo updated successfully',
      todo: updatedTodo
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// Delete todo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const todo = await Todo.findOne({ _id: id, userId: req.user.id });
    
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    await Todo.findByIdAndDelete(id);

    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

module.exports = router;
