import { query } from '../config/database.js';
import logger from '../config/logger.js';
import axios from 'axios';

class SanctionsScreeningService {
  constructor() {
    this.sanctionsLists = {
      ofac: {
        name: 'OFAC SDN List',
        url: process.env.SANCTIONS_API_URL || 'https://api.ofac.gov/sdn',
        enabled: true
      },
      un: {
        name: 'UN Sanctions List',
        url: process.env.UN_SANCTIONS_API_URL || 'https://api.un.org/sanctions',
        enabled: true
      },
      eu: {
        name: 'EU Sanctions List',
        url: process.env.EU_SANCTIONS_API_URL || 'https://api.europa.eu/sanctions',
        enabled: true
      }
    };
  }

  // Screen party against sanctions lists
  async screenParty(partyDetails) {
    try {
      const { name, address, country, bic, accountNumber } = partyDetails;
      
      const screeningResults = {
        party: partyDetails,
        timestamp: new Date().toISOString(),
        riskScore: 0,
        matches: [],
        recommendations: []
      };

      // Screen against each sanctions list
      for (const [listKey, listConfig] of Object.entries(this.sanctionsLists)) {
        if (!listConfig.enabled) continue;

        try {
          const matches = await this.screenAgainstList(listKey, partyDetails);
          
          if (matches.length > 0) {
            screeningResults.matches.push({
              list: listConfig.name,
              matches: matches,
              riskScore: this.calculateRiskScore(matches)
            });
          }
        } catch (error) {
          logger.error(`Error screening against ${listConfig.name}`, {
            error: error.message,
            listKey
          });
        }
      }

      // Calculate overall risk score
      screeningResults.riskScore = this.calculateOverallRiskScore(screeningResults.matches);

      // Generate recommendations
      screeningResults.recommendations = this.generateRecommendations(screeningResults);

      // Store screening result
      await this.storeScreeningResult(screeningResults);

      logger.info('Sanctions screening completed', {
        partyName: name,
        riskScore: screeningResults.riskScore,
        matchesCount: screeningResults.matches.length
      });

      return screeningResults;

    } catch (error) {
      logger.error('Error in sanctions screening', {
        error: error.message,
        partyDetails
      });
      throw error;
    }
  }

  // Screen against specific sanctions list
  async screenAgainstList(listKey, partyDetails) {
    try {
      const listConfig = this.sanctionsLists[listKey];
      
      // In production, make actual API calls to sanctions lists
      // For now, simulate screening with mock data
      const matches = await this.mockScreening(listKey, partyDetails);
      
      return matches;
    } catch (error) {
      logger.error(`Error screening against list ${listKey}`, {
        error: error.message
      });
      throw error;
    }
  }

  // Mock screening for demonstration
  async mockScreening(listKey, partyDetails) {
    const matches = [];
    
    // Simulate potential matches based on common patterns
    const highRiskPatterns = [
      'sanctioned', 'blocked', 'prohibited', 'embargo'
    ];
    
    const { name, address, country } = partyDetails;
    
    // Check name against high-risk patterns
    if (name && highRiskPatterns.some(pattern => 
        name.toLowerCase().includes(pattern))) {
      matches.push({
        type: 'name',
        match: name,
        confidence: 0.9,
        details: 'Name contains high-risk pattern'
      });
    }
    
    // Check country against high-risk countries
    const highRiskCountries = ['IR', 'KP', 'SY', 'CU'];
    if (country && highRiskCountries.includes(country.toUpperCase())) {
      matches.push({
        type: 'country',
        match: country,
        confidence: 0.8,
        details: 'Country is under sanctions'
      });
    }
    
    return matches;
  }

  // Calculate risk score for matches
  calculateRiskScore(matches) {
    if (matches.length === 0) return 0;
    
    let totalScore = 0;
    matches.forEach(match => {
      totalScore += match.confidence * 100;
    });
    
    return Math.min(totalScore, 100);
  }

  // Calculate overall risk score
  calculateOverallRiskScore(matchesByList) {
    if (matchesByList.length === 0) return 0;
    
    let totalScore = 0;
    matchesByList.forEach(list => {
      totalScore += list.riskScore;
    });
    
    return Math.min(totalScore / matchesByList.length, 100);
  }

  // Generate recommendations based on risk score
  generateRecommendations(screeningResults) {
    const recommendations = [];
    const { riskScore, matches } = screeningResults;
    
    if (riskScore >= 80) {
      recommendations.push({
        level: 'critical',
        action: 'block',
        message: 'High risk detected - transaction should be blocked',
        requiresManualReview: true
      });
    } else if (riskScore >= 50) {
      recommendations.push({
        level: 'high',
        action: 'review',
        message: 'Medium risk detected - manual review required',
        requiresManualReview: true
      });
    } else if (riskScore >= 20) {
      recommendations.push({
        level: 'medium',
        action: 'monitor',
        message: 'Low risk detected - enhanced monitoring recommended',
        requiresManualReview: false
      });
    } else {
      recommendations.push({
        level: 'low',
        action: 'proceed',
        message: 'No significant risk detected',
        requiresManualReview: false
      });
    }
    
    return recommendations;
  }

  // Store screening result
  async storeScreeningResult(screeningResults) {
    try {
      await query(`
        INSERT INTO sanctions_screening (
          party_name, party_type, country, risk_score, 
          matches, screening_data, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        screeningResults.party.name || 'Unknown',
        screeningResults.party.type || 'individual',
        screeningResults.party.country || 'Unknown',
        screeningResults.riskScore,
        JSON.stringify(screeningResults.matches),
        JSON.stringify(screeningResults)
      ]);
    } catch (error) {
      logger.error('Error storing screening result', {
        error: error.message,
        screeningResults
      });
      throw error;
    }
  }

  // Get screening history
  async getScreeningHistory(filters = {}) {
    try {
      let queryStr = `
        SELECT 
          id, party_name, party_type, country, risk_score,
          matches, created_at
        FROM sanctions_screening 
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (filters.partyName) {
        paramCount++;
        queryStr += ` AND party_name ILIKE $${paramCount}`;
        params.push(`%${filters.partyName}%`);
      }

      if (filters.country) {
        paramCount++;
        queryStr += ` AND country = $${paramCount}`;
        params.push(filters.country);
      }

      if (filters.minRiskScore) {
        paramCount++;
        queryStr += ` AND risk_score >= $${paramCount}`;
        params.push(filters.minRiskScore);
      }

      if (filters.startDate) {
        paramCount++;
        queryStr += ` AND created_at >= $${paramCount}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        paramCount++;
        queryStr += ` AND created_at <= $${paramCount}`;
        params.push(filters.endDate);
      }

      queryStr += ' ORDER BY created_at DESC';

      if (filters.limit) {
        paramCount++;
        queryStr += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await query(queryStr, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting screening history', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  // Get screening statistics
  async getScreeningStatistics() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_screenings,
          COUNT(CASE WHEN risk_score >= 80 THEN 1 END) as high_risk,
          COUNT(CASE WHEN risk_score >= 50 AND risk_score < 80 THEN 1 END) as medium_risk,
          COUNT(CASE WHEN risk_score < 50 THEN 1 END) as low_risk,
          AVG(risk_score) as average_risk_score,
          MAX(risk_score) as highest_risk_score
        FROM sanctions_screening 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      const byCountry = await query(`
        SELECT 
          country,
          COUNT(*) as screenings,
          AVG(risk_score) as avg_risk_score,
          COUNT(CASE WHEN risk_score >= 50 THEN 1 END) as high_risk_count
        FROM sanctions_screening 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY country
        ORDER BY screenings DESC
        LIMIT 10
      `);

      return {
        summary: result.rows[0],
        byCountry: byCountry.rows
      };
    } catch (error) {
      logger.error('Error getting screening statistics', {
        error: error.message
      });
      throw error;
    }
  }

  // Update sanctions list configuration
  async updateSanctionsListConfig(listKey, config) {
    try {
      if (!this.sanctionsLists[listKey]) {
        throw new Error(`Invalid sanctions list: ${listKey}`);
      }

      this.sanctionsLists[listKey] = {
        ...this.sanctionsLists[listKey],
        ...config
      };

      logger.info('Sanctions list configuration updated', {
        listKey,
        config
      });

      return this.sanctionsLists[listKey];
    } catch (error) {
      logger.error('Error updating sanctions list config', {
        error: error.message,
        listKey,
        config
      });
      throw error;
    }
  }

  // Get sanctions list configurations
  getSanctionsListConfigs() {
    return this.sanctionsLists;
  }

  // Perform batch screening
  async batchScreen(parties) {
    try {
      const results = [];
      
      for (const party of parties) {
        try {
          const result = await this.screenParty(party);
          results.push(result);
        } catch (error) {
          logger.error('Error in batch screening for party', {
            error: error.message,
            party
          });
          results.push({
            party,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error in batch screening', {
        error: error.message
      });
      throw error;
    }
  }
}

export default new SanctionsScreeningService();
