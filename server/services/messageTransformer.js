import swiftParser from './swiftParser.js';
import logger from '../config/logger.js';

/**
 * Master Data Transformation Service
 * Handles conversion between JSON, MT text, and MX XML formats
 * Ensures compliance with SWIFT and ISO 20022 standards
 */
class MessageTransformer {
  /**
   * Convert JSON object to MT103 text format
   * @param {Object} jsonData - JSON payment data
   * @returns {String} MT103 formatted text
   */
  jsonToMT103(jsonData) {
    try {
      const {
        senderBIC = '',
        receiverBIC = '',
        reference = '',
        valueDate = new Date().toISOString().split('T')[0].replace(/-/g, ''),
        currency = 'USD',
        amount = '0',
        orderingCustomer = {},
        beneficiary = {},
        remittanceInfo = '',
        charges = 'SHA' // OUR, SHA, BEN
      } = jsonData;

      // Validate BIC codes (8-11 characters)
      if (senderBIC.length < 8 || senderBIC.length > 11) {
        throw new Error('Invalid sender BIC format');
      }
      if (receiverBIC.length < 8 || receiverBIC.length > 11) {
        throw new Error('Invalid receiver BIC format');
      }

      // Format amount (remove decimals, pad to 15 digits)
      const formattedAmount = amount.toString().replace('.', '').padStart(15, '0');

      // Block 1: Basic Header
      const block1 = `{1:F01${senderBIC.padEnd(12, 'X')}${receiverBIC.padEnd(12, 'X')}${valueDate}${Date.now().toString().slice(-6)}}`;

      // Block 2: Application Header
      const block2 = `{2:I103${receiverBIC.padEnd(12, 'X')}N}`;

      // Block 4: Text Block
      let block4 = `{4:\n`;
      block4 += `:20:${reference}\n`; // Transaction Reference
      block4 += `:23B:CRED\n`; // Bank Operation Code
      block4 += `:32A:${valueDate}${currency}${formattedAmount}\n`; // Value Date, Currency, Amount

      // Ordering Customer (Field 50K or 50A)
      if (orderingCustomer.account) {
        block4 += `:50K:/${orderingCustomer.account}\n`;
        if (orderingCustomer.name) {
          block4 += `${orderingCustomer.name}\n`;
        }
      } else if (orderingCustomer.name) {
        block4 += `:50K:${orderingCustomer.name}\n`;
      }

      // Beneficiary (Field 59)
      if (beneficiary.account) {
        block4 += `:59:/${beneficiary.account}\n`;
        if (beneficiary.name) {
          block4 += `${beneficiary.name}\n`;
        }
      } else if (beneficiary.name) {
        block4 += `:59:${beneficiary.name}\n`;
      }

      // Remittance Information (Field 70)
      if (remittanceInfo) {
        block4 += `:70:${remittanceInfo}\n`;
      }

      // Charges (Field 71A)
      block4 += `:71A:${charges}\n`;

      block4 += `-}`;

      // Block 5: Trailer (checksum - simplified)
      const checksum = this.calculateChecksum(block1 + block2 + block4);
      const block5 = `{5:{CHK:${checksum}}}`;

      const mt103Text = `${block1}\n${block2}\n${block4}\n${block5}`;

      logger.info('JSON to MT103 conversion successful', { reference });
      return mt103Text;
    } catch (error) {
      logger.error('Error converting JSON to MT103', { error: error.message });
      throw new Error(`Failed to convert JSON to MT103: ${error.message}`);
    }
  }

  /**
   * Convert JSON object to MX (ISO 20022) XML format (pacs.008)
   * @param {Object} jsonData - JSON payment data
   * @returns {String} ISO 20022 XML
   */
  async jsonToMX(jsonData) {
    try {
      const {
        reference = '',
        senderBIC = '',
        receiverBIC = '',
        amount = '0',
        currency = 'USD',
        valueDate = new Date().toISOString(),
        orderingCustomer = {},
        beneficiary = {},
        remittanceInfo = '',
        messageId = `MSG${Date.now()}`
      } = jsonData;

      // Build ISO 20022 pacs.008 structure
      const mxStructure = {
        Document: {
          $: {
            xmlns: 'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08',
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
          },
          FIToFICstmrCdtTrf: {
            GrpHdr: {
              MsgId: messageId,
              CreDtTm: new Date().toISOString(),
              NbOfTxs: '1',
              CtrlSum: parseFloat(amount).toFixed(2),
              InitgPty: {
                Nm: senderBIC
              }
            },
            CdtTrfTxInf: {
              PmtId: {
                InstrId: messageId,
                EndToEndId: reference,
                TxId: reference
              },
              IntrBkSttlmAmt: {
                $: { Ccy: currency },
                _: parseFloat(amount).toFixed(2)
              },
              IntrBkSttlmDt: valueDate.split('T')[0],
              SttlmPrty: 'NORM',
              PmtTpInf: {
                SvcLvl: {
                  Cd: 'SEPA'
                },
                CtgyPurp: {
                  Cd: 'SUPP'
                }
              },
              InstgAgt: {
                FinInstnId: {
                  BICFI: senderBIC
                }
              },
              InstdAgt: {
                FinInstnId: {
                  BICFI: receiverBIC
                }
              },
              Cdtr: {
                Nm: beneficiary.name || 'Beneficiary',
                PstlAdr: {
                  Ctry: beneficiary.country || 'US'
                }
              },
              CdtrAcct: {
                Id: {
                  IBAN: beneficiary.account || ''
                }
              },
              RmtInf: {
                Ustrd: remittanceInfo || ''
              },
              Dbtr: {
                Nm: orderingCustomer.name || 'Ordering Customer',
                PstlAdr: {
                  Ctry: orderingCustomer.country || 'US'
                }
              },
              DbtrAcct: {
                Id: {
                  IBAN: orderingCustomer.account || ''
                }
              }
            }
          }
        }
      };

      // Convert to XML using swiftParser
      const xmlText = swiftParser.buildMXMessage(mxStructure);

      logger.info('JSON to MX conversion successful', { messageId, reference });
      return xmlText;
    } catch (error) {
      logger.error('Error converting JSON to MX', { error: error.message });
      throw new Error(`Failed to convert JSON to MX: ${error.message}`);
    }
  }

  /**
   * Convert MT103 text to JSON
   * @param {String} mt103Text - MT103 formatted text
   * @returns {Object} JSON payment data
   */
  async mt103ToJSON(mt103Text) {
    try {
      const parsed = await swiftParser.parseMTMessage(mt103Text);
      
      if (parsed.messageType !== 'MT103' && parsed.block2?.messageType !== '103') {
        throw new Error('Not an MT103 message');
      }

      const block4 = parsed.block4 || {};
      const block1 = parsed.block1 || {};

      // Extract field :32A: (Value Date, Currency, Amount)
      const field32A = block4['32A'] || '';
      const valueDate = field32A.substring(0, 6);
      const currency = field32A.substring(6, 9);
      const amount = field32A.substring(9);

      const jsonData = {
        messageType: 'MT103',
        senderBIC: block1.senderBIC || '',
        receiverBIC: block1.receiverBIC || '',
        reference: block4['20'] || '',
        valueDate: this.formatDate(valueDate),
        currency: currency,
        amount: parseFloat(amount) / 100, // Convert from minor units
        orderingCustomer: {
          account: block4['50K']?.split('/')[1] || '',
          name: block4['50K']?.split('\n')[1] || block4['50K'] || ''
        },
        beneficiary: {
          account: block4['59']?.split('/')[1] || '',
          name: block4['59']?.split('\n')[1] || block4['59'] || ''
        },
        remittanceInfo: block4['70'] || '',
        charges: block4['71A'] || 'SHA'
      };

      logger.info('MT103 to JSON conversion successful', { reference: jsonData.reference });
      return jsonData;
    } catch (error) {
      logger.error('Error converting MT103 to JSON', { error: error.message });
      throw new Error(`Failed to convert MT103 to JSON: ${error.message}`);
    }
  }

  /**
   * Convert MX XML to JSON
   * @param {String} xmlText - ISO 20022 XML
   * @returns {Object} JSON payment data
   */
  async mxToJSON(xmlText) {
    try {
      const parsed = await swiftParser.parseMXMessage(xmlText);
      
      // Extract from ISO 20022 structure
      const doc = parsed.Document?.FIToFICstmrCdtTrf || parsed.FIToFICstmrCdtTrf;
      const txInf = doc?.CdtTrfTxInf || doc?.CdtTrfTxInf?.[0];

      const jsonData = {
        messageType: 'pacs.008',
        messageId: doc?.GrpHdr?.MsgId || '',
        reference: txInf?.PmtId?.EndToEndId || txInf?.PmtId?.InstrId || '',
        senderBIC: txInf?.InstgAgt?.FinInstnId?.BICFI || '',
        receiverBIC: txInf?.InstdAgt?.FinInstnId?.BICFI || '',
        amount: parseFloat(txInf?.IntrBkSttlmAmt?._ || txInf?.IntrBkSttlmAmt || '0'),
        currency: txInf?.IntrBkSttlmAmt?.['@_']?.Ccy || txInf?.IntrBkSttlmAmt?.Ccy || 'USD',
        valueDate: txInf?.IntrBkSttlmDt || new Date().toISOString(),
        orderingCustomer: {
          name: txInf?.Dbtr?.Nm || '',
          account: txInf?.DbtrAcct?.Id?.IBAN || '',
          country: txInf?.Dbtr?.PstlAdr?.Ctry || ''
        },
        beneficiary: {
          name: txInf?.Cdtr?.Nm || '',
          account: txInf?.CdtrAcct?.Id?.IBAN || '',
          country: txInf?.Cdtr?.PstlAdr?.Ctry || ''
        },
        remittanceInfo: txInf?.RmtInf?.Ustrd || ''
      };

      logger.info('MX to JSON conversion successful', { messageId: jsonData.messageId });
      return jsonData;
    } catch (error) {
      logger.error('Error converting MX to JSON', { error: error.message });
      throw new Error(`Failed to convert MX to JSON: ${error.message}`);
    }
  }

  /**
   * Calculate checksum for SWIFT message
   */
  calculateChecksum(text) {
    let sum = 0;
    for (let i = 0; i < text.length; i++) {
      sum += text.charCodeAt(i);
    }
    return (sum % 1000000).toString().padStart(6, '0');
  }

  /**
   * Format date from YYMMDD to ISO format
   */
  formatDate(yymmdd) {
    if (!yymmdd || yymmdd.length !== 6) return new Date().toISOString().split('T')[0];
    const year = '20' + yymmdd.substring(0, 2);
    const month = yymmdd.substring(2, 4);
    const day = yymmdd.substring(4, 6);
    return `${year}-${month}-${day}`;
  }
}

export default new MessageTransformer();

