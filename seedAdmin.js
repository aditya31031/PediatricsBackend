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

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (user) {
            console.log('Admin already exists, updating password...');
            user.password = hashedPassword;
            user.phone = '1234567890'; // Add dummy phone
            user.role = 'admin'; // Ensure role is admin
            await user.save();
            console.log('Admin Password Reset');
        } else {
            user = new User({
                name,
                email,
                phone: '1234567890', // Add dummy phone
                password: hashedPassword,
                role: 'admin'
            });
            await user.save();
            console.log('Admin User Created');
        }

        console.log('Email: admin@clinic.com');
        console.log('Password: admin');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

createAdmin();
