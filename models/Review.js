const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String, // Optional, mostly for contact
        required: false
    },
    message: {
        type: String,
        required: true
    },
    approved: {
        type: Boolean,
        default: true // Auto-approve for demo purposes
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Review', ReviewSchema);
