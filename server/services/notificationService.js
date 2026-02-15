import { query } from '../config/database.js';
import logger from '../config/logger.js';

class NotificationService {
  async sendAdminNotification(type, data) {
    try {
      await query(`
        INSERT INTO admin_notifications (type, data, status, created_at)
        VALUES ($1, $2, 'unread', CURRENT_TIMESTAMP)
      `, [type, JSON.stringify(data)]);
      
      logger.info('Admin notification sent', { type, data });
    } catch (error) {
      logger.error('Error sending admin notification', { error: error.message });
    }
  }

  async getAdminNotifications() {
    try {
      const result = await query(`
        SELECT * FROM admin_notifications 
        ORDER BY created_at DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting admin notifications', { error: error.message });
      return [];
    }
  }

  async sendApplicantConfirmation(email, firstName, position) {
    try {
      // This would integrate with an email service like SendGrid, Nodemailer, etc.
      // For now, we'll just log it
      logger.info('Applicant confirmation email sent', { 
        email, 
        firstName, 
        position,
        type: 'application_confirmation'
      });
      
      // TODO: Implement actual email sending
      // Example with nodemailer:
      // await transporter.sendMail({
      //   to: email,
      //   subject: 'Application Confirmation - SwiftNexus',
      //   html: `Dear ${firstName},<br><br>We have received your application for ${position}.`
      // });
      
    } catch (error) {
      logger.error('Error sending applicant confirmation', { error: error.message });
      throw error;
    }
  }
}

export default new NotificationService();
