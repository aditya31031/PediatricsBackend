// This acts as a mock service for external providers like SendGrid or Twilio
// In a real production app, you would install 'nodemailer' and 'twilio' SDKs here.

const sendEmail = async (toEmail, subject, body) => {
    // Simulator
    console.log(`\n--- [MOCK EMAIL SERVICE] ---`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    console.log(`----------------------------\n`);
    return true;
};

const sendWhatsApp = async (phoneNumber, message) => {
    // Simulator
    console.log(`\n--- [MOCK WHATSAPP SERVICE] ---`);
    console.log(`To: ${phoneNumber}`);
    console.log(`Message: ${message}`);
    console.log(`-------------------------------\n`);
    return true;
};

module.exports = { sendEmail, sendWhatsApp };
