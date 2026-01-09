const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const User = require('./models/User');
require('dotenv').config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pediatrician-clinic');
        console.log('MongoDB Connected');

        // Get all users
        const users = await User.find({});
        const userMap = {};
        users.forEach(u => userMap[u._id.toString()] = { name: u.name, email: u.email });
        console.log('Users found:', users.length);

        // Get all appointments
        const appointments = await Appointment.find({});
        console.log(`Total Appointments: ${appointments.length}`);

        console.log('\n--- APPOINTMENT OWNERSHIP ---');
        appointments.forEach(app => {
            const uid = app.userId ? app.userId.toString() : 'null';
            const owner = userMap[uid] ? userMap[uid].name : 'UNKNOWN_USER';
            console.log(`Appt [${app.date} ${app.time}] Patient: ${app.patientName} -> Owned by: ${owner} (${uid})`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkData();
