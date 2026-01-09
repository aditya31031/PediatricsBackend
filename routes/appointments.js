const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail, sendWhatsApp } = require('../utils/notify');

// Create Appointment
router.post('/', auth, async (req, res) => {
    try {
        const { patientName, patientAge, date, time, category } = req.body;

        // Check availability
        const existing = await Appointment.findOne({ date, time, status: { $ne: 'cancelled' } });
        if (existing) {
            return res.status(400).json({ msg: 'Slot already booked' });
        }

        const newAppointment = new Appointment({
            patientName,
            patientAge,
            date,
            time,
            category,
            userId: req.user.id
        });

        const appointment = await newAppointment.save();

        // Create Notification for User
        await Notification.create({
            userId: req.user.id,
            title: 'Appointment Booked',
            message: `Your appointment is confirmed for ${date} at ${time}.`,
            type: 'success'
        });

        // Notify all clients (especially Admin)
        const io = req.app.get('io');
        // Emit specific structure for Admin Toast
        io.emit('appointments:updated', { type: 'create', appointment });

        // Also emit user specific notification
        io.emit(`notification:${req.user.id}`, {
            title: 'Booking Confirmed',
            message: `Your appointment is confirmed for ${date} at ${time}.`
        });

        res.json(appointment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get Appointments (by date)
router.get('/', async (req, res) => {
    try {
        const { date } = req.query;
        let query = { status: { $ne: 'cancelled' } };
        if (date) {
            query.date = date;
        }
        const appointments = await Appointment.find(query);
        res.json(appointments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get User's Appointments
router.get('/my-appointments', auth, async (req, res) => {
    try {
        const appointments = await Appointment.find({ userId: req.user.id }).sort({ date: 1 });
        res.json(appointments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get ALL Appointments (Admin Only)
router.get('/all', [auth, require('../middleware/admin')], async (req, res) => {
    try {
        const appointments = await Appointment.find().sort({ date: 1, time: 1 });
        res.json(appointments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update Appointment (Reschedule/Modify)
router.put('/:id', [auth, require('../middleware/admin')], async (req, res) => {
    try {
        const { date, time } = req.body;
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) return res.status(404).json({ msg: 'Appointment not found' });

        // Update fields
        if (date) appointment.date = date;
        if (time) appointment.time = time;

        const updatedAppt = await appointment.save();

        // Notify User
        const patientUser = await User.findById(appointment.userId);
        if (patientUser) {
            const customMsg = req.body.message ? ` Reason: ${req.body.message}` : '';
            const msg = `Your appointment has been rescheduled to ${updatedAppt.date} at ${updatedAppt.time}.${customMsg}`;

            await Notification.create({
                userId: appointment.userId,
                title: 'Appointment Modified',
                message: msg,
                type: 'info'
            });
            // Notify clients (Socket)
            const io = req.app.get('io');
            io.emit(`notification:${appointment.userId}`, { title: 'Appointment Changed', message: msg });
        }

        // Broadcast update to Admin/Others
        const io = req.app.get('io');
        io.emit('appointments:updated', updatedAppt);

        res.json(updatedAppt);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Cancel Appointment
router.delete('/:id', auth, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ msg: 'Appointment not found' });
        }

        // Verify user owns appointment OR is admin
        const isAdmin = req.user.role === 'admin';
        if (appointment.userId.toString() !== req.user.id && !isAdmin) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // --- NOTIFICATION LOGIC START ---
        if (isAdmin) {
            console.log('--- ADMIN CANCELLATION DETECTED ---');
            // Fetch User details for contact info
            const patientUser = await User.findById(appointment.userId);

            if (patientUser) {
                console.log(`Found patient to notify: ${patientUser.email}`);
                const cancelMessage = `Your appointment for ${appointment.date} at ${appointment.time} has been cancelled by the clinic.`;

                // 1. Create In-App Notification
                try {
                    await Notification.create({
                        userId: appointment.userId,
                        title: 'Appointment Cancelled',
                        message: cancelMessage,
                        type: 'warning'
                    });
                } catch (e) {
                    console.error('Failed to create notification:', e);
                }

                // 2. Mock Email
                await sendEmail(patientUser.email, 'Appointment Cancelled', cancelMessage);

                // 3. Mock WhatsApp
                await sendWhatsApp(patientUser.mobile || '+919999999999', cancelMessage);

                // 4. Real-time Socket Alert to User
                const io = req.app.get('io');
                io.emit(`notification:${appointment.userId}`, {
                    title: 'Appointment Cancelled',
                    message: cancelMessage
                });
            }
        } else {
            // USER CANCELLATION DETECTED
            // Create a confirmation notification for the user
            try {
                await Notification.create({
                    userId: req.user.id,
                    title: 'Cancellation Confirmed',
                    message: `You successfully cancelled your appointment for ${appointment.date} at ${appointment.time}.`,
                    type: 'success'
                });
            } catch (e) {
                console.error('Failed to create user cancellation notification:', e);
            }
        }
        // --- NOTIFICATION LOGIC END ---

        await appointment.deleteOne();

        // Notify clients
        const io = req.app.get('io');
        io.emit('appointments:updated', { id: req.params.id, type: 'delete' });

        res.json({ msg: 'Appointment removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Appointment not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
