const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Create transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // e.g., yourgmail@gmail.com
            pass: process.env.EMAIL_PASS  // e.g., your app password
        }
    });

    // Define email options
    const mailOptions = {
        from: `Pediatrician Clinic <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.html
    };

    // Send email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
