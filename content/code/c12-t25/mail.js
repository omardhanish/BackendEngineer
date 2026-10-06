import Mailgen from 'mailgen';
import nodemailer from 'nodemailer';

// From the previous lesson, next to the email templates.
const mailGenerator = new Mailgen({
  theme: 'default',
  product: {
    name: 'Auth Backend',
    link: 'https://example.com',
    copyright: 'Copyright © Auth Backend demo.',
  },
});

export const sendEmail = async ({ email, subject, mailgenContent }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
  await transporter.sendMail({
    from: 'Auth Backend <no-reply@example.com>',
    to: email,
    subject,
    text: mailGenerator.generatePlaintext(mailgenContent),
    html: mailGenerator.generate(mailgenContent),
  });
};
