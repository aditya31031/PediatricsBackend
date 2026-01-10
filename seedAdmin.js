const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect('mongodb+srv://Vercel-Admin-pediatrics:Adityaadi334@pediatrics.qsfg2fw.mongodb.net/?appName=pediatrics');
        console.log('MongoDB Connected');

        const email = 'admin@clinic.com';
        const password = 'admin';
        const name = 'Dr. Sai Manohar';

        let user = await User.findOne({ email });
        if (user) {
            console.log('Admin already exists');
            process.exit();
        }

        user = new User({
            name,
            email,
            password,
            role: 'admin'
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        console.log('Admin User Created');
        console.log('Email: admin@clinic.com');
        console.log('Password: admin');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

createAdmin();
