import Mailgen from 'mailgen';
import nodemailer from 'nodemailer';

const mailGenerator = new Mailgen({
  theme: 'default',
  product: {
    name: 'Auth Backend',
    link: 'https://example.com',
    copyright: 'Copyright © Auth Backend demo.',
  },
});
const link = 'https://example.com/api/v1/auth/verify-email/demo-token';
const mailgenContent = {
  body: {
    name: 'ada',
    intro: 'Welcome! One step left: confirm your email address.',
    action: {
      instructions: 'Click the button to verify your email:',
      button: { color: '#22BC66', text: 'Verify email', link },
    },
  },
};

// jsonTransport builds the message but sends nothing.
const transporter = nodemailer.createTransport({ jsonTransport: true });
const info = await transporter.sendMail({
  from: 'Auth Backend <no-reply@example.com>',
  to: 'ada@example.com',
  subject: 'Verify your email',
  text: mailGenerator.generatePlaintext(mailgenContent),
  html: mailGenerator.generate(mailgenContent),
});

const sent = JSON.parse(info.message);
console.log(sent.from.name, '|', sent.from.address);
console.log(sent.to[0].address, '|', sent.subject);
console.log('text has link:', sent.text.includes(link));
console.log('html has link:', sent.html.includes(`href="${link}"`));
