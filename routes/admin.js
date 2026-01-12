const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }
        next();
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

// @route   GET api/admin/stats
// @desc    Get dashboard analytics (Total Patients, Visit Trends, Reasons)
// @access  Admin
router.get('/stats', [auth, requireAdmin], async (req, res) => {
    try {
        // 1. Total Patients (Count of all children across all users)
        const users = await User.find().select('children');
        let totalPatients = 0;
        users.forEach(user => {
            if (user.children && Array.isArray(user.children)) {
                totalPatients += user.children.length;
            }
        });

        // 2. Visit Trends (Last 12 Months) & Visit Reasons
        const appointments = await Appointment.find();

        // Process for Graph (Group by Date)
        // We will return raw data, frontend can filter by week/month/year
        const visitsByDate = {};
        const visitReasons = {};

        appointments.forEach(app => {
            // Trend Data
            const date = app.date; // YYYY-MM-DD
            if (visitsByDate[date]) {
                visitsByDate[date]++;
            } else {
                visitsByDate[date] = 1;
            }

            // Reason Data
            const reason = app.category || 'General';
            if (visitReasons[reason]) {
                visitReasons[reason]++;
            } else {
                visitReasons[reason] = 1;
            }
        });

        // Convert to Arrays for easy frontend consumption
        const trendData = Object.keys(visitsByDate).map(date => ({
            date,
            visits: visitsByDate[date]
        })).sort((a, b) => new Date(a.date) - new Date(b.date));

        const reasonData = Object.keys(visitReasons).map(reason => ({
            name: reason,
            value: visitReasons[reason]
        }));

        res.json({
            totalPatients,
            trendData,
            reasonData
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
