const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const { createNotification } = require('./notifications');

// Register
router.post('/register', async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({ name, email, password, phone });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        await createNotification(user.id, `Welcome to Dr. Sai Manohar's Clinic! We're glad to have you here.`, 'success');

        const payload = { user: { id: user.id, role: user.role } };

        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = { user: { id: user.id, role: user.role } };

        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update Profile
router.put('/update-profile', auth, async (req, res) => {
    const { name, email } = req.body;
    try {
        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Check if email is being changed and if it is already taken
        if (email && email !== user.email) {
            let existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ msg: 'Email already in use' });
            }
            user.email = email;
        }

        if (name) user.name = name;

        await user.save();
        await createNotification(user.id, 'Your profile information has been updated.', 'success');

        res.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Change Password
router.put('/change-password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid current password' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();
        await createNotification(user.id, 'Your password was changed successfully.', 'warning');

        res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Generate Token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash and set to user
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set expire (10 mins)
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

        await user.save();

        // Create reset url
        // Update URL to match client port 5173
        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

        const message = `
            <h1>You have requested a password reset</h1>
            <p>Please go to this link to reset your password:</p>
            <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Request',
                html: message
            });

            res.json({ success: true, data: 'Email sent' });
        } catch (err) {
            console.error(err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            return res.status(500).json({ msg: 'Email could not be sent' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Reset Password
router.put('/reset-password/:resetToken', async (req, res) => {
    try {
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resetToken)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid Token' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);

        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.json({ success: true, data: 'Password Updated Success' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Add Child
router.post('/add-child', auth, async (req, res) => {
    const { name, age, gender, bloodGroup, weight, height } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Basic Validation
        if (!name || !age || !gender) {
            return res.status(400).json({ msg: 'Please enter Name, Age, and Gender' });
        }

        const newChild = { name, age, gender, bloodGroup, weight, height };
        user.children.push(newChild);
        await user.save();

        await createNotification(user.id, `Child profile added for ${name}.`, 'success');

        res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, children: user.children });
    } catch (err) {
        console.error('Error adding child:', err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// Delete Child
router.delete('/delete-child/:child_id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Filter out the child to remove
        user.children = user.children.filter(
            (child) => child.id.toString() !== req.params.child_id
        );
        await user.save();

        await createNotification(user.id, 'A child profile was removed.', 'warning');

        res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, children: user.children });
    } catch (err) {
        console.error('Error deleting child:', err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

module.exports = router;
