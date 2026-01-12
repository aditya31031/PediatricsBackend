const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 // Document automatically saved for 10 minutes (600 seconds)
    }
});

module.exports = mongoose.model('Otp', OtpSchema);
