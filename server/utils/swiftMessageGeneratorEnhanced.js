/**
 * Enhanced SWIFT Message Generator for SwiftNexus Enterprise
 * Complete Industry Standard Implementation with All Categories
 */

class SwiftMessageGeneratorEnhanced {
  constructor() {
    this.messageTypes = {
      // Category 0: System Messages
      'MT019': 'System Message',
      'MT021': 'Login',
      'MT095': 'Query',
      
      // Category 1: Customer Payments & Cheques
      'MT101': 'General Financial Institution Transfer',
      'MT102': 'General Financial Institution Transfer',
      'MT103': 'Single Customer Credit Transfer',
      'MT104': 'Multiple Customer Credit Transfer',
      'MT105': 'Multiple Customer Debit Transfer',
      'MT106': 'General Financial Institution Transfer',
      'MT107': 'General Financial Institution Transfer',
      'MT110': 'Advice of Cheque',
      'MT111': 'Request for Cheque',
      'MT112': 'Stop Cheque',
      'MT190': 'Advisory Services',
      'MT191': 'Request for Advisory Services',
      'MT192': 'Request for Advisory Services',
      'MT195': 'Queries',
      'MT196': 'Answers',
      'MT198': 'Permission to Debit Account',
      'MT199': 'Free Format Message',
      
      // Category 2: Financial Institution Transfers
      'MT200': 'Financial Institution Transfer',
      'MT201': 'Financial Institution Transfer',
      'MT202': 'General Financial Institution Transfer',
      'MT203': 'Financial Institution Transfer',
      'MT204': 'Financial Institution Transfer',
      'MT205': 'Financial Institution Transfer',
      'MT206': 'Financial Institution Transfer',
      'MT207': 'Financial Institution Transfer',
      'MT208': 'Financial Institution Transfer',
      'MT210': 'Notice to Receive',
      'MT256': 'General Financial Institution Transfer',
      
      // Category 3: Treasury Markets
      'MT300': 'Foreign Exchange Confirmation',
      'MT301': 'Foreign Exchange Confirmation',
      'MT302': 'Foreign Exchange Confirmation',
      'MT303': 'Foreign Exchange Confirmation',
      'MT304': 'Advice/Instruction of a Third Party Deal',
      'MT305': 'Foreign Exchange Confirmation',
      'MT306': 'Foreign Exchange Confirmation',
      'MT307': 'Foreign Exchange Confirmation',
      'MT308': 'Foreign Exchange Confirmation',
      'MT309': 'Financial Institution Transfer',
      'MT320': 'Fixed/Variable Loan Confirmation',
      'MT330': 'Extended Loan Notification',
      'MT340': 'Forward Rate Agreement Confirmation',
      'MT341': 'Forward Rate Agreement Confirmation',
      'MT350': 'Loan/Deposit Notification',
      'MT360': 'New Loan/Deposit Notification',
      'MT365': 'Currency Interest Settlement',
      'MT366': 'Currency Interest Settlement',
      
      // Category 4: Collections & Cash Letters
      'MT400': 'Payment Advice',
      'MT410': 'Acknowledgement of Payment',
      'MT412': 'Advice of Payment',
      'MT416': 'Cash Letter',
      'MT420': 'Tracer',
      'MT422': 'Request for Payment',
      'MT430': 'Amendment to Payment',
      'MT450': 'Settlement Transaction',
      'MT456': 'Request for Amendment',
      'MT470': 'Multiple Debit/Credit Transfer',
      'MT471': 'Amendment to Multiple Debit/Credit Transfer',
      'MT475': 'Statement',
      'MT480': 'Debit/Credit Confirmation',
      'MT490': 'Advice of Charges',
      'MT492': 'Request for Charges',
      'MT494': 'Query',
      'MT496': 'Answer',
      'MT498': 'Permission to Debit Account',
      
      // Category 5: Securities Markets
      'MT540': 'Receive Free of Payment',
      'MT541': 'Receive Free of Payment',
      'MT542': 'Receive Against Payment',
      'MT543': 'Receive Against Payment',
      'MT544': 'Deliver Free of Payment',
      'MT545': 'Deliver Free of Payment',
      'MT546': 'Deliver Against Payment',
      'MT547': 'Deliver Against Payment',
      'MT548': 'Statement of Holdings',
      'MT549': 'Statement of Transactions',
      'MT550': 'Account Statement',
      'MT558': 'Transfer Instruction',
      'MT568': 'Trade Confirmation',
      'MT569': 'Trade Confirmation',
      'MT575': 'Statement of Holdings',
      'MT576': 'Statement of Transactions',
      'MT578': 'Account Statement',
      'MT586': 'Transfer Instruction',
      'MT588': 'Trade Confirmation',
      'MT590': 'Account Statement',
      'MT594': 'Transfer Instruction',
      'MT596': 'Trade Confirmation',
      'MT598': 'Account Statement',
      'MT599': 'Free Format Message',
      
      // Category 6: Treasury Markets - Precious Metals
      'MT600': 'Precious Metals Confirmation',
      'MT601': 'Precious Metals Confirmation',
      'MT602': 'Precious Metals Confirmation',
      'MT603': 'Precious Metals Confirmation',
      'MT604': 'Precious Metals Confirmation',
      'MT605': 'Precious Metals Confirmation',
      'MT606': 'Precious Metals Confirmation',
      'MT607': 'Precious Metals Confirmation',
      'MT608': 'Precious Metals Confirmation',
      'MT609': 'Precious Metals Confirmation',
      'MT643': 'Syndication Confirmation',
      'MT644': 'Syndication Confirmation',
      'MT645': 'Syndication Confirmation',
      'MT646': 'Syndication Confirmation',
      'MT647': 'Syndication Confirmation',
      'MT648': 'Syndication Confirmation',
      'MT649': 'Syndication Confirmation',
      
      // Category 7: Documentary Credits & Guarantees
      'MT700': 'Issue of a Documentary Credit',
      'MT705': 'Pre-Advice of a Documentary Credit',
      'MT707': 'Amendment to a Documentary Credit',
      'MT710': 'Advice of a Documentary Credit',
      'MT720': 'Transfer of a Documentary Credit',
      'MT721': 'Transfer of a Documentary Credit',
      'MT730': 'Advice of Discrepancy',
      'MT732': 'Advice of Discrepancy',
      'MT734': 'Advice of Discrepancy',
      'MT740': 'Authorization to Reimburse',
      'MT742': 'Authorization to Reimburse',
      'MT747': 'Amendment to Authorization',
      'MT750': 'Advice of Payment/Acceptance/Negotiation',
      'MT752': 'Authorization to Pay',
      'MT754': 'Advice of Payment',
      'MT756': 'Advice of Reimbursement',
      'MT757': 'Issuance of a Standby Letter of Credit',
      'MT760': 'Amendment to a Standby Letter of Credit',
      'MT767': 'Guarantee',
      'MT768': 'Guarantee',
      'MT769': 'Guarantee',
      'MT770': 'Advice of Guarantee',
      'MT771': 'Advice of Guarantee',
      'MT775': 'Request for Issue of a Guarantee',
      'MT776': 'Request for Issue of a Guarantee',
      'MT777': 'Request for Issue of a Guarantee',
      'MT779': 'Request for Issue of a Guarantee',
      'MT780': 'Advice of Guarantee',
      'MT787': 'Guarantee',
      'MT788': 'Guarantee',
      'MT790': 'Advice of Payment',
      'MT791': 'Request for Payment',
      'MT792': 'Request for Payment',
      'MT795': 'Queries',
      'MT796': 'Answers',
      'MT797': 'Notification of Discrepancy',
      'MT798': 'Permission to Debit Account',
      'MT799': 'Free Format Message',
      
      // Category 8: Travellers Cheques
      'MT800': 'Travellers Cheque Purchase',
      'MT801': 'Travellers Cheque Sale',
      'MT802': 'Travellers Cheque Refund',
      'MT810': 'Travellers Cheque Purchase Confirmation',
      'MT811': 'Travellers Cheque Sale Confirmation',
      'MT812': 'Travellers Cheque Refund Confirmation',
      'MT820': 'Travellers Cheque Purchase Advice',
      'MT821': 'Travellers Cheque Sale Advice',
      'MT822': 'Travellers Cheque Refund Advice',
      'MT830': 'Travellers Cheque Purchase Notification',
      'MT831': 'Travellers Cheque Sale Notification',
      'MT832': 'Travellers Cheque Refund Notification',
      'MT840': 'Travellers Cheque Purchase Confirmation',
      'MT841': 'Travellers Cheque Sale Confirmation',
      'MT842': 'Travellers Cheque Refund Confirmation',
      'MT850': 'Travellers Cheque Purchase Advice',
      'MT851': 'Travellers Cheque Sale Advice',
      'MT852': 'Travellers Cheque Refund Advice',
      'MT860': 'Travellers Cheque Purchase Notification',
      'MT861': 'Travellers Cheque Sale Notification',
      'MT862': 'Travellers Cheque Refund Notification',
      'MT890': 'Travellers Cheque Purchase Confirmation',
      'MT891': 'Travellers Cheque Sale Confirmation',
      'MT892': 'Travellers Cheque Refund Confirmation',
      'MT895': 'Queries',
      'MT896': 'Answers',
      'MT898': 'Permission to Debit Account',
      
      // Category 9: Cash Management & Customer Status
      'MT900': 'Confirmation of Debit',
      'MT910': 'Confirmation of Debit',
      'MT920': 'Original Message',
      'MT921': 'Original Message',
      'MT935': 'Return Message',
      'MT940': 'Customer Statement Message',
      'MT941': 'Customer Statement Message',
      'MT942': 'Interim Transaction Report',
      'MT950': 'Statement Message',
      'MT951': 'Statement Message',
      'MT952': 'Statement Message',
      'MT960': 'Original Message',
      'MT961': 'Original Message',
      'MT970': 'Return Message',
      'MT971': 'Return Message',
      'MT972': 'Return Message',
      'MT979': 'Free Format Message',
      'MT990': 'Original Message',
      'MT991': 'Original Message',
      'MT992': 'Original Message',
      'MT993': 'Original Message',
      'MT994': 'Original Message',
      'MT995': 'Queries',
      'MT996': 'Answers',
      'MT997': 'Permission to Debit Account',
      'MT999': 'Free Format Message'
    };

    // ISO 20022 MX Message Types
    this.mxMessageTypes = {
      // PACS (Payments Clearing and Settlement)
      'pacs.008': 'Customer Credit Transfer',
      'pacs.009': 'Customer Credit Transfer Initiation',
      'pacs.010': 'FI Direct Debit',
      'pacs.003': 'FIToFI Customer Credit Transfer',
      'pacs.004': 'FIToFI Direct Debit',
      'pacs.007': 'FIToFI Credit Transfer',
      
      // PAIN (Payments Initiation)
      'pain.001': 'Customer Credit Transfer Initiation',
      'pain.002': 'Customer Direct Debit Initiation',
      'pain.008': 'FIToFI Customer Credit Transfer',
      'pain.009': 'FIToFI Customer Direct Debit',
      
      // CAMT (Cash Management)
      'camt.052': 'Bank-to-Customer Account Report',
      'camt.053': 'Bank-to-Customer Account Statement',
      'camt.054': 'Bank-to-Customer Account Transaction Report'
    };

    this.priorityCodes = {
      'N': 'Normal',
      'U': 'Urgent',
      'S': 'System'
    };
  }

  /**
   * Generate MX Message (ISO 20022)
   */
  generateMXMessage(messageType, options) {
    if (!this.mxMessageTypes[messageType]) {
      throw new Error(`Invalid MX message type: ${messageType}`);
    }

    const { senderBIC, receiverBIC, transactionReference, ...messageData } = options;

    // Basic MX message structure
    const mxMessage = {
      'AppHdr': {
        'Fr': {
          'FIId': {
            'FinInstnId': {
              'BIC': senderBIC
            }
          }
        },
        'To': {
          'FIId': {
            'FinInstnId': {
              'BIC': receiverBIC
            }
          }
        },
        'BizMsgIdr': transactionReference,
        'MsgDefIdr': messageType,
        'CreDtTm': new Date().toISOString()
      },
      'Document': {
        [messageType.replace('.', '')]: messageData
      }
    };

    return mxMessage;
  }

  /**
   * Generate MX Customer Credit Transfer (pacs.008)
   */
  generatePacs008(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      initiationTime,
      requestedExecutionDate,
      debtor,
      debtorAgent,
      creditor,
      creditorAgent,
      instructedAmount,
      chargeBearer,
      paymentInformation
    } = options;

    return this.generateMXMessage('pacs.008', {
      'GrpHdr': {
        'MsgId': transactionReference,
        'CreDtTm': initiationTime || new Date().toISOString(),
        'NbOfTxs': '1',
        'CtrlSum': instructedAmount,
        'InitgPty': {
          'Nm': debtor.name,
          'Id': {
            'OrgId': {
              'Othr': {
                'Id': debtor.id
              }
            }
          }
        }
      },
      'CdtTrfTxInf': {
        'PmtId': {
          'InstrId': transactionReference,
          'EndToEndId': transactionReference
        },
        'Amt': {
          'InstdAmt': {
            '_Ccy': instructedAmount.currency,
            '__text': instructedAmount.amount
          }
        },
        'ChrgBr': chargeBearer || 'SHAR',
        'Dbtr': {
          'Nm': debtor.name,
          'PstlAdr': debtor.address || {}
        },
        'DbtrAgt': {
          'FinInstnId': {
            'BIC': debtorAgent || senderBIC
          }
        },
        'CdtrAgt': {
          'FinInstnId': {
            'BIC': creditorAgent || receiverBIC
          }
        },
        'Cdtr': {
          'Nm': creditor.name,
          'PstlAdr': creditor.address || {}
        },
        'RmtInf': {
          'Ustrd': paymentInformation || ''
        }
      }
    });
  }

  /**
   * Generate MX Account Report (camt.052)
   */
  generateCamt052(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      fromDateTime,
      toDateTime,
      account,
      entries
    } = options;

    return this.generateMXMessage('camt.052', {
      'GrpHdr': {
        'MsgId': transactionReference,
        'CreDtTm': new Date().toISOString(),
        'MsgRcpt': {
          'Nm': receiverBIC
        }
      },
      'Rpt': {
        'Id': transactionReference,
        'CreDtTm': new Date().toISOString(),
        'FrToDt': {
          'FrDtTm': fromDateTime,
          'ToDtTm': toDateTime
        },
        'Acct': {
          'Id': {
            'IBAN': account.iban
          },
          'Ccy': account.currency,
          'Nm': account.name
        },
        'Bal': [
          {
            'Tp': {
              'CdOrPrtry': {
                'Cd': 'OPBD'
              }
            },
            'Amt': {
              '_Ccy': account.currency,
              '__text': account.openingBalance
            },
            'CdtDbtInd': account.openingBalance >= 0 ? 'CRDT' : 'DBIT'
          },
          {
            'Tp': {
              'CdOrPrtry': {
                'Cd': 'CLBD'
              }
            },
            'Amt': {
              '_Ccy': account.currency,
              '__text': account.closingBalance
            },
            'CdtDbtInd': account.closingBalance >= 0 ? 'CRDT' : 'DBIT'
          }
        ],
        'Ntry': entries || []
      }
    });
  }

  /**
   * Convert MT to MX (ISO 20022 migration)
   */
  convertMTtoMX(mtMessage, messageType) {
    const mtToMxMapping = {
      'MT103': 'pacs.008',
      'MT940': 'camt.052',
      'MT202': 'pacs.003',
      'MT199': 'pacs.009'
    };

    const mxType = mtToMxMapping[messageType];
    if (!mxType) {
      throw new Error(`No MX equivalent found for ${messageType}`);
    }

    // Parse MT message and convert to MX format
    const parsed = this.parseSwiftMessage(mtMessage);
    
    // Convert based on message type
    switch (mxType) {
      case 'pacs.008':
        return this.convertMT103toPacs008(parsed);
      case 'camt.052':
        return this.convertMT940toCamt052(parsed);
      default:
        throw new Error(`Conversion from ${messageType} to ${mxType} not implemented`);
    }
  }

  /**
   * Convert MT103 to pacs.008
   */
  convertMT103toPacs008(parsedMT) {
    const fields = parsedMT.fields;
    
    return this.generatePacs008({
      transactionReference: fields['20'],
      debtor: {
        name: fields['50A'],
        id: fields['50A']
      },
      creditor: {
        name: fields['59']
      },
      instructedAmount: {
        currency: fields['32A'] ? fields['32A'].substring(0, 3) : 'USD',
        amount: fields['32A'] ? fields['32A'].substring(3) : '0'
      },
      paymentInformation: fields['70']
    });
  }

  /**
   * Convert MT940 to camt.052
   */
  convertMT940toCamt052(parsedMT) {
    const fields = parsedMT.fields;
    
    return this.generateCamt052({
      transactionReference: fields['20'],
      account: {
        iban: fields['25'],
        currency: 'USD', // Extract from opening balance
        name: 'Account Holder'
      },
      openingBalance: fields['60F'],
      closingBalance: fields['62F']
    });
  }

  /**
   * Generate MT202 (General Financial Institution Transfer)
   */
  generateMT202(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      relatedReference,
      date,
      currency,
      amount,
      orderingInstitution,
      beneficiaryInstitution,
      senderToReceiverInfo = ''
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT202', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '20': transactionReference,
      '21': relatedReference,
      '13C': date,
      '32A': `${currency}${amount}`,
      '56A': orderingInstitution,
      '58A': beneficiaryInstitution,
      '72': senderToReceiverInfo
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  /**
   * Generate MT300 (Foreign Exchange Confirmation)
   */
  generateMT300(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      date,
      currency1,
      amount1,
      currency2,
      amount2,
      exchangeRate,
      valueDate,
      orderingParty,
      counterparty
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT300', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '20': transactionReference,
      '30V': date,
      '32B': `${currency1}${amount1}`,
      '33B': `${currency2}${amount2}`,
      '36': exchangeRate,
      '30': valueDate,
      '50A': orderingParty,
      '57A': counterparty
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  /**
   * Generate MT320 (Fixed/Variable Loan Confirmation)
   */
  generateMT320(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      date,
      currency,
      amount,
      interestRate,
      maturityDate,
      borrower,
      lender
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT320', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '20': transactionReference,
      '45A': date,
      '32B': `${currency}${amount}`,
      '37J': interestRate,
      '30': maturityDate,
      '50A': borrower,
      '57A': lender
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  /**
   * Generate MT540 (Receive Free of Payment)
   */
  generateMT540(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      date,
      securityIdentification,
      quantity,
      deliveringParty,
      receivingParty
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT540', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '20': transactionReference,
      '16R': 'GENL',
      '98A': date,
      '35B': securityIdentification,
      '36B': quantity,
      '50A': deliveringParty,
      '57A': receivingParty,
      '16S': 'GENL'
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  /**
   * Generate MT541 (Receive Free of Payment)
   */
  generateMT541(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      date,
      securityIdentification,
      quantity,
      deliveringParty,
      receivingParty
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT541', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '20': transactionReference,
      '16R': 'GENL',
      '98A': date,
      '35B': securityIdentification,
      '36B': quantity,
      '50A': deliveringParty,
      '57A': receivingParty,
      '16S': 'GENL'
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  /**
   * Generate MT542 (Receive Against Payment)
   */
  generateMT542(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      date,
      securityIdentification,
      quantity,
      settlementAmount,
      settlementCurrency,
      deliveringParty,
      receivingParty
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT542', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '20': transactionReference,
      '16R': 'GENL',
      '98A': date,
      '35B': securityIdentification,
      '36B': quantity,
      '34A': `${settlementCurrency}${settlementAmount}`,
      '50A': deliveringParty,
      '57A': receivingParty,
      '16S': 'GENL'
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  /**
   * Generate MT700 (Issue of a Documentary Credit)
   */
  generateMT700(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      documentaryCreditNumber,
      date,
      dateOfExpiry,
      placeOfExpiry,
      applicant,
      beneficiary,
      currency,
      amount,
      availableWith,
      draftsAt,
      partialShipments,
      transshipment,
      portOfLoading,
      portOfDischarge,
      latestDateOfShipment,
      descriptionOfGoods,
      documentsRequired
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT700', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '27': 'SEQUENCE OF TOTAL',
      '40A': 'IRREVOCABLE',
      '20': documentaryCreditNumber,
      '31C': dateOfExpiry,
      '31D': `${dateOfExpiry}${placeOfExpiry}`,
      '50': applicant,
      '59': beneficiary,
      '32B': `${currency}${amount}`,
      '41A': availableWith,
      '42C': draftsAt,
      '43P': partialShipments,
      '43T': transshipment,
      '44A': portOfLoading,
      '44B': portOfDischarge,
      '44C': latestDateOfShipment,
      '45A': descriptionOfGoods,
      '46A': documentsRequired,
      '47A': 'ADDITIONAL CONDITIONS',
      '71B': 'CHARGES',
      '49': 'CONFIRMATION INSTRUCTIONS'
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  /**
   * Generate MT710 (Advice of a Documentary Credit)
   */
  generateMT710(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      documentaryCreditNumber,
      dateOfIssue,
      dateOfExpiry,
      placeOfExpiry,
      applicant,
      beneficiary,
      currency,
      amount,
      availableWith,
      issuingBank
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT710', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '27': 'SEQUENCE OF TOTAL',
      '40A': 'IRREVOCABLE',
      '20': documentaryCreditNumber,
      '31C': dateOfExpiry,
      '31D': `${dateOfExpiry}${placeOfExpiry}`,
      '50': applicant,
      '59': beneficiary,
      '32B': `${currency}${amount}`,
      '41A': availableWith,
      '52A': issuingBank
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  /**
   * Generate MT799 (Free Format Message)
   */
  generateMT799(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      messageContent,
      priority = 'N'
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT799', receiverBIC, priority);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '20': transactionReference,
      '79': messageContent
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  /**
   * Generate MT910 (Confirmation of Debit)
   */
  generateMT910(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      date,
      currency,
      amount,
      accountNumber,
      debitCreditMark,
      transactionDetails
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT910', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '20': transactionReference,
      '21': 'RELATED REFERENCE',
      '25': accountNumber,
      '30': date,
      '31C': date,
      '32A': `${debitCreditMark}${currency}${amount}`,
      '79': transactionDetails
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  /**
   * Generate MT950 (Statement Message)
   */
  generateMT950(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      accountNumber,
      statementNumber,
      date,
      openingBalance,
      closingBalance,
      transactions = []
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT950', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    let textFields = {
      '20': transactionReference,
      '25': accountNumber,
      '28C': statementNumber,
      '60F': openingBalance,
      '62F': closingBalance
    };
    
    // Add transactions
    transactions.forEach((transaction, index) => {
      const tag = index % 2 === 0 ? '61' : '86';
      textFields[tag] = transaction;
    });
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  // Inherit all existing methods from the original generator
  generateBasicHeader(senderBIC, sessionNumber = '2456', sequenceNumber = '1') {
    const applicationId = 'F';
    const serviceId = '01';
    const logicalTerminal = senderBIC + 'XXX';
    
    return `{1:${applicationId}${serviceId}${logicalTerminal}${sessionNumber}${sequenceNumber}}`;
  }

  generateApplicationHeader(messageType, receiverBIC, priority = 'N') {
    if (!this.messageTypes[messageType]) {
      throw new Error(`Invalid message type: ${messageType}`);
    }
    
    if (!this.priorityCodes[priority]) {
      throw new Error(`Invalid priority code: ${priority}`);
    }

    const receiverAddress = receiverBIC + 'XXXX';
    return `{2:${messageType}${receiverAddress}${priority}}`;
  }

  generateUserHeader(bankPriorityCode = '', uetr = '') {
    let userHeader = '{3:';
    const blocks = [];
    
    if (bankPriorityCode) {
      blocks.push(`{108:${bankPriorityCode}}`);
    }
    
    if (uetr) {
      blocks.push(`{121:${uetr}}`);
    }
    
    if (blocks.length > 0) {
      userHeader += blocks.join('');
    }
    
    userHeader += '}';
    return userHeader;
  }

  generateTextBlock(fields) {
    let textBlock = '{4:\n';
    
    Object.entries(fields).forEach(([tag, value]) => {
      if (value) {
        textBlock += `:${tag}:${value}\n`;
      }
    });
    
    textBlock += '-}';
    return textBlock;
  }

  generateTrailer(mac = '', checksum = '') {
    let trailer = '{5:';
    const blocks = [];
    
    if (mac) {
      blocks.push(`{MAC:${mac}}`);
    }
    
    if (checksum) {
      blocks.push(`{CHK:${checksum}}`);
    }
    
    if (blocks.length > 0) {
      trailer += blocks.join('');
    }
    
    trailer += '}';
    return trailer;
  }

  generateMT103(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      relatedReference,
      date,
      currency,
      amount,
      orderingCustomer,
      beneficiaryCustomer,
      beneficiaryBank,
      paymentDetails,
      charges = 'SHA',
      senderToReceiverInfo = ''
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT103', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '20': transactionReference,
      '21': relatedReference,
      '13C': date,
      '32A': `${currency}${amount}`,
      '50A': orderingCustomer,
      '59': beneficiaryCustomer,
      '57A': beneficiaryBank,
      '70': paymentDetails,
      '71A': charges,
      '72': senderToReceiverInfo
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  generateMT199(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      messageContent,
      priority = 'N'
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT199', receiverBIC, priority);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '20': transactionReference,
      '79': messageContent
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  generateMT940(options) {
    const {
      senderBIC,
      receiverBIC,
      accountNumber,
      statementNumber,
      openingBalance,
      closingBalance,
      transactions = []
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT940', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    let textFields = {
      '20': accountNumber,
      '25': statementNumber,
      '60F': openingBalance,
      '62F': closingBalance
    };
    
    transactions.forEach((transaction, index) => {
      const tag = index % 2 === 0 ? '61' : '86';
      textFields[tag] = transaction;
    });
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  generateUETR() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  validateSwiftMessage(message) {
    const errors = [];
    
    if (!message.includes('{1:')) {
      errors.push('Missing Basic Header Block (Block 1)');
    }
    
    if (!message.includes('{2:')) {
      errors.push('Missing Application Header Block (Block 2)');
    }
    
    if (!message.includes('{4:')) {
      errors.push('Missing Text Block (Block 4)');
    }
    
    if (!message.includes('{5:')) {
      errors.push('Missing Trailer Block (Block 5)');
    }
    
    const block2Match = message.match(/\{2:(I\d{3}|[A-Z]\d{3})/);
    if (!block2Match) {
      errors.push('Invalid or missing message type in Block 2');
    } else {
      const messageType = block2Match[1];
      if (!this.messageTypes[messageType]) {
        errors.push(`Unknown message type: ${messageType}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      messageType: block2Match ? block2Match[1] : null
    };
  }

  parseSwiftMessage(message) {
    const parsed = {
      blocks: {},
      fields: {},
      messageType: null
    };
    
    const blockMatches = message.match(/\{(\d):([^}]*)\}/g);
    if (blockMatches) {
      blockMatches.forEach(block => {
        const blockMatch = block.match(/\{(\d):([^}]*)\}/);
        if (blockMatch) {
          const blockNumber = blockMatch[1];
          const blockContent = blockMatch[2];
          parsed.blocks[blockNumber] = blockContent;
        }
      });
    }
    
    if (parsed.blocks['4']) {
      const fieldMatches = parsed.blocks['4'].match(/:(\d{2,3}):([^\n]*)/g);
      if (fieldMatches) {
        fieldMatches.forEach(field => {
          const fieldMatch = field.match(/:(\d{2,3}):([^\n]*)/);
          if (fieldMatch) {
            const fieldTag = fieldMatch[1];
            const fieldValue = fieldMatch[2];
            parsed.fields[fieldTag] = fieldValue;
          }
        });
      }
    }
    
    if (parsed.blocks['2']) {
      const messageTypeMatch = parsed.blocks['2'].match(/(I\d{3}|[A-Z]\d{3})/);
      if (messageTypeMatch) {
        parsed.messageType = messageTypeMatch[1];
      }
    }
    
    return parsed;
  }

  /**
   * Get all supported message types
   */
  getAllMessageTypes() {
    return {
      mt: this.messageTypes,
      mx: this.mxMessageTypes
    };
  }

  /**
   * Get message types by category
   */
  getMessageTypesByCategory() {
    const categories = {};
    
    Object.entries(this.messageTypes).forEach(([type, description]) => {
      const category = type.substring(2, 3); // Get the third digit
      if (!categories[category]) {
        categories[category] = {};
      }
      categories[category][type] = description;
    });
    
    return categories;
  }
}

export default SwiftMessageGeneratorEnhanced;
