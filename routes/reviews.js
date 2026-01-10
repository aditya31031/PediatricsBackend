const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// @route   GET api/reviews
// @desc    Get all reviews (Patient Stories)
// @access  Public
router.get('/', async (req, res) => {
    try {
        // Fetch approved reviews, sorted by newest first
        const reviews = await Review.find({ approved: true }).sort({ date: -1 });
        res.json(reviews);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/reviews
// @desc    Submit a new review/message
// @access  Public
router.post('/', async (req, res) => {
    const { name, email, message, rating } = req.body;

    try {
        const newReview = new Review({
            name,
            email,
            message,
            rating: rating || 5,
            approved: true // Auto-approve for now
        });

        const review = await newReview.save();
        res.json(review);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
