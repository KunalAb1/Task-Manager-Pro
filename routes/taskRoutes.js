const express = require('express');
const Task = require('../Models/taskModel');
const authTokenHandler = require('../Middlewares/checkAuthToken');
const router = express.Router();

// Get all tasks for the logged-in user
router.get('/tasks', authTokenHandler, async (req, res) => {
    try {
        const tasks = await Task.find({ owner: req.userId }).sort({ createdAt: -1 });
        res.status(200).json({ tasks });
    } catch (err) {
        console.error('Get tasks error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Add a task
router.post('/tasks', authTokenHandler, async (req, res) => {
    const { task, dueDate, priority } = req.body;

    if (!task) {
        return res.status(400).json({ message: 'Task is required' });
    }

    try {
        const newTask = new Task({
            text: task,
            dueDate: dueDate || null,
            priority: priority || 'medium',
            owner: req.userId,
        });
        await newTask.save();

        const tasks = await Task.find({ owner: req.userId }).sort({ createdAt: -1 });
        res.status(201).json({ message: 'Task added', tasks });
    } catch (err) {
        console.error('Add task error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update a task
router.put('/tasks/:id', authTokenHandler, async (req, res) => {
    const { id } = req.params;
    const { task, dueDate, priority } = req.body;

    if (!task) {
        return res.status(400).json({ message: 'New task text is required' });
    }

    try {
        const existingTask = await Task.findById(id);
        if (!existingTask) {
            return res.status(404).json({ message: 'Task not found' });
        }
        if (existingTask.owner.toString() !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to edit this task' });
        }

        existingTask.text = task;
        existingTask.dueDate = dueDate || null;
        existingTask.priority = priority || 'medium';
        await existingTask.save();

        const tasks = await Task.find({ owner: req.userId }).sort({ createdAt: -1 });
        res.status(200).json({ message: 'Task updated', tasks });
    } catch (err) {
        console.error('Update task error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Delete a task
router.delete('/tasks/:id', authTokenHandler, async (req, res) => {
    const { id } = req.params;

    try {
        const existingTask = await Task.findById(id);
        if (!existingTask) {
            return res.status(404).json({ message: 'Task not found' });
        }
        if (existingTask.owner.toString() !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this task' });
        }

        await Task.findByIdAndDelete(id);

        const tasks = await Task.find({ owner: req.userId }).sort({ createdAt: -1 });
        res.status(200).json({ message: 'Task deleted', tasks });
    } catch (err) {
        console.error('Delete task error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Toggle task completion
router.patch('/tasks/:id/toggle', authTokenHandler, async (req, res) => {
    const { id } = req.params;

    try {
        const existingTask = await Task.findById(id);
        if (!existingTask) {
            return res.status(404).json({ message: 'Task not found' });
        }
        if (existingTask.owner.toString() !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to update this task' });
        }

        existingTask.completed = !existingTask.completed;
        await existingTask.save();

        const tasks = await Task.find({ owner: req.userId }).sort({ createdAt: -1 });
        res.status(200).json({ message: 'Task toggled', tasks });
    } catch (err) {
        console.error('Toggle task error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
