const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// Get All Notifications for User
router.get('/', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 });
        res.json(notifications);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Mark Notification as Read
router.put('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found' });
        }

        // Check user owns notification
        if (notification.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        notification.read = true;
        await notification.save();
        res.json(notification);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Helper function to create notification (internal use)
const createNotification = async (userId, message, type = 'info') => {
    try {
        const newNotification = new Notification({
            user: userId,
            message,
            type
        });
        await newNotification.save();
        return newNotification;
    } catch (err) {
        console.error('Error creating notification:', err);
    }
};

module.exports = { router, createNotification };
