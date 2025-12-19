// const nodemailer = require("nodemailer");
// const transport = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,
//   secure: true,
//   auth: {
//     user: process.env.EMAIL,
//     pass: process.env.PASSWORD,
//   },
// });

// module.exports = transport;

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOTPEmail(email, otp) {
  await resend.emails.send({
    from: "MyApp <onboarding@resend.dev>",
    to: email,
    subject: "Email Verification Code",
    html: `
      <h2>Email Verification</h2>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing:4px">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
    `,
  });
}

module.exports = sendOTPEmail;
