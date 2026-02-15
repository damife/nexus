/**
 * Payment ID Generator
 * Generates SWIFT-compliant payment IDs in format: PAY/123456
 */
class PaymentIdGenerator {
  /**
   * Generate payment ID in SWIFT format: PAY/123456
   * @returns {String} Payment ID
   */
  static generate() {
    // Format: PAY/YYYYMMDDHHMMSSXXX
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    return `PAY/${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}${random}`;
  }

  /**
   * Validate payment ID format
   * @param {String} paymentId - Payment ID to validate
   * @returns {Boolean} True if valid
   */
  static validate(paymentId) {
    if (!paymentId || typeof paymentId !== 'string') {
      return false;
    }
    
    // Format: PAY/YYYYMMDDHHMMSSXXX
    const pattern = /^PAY\/\d{17}[A-Z0-9]{3}$/;
    return pattern.test(paymentId);
  }
}

export default PaymentIdGenerator;

