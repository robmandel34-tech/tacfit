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
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #7cb342; font-size: 32px; margin: 0;">TacFit</h1>
        <p style="color: #666; font-size: 16px; margin: 5px 0;">Teamwork, Fitness, Winning</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #7cb342;">
        <h2 style="color: #333; margin-top: 0;">Welcome to TacFit, ${username}!</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.5;">
          Thank you for joining the TacFit community. To complete your registration and start competing with your team, please verify your email address.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #7cb342; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p style="color: #777; font-size: 14px; margin-bottom: 0;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verificationUrl}" style="color: #7cb342; word-break: break-all;">${verificationUrl}</a>
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          This verification link will expire in 24 hours.<br>
          If you didn't create an account with TacFit, please ignore this email.
        </p>
      </div>
    </div>
  `;

  try {
    if (process.env.SENDGRID_API_KEY) {
      // Use SendGrid
      const msg = {
        to: email,
        from: process.env.FROM_EMAIL || 'noreply@tacfit.app',
        subject: 'TacFit - Verify Your Email Address',
        html: emailHtml,
        // Disable click tracking to prevent link redirects
        trackingSettings: {
          clickTracking: {
            enable: false,
            enableText: false
          },
          openTracking: {
            enable: false
          }
        }
      };

      await sgMail.send(msg);
      console.log('Verification email sent via SendGrid to:', email);
    } else {
      // Fallback to SMTP/Ethereal
      const transporter = createEmailTransporter();
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@tacfit.app',
        to: email,
        subject: 'TacFit - Verify Your Email Address',
        html: emailHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Verification email sent via SMTP:', info.messageId);
      
      // For development with Ethereal, log the preview URL
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

// Send welcome email after verification
export const sendWelcomeEmail = async (
  email: string,
  username: string
): Promise<void> => {
  // For Replit deployments, use HTTP instead of HTTPS to avoid SSL issues
  const baseUrl = process.env.APP_URL || 'http://localhost:5000';
  const correctedUrl = baseUrl.replace('https://', 'http://');
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #7cb342; font-size: 32px; margin: 0;">TacFit</h1>
        <p style="color: #666; font-size: 16px; margin: 5px 0;">Teamwork, Fitness, Winning</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #7cb342;">
        <h2 style="color: #333; margin-top: 0;">Mission Briefing Ready, ${username}!</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.5;">
          Your email has been verified and your tactical command access is now active. Here's what you can do next:
        </p>
        
        <ul style="color: #555; font-size: 16px; line-height: 1.8; padding-left: 20px;">
          <li><strong>Join a Competition:</strong> Find active competitions and form or join a team</li>
          <li><strong>Submit Activities:</strong> Track your cardio, strength, and mobility training</li>
          <li><strong>Earn Points:</strong> Get 15 points per activity (minimum 1 image required), 30 points with photo + video evidence</li>
          <li><strong>Daily Wellness:</strong> Complete mood check-ins for 5 bonus points</li>
          <li><strong>Connect with Buddies:</strong> Build your tactical network</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${correctedUrl}" 
             style="background-color: #7cb342; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Enter Command Center
          </a>
        </div>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          Welcome to the TacFit community. Let's achieve your fitness goals together!
        </p>
      </div>
    </div>
  `;

  try {
    if (process.env.SENDGRID_API_KEY) {
      // Use SendGrid
      const msg = {
        to: email,
        from: process.env.FROM_EMAIL || 'noreply@tacfit.app',
        subject: 'Welcome to TacFit - Let\'s Get Started!',
        html: emailHtml,
        // Disable click tracking to prevent link redirects
        trackingSettings: {
          clickTracking: {
            enable: false,
            enableText: false
          },
          openTracking: {
            enable: false
          }
        }
      };

      await sgMail.send(msg);
      console.log('Welcome email sent via SendGrid to:', email);
    } else {
      // Fallback to SMTP
      const transporter = createEmailTransporter();
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@tacfit.app',
        to: email,
        subject: 'Welcome to TacFit - Let\'s Get Started!',
        html: emailHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Welcome email sent via SMTP:', info.messageId);
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email failures
  }
};