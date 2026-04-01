const axios = require("axios");

const sendFast2SMS = async (phone, message) => {
  try {
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "v3",
        sender_id: "FTWSMS",
        message: message,
        language: "english",
        flash: 0,
        numbers: phone,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Fast2SMS Error:", error.response ? error.response.data : error.message);
    throw new Error("Failed to send OTP via SMS");
  }
};

module.exports = sendFast2SMS;
