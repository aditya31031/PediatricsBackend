const axios = require('axios');

// Hardcoded tokens for testing purposes (based on your previous messages)
const API_KEY = 'eb21f931-eb28-4b2b-a287-a8a44cca1120';
const DEVICE_ID = '6964835e9f385ce7310f492a';

// REPLACE THIS WITH YOUR REAL PHONE NUMBER INCLUDING COUNTRY CODE
// Example: '+919876543210' for India
const TEST_PHONE_NUMBER = '+919066910183';


const sendTestSms = async () => {
    console.log('Attempting to send SMS...');
    console.log(`API Key: ${API_KEY.substring(0, 5)}...`);
    console.log(`Device ID: ${DEVICE_ID}`);
    console.log(`Recipient: ${TEST_PHONE_NUMBER}`);

    try {
        const response = await axios.post(
            `https://api.textbee.dev/api/v1/gateway/devices/${DEVICE_ID}/send-sms`,
            {
                recipients: [TEST_PHONE_NUMBER],
                message: 'Test SMS from Hospital App Debug Script',
            },
            {
                headers: {
                    'x-api-key': API_KEY,
                },
            }
        );

        console.log('✅ SMS Sent Successfully!');
        console.log('Response Status:', response.status);
        console.log('Response Data:', response.data);
    } catch (error) {
        console.error('❌ Failed to send SMS');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

sendTestSms();
