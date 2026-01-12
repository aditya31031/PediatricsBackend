const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const { createNotification } = require('./notifications');
const axios = require('axios');
const Otp = require('../models/Otp');

// Register
router.post('/register', async (req, res) => {
    const { name, email, password, phone, otp } = req.body;
    try {
        // Verify OTP
        if (process.env.NODE_ENV !== 'test') { // Skip for tests if needed, or better, mock it
            const otpRecord = await Otp.findOne({ phone, otp });
            if (!otpRecord) {
                return res.status(400).json({ msg: 'Invalid or expired OTP' });
            }
            // Delete used OTP
            await Otp.deleteOne({ _id: otpRecord._id });
        }
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({ name, email, password, phone });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        await createNotification(user.id, `Welcome to Dr. Sai Manohar's Clinic! We're glad to have you here.`, 'success');

        // Emit real-time notification
        const io = req.app.get('io');
        io.emit(`notification:${user.id}`, {
            title: 'Welcome!',
            message: `Welcome to Dr. Sai Manohar's Clinic! We're glad to have you here.`,
            read: false,
            createdAt: new Date()
        });

        const payload = { user: { id: user.id, role: user.role } };

        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, children: user.children } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Send OTP
router.post('/send-otp', async (req, res) => {
    let { phone } = req.body;
    try {
        // Basic formatting: Default to +91 (India) if no country code provided
        // This prevents failures if user enters just "9876543210"
        if (phone && !phone.startsWith('+')) {
            phone = '+91' + phone.trim();
        }

        // Check if user already exists
        let user = await User.findOne({ phone });
        if (user) {
            return res.status(400).json({ msg: 'User with this phone number already exists' });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save to DB
        // Remove existing OTPs for this phone
        await Otp.deleteMany({ phone });

        await new Otp({ phone, otp }).save();

        // Send via TextBee
        const API_KEY = process.env.TEXTBEE_API_KEY;
        const DEVICE_ID = process.env.TEXTBEE_DEVICE_ID;
        const BASE_URL = 'https://api.textbee.dev/api/v1';

        await axios.post(
            `${BASE_URL}/gateway/devices/${DEVICE_ID}/send-sms`,
            {
                recipients: [phone],
                message: `Your OTP for Dr. Sai Manohar's Clinic is ${otp}. Valid for 10 minutes. @pediatrics-app # ${otp}`
            },
            { headers: { 'x-api-key': API_KEY } }
        );

        res.json({ msg: 'OTP sent successfully' });
    } catch (err) {
        console.error(err.message);
        console.error(err.response?.data);
        res.status(500).send('Server Error: ' + (err.response?.data?.message || err.message));
    }
});

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const normalizedEmail = email.trim();
        // Case-insensitive search
        let user = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } });
        if (!user) {
            return res.status(400).json({ msg: 'User with this email was not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Password is wrong' });
        }

        const payload = { user: { id: user.id, role: user.role } };

        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, children: user.children } });
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

        res.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, children: user.children } });
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
        const normalizedEmail = email.trim();
        // Case-insensitive search
        const user = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } });
        if (!user) {
            return res.status(404).json({ msg: 'User with this email was not found' });
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


// Multer Configuration

// ImageKit Configuration
const ImageKit = require('imagekit');

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Multer Configuration (Memory Storage for Cloud Upload)
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage(); // Store file in memory to upload to cloud

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Add Child
router.post('/add-child', [auth, upload.single('photo')], async (req, res) => {
    // Note: req.body fields are available after multer processes the file
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

        let photoUrl = '';
        if (req.file) {
            try {
                // Upload to ImageKit
                const result = await imagekit.upload({
                    file: req.file.buffer, // Upload buffer
                    fileName: `${req.user.id}-${Date.now()}-${req.file.originalname}`,
                    folder: '/children_profiles/'
                });
                photoUrl = result.url;
            } catch (error) {
                console.error('ImageKit Upload Error:', error);
                return res.status(500).json({ msg: 'Error uploading image' });
            }
        }

        const newChild = { name, lastName, age, gender, bloodGroup, weight, height, photo: photoUrl };
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

// Update Child Profile
router.put('/child/:child_id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const child = user.children.id(req.params.child_id);
        if (!child) return res.status(404).json({ msg: 'Child not found' });

        const { bloodGroup, weight, height } = req.body;

        if (bloodGroup) child.bloodGroup = bloodGroup;
        if (weight) child.weight = weight;
        if (height) child.height = height;

        await user.save();
        await createNotification(user.id, `Child profile updated for ${child.name}.`, 'success');

        res.json(user.children);
    } catch (err) {
        console.error('Error updating child:', err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// Update Vaccine Status
router.put('/child/:child_id/vaccine', auth, async (req, res) => {
    const { vaccineName, status, dateGiven } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const child = user.children.id(req.params.child_id);
        if (!child) return res.status(404).json({ msg: 'Child not found' });

        // Check if vaccine record exists
        const existingVaccine = child.vaccinations.find(v => v.name === vaccineName);

        if (existingVaccine) {
            existingVaccine.status = status;
            existingVaccine.dateGiven = dateGiven || Date.now();
        } else {
            child.vaccinations.push({ name: vaccineName, status, dateGiven });
        }

        await user.save();
        res.json(user.children);
    } catch (err) {
        console.error('Error updating vaccine:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
// Force git update
