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
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        default: 5
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
