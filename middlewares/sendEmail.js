const nodemailer = require("nodemailer");
const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

module.exports = transport;

// const { Resend } = require("resend");

// const resend = new Resend(process.env.RESEND_API_KEY);

// async function sendOTPEmail(email, otp) {
//   await resend.emails.send({
//     from: "MyApp <onboarding@resend.dev>",
//     to: email,
//     subject: "Email Verification Code",
//     html: `
//       <h2>Email Verification</h2>
//       <p>Your verification code is:</p>
//       <h1 style="letter-spacing:4px">${otp}</h1>
//       <p>This code will expire in 10 minutes.</p>
//     `,
//   });
// }

// module.exports = sendOTPEmail;

// const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "smtp-relay.brevo.com",
//   port: 587,
//   secure: false,
//   auth: {
//     user: "9e6a6c001@smtp-brevo.com", // SMTP Login من Brevo
//     pass: process.env.BREVO_API_KEY, // xsmtpsib-...
//   },
// });

// async function sendOTPEmail(email, otp) {
//   await transporter.sendMail({
//     from: "mowqaf <bebbxxdd@gmail.com>", // 👈 لازم sender verified
//     to: email,
//     subject: "Your Verification Code",
//     html: `
//       <h2>Email Verification</h2>
//       <p>Your code is:</p>
//       <h1>${otp}</h1>
//       <p>Expires in 10 minutes</p>
//     `,
//   });
// }

// module.exports = sendOTPEmail;
