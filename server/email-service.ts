import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid initialized for email service');
}

// Email service configuration
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
      pass: process.env.SMTP_PASS || 'ethereal.pass',
    },
  });
};

// ---------------------------------------------------------------------------
// Branded email template (Main Link military/tactical theme)
// Dark background, green gradient accents, sharp edges, TACFIT wordmark.
// All styling is inline + table-based for maximum email-client compatibility.
// ---------------------------------------------------------------------------
const BRAND = {
  pageBg: '#0a0f0a',
  cardBg: '#12180f',
  border: '#2a3a1e',
  green: '#7cb342',
  greenDeep: '#4d7d27',
  textLight: '#cdd8c2',
  textMuted: '#8a9a7d',
  heading: '#ffffff',
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const para = (html: string): string =>
  `<p style="margin:0 0 16px; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:26px; color:${BRAND.textLight};">${html}</p>`;

export const bulletList = (items: Array<{ label: string; text: string }>): string => {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td valign="top" style="padding:6px 12px 6px 0; color:${BRAND.green}; font-size:16px; line-height:24px; font-family:Arial,Helvetica,sans-serif;">&#9656;</td>
        <td style="padding:6px 0; color:${BRAND.textLight}; font-size:15px; line-height:24px; font-family:Arial,Helvetica,sans-serif;"><strong style="color:${BRAND.heading};">${i.label}</strong> ${i.text}</td>
      </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 4px;">${rows}</table>`;
};

interface EmailShellOptions {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote: string;
}

export const renderEmailShell = (o: EmailShellOptions): string => {
  const cta =
    o.ctaLabel && o.ctaUrl
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto 8px;">
          <tr>
            <td bgcolor="${BRAND.greenDeep}" style="border-radius:2px; background:linear-gradient(135deg, ${BRAND.green} 0%, ${BRAND.greenDeep} 100%);">
              <a href="${o.ctaUrl}" style="display:inline-block; padding:16px 40px; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:bold; letter-spacing:1.5px; text-transform:uppercase; color:#0a0f0a; text-decoration:none;">${o.ctaLabel}</a>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0; text-align:center; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:20px; color:${BRAND.textMuted};">
          Button not working? Copy and paste this link:<br>
          <a href="${o.ctaUrl}" style="color:${BRAND.green}; word-break:break-all;">${o.ctaUrl}</a>
        </p>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>Main Link</title>
</head>
<body style="margin:0; padding:0; background-color:${BRAND.pageBg};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${o.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.pageBg}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:${BRAND.cardBg}; border:1px solid ${BRAND.border};">
          <tr><td height="4" style="height:4px; line-height:4px; font-size:0; background:linear-gradient(90deg, ${BRAND.greenDeep} 0%, ${BRAND.green} 50%, ${BRAND.greenDeep} 100%); background-color:${BRAND.green};">&nbsp;</td></tr>
          <tr><td style="padding:36px 40px 8px; text-align:center;">
            <div style="font-family:'Arial Black',Arial,Helvetica,sans-serif; font-size:34px; font-weight:900; letter-spacing:6px; color:${BRAND.green}; text-transform:uppercase;">TACFIT</div>
            <div style="font-family:Arial,Helvetica,sans-serif; font-size:11px; letter-spacing:4px; color:${BRAND.textMuted}; text-transform:uppercase; margin-top:10px;">Teamwork &nbsp;&middot;&nbsp; Fitness &nbsp;&middot;&nbsp; Winning</div>
          </td></tr>
          <tr><td style="padding:18px 40px 0;"><div style="height:1px; background-color:${BRAND.border}; font-size:0; line-height:0;">&nbsp;</div></td></tr>
          <tr><td style="padding:28px 40px 8px;">
            <h1 style="margin:0 0 16px; font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:${BRAND.heading}; text-transform:uppercase; letter-spacing:0.5px;">${o.heading}</h1>
            ${o.bodyHtml}
            ${cta}
          </td></tr>
          <tr><td style="padding:28px 40px 36px;">
            <div style="height:1px; background-color:${BRAND.border}; font-size:0; line-height:0; margin-bottom:18px;">&nbsp;</div>
            <p style="margin:0 0 6px; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:20px; color:${BRAND.textMuted};">${o.footerNote}</p>
            <p style="margin:10px 0 0; font-family:Arial,Helvetica,sans-serif; font-size:11px; letter-spacing:2px; color:${BRAND.textMuted}; text-transform:uppercase;">&copy; ${new Date().getFullYear()} Main Link</p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// Sender shown in the recipient's inbox. The display name ("Main Link") controls
// the name and the auto-generated avatar letter the mail client draws. The
// address is team@tacfit.app, which stays on the SendGrid-authenticated domain
// (tacfit.app). We intentionally do NOT read the legacy FROM_EMAIL secret here
// (it was hello@tacfit.app, which made inboxes show "hello").
const FROM_ADDRESS = `${process.env.FROM_NAME || 'Main Link'} <team@tacfit.app>`;

// SendGrid tracking is disabled so links are delivered exactly as written.
const TRACKING_SETTINGS = {
  clickTracking: { enable: false, enableText: false },
  openTracking: { enable: false },
};

// Generate verification token
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
export const sendVerificationEmail = async (
  email: string,
  username: string,
  token: string
): Promise<void> => {
  const baseUrl = process.env.APP_URL || 'http://localhost:5000';
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  console.log('Generated verification URL:', verificationUrl);

  const emailHtml = renderEmailShell({
    preheader: 'Confirm your email to activate your Main Link account.',
    heading: 'Confirm Your Email',
    bodyHtml:
      para(`Welcome to Main Link, <strong style="color:${BRAND.heading};">${escapeHtml(username)}</strong>.`) +
      para('Confirm your email address to activate your account, join your team, and start competing.'),
    ctaLabel: 'Verify Email',
    ctaUrl: verificationUrl,
    footerNote:
      'This verification link expires in 24 hours. If you didn\u2019t create a Main Link account, you can safely ignore this email.',
  });

  const emailText = `Welcome to Main Link, ${username}.\n\nConfirm your email to activate your account:\n${verificationUrl}\n\nThis link expires in 24 hours. If you didn't create a Main Link account, you can ignore this email.`;

  try {
    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send({
        to: email,
        from: FROM_ADDRESS,
        subject: 'Main Link - Verify Your Email Address',
        text: emailText,
        html: emailHtml,
        trackingSettings: TRACKING_SETTINGS,
      });
      console.log('Verification email sent via SendGrid to:', email);
    } else {
      const transporter = createEmailTransporter();
      const info = await transporter.sendMail({
        from: FROM_ADDRESS,
        to: email,
        subject: 'Main Link - Verify Your Email Address',
        text: emailText,
        html: emailHtml,
      });
      console.log('Verification email sent via SMTP:', info.messageId);
      if (process.env.NODE_ENV !== 'production') {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }
    }
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    if (error.response && error.response.body) {
      console.error('SendGrid error details:', JSON.stringify(error.response.body, null, 2));
      console.error('SendGrid error errors array:', error.response.body.errors);
    }
    console.error('FROM_EMAIL configured as:', process.env.FROM_EMAIL);
    throw new Error('Failed to send verification email');
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  username: string,
  token: string
): Promise<void> => {
  const baseUrl = process.env.APP_URL || 'http://localhost:5000';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  console.log('Generated password reset URL:', resetUrl);

  const emailHtml = renderEmailShell({
    preheader: 'Reset the password for your Main Link account.',
    heading: 'Reset Your Password',
    bodyHtml:
      para(`We received a request to reset the password for your Main Link account, <strong style="color:${BRAND.heading};">${escapeHtml(username)}</strong>.`) +
      para('Tap the button below to set a new password and get back in the fight.'),
    ctaLabel: 'Reset Password',
    ctaUrl: resetUrl,
    footerNote:
      'This password reset link expires in 1 hour. If you didn\u2019t request this, ignore this email and your password will stay the same.',
  });

  const emailText = `Password reset requested for your Main Link account, ${username}.\n\nSet a new password here:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`;

  try {
    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send({
        to: email,
        from: FROM_ADDRESS,
        subject: 'Main Link - Reset Your Password',
        text: emailText,
        html: emailHtml,
        trackingSettings: TRACKING_SETTINGS,
      });
      console.log('Password reset email sent via SendGrid to:', email);
    } else {
      const transporter = createEmailTransporter();
      const info = await transporter.sendMail({
        from: FROM_ADDRESS,
        to: email,
        subject: 'Main Link - Reset Your Password',
        text: emailText,
        html: emailHtml,
      });
      console.log('Password reset email sent via SMTP:', info.messageId);
    }
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Send welcome email after verification
export const sendWelcomeEmail = async (
  email: string,
  username: string
): Promise<void> => {
  // For Replit deployments, use HTTP instead of HTTPS to avoid SSL issues
  const baseUrl = process.env.APP_URL || 'http://localhost:5000';
  const correctedUrl = baseUrl.replace('https://', 'http://');

  const emailHtml = renderEmailShell({
    preheader: 'Your Main Link command access is active. Here\u2019s your mission briefing.',
    heading: `You're In, ${escapeHtml(username)}`,
    bodyHtml:
      para('Your email is verified and your tactical command access is now active. Here\u2019s your mission briefing:') +
      bulletList([
        { label: 'Join a Competition:', text: 'Find active competitions and form or join a team.' },
        { label: 'Submit Activities:', text: 'Track your cardio, strength, and mobility training.' },
        { label: 'Earn Points:', text: '15 points per activity (1 image required), 30 with photo + video evidence.' },
        { label: 'Daily Wellness:', text: 'Complete mood check-ins for 5 bonus points.' },
        { label: 'Connect with Buddies:', text: 'Build your tactical network.' },
      ]),
    ctaLabel: 'Enter Command Center',
    ctaUrl: correctedUrl,
    footerNote: 'Welcome to the Main Link community. Let\u2019s achieve your fitness goals together.',
  });

  const emailText = `You're in, ${username}! Your email is verified and your Main Link account is active.\n\nNext steps:\n- Join a competition and form or join a team\n- Submit activities to track cardio, strength, and mobility\n- Earn points (15 per activity, 30 with photo + video)\n- Complete daily mood check-ins for bonus points\n- Connect with buddies\n\nEnter the Command Center: ${correctedUrl}`;

  try {
    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send({
        to: email,
        from: FROM_ADDRESS,
        subject: 'Welcome to Main Link - Let\'s Get Started!',
        text: emailText,
        html: emailHtml,
        trackingSettings: TRACKING_SETTINGS,
      });
      console.log('Welcome email sent via SendGrid to:', email);
    } else {
      const transporter = createEmailTransporter();
      const info = await transporter.sendMail({
        from: FROM_ADDRESS,
        to: email,
        subject: 'Welcome to Main Link - Let\'s Get Started!',
        text: emailText,
        html: emailHtml,
      });
      console.log('Welcome email sent via SMTP:', info.messageId);
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email failures
  }
};
