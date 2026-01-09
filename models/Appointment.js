const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    patientName: {
        type: String,
        required: true
    },
    patientAge: {
        type: Number,
        required: true
    },
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true
    },
    time: {
        type: String, // Format: HH:MM AM/PM
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['General Checkup', 'Vaccination', 'Newborn Care', 'Emergency']
    },
    status: {
        type: String,
        enum: ['booked', 'completed', 'cancelled'],
        default: 'booked'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
