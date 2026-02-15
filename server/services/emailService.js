import { Resend } from 'resend';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Email Service using Resend API
 */
class EmailService {
  constructor() {
    this.resend = null;
    this.fromEmail = 'noreply@swiftnexus.com';
    this.loadConfig();
  }

  /**
   * Load Resend configuration from system settings
   */
  async loadConfig() {
    try {
      const result = await query(`
        SELECT setting_value FROM system_settings 
        WHERE setting_key IN ('resend_api_key', 'resend_from_email')
      `);

      let apiKey = null;
      let fromEmail = this.fromEmail;

      result.rows.forEach(row => {
        if (row.setting_key === 'resend_api_key') {
          apiKey = row.setting_value;
        } else if (row.setting_key === 'resend_from_email') {
          fromEmail = row.setting_value;
        }
      });

      if (apiKey) {
        this.resend = new Resend(apiKey);
        this.fromEmail = fromEmail || this.fromEmail;
      }
    } catch (error) {
      logger.warn('Resend API key not configured', { error: error.message });
    }
  }

  /**
   * Send email
   * @param {String} to - Recipient email
   * @param {String} subject - Email subject
   * @param {String} html - HTML content
   * @param {String} text - Plain text content (optional)
   */
  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.resend) {
        await this.loadConfig();
        if (!this.resend) {
          logger.warn('Resend not configured, email not sent', { to, subject });
          return { success: false, message: 'Email service not configured' };
        }
      }

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '')
      });

      if (error) {
        logger.error('Error sending email', { to, subject, error });
        throw error;
      }

      logger.info('Email sent', { to, subject, id: data?.id });
      return { success: true, id: data?.id };
    } catch (error) {
      logger.error('Error sending email', { to, subject, error: error.message });
      throw error;
    }
  }

  /**
   * Send 2FA email
   * @param {String} to - Recipient email
   * @param {String} otp - OTP code
   */
  async send2FAEmail(to, otp) {
    const subject = 'Your SwiftNexus 2FA Code';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; padding: 20px; background: #f5f5f5; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Two-Factor Authentication Code</h2>
          <p>Your verification code is:</p>
          <div class="code">${otp}</div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(to, subject, html);
  }

  /**
   * Send balance top-up confirmation
   * @param {String} to - Recipient email
   * @param {Number} amount - Amount added
   * @param {String} paymentId - Payment ID
   */
  async sendBalanceConfirmation(to, amount, paymentId) {
    const subject = 'Balance Top-Up Confirmed';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Balance Top-Up Confirmed</h2>
          <p>Your account has been credited with <strong>$${amount}</strong>.</p>
          <p>Payment ID: ${paymentId}</p>
          <p>Thank you for using SwiftNexus Enterprise.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(to, subject, html);
  }
  /**
   * Send user disabled notification
   * @param {String} to - Recipient email
   * @param {String} userName - User name
   * @param {String} reason - Disable reason
   */
  async sendUserDisabledNotification(to, userName, reason) {
    const subject = 'Account Disabled - SwiftNexus Enterprise';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Account Disabled</h2>
          <p>Dear <strong>${userName}</strong>,</p>
          <p>Your SwiftNexus Enterprise account has been disabled.</p>
          <div class="alert">
            <strong>Reason:</strong> ${reason}
          </div>
          <p>If you believe this is an error, please contact our support team.</p>
          <p>Thank you,<br>SwiftNexus Enterprise Team</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(to, subject, html);
  }

  /**
   * Send admin notification for new user registration
   * @param {String} to - Admin email
   * @param {Object} userData - User data
   */
  async sendNewUserNotification(to, userData) {
    const subject = 'New User Registration - SwiftNexus Enterprise';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .user-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>New User Registration</h2>
          <p>A new user has registered on SwiftNexus Enterprise:</p>
          <div class="user-info">
            <strong>Name:</strong> ${userData.name}<br>
            <strong>Email:</strong> ${userData.email}<br>
            <strong>Role:</strong> ${userData.role}<br>
            <strong>Registration Date:</strong> ${new Date().toLocaleDateString()}
          </div>
          <p>Please review and approve the user account.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(to, subject, html);
  }

  /**
   * Send contact form notification to admin
   * @param {String} to - Admin email
   * @param {Object} contactData - Contact form data
   */
  async sendContactNotification(to, contactData) {
    const subject = 'New Contact Form Submission - SwiftNexus Enterprise';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .contact-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>New Contact Form Submission</h2>
          <div class="contact-info">
            <strong>Name:</strong> ${contactData.name}<br>
            <strong>Email:</strong> ${contactData.email}<br>
            <strong>Subject:</strong> ${contactData.subject}<br>
            <strong>Message:</strong> ${contactData.message}<br>
            <strong>Submitted:</strong> ${new Date().toLocaleDateString()}
          </div>
          <p>Please respond to this inquiry promptly.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(to, subject, html);
  }

  /**
   * Send demo request notification to admin
   * @param {String} to - Admin email
   * @param {Object} demoData - Demo request data
   */
  async sendDemoNotification(to, demoData) {
    const subject = 'New Demo Request - SwiftNexus Enterprise';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .demo-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>New Demo Request</h2>
          <div class="demo-info">
            <strong>Name:</strong> ${demoData.name}<br>
            <strong>Email:</strong> ${demoData.email}<br>
            <strong>Company:</strong> ${demoData.company}<br>
            <strong>Phone:</strong> ${demoData.phone}<br>
            <strong>Preferred Date:</strong> ${demoData.preferredDate}<br>
            <strong>Message:</strong> ${demoData.message}<br>
            <strong>Requested:</strong> ${new Date().toLocaleDateString()}
          </div>
          <p>Please schedule the demo and contact the prospect.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(to, subject, html);
  }

  /**
   * Send complaint notification to admin
   * @param {String} to - Admin email
   * @param {Object} complaintData - Complaint data
   */
  async sendComplaintNotification(to, complaintData) {
    const subject = 'New User Complaint - SwiftNexus Enterprise';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .complaint-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .priority-high { border-left: 4px solid #dc2626; }
          .priority-medium { border-left: 4px solid #f59e0b; }
          .priority-low { border-left: 4px solid #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>New User Complaint</h2>
          <div class="complaint-info priority-${complaintData.priority}">
            <strong>User:</strong> ${complaintData.userName}<br>
            <strong>Email:</strong> ${complaintData.userEmail}<br>
            <strong>Category:</strong> ${complaintData.category}<br>
            <strong>Priority:</strong> ${complaintData.priority}<br>
            <strong>Title:</strong> ${complaintData.title}<br>
            <strong>Description:</strong> ${complaintData.description}<br>
            <strong>Submitted:</strong> ${new Date().toLocaleDateString()}
          </div>
          <p>Please review and address this complaint promptly.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(to, subject, html);
  }

  /**
   * Send message sent confirmation
   * @param {String} to - Recipient email
   * @param {Object} messageData - Message data
   */
  async sendMessageSentConfirmation(to, messageData) {
    const subject = 'SWIFT Message Sent Successfully - SwiftNexus Enterprise';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .message-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>SWIFT Message Sent Successfully</h2>
          <div class="message-info">
            <strong>UTR:</strong> ${messageData.utr}<br>
            <strong>Message Type:</strong> ${messageData.messageType}<br>
            <strong>Receiver BIC:</strong> ${messageData.receiverBIC}<br>
            <strong>Amount:</strong> ${messageData.currency} ${messageData.amount}<br>
            <strong>Priority:</strong> ${messageData.priority}<br>
            <strong>Status:</strong> ${messageData.status}
          </div>
          <p>Your SWIFT message has been sent successfully. You can track its status using the UTR above.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(to, subject, html);
  }

  /**
   * Send contact submission confirmation to user
   * @param {String} to - Recipient email
   * @param {Object} contactData - Contact data
   */
  async sendContactSubmissionConfirmation(to, contactData) {
    const subject = 'Thank You for Contacting SwiftNexus - We Have Received Your Message';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1f2937; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .message-details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SwiftNexus Enterprise</h1>
            <p>SWIFT Messaging & Financial Compliance Solutions</p>
          </div>
          <div class="content">
            <h2>Thank You for Contacting Us!</h2>
            <p>Dear ${contactData.firstName} ${contactData.lastName},</p>
            <p>We have successfully received your message and will get back to you within 24 business hours. Our team is reviewing your inquiry and will respond as soon as possible.</p>
            <div class="message-details">
              <strong>Your Message Details:</strong><br>
              <strong>Subject:</strong> ${contactData.subject}<br>
              <strong>Company:</strong> ${contactData.company || 'N/A'}<br>
              <strong>Submitted:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
            </div>
            <p>If you have any urgent matters, please don't hesitate to call us directly at our support hotline.</p>
            <p>Best regards,<br>The SwiftNexus Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2018 - ${new Date().getFullYear()} SwiftNexus. All rights reserved.</p>
            <p>Enterprise SWIFT Messaging Platform | Financial Compliance Solutions</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(to, subject, html);
  }

  /**
   * Send demo request confirmation to user
   * @param {String} to - Recipient email
   * @param {Object} demoData - Demo request data
   */
  async sendDemoRequestConfirmation(to, demoData) {
    const subject = 'Your SwiftNexus Demo Request Has Been Received - Next Steps';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1f2937; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .demo-details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .next-steps { background: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .footer { background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SwiftNexus Enterprise</h1>
            <p>SWIFT Messaging & Financial Compliance Solutions</p>
          </div>
          <div class="content">
            <h2>Your Demo Request Has Been Received!</h2>
            <p>Dear ${demoData.firstName} ${demoData.lastName},</p>
            <p>Thank you for your interest in SwiftNexus! We have successfully received your demo request and our solutions team is excited to show you the power of our platform.</p>
            <div class="demo-details">
              <strong>Your Demo Request Details:</strong><br>
              <strong>Company:</strong> ${demoData.company}<br>
              <strong>Job Title:</strong> ${demoData.jobTitle || 'N/A'}<br>
              <strong>Solution Interest:</strong> ${demoData.solutionInterest || 'General Overview'}<br>
              <strong>Phone:</strong> ${demoData.phone || 'N/A'}<br>
              <strong>Submitted:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
            </div>
            <div class="next-steps">
              <h3>What Happens Next?</h3>
              <ol>
                <li><strong>Within 24 hours:</strong> Our team will review your requirements</li>
                <li><strong>Within 48 hours:</strong> You'll receive a calendar invitation for your personalized demo</li>
                <li><strong>Demo Session:</strong> 45-minute live demonstration tailored to your needs</li>
                <li><strong>Follow-up:</strong> Detailed proposal and implementation roadmap</li>
              </ol>
            </div>
            <p>Please ensure you're available for the demo session. Our team will coordinate with you to find the best time that works for your schedule.</p>
            <p>We look forward to demonstrating how SwiftNexus can transform your financial messaging and compliance operations!</p>
            <p>Best regards,<br>The SwiftNexus Solutions Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2018 - ${new Date().getFullYear()} SwiftNexus. All rights reserved.</p>
            <p>Enterprise SWIFT Messaging Platform | Financial Compliance Solutions</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(to, subject, html);
  }
}

export default new EmailService();

