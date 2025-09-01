import nodemailer from "nodemailer";
const smtp_password = process.env.SMTP_PASS
const smtp_user = process.env.SMTP_USER

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtp_user,
    pass: smtp_password,
  },
});


export default transporter