import xml2js from 'xml2js';
import logger from '../config/logger.js';

class SwiftParser {
  constructor() {
    this.xmlParser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      ignoreAttrs: false
    });
    this.xmlBuilder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ' }
    });
    this.swiftParserLib = null;
    this.swiftParserLibPromise = null;
    this.loadSwiftParserLib();
  }

  async loadSwiftParserLib() {
    if (this.swiftParserLibPromise) {
      return this.swiftParserLibPromise;
    }

    this.swiftParserLibPromise = (async () => {
      try {
        const module = await import('@centrapay/swift-parser');
        this.swiftParserLib = module.default || module;
        logger.info('✅ @centrapay/swift-parser loaded successfully');
        return true;
      } catch (error) {
        logger.warn('⚠️  @centrapay/swift-parser not available, using custom parser', { error: error.message });
        return false;
      }
    })();

    return this.swiftParserLibPromise;
  }

  async parseMTMessage(mtText) {
    try {
      const messageType = this.detectMessageType(mtText);
      
      if (messageType === '940' || messageType === '942') {
        await this.loadSwiftParserLib();
        
        if (this.swiftParserLib) {
          try {
            const parsed = this.swiftParserLib.parse({
              type: `mt${messageType}`,
              data: mtText
            });
            
            return {
              messageType: `MT${messageType}`,
              parsed: parsed,
              blocks: this.extractMTBlocks(mtText),
              raw: mtText,
              parser: 'centrapay'
            };
          } catch (libError) {
            logger.warn('@centrapay/swift-parser failed, falling back to custom parser', { error: libError.message });
          }
        }
      }
      
      const blocks = this.extractMTBlocks(mtText);
      
      return {
        messageType: messageType ? `MT${messageType}` : 'UNKNOWN',
        block1: this.parseBlock1(blocks.block1),
        block2: this.parseBlock2(blocks.block2),
        block3: this.parseBlock3(blocks.block3),
        block4: this.parseBlock4(blocks.block4),
        block5: this.parseBlock5(blocks.block5),
        raw: mtText,
        parser: 'custom'
      };
    } catch (error) {
      logger.error('Error parsing MT message', { error: error.message });
      throw new Error(`Failed to parse MT message: ${error.message}`);
    }
  }

  detectMessageType(mtText) {
    const block2Match = mtText.match(/\{2:([IO])(\d{3})/);
    if (block2Match) {
      return block2Match[2];
    }
    return null;
  }

  extractMTBlocks(text) {
    const blockRegex = /\{(\d):([^}]+)\}/g;
    const blocks = {};
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
      const blockNum = match[1];
      const content = match[2];
      blocks[`block${blockNum}`] = content;
    }

    return blocks;
  }

  parseBlock1(block1) {
    if (!block1 || block1.length < 12) {
      throw new Error('Invalid Block 1 format');
    }

    return {
      applicationId: block1.substring(0, 1),
      serviceId: block1.substring(1, 3),
      senderBIC: block1.substring(3, 6) + block1.substring(6, 9) + block1.substring(9, 11),
      receiverBIC: block1.substring(11, 14) + block1.substring(14, 17) + block1.substring(17, 19),
      sessionNumber: block1.substring(19, 25),
      sequenceNumber: block1.substring(25)
    };
  }

  parseBlock2(block2) {
    if (!block2) return null;

    const direction = block2.substring(0, 1);
    const messageType = block2.substring(1, 4);
    const priority = block2.substring(4, 5);
    const deliveryMonitoring = block2.substring(5, 6);
    const obsolescencePeriod = block2.substring(6, 9);

    return {
      direction,
      messageType,
      priority,
      deliveryMonitoring,
      obsolescencePeriod,
      receiverAddress: block2.substring(9)
    };
  }

  parseBlock3(block3) {
    if (!block3) return null;

    const tags = {};
    const tagRegex = /(\d{3}):([^:]+)/g;
    let match;

    while ((match = tagRegex.exec(block3)) !== null) {
      tags[match[1]] = match[2];
    }

    return tags;
  }

  parseBlock4(block4) {
    if (!block4) return null;

    const fields = {};
    const fieldRegex = /:(\d{2}[A-Z]?):([^:]+)/g;
    let match;

    while ((match = fieldRegex.exec(block4)) !== null) {
      const fieldTag = match[1];
      const fieldValue = match[2].trim();
      fields[fieldTag] = fieldValue;
    }

    return fields;
  }

  parseBlock5(block5) {
    if (!block5) return null;

    const tags = {};
    const tagRegex = /([A-Z]{3}):([^}]+)/g;
    let match;

    while ((match = tagRegex.exec(block5)) !== null) {
      tags[match[1]] = match[2];
    }

    return tags;
  }

  async parseMXMessage(xmlText) {
    try {
      const result = await this.xmlParser.parseStringPromise(xmlText);
      return result;
    } catch (error) {
      logger.error('Error parsing MX message', { error: error.message });
      throw new Error(`Failed to parse MX message: ${error.message}`);
    }
  }

  buildMXMessage(jsonObject) {
    try {
      return this.xmlBuilder.buildObject(jsonObject);
    } catch (error) {
      logger.error('Error building MX message', { error: error.message });
      throw new Error(`Failed to build MX message: ${error.message}`);
    }
  }

  validateMTMessage(parsedMessage) {
    const errors = [];

    if (!parsedMessage.block1) {
      errors.push('Missing Block 1 (Basic Header)');
    }

    if (!parsedMessage.block2) {
      errors.push('Missing Block 2 (Application Header)');
    }

    if (!parsedMessage.block4) {
      errors.push('Missing Block 4 (Text Block)');
    }

    if (parsedMessage.block1?.senderBIC && 
        (parsedMessage.block1.senderBIC.length < 8 || parsedMessage.block1.senderBIC.length > 11)) {
      errors.push('Invalid sender BIC format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateMXMessage(parsedMessage) {
    const errors = [];

    if (!parsedMessage.Document) {
      errors.push('Missing Document root element');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  parsePriority(block2) {
    if (!block2 || block2.length < 5) {
      return {
        code: 'N',
        name: 'Normal',
        deliveryTime: '2-4 business days'
      };
    }

    const priority = block2.substring(4, 5);
    const priorityMap = {
      'S': { code: 'S', name: 'System', deliveryTime: 'Immediate' },
      'U': { code: 'U', name: 'Urgent', deliveryTime: '1-24 hours' },
      'N': { code: 'N', name: 'Normal', deliveryTime: '2-4 business days' }
    };

    return priorityMap[priority] || priorityMap['N'];
  }

  // Add priority to SWIFT message
  addPriority(swiftMessage, priority) {
    const priorityMap = {
      'normal': 'N',
      'urgent': 'U',
      'system': 'S'
    };

    const priorityCode = priorityMap[priority.toLowerCase()] || 'N';
    
    // Update Block 2 with priority
    if (swiftMessage.block2) {
      const block2 = swiftMessage.block2;
      const newBlock2 = block2.substring(0, 4) + priorityCode + block2.substring(5);
      swiftMessage.block2 = newBlock2;
    }

    return swiftMessage;
  }

  // Calculate delivery time based on priority
  calculateDeliveryTime(priority) {
    const deliveryTimes = {
      'normal': { min: 48, max: 96, unit: 'hours' }, // 2-4 business days
      'urgent': { min: 1, max: 24, unit: 'hours' }, // 1-24 hours
      'system': { min: 0, max: 1, unit: 'hours' } // Immediate
    };

    return deliveryTimes[priority.toLowerCase()] || deliveryTimes['normal'];
  }
}

export default new SwiftParser();
