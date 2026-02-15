import express from 'express';
import analyticsService from '../services/analyticsService.js';
import advancedAnalyticsService from '../services/advancedAnalyticsService.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// Get comprehensive analytics data
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    const analytics = await analyticsService.getAnalytics(timeRange);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: error.message
    });
  }
});

// Get message volume trends
router.get('/message-trends', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    const trends = await analyticsService.getMessageVolumeTrends(timeRange);
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error fetching message trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message trends',
      error: error.message
    });
  }
});

// Get user activity heatmap
router.get('/user-heatmap', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    const heatmap = await analyticsService.getUserActivityHeatmap(timeRange);
    
    res.json({
      success: true,
      data: heatmap
    });
  } catch (error) {
    console.error('Error fetching user heatmap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user heatmap',
      error: error.message
    });
  }
});

// Clear analytics cache
router.post('/clear-cache', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    analyticsService.clearCache();
    
    res.json({
      success: true,
      message: 'Analytics cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing analytics cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear analytics cache',
      error: error.message
    });
  }
});

// Get comprehensive advanced analytics dashboard
router.get('/advanced', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { timeRange = '24h', filters = {} } = req.query;
    const dashboard = await advancedAnalyticsService.generateAnalyticsDashboard(timeRange, filters);
    
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Error fetching advanced analytics dashboard', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advanced analytics dashboard',
      error: error.message
    });
  }
});

// Generate comprehensive reports
router.post('/reports/:reportType', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { reportType } = req.params;
    const { timeRange = '7d', filters = {} } = req.body;
    
    const report = await advancedAnalyticsService.generateReport(reportType, timeRange, filters);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating report', { error: error.message, reportType: req.params.reportType });
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
});

// Get predictive analytics
router.get('/predictive', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { timeRange = '7d', filters = {} } = req.query;
    const dashboard = await advancedAnalyticsService.generateAnalyticsDashboard(timeRange, filters);
    
    res.json({
      success: true,
      data: dashboard.sections.predictive
    });
  } catch (error) {
    logger.error('Error fetching predictive analytics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch predictive analytics',
      error: error.message
    });
  }
});

// Get real-time metrics
router.get('/realtime', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const realTimeMetrics = await advancedAnalyticsService.getRealTimeMetrics();
    
    res.json({
      success: true,
      data: realTimeMetrics
    });
  } catch (error) {
    logger.error('Error fetching real-time metrics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time metrics',
      error: error.message
    });
  }
});

// Get performance benchmarks
router.get('/benchmarks', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const benchmarks = await advancedAnalyticsService.getPerformanceBenchmarks(timeRange);
    
    res.json({
      success: true,
      data: benchmarks
    });
  } catch (error) {
    logger.error('Error fetching performance benchmarks', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance benchmarks',
      error: error.message
    });
  }
});

// Get system health analytics
router.get('/system-health', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    const systemHealth = await advancedAnalyticsService.getSystemHealthAnalytics(timeRange);
    
    res.json({
      success: true,
      data: systemHealth
    });
  } catch (error) {
    logger.error('Error fetching system health analytics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health analytics',
      error: error.message
    });
  }
});

export default router;
