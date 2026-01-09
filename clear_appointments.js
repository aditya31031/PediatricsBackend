const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
require('dotenv').config();

const clearData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pediatrician-clinic');
        console.log('MongoDB Connected');

        const result = await Appointment.deleteMany({});
        console.log(`Deleted ${result.deletedCount} appointments.`);
        console.log('Database cleared of booking history.');

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

clearData();
