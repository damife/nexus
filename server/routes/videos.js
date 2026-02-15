import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateUserInput } from '../middleware/security.js';
import logger from '../config/logger.js';

const router = express.Router();

// All video routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

// Get all videos
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, category, published, featured } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ` AND category = $${paramIndex++}`;
      queryParams.push(category);
    }

    if (published !== undefined) {
      whereClause += ` AND published = $${paramIndex++}`;
      queryParams.push(published === 'true');
    }

    if (featured !== undefined) {
      whereClause += ` AND featured = $${paramIndex++}`;
      queryParams.push(featured === 'true');
    }

    const result = await query(`
      SELECT 
        id,
        title,
        description,
        url,
        thumbnail,
        category,
        tags,
        duration,
        featured,
        published,
        view_count,
        created_at,
        updated_at
      FROM videos 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total FROM videos ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      videos: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    logger.error('Error fetching videos', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch videos'
    });
  }
});

// Get video statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_videos,
        COUNT(*) FILTER (WHERE published = true) as published_videos,
        COUNT(*) FILTER (WHERE featured = true) as featured_videos,
        COALESCE(SUM(duration), 0) as total_duration,
        COALESCE(AVG(duration), 0) as average_duration,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as videos_this_month
      FROM videos
    `);

    // Category breakdown
    const categoryStats = await query(`
      SELECT 
        category,
        COUNT(*) as count
      FROM videos 
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      stats: {
        ...stats.rows[0],
        categoryBreakdown: categoryStats.rows
      }
    });
  } catch (error) {
    console.error('Error fetching video stats:', error);
    logger.error('Error fetching video stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video statistics'
    });
  }
});

// Get single video
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        id,
        title,
        description,
        url,
        thumbnail,
        category,
        tags,
        duration,
        featured,
        published,
        view_count,
        created_at,
        updated_at
      FROM videos 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.json({
      success: true,
      video: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    logger.error('Error fetching video', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video'
    });
  }
});

// Create new video
router.post('/', validateUserInput({
  title: { type: 'text', required: true, maxLength: 255 },
  description: { type: 'text', required: true, maxLength: 2000 },
  url: { type: 'url', required: true, maxLength: 500 },
  thumbnail: { type: 'url', required: false, maxLength: 500 },
  category: { type: 'text', required: false, maxLength: 100 },
  tags: { type: 'text', required: false, maxLength: 500 },
  duration: { type: 'number', required: false },
  featured: { type: 'text', required: false },
  published: { type: 'text', required: false }
}), async (req, res) => {
  try {
    const {
      title,
      description,
      url,
      thumbnail,
      category,
      tags,
      duration,
      featured = false,
      published = false
    } = req.body;

    // Parse tags
    const parsedTags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const result = await query(`
      INSERT INTO videos 
      (title, description, url, thumbnail, category, tags, duration, featured, published, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      title,
      description,
      url,
      thumbnail || null,
      category || null,
      JSON.stringify(parsedTags),
      duration ? parseFloat(duration) : null,
      featured === 'true',
      published === 'true'
    ]);

    logger.info('Video created', {
      videoId: result.rows[0].id,
      title: title,
      createdBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Video created successfully',
      video: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating video:', error);
    logger.error('Error creating video', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create video',
      error: error.message
    });
  }
});

// Update video
router.put('/:id', validateUserInput({
  title: { type: 'text', required: false, maxLength: 255 },
  description: { type: 'text', required: false, maxLength: 2000 },
  url: { type: 'url', required: false, maxLength: 500 },
  thumbnail: { type: 'url', required: false, maxLength: 500 },
  category: { type: 'text', required: false, maxLength: 100 },
  tags: { type: 'text', required: false, maxLength: 500 },
  duration: { type: 'number', required: false },
  featured: { type: 'text', required: false },
  published: { type: 'text', required: false }
}), async (req, res) => {
  try {
    const { id } = req.params;
    
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    // Build dynamic update query
    if (req.body.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(req.body.title);
    }
    if (req.body.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(req.body.description);
    }
    if (req.body.url !== undefined) {
      updateFields.push(`url = $${paramIndex++}`);
      updateValues.push(req.body.url);
    }
    if (req.body.thumbnail !== undefined) {
      updateFields.push(`thumbnail = $${paramIndex++}`);
      updateValues.push(req.body.thumbnail);
    }
    if (req.body.category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`);
      updateValues.push(req.body.category);
    }
    if (req.body.tags !== undefined) {
      const parsedTags = req.body.tags ? 
        req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      updateFields.push(`tags = $${paramIndex++}`);
      updateValues.push(JSON.stringify(parsedTags));
    }
    if (req.body.duration !== undefined) {
      updateFields.push(`duration = $${paramIndex++}`);
      updateValues.push(parseFloat(req.body.duration));
    }
    if (req.body.featured !== undefined) {
      updateFields.push(`featured = $${paramIndex++}`);
      updateValues.push(req.body.featured === 'true');
    }
    if (req.body.published !== undefined) {
      updateFields.push(`published = $${paramIndex++}`);
      updateValues.push(req.body.published === 'true');
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const result = await query(`
      UPDATE videos 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    logger.info('Video updated', {
      videoId: id,
      updatedBy: req.user.id,
      updates: updateFields
    });

    res.json({
      success: true,
      message: 'Video updated successfully',
      video: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating video:', error);
    logger.error('Error updating video', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update video',
      error: error.message
    });
  }
});

// Delete video
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      DELETE FROM videos 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    logger.info('Video deleted', {
      videoId: id,
      deletedBy: req.user.id,
      videoTitle: result.rows[0].title
    });

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting video:', error);
    logger.error('Error deleting video', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete video'
    });
  }
});

// Increment view count
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      UPDATE videos 
      SET view_count = COALESCE(view_count, 0) + 1
      WHERE id = $1
      RETURNING view_count
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.json({
      success: true,
      viewCount: result.rows[0].view_count
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    logger.error('Error incrementing view count', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to increment view count'
    });
  }
});

// Get published videos for public view
router.get('/public/published', async (req, res) => {
  try {
    const { limit = 20, offset = 0, category, featured } = req.query;
    
    let whereClause = 'WHERE published = true';
    let queryParams = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ` AND category = $${paramIndex++}`;
      queryParams.push(category);
    }

    if (featured !== undefined) {
      whereClause += ` AND featured = $${paramIndex++}`;
      queryParams.push(featured === 'true');
    }

    const result = await query(`
      SELECT 
        id,
        title,
        description,
        url,
        thumbnail,
        category,
        tags,
        duration,
        featured,
        view_count,
        created_at
      FROM videos 
      ${whereClause}
      ORDER BY featured DESC, created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...queryParams, limit, offset]);

    res.json({
      success: true,
      videos: result.rows
    });
  } catch (error) {
    console.error('Error fetching published videos:', error);
    logger.error('Error fetching published videos', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch published videos'
    });
  }
});

// Get featured videos
router.get('/public/featured', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const result = await query(`
      SELECT 
        id,
        title,
        description,
        url,
        thumbnail,
        category,
        duration,
        view_count,
        created_at
      FROM videos 
      WHERE published = true AND featured = true
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    res.json({
      success: true,
      videos: result.rows
    });
  } catch (error) {
    console.error('Error fetching featured videos:', error);
    logger.error('Error fetching featured videos', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured videos'
    });
  }
});

export default router;
