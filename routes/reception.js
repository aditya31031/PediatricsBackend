const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const staff = require('../middleware/staff');
const bcrypt = require('bcryptjs');

// @route   GET /api/reception/users/search
// @desc    Search users by name, email, or phone
// @access  Staff (Receptionist/Admin)
router.get('/users/search', [auth, staff], async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        // Robust search regex
        const regex = new RegExp(q, 'i');

        const users = await User.find({
            $or: [
                { name: regex },
                { email: regex },
                { phone: regex }
            ]
        }).select('-password').limit(10); // Limit results for performance

        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/reception/quick-register
// @desc    Quickly register a parent and child (Walk-in)
// @access  Staff
router.post('/quick-register', [auth, staff], async (req, res) => {
    try {
        const { parentName, parentPhone, children } = req.body;

        // 1. Check if parent exists by phone
        let user = await User.findOne({ phone: parentPhone });
        let isNewUser = false;

        if (!user) {
            isNewUser = true;
            // Create minimal user (Placeholder email/password)
            const password = Math.random().toString(36).slice(-8); // Generate temp password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const tempEmail = `${parentPhone}@clinic.temp`; // Placeholder email

            user = new User({
                name: parentName,
                email: tempEmail,
                phone: parentPhone,
                password: hashedPassword,
                role: 'user'
            });
        }

        // 2. Add Children
        if (Array.isArray(children)) {
            children.forEach(child => {
                user.children.push({
                    name: child.name,
                    age: child.age,
                    gender: child.gender,
                    bloodGroup: child.bloodGroup || ''
                });
            });
        }

        await user.save();

        res.json({
            user,
            isNewUser,
            msg: isNewUser ? 'New Parent Account Created' : 'Child added to existing Parent'
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/reception/patients
// @desc    Get all patients (Users and their Children)
// @access  Staff
router.get('/patients', [auth, staff], async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ date: -1 });

        // Transform data for easier frontend consumption
        const patients = [];
        users.forEach(user => {
            // Add Parent as a patient entry if needed, but mainly children
            // Let's structure it flat for the table
            if (user.children && user.children.length > 0) {
                user.children.forEach(child => {
                    patients.push({
                        _id: child._id, // Child ID
                        isChild: true,
                        name: child.name,
                        age: child.age,
                        gender: child.gender,
                        bloodGroup: child.bloodGroup,
                        parentName: user.name,
                        parentPhone: user.phone,
                        parentId: user._id,
                        photo: child.photo
                    });
                });
            } else {
                // Even if no children, maybe show the user themselves if they are a patient?
                // For pediatric clinic, usually focus is children. 
                // But let's add an entry for the user if they have no kids, or just focusing on kids?
                // Let's stick to the request: "list all the patient, ... show me details of children"
                // So we prioritize children.
            }
        });

        res.json(patients);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
