// /*
//  * IMPORTANT: Before running this script, make sure to set in your .env:
//  * GMAIL_USER=your-email@gmail.com
//  * GMAIL_APP_PASSWORD=your-app-specific-password
//  */

// const nodemailer = require('nodemailer');

// // Load environment variables
// require('dotenv').config();

// // Create SMTP transporter configuration
// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587,
//   secure: false, // Use TLS
//   auth: {

//   }
// });

// // Function to send a test email
// async function sendTestEmail() {
//   try {
//     // Define email options
//     const mailOptions = {
//       from: process.env.GMAIL_USER,
//       to: ' jerry@techluminateacademy.com',
//       subject: "SMTP Test Email",
//       text: "Hello! This is a test email from my app."
//     };

//     // Send the email
//     await transporter.sendMail(mailOptions);
//     console.log("✅ Email sent!");
//   } catch (error) {
//     console.error("❌ Email failed:", error);
//   }
// }

// // Immediately invoke the send function
// sendTestEmail(); 