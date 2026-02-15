import logger from '../config/logger.js';
import PDFDocument from 'pdfkit';

/**
 * PDF Generator Service for FIN Copy
 * Generates PDF documents with Courier New font for SWIFT messages
 */
class PDFGenerator {
  /**
   * Generate FIN copy PDF from SWIFT message
   * @param {object} message - Message object
   * @returns {Buffer} - PDF buffer
   */
  async generateFINCopy(message) {
    try {
      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          font: 'Courier'
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(16).font('Courier-Bold').text('SWIFT FIN COPY', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Courier').text('='.repeat(80), { align: 'center' });
        doc.moveDown();

        // Message Information
        doc.fontSize(11).font('Courier-Bold').text('Message Information:', { continued: false });
        doc.font('Courier').fontSize(10);
        doc.text(`Message Type: ${message.message_type || 'N/A'}`);
        doc.text(`Reference: ${message.reference || message.message_id || 'N/A'}`);
        doc.text(`Status: ${(message.status || 'N/A').toUpperCase()}`);
        doc.text(`Created: ${new Date(message.created_at).toLocaleString()}`);
        doc.moveDown();

        // Sender/Receiver
        doc.font('Courier-Bold').text('BIC Information:', { continued: false });
        doc.font('Courier');
        doc.text(`Sender BIC: ${message.sender_bic || 'N/A'}`);
        doc.text(`Receiver BIC: ${message.receiver_bic || 'N/A'}`);
        doc.moveDown();

        // Amount Information
        if (message.amount && message.currency) {
          doc.font('Courier-Bold').text('Payment Details:', { continued: false });
          doc.font('Courier');
          doc.text(`Amount: ${message.currency} ${parseFloat(message.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
          doc.text(`Value Date: ${message.value_date || 'N/A'}`);
          doc.moveDown();
        }

        // Separator
        doc.font('Courier').fontSize(9).text('-'.repeat(80), { align: 'center' });
        doc.moveDown();

        // SWIFT Message Text
        doc.font('Courier-Bold').fontSize(11).text('SWIFT MESSAGE TEXT', { align: 'center' });
        doc.moveDown(0.5);
        doc.font('Courier').fontSize(9).text('-'.repeat(80), { align: 'center' });
        doc.moveDown();

        // Format SWIFT blocks
        const swiftText = message.raw_swift_text || message.swift_content || '';
        if (swiftText) {
          const lines = swiftText.split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              doc.font('Courier').fontSize(9).text(line, { 
                indent: 0,
                align: 'left'
              });
            }
          });
        } else {
          doc.font('Courier').fontSize(9).text('No SWIFT text available');
        }

        doc.moveDown();
        doc.font('Courier').fontSize(8).text('='.repeat(80), { align: 'center' });
        doc.font('Courier').fontSize(8).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.font('Courier').fontSize(8).text('='.repeat(80), { align: 'center' });

        doc.end();
      });
    } catch (error) {
      logger.error('PDF generation error', { error: error.message, messageId: message.message_id });
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Format SWIFT message for PDF display
   */
  formatSwiftForPDF(swiftText, message) {
    let formatted = '';
    
    // Header
    formatted += '='.repeat(80) + '\n';
    formatted += 'SWIFT FIN COPY\n';
    formatted += '='.repeat(80) + '\n\n';
    
    // Message Information
    formatted += `Message Type: ${message.message_type}\n`;
    formatted += `Reference: ${message.reference || message.message_id}\n`;
    formatted += `Status: ${message.status.toUpperCase()}\n`;
    formatted += `Created: ${new Date(message.created_at).toLocaleString()}\n`;
    formatted += `\n`;
    
    // Sender/Receiver
    formatted += `Sender BIC: ${message.sender_bic || 'N/A'}\n`;
    formatted += `Receiver BIC: ${message.receiver_bic || 'N/A'}\n`;
    formatted += `\n`;
    
    if (message.amount && message.currency) {
      formatted += `Amount: ${message.currency} ${parseFloat(message.amount).toLocaleString()}\n`;
      formatted += `Value Date: ${message.value_date || 'N/A'}\n`;
      formatted += `\n`;
    }
    
    formatted += '-'.repeat(80) + '\n';
    formatted += 'SWIFT MESSAGE TEXT\n';
    formatted += '-'.repeat(80) + '\n\n';
    
    // Format SWIFT blocks
    if (swiftText) {
      const lines = swiftText.split('\n');
      lines.forEach(line => {
        formatted += line + '\n';
      });
    } else {
      formatted += 'No SWIFT text available\n';
    }
    
    formatted += '\n' + '='.repeat(80) + '\n';
    formatted += `Generated: ${new Date().toLocaleString()}\n`;
    formatted += '='.repeat(80) + '\n';
    
    return formatted;
  }

  /**
   * Create PDF content (simplified version)
   * In production, use pdfkit or similar library
   */
  createPDFContent(text, message) {
    // This is a simplified version
    // In production, use a proper PDF library like pdfkit
    const pdfHeader = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Courier
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length ${text.length + 100}
>>
stream
BT
/F1 10 Tf
100 700 Td
(${text.replace(/[()\\]/g, '\\$&').replace(/\n/g, ') Tj T* (')}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000300 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${400 + text.length}
%%EOF`;

    return Buffer.from(pdfHeader);
  }

  /**
   * Generate PDF using proper library (recommended implementation)
   * This requires pdfkit: npm install pdfkit
   */
  async generatePDFWithLibrary(message) {
    // Uncomment when pdfkit is installed
    /*
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      font: 'Courier',
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {});

    // Header
    doc.fontSize(16).text('SWIFT FIN COPY', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text('='.repeat(80), { align: 'center' });
    doc.moveDown();

    // Message Info
    doc.fontSize(12).text(`Message Type: ${message.message_type}`);
    doc.text(`Reference: ${message.reference || message.message_id}`);
    doc.text(`Status: ${message.status.toUpperCase()}`);
    doc.text(`Created: ${new Date(message.created_at).toLocaleString()}`);
    doc.moveDown();

    // SWIFT Text
    doc.fontSize(10);
    const swiftText = message.raw_swift_text || message.swift_content || '';
    const lines = swiftText.split('\n');
    lines.forEach(line => {
      doc.text(line);
    });

    doc.end();

    return Buffer.concat(chunks);
    */
    
    // Fallback to text-based for now
    return this.createPDFContent(
      this.formatSwiftForPDF(message.raw_swift_text || message.swift_content || '', message),
      message
    );
  }
}

export default new PDFGenerator();

