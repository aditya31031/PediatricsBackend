const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    children: [{
        name: { type: String, required: true },
        age: { type: Number, required: true },
        gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
        bloodGroup: { type: String },
        weight: { type: String },
        height: { type: String }
    }],
    resetPasswordToken: String,
    resetPasswordExpire: Date
});

module.exports = mongoose.model('User', UserSchema);
