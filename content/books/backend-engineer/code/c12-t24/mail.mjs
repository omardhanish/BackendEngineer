import Mailgen from 'mailgen';

const mailGenerator = new Mailgen({
  theme: 'default',
  product: {
    name: 'Auth Backend',
    link: 'https://example.com',
    copyright: 'Copyright © Auth Backend demo.',
  },
});

export const emailVerificationMailgenContent = (username, verificationUrl) => ({
  body: {
    name: username,
    intro: 'Welcome! One step left: confirm your email address.',
    action: {
      instructions: 'Click the button to verify your email:',
      button: {
        color: '#22BC66',
        text: 'Verify email',
        link: verificationUrl,
      },
    },
    outro: 'Need help? Reply to this email.',
  },
});

export const forgotPasswordMailgenContent = (username, passwordResetUrl) => ({
  body: {
    name: username,
    intro: 'We received a request to reset your password.',
    action: {
      instructions: 'Click the button to choose a new password:',
      button: {
        color: '#DC4D2F',
        text: 'Reset password',
        link: passwordResetUrl,
      },
    },
    outro: 'If you did not ask for this, ignore this email.',
  },
});

const verifyUrl = 'https://example.com/api/v1/auth/verify-email/demo-token';
const resetUrl = 'https://example.com/api/v1/auth/reset-password/demo-token';
const verify = emailVerificationMailgenContent('ada', verifyUrl);
const reset = forgotPasswordMailgenContent('ada', resetUrl);

console.log(mailGenerator.generatePlaintext(verify));
const html = (content) => mailGenerator.generate(content);
console.log(html(verify).includes(verifyUrl), html(reset).includes(resetUrl));
