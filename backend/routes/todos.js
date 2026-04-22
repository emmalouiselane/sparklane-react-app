const express = require('express');
const Todo = require('../models/Todo');
const { getAppUserId, requireAuth, requireTrustedOrigin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.use(requireTrustedOrigin);

// Get user-specific todos
router.get('/', async (req, res) => {
  try {
    const userId = getAppUserId(req.user);
    const userTodos = await Todo.find({ userId }).sort({ completed: 1, priority: 1, createdAt: -1 });
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
      userId: getAppUserId(req.user),
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

    const userId = getAppUserId(req.user);
    const todo = await Todo.findOne({ _id: id, userId });
    
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

    const userId = getAppUserId(req.user);
    const todo = await Todo.findOne({ _id: id, userId });
    
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
