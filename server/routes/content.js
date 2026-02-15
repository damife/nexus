import express from 'express';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// In-memory storage (replace with database in production)
const content = {
  careers: [
    {
      id: 1,
      title: 'Senior Backend Developer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      description: 'We are looking for an experienced backend developer to join our team.',
      requirements: [
        '5+ years of experience with Node.js',
        'Strong understanding of REST APIs',
        'Experience with PostgreSQL or similar databases'
      ],
      responsibilities: [
        'Design and implement scalable backend services',
        'Collaborate with frontend developers',
        'Maintain code quality and documentation'
      ],
      salary: '$100,000 - $150,000',
      posted: new Date('2024-01-15').toISOString(),
      active: true,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  news: [
    {
      id: 1,
      title: 'SwiftNexus Announces Major Platform Update',
      slug: 'swiftnexus-announces-major-platform-update',
      excerpt: 'New features and improvements to enhance your compliance workflow.',
      content: '<p>We are excited to announce a major update to the SwiftNexus platform...</p>',
      image: '/assets/images/news-1.jpg',
      author: 'John Doe',
      category: 'Product Updates',
      tags: ['Platform', 'Updates', 'Features'],
      published: true,
      publishedDate: new Date('2024-01-10').toISOString(),
      views: 1250,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  blogs: [
    {
      id: 1,
      title: 'Understanding AML Compliance in 2024',
      slug: 'understanding-aml-compliance-2024',
      excerpt: 'A comprehensive guide to Anti-Money Laundering compliance requirements.',
      content: '<p>Anti-Money Laundering (AML) compliance continues to evolve...</p>',
      image: '/assets/images/blog-1.jpg',
      author: 'Jane Smith',
      category: 'Compliance',
      tags: ['AML', 'Compliance', 'Regulations'],
      published: true,
      publishedDate: new Date('2024-01-05').toISOString(),
      readTime: '8 min read',
      views: 3500,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  videos: [
    {
      id: 1,
      title: 'SafeWatch AML Product Demo',
      slug: 'safewatch-aml-product-demo',
      description: 'Watch how SafeWatch AML can transform your compliance workflow.',
      videoUrl: 'https://www.youtube.com/watch?v=example',
      thumbnail: '/assets/images/video-thumb-1.jpg',
      duration: '10:45',
      category: 'Product Demo',
      tags: ['AML', 'Demo', 'Tutorial'],
      published: true,
      publishedDate: new Date('2024-01-08').toISOString(),
      views: 2100,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  events: [
    {
      id: 1,
      title: 'FinTech Compliance Summit 2024',
      slug: 'fintech-compliance-summit-2024',
      description: 'Join us for the leading financial compliance conference.',
      location: 'New York, NY',
      venue: 'Javits Center',
      eventType: 'Conference',
      startDate: new Date('2024-06-15T09:00:00').toISOString(),
      endDate: new Date('2024-06-17T17:00:00').toISOString(),
      timezone: 'EST',
      registrationUrl: 'https://example.com/register',
      image: '/assets/images/event-1.jpg',
      capacity: 500,
      registered: 342,
      status: 'upcoming',
      tags: ['Conference', 'Compliance', 'FinTech'],
      published: true,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  webinars: [
    {
      id: 1,
      title: 'Best Practices for KYC Compliance',
      slug: 'best-practices-kyc-compliance',
      description: 'Learn the latest KYC compliance strategies from industry experts.',
      presenter: 'Dr. Sarah Johnson',
      presenterTitle: 'Chief Compliance Officer',
      presenterBio: 'Dr. Johnson has over 15 years of experience in financial compliance.',
      webinarUrl: 'https://zoom.us/j/example',
      startDate: new Date('2024-02-20T14:00:00').toISOString(),
      duration: 60,
      timezone: 'EST',
      registrationUrl: 'https://example.com/webinar-register',
      image: '/assets/images/webinar-1.jpg',
      maxAttendees: 1000,
      registered: 687,
      status: 'upcoming',
      tags: ['KYC', 'Webinar', 'Compliance'],
      published: true,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  glossary: [
    {
      id: 1,
      term: 'AML',
      fullForm: 'Anti-Money Laundering',
      definition: 'A set of laws, regulations, and procedures designed to prevent criminals from disguising illegally obtained funds as legitimate income.',
      category: 'Compliance',
      relatedTerms: ['KYC', 'CTF', 'Financial Crime'],
      published: true,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      term: 'KYC',
      fullForm: 'Know Your Customer',
      definition: 'The process of verifying the identity of clients and assessing potential risks of illegal intentions for the business relationship.',
      category: 'Compliance',
      relatedTerms: ['AML', 'CDD', 'EDD'],
      published: true,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  leadership: [
    {
      id: 1,
      name: 'John Anderson',
      title: 'Chief Executive Officer',
      bio: 'John brings over 20 years of experience in financial technology and compliance. He has led multiple successful startups and established enterprises in the fintech space.',
      image: '/assets/images/leadership/john-anderson.jpg',
      linkedin: 'https://linkedin.com/in/johnanderson',
      twitter: 'https://twitter.com/johnanderson',
      order: 1,
      active: true,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Sarah Chen',
      title: 'Chief Technology Officer',
      bio: 'Sarah is a seasoned technology executive with expertise in AI, machine learning, and scalable systems. She has architected mission-critical systems for global financial institutions.',
      image: '/assets/images/leadership/sarah-chen.jpg',
      linkedin: 'https://linkedin.com/in/sarahchen',
      twitter: 'https://twitter.com/sarahchen',
      order: 2,
      active: true,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      name: 'Michael Roberts',
      title: 'Chief Compliance Officer',
      bio: 'Michael is a recognized expert in financial crime prevention with extensive experience in regulatory compliance and risk management across multiple jurisdictions.',
      image: '/assets/images/leadership/michael-roberts.jpg',
      linkedin: 'https://linkedin.com/in/michaelroberts',
      twitter: 'https://twitter.com/michaelroberts',
      order: 3,
      active: true,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  caseStudies: [
    {
      id: 1,
      title: 'Global Bank reduces false positives by 75%',
      slug: 'global-bank-reduces-false-positives-75-percent',
      excerpt: 'How a major international bank implemented contextual AI to transform their AML operations.',
      content: '<p>A leading global bank faced significant challenges with false positives in their AML monitoring...</p>',
      image: '/assets/images/case-study-1.jpg',
      company: 'Global Bank International',
      industry: 'Banking',
      region: 'Europe',
      pdfUrl: '/assets/pdfs/case-study-1.pdf',
      tags: ['Banking', 'AML', 'AI', 'False Positives'],
      published: true,
      publishedDate: new Date('2025-10-12T10:00:00').toISOString(),
      views: 1800,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      title: 'FinTech startup scales compliance operations',
      slug: 'fintech-startup-scales-compliance-operations',
      excerpt: 'How a rapidly growing FinTech company maintained compliance while scaling 10x in 12 months.',
      content: '<p>When this innovative FinTech company experienced rapid growth, they needed a compliance solution...</p>',
      image: '/assets/images/case-study-2.jpg',
      company: 'PayFast Solutions',
      industry: 'FinTech',
      region: 'North America',
      pdfUrl: '/assets/pdfs/case-study-2.pdf',
      tags: ['FinTech', 'Scaling', 'Compliance'],
      published: true,
      publishedDate: new Date('2025-10-08T10:00:00').toISOString(),
      views: 1200,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  whitePapers: [
    {
      id: 1,
      title: 'The Future of AI in Financial Crime Prevention',
      slug: 'future-ai-financial-crime-prevention',
      excerpt: 'Comprehensive analysis of how AI is transforming financial crime detection and prevention.',
      content: '<p>Artificial Intelligence is revolutionizing the fight against financial crime...</p>',
      image: '/assets/images/white-paper-1.jpg',
      pdfUrl: '/assets/pdfs/white-paper-1.pdf',
      readTime: '15 min read',
      tags: ['AI', 'Financial Crime', 'Future'],
      published: true,
      publishedDate: new Date('2025-10-15T10:00:00').toISOString(),
      views: 2800,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      title: 'ISO 20022 Implementation Guide 2025',
      slug: 'iso-20022-implementation-guide-2025',
      excerpt: 'Step-by-step guide for successful ISO 20022 migration and compliance.',
      content: '<p>ISO 20022 represents the future of financial messaging...</p>',
      image: '/assets/images/white-paper-2.jpg',
      pdfUrl: '/assets/pdfs/white-paper-2.pdf',
      readTime: '20 min read',
      tags: ['ISO 20022', 'Implementation', 'Guide'],
      published: true,
      publishedDate: new Date('2025-10-10T10:00:00').toISOString(),
      views: 3200,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  reports: [
    {
      id: 1,
      title: '2025 Financial Crime Trends Report',
      slug: '2025-financial-crime-trends-report',
      excerpt: 'Annual analysis of emerging financial crime trends and prevention strategies.',
      content: '<p>Our comprehensive annual report analyzes the latest trends in financial crime...</p>',
      image: '/assets/images/report-1.jpg',
      pdfUrl: '/assets/pdfs/report-1.pdf',
      format: 'PDF',
      period: '2025',
      tags: ['Annual Report', 'Trends', '2025'],
      published: true,
      publishedDate: new Date('2025-10-01T10:00:00').toISOString(),
      views: 4500,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Q3 2025 Compliance Benchmark Report',
      slug: 'q3-2025-compliance-benchmark-report',
      excerpt: 'Quarterly benchmark analysis of compliance performance across industries.',
      content: '<p>Our Q3 benchmark report provides insights into compliance performance...</p>',
      image: '/assets/images/report-2.jpg',
      pdfUrl: '/assets/pdfs/report-2.pdf',
      format: 'PDF',
      period: 'Q3 2025',
      tags: ['Quarterly', 'Benchmark', 'Q3'],
      published: true,
      publishedDate: new Date('2025-09-30T10:00:00').toISOString(),
      views: 2100,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Helper function to get next ID
const getNextId = (type) => {
  const items = content[type];
  return items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
};

// ========================================
// CAREERS ROUTES
// ========================================

// Get all careers (public)
router.get('/careers', (req, res) => {
  const { active, department, location } = req.query;
  let careers = content.careers.filter(c => c.active);

  if (department) {
    careers = careers.filter(c => c.department === department);
  }
  if (location) {
    careers = careers.filter(c => c.location === location);
  }

  res.json({ careers, total: careers.length });
});

// Get single career (public)
router.get('/careers/:id', (req, res) => {
  const career = content.careers.find(c => c.id === parseInt(req.params.id));
  if (!career) {
    return res.status(404).json({ error: 'Career not found' });
  }
  res.json({ career });
});

// Create career (admin only)
router.post('/careers', [
  body('title').notEmpty().trim(),
  body('department').notEmpty().trim(),
  body('location').notEmpty().trim(),
  body('type').notEmpty().trim(),
  body('description').notEmpty().trim()
], requireAdmin, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const newCareer = {
    id: getNextId('careers'),
    ...req.body,
    posted: new Date().toISOString(),
    active: true,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  content.careers.push(newCareer);
  res.status(201).json({ message: 'Career created successfully', career: newCareer });
});

// Update career (admin only)
router.put('/careers/:id', requireAdmin, (req, res) => {
  const index = content.careers.findIndex(c => c.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Career not found' });
  }

  content.careers[index] = {
    ...content.careers[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json({ message: 'Career updated successfully', career: content.careers[index] });
});

// Delete career (admin only)
router.delete('/careers/:id', requireAdmin, (req, res) => {
  const index = content.careers.findIndex(c => c.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Career not found' });
  }

  content.careers.splice(index, 1);
  res.json({ message: 'Career deleted successfully' });
});

// ========================================
// NEWS ROUTES
// ========================================

// Get all news (public)
router.get('/news', (req, res) => {
  const { category, published } = req.query;
  let news = content.news;

  if (published !== undefined) {
    news = news.filter(n => n.published === (published === 'true'));
  }
  if (category) {
    news = news.filter(n => n.category === category);
  }

  res.json({ news, total: news.length });
});

// Get single news by slug (public)
router.get('/news/:slug', (req, res) => {
  const newsItem = content.news.find(n => n.slug === req.params.slug || n.id === parseInt(req.params.slug));
  if (!newsItem) {
    return res.status(404).json({ error: 'News not found' });
  }

  // Increment views
  newsItem.views = (newsItem.views || 0) + 1;

  res.json({ news: newsItem });
});

// Create news (admin only)
router.post('/news', [
  body('title').notEmpty().trim(),
  body('slug').notEmpty().trim(),
  body('excerpt').notEmpty().trim(),
  body('content').notEmpty(),
  body('category').notEmpty().trim()
], requireAdmin, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const newNews = {
    id: getNextId('news'),
    ...req.body,
    views: 0,
    publishedDate: new Date().toISOString(),
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  content.news.push(newNews);
  res.status(201).json({ message: 'News created successfully', news: newNews });
});

// Update news (admin only)
router.put('/news/:id', requireAdmin, (req, res) => {
  const index = content.news.findIndex(n => n.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'News not found' });
  }

  content.news[index] = {
    ...content.news[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json({ message: 'News updated successfully', news: content.news[index] });
});

// Delete news (admin only)
router.delete('/news/:id', requireAdmin, (req, res) => {
  const index = content.news.findIndex(n => n.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'News not found' });
  }

  content.news.splice(index, 1);
  res.json({ message: 'News deleted successfully' });
});

// ========================================
// BLOGS ROUTES
// ========================================

// Get all blogs (public)
router.get('/blogs', (req, res) => {
  const { category, published, tag } = req.query;
  let blogs = content.blogs;

  if (published !== undefined) {
    blogs = blogs.filter(b => b.published === (published === 'true'));
  }
  if (category) {
    blogs = blogs.filter(b => b.category === category);
  }
  if (tag) {
    blogs = blogs.filter(b => b.tags && b.tags.includes(tag));
  }

  res.json({ blogs, total: blogs.length });
});

// Get single blog by slug (public)
router.get('/blogs/:slug', (req, res) => {
  const blog = content.blogs.find(b => b.slug === req.params.slug || b.id === parseInt(req.params.slug));
  if (!blog) {
    return res.status(404).json({ error: 'Blog not found' });
  }

  // Increment views
  blog.views = (blog.views || 0) + 1;

  res.json({ blog });
});

// Create blog (admin only)
router.post('/blogs', [
  body('title').notEmpty().trim(),
  body('slug').notEmpty().trim(),
  body('excerpt').notEmpty().trim(),
  body('content').notEmpty(),
  body('category').notEmpty().trim()
], requireAdmin, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const newBlog = {
    id: getNextId('blogs'),
    ...req.body,
    views: 0,
    publishedDate: new Date().toISOString(),
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  content.blogs.push(newBlog);
  res.status(201).json({ message: 'Blog created successfully', blog: newBlog });
});

// Update blog (admin only)
router.put('/blogs/:id', requireAdmin, (req, res) => {
  const index = content.blogs.findIndex(b => b.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Blog not found' });
  }

  content.blogs[index] = {
    ...content.blogs[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json({ message: 'Blog updated successfully', blog: content.blogs[index] });
});

// Delete blog (admin only)
router.delete('/blogs/:id', requireAdmin, (req, res) => {
  const index = content.blogs.findIndex(b => b.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Blog not found' });
  }

  content.blogs.splice(index, 1);
  res.json({ message: 'Blog deleted successfully' });
});

// ========================================
// VIDEOS ROUTES
// ========================================

// Get all videos (public)
router.get('/videos', (req, res) => {
  const { category, published } = req.query;
  let videos = content.videos;

  if (published !== undefined) {
    videos = videos.filter(v => v.published === (published === 'true'));
  }
  if (category) {
    videos = videos.filter(v => v.category === category);
  }

  res.json({ videos, total: videos.length });
});

// Get single video (public)
router.get('/videos/:slug', (req, res) => {
  const video = content.videos.find(v => v.slug === req.params.slug || v.id === parseInt(req.params.slug));
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  // Increment views
  video.views = (video.views || 0) + 1;

  res.json({ video });
});

// Create video (admin only)
router.post('/videos', [
  body('title').notEmpty().trim(),
  body('slug').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('videoUrl').notEmpty().trim()
], requireAdmin, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const newVideo = {
    id: getNextId('videos'),
    ...req.body,
    views: 0,
    publishedDate: new Date().toISOString(),
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  content.videos.push(newVideo);
  res.status(201).json({ message: 'Video created successfully', video: newVideo });
});

// Update video (admin only)
router.put('/videos/:id', requireAdmin, (req, res) => {
  const index = content.videos.findIndex(v => v.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Video not found' });
  }

  content.videos[index] = {
    ...content.videos[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json({ message: 'Video updated successfully', video: content.videos[index] });
});

// Delete video (admin only)
router.delete('/videos/:id', requireAdmin, (req, res) => {
  const index = content.videos.findIndex(v => v.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Video not found' });
  }

  content.videos.splice(index, 1);
  res.json({ message: 'Video deleted successfully' });
});

// ========================================
// EVENTS ROUTES
// ========================================

// Get all events (public)
router.get('/events', (req, res) => {
  const { status, upcoming } = req.query;
  let events = content.events.filter(e => e.published);

  if (status) {
    events = events.filter(e => e.status === status);
  }
  if (upcoming === 'true') {
    const now = new Date();
    events = events.filter(e => new Date(e.startDate) > now);
  }

  res.json({ events, total: events.length });
});

// Get single event (public)
router.get('/events/:slug', (req, res) => {
  const event = content.events.find(e => e.slug === req.params.slug || e.id === parseInt(req.params.slug));
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json({ event });
});

// Create event (admin only)
router.post('/events', [
  body('title').notEmpty().trim(),
  body('slug').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('startDate').notEmpty(),
  body('endDate').notEmpty()
], requireAdmin, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const newEvent = {
    id: getNextId('events'),
    ...req.body,
    registered: 0,
    status: 'upcoming',
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  content.events.push(newEvent);
  res.status(201).json({ message: 'Event created successfully', event: newEvent });
});

// Update event (admin only)
router.put('/events/:id', requireAdmin, (req, res) => {
  const index = content.events.findIndex(e => e.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }

  content.events[index] = {
    ...content.events[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json({ message: 'Event updated successfully', event: content.events[index] });
});

// Delete event (admin only)
router.delete('/events/:id', requireAdmin, (req, res) => {
  const index = content.events.findIndex(e => e.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }

  content.events.splice(index, 1);
  res.json({ message: 'Event deleted successfully' });
});

// ========================================
// WEBINARS ROUTES
// ========================================

// Get all webinars (public)
router.get('/webinars', (req, res) => {
  const { status, upcoming } = req.query;
  let webinars = content.webinars.filter(w => w.published);

  if (status) {
    webinars = webinars.filter(w => w.status === status);
  }
  if (upcoming === 'true') {
    const now = new Date();
    webinars = webinars.filter(w => new Date(w.startDate) > now);
  }

  res.json({ webinars, total: webinars.length });
});

// Get single webinar (public)
router.get('/webinars/:slug', (req, res) => {
  const webinar = content.webinars.find(w => w.slug === req.params.slug || w.id === parseInt(req.params.slug));
  if (!webinar) {
    return res.status(404).json({ error: 'Webinar not found' });
  }
  res.json({ webinar });
});

// Create webinar (admin only)
router.post('/webinars', [
  body('title').notEmpty().trim(),
  body('slug').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('presenter').notEmpty().trim(),
  body('startDate').notEmpty(),
  body('duration').notEmpty()
], requireAdmin, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const newWebinar = {
    id: getNextId('webinars'),
    ...req.body,
    registered: 0,
    status: 'upcoming',
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  content.webinars.push(newWebinar);
  res.status(201).json({ message: 'Webinar created successfully', webinar: newWebinar });
});

// Update webinar (admin only)
router.put('/webinars/:id', requireAdmin, (req, res) => {
  const index = content.webinars.findIndex(w => w.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Webinar not found' });
  }

  content.webinars[index] = {
    ...content.webinars[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json({ message: 'Webinar updated successfully', webinar: content.webinars[index] });
});

// Delete webinar (admin only)
router.delete('/webinars/:id', requireAdmin, (req, res) => {
  const index = content.webinars.findIndex(w => w.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Webinar not found' });
  }

  content.webinars.splice(index, 1);
  res.json({ message: 'Webinar deleted successfully' });
});

// ========================================
// GLOSSARY ROUTES
// ========================================

// Get all glossary terms (public)
router.get('/glossary', (req, res) => {
  const { category, search } = req.query;
  let glossary = content.glossary.filter(g => g.published);

  if (category) {
    glossary = glossary.filter(g => g.category === category);
  }
  if (search) {
    const searchLower = search.toLowerCase();
    glossary = glossary.filter(g =>
      g.term.toLowerCase().includes(searchLower) ||
      g.definition.toLowerCase().includes(searchLower)
    );
  }

  // Sort alphabetically by term
  glossary.sort((a, b) => a.term.localeCompare(b.term));

  res.json({ glossary, total: glossary.length });
});

// Get single glossary term (public)
router.get('/glossary/:id', (req, res) => {
  const term = content.glossary.find(g => g.id === parseInt(req.params.id) || g.term.toLowerCase() === req.params.id.toLowerCase());
  if (!term) {
    return res.status(404).json({ error: 'Glossary term not found' });
  }
  res.json({ term });
});

// Create glossary term (admin only)
router.post('/glossary', [
  body('term').notEmpty().trim(),
  body('fullForm').optional().trim(),
  body('definition').notEmpty().trim(),
  body('category').notEmpty().trim()
], requireAdmin, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const newTerm = {
    id: getNextId('glossary'),
    ...req.body,
    published: true,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  content.glossary.push(newTerm);
  res.status(201).json({ message: 'Glossary term created successfully', term: newTerm });
});

// Update glossary term (admin only)
router.put('/glossary/:id', requireAdmin, (req, res) => {
  const index = content.glossary.findIndex(g => g.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Glossary term not found' });
  }

  content.glossary[index] = {
    ...content.glossary[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json({ message: 'Glossary term updated successfully', term: content.glossary[index] });
});

// Delete glossary term (admin only)
router.delete('/glossary/:id', requireAdmin, (req, res) => {
  const index = content.glossary.findIndex(g => g.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Glossary term not found' });
  }

  content.glossary.splice(index, 1);
  res.json({ message: 'Glossary term deleted successfully' });
});

// ========================================
// LEADERSHIP MANAGEMENT
// ========================================

// Get all leadership members (public)
router.get('/leadership', (req, res) => {
  const leadership = content.leadership
    .filter(l => l.active)
    .sort((a, b) => a.order - b.order);
  
  res.json({ success: true, leadership });
});

// Get single leadership member (public)
router.get('/leadership/:id', (req, res) => {
  const leadership = content.leadership.find(l => 
    (l.id === parseInt(req.params.id) || l.slug === req.params.slug) && l.active
  );
  
  if (!leadership) {
    return res.status(404).json({ error: 'Leadership member not found' });
  }
  
  res.json({ success: true, leadership });
});

// Create leadership member (admin only)
router.post('/leadership', [
  body('name').notEmpty().trim(),
  body('title').notEmpty().trim(),
  body('bio').notEmpty().trim(),
  body('order').isInt({ min: 1 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const newLeadership = {
    id: getNextId('leadership'),
    ...req.body,
    active: true,
    createdBy: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  content.leadership.push(newLeadership);
  res.json({ success: true, leadership: newLeadership });
});

// Update leadership member (admin only)
router.put('/leadership/:id', requireAdmin, (req, res) => {
  const index = content.leadership.findIndex(l => l.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Leadership member not found' });
  }

  content.leadership[index] = {
    ...content.leadership[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json({ success: true, leadership: content.leadership[index] });
});

// Delete leadership member (admin only)
router.delete('/leadership/:id', requireAdmin, (req, res) => {
  const index = content.leadership.findIndex(l => l.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Leadership member not found' });
  }

  content.leadership.splice(index, 1);
  res.json({ success: true, message: 'Leadership member deleted successfully' });
});

// ========================================
// CASE STUDIES MANAGEMENT
// ========================================

// Get all case studies (public)
router.get('/case-studies', (req, res) => {
  const caseStudies = content.caseStudies.filter(cs => cs.published);
  res.json({ success: true, caseStudies });
});

// Get single case study (public)
router.get('/case-studies/:id', (req, res) => {
  const caseStudy = content.caseStudies.find(cs => 
    (cs.id === parseInt(req.params.id) || cs.slug === req.params.slug) && cs.published
  );
  
  if (!caseStudy) {
    return res.status(404).json({ error: 'Case study not found' });
  }
  
  res.json({ success: true, caseStudy });
});

// Create case study (admin only)
router.post('/case-studies', requireAdmin, [
  body('title').notEmpty().trim(),
  body('excerpt').notEmpty().trim(),
  body('company').notEmpty().trim(),
  body('industry').notEmpty().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const newCaseStudy = {
    id: getNextId('caseStudies'),
    ...req.body,
    published: req.body.published !== false,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  content.caseStudies.push(newCaseStudy);
  res.json({ success: true, caseStudy: newCaseStudy });
});

// Update case study (admin only)
router.put('/case-studies/:id', requireAdmin, (req, res) => {
  const index = content.caseStudies.findIndex(cs => cs.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Case study not found' });
  }

  content.caseStudies[index] = {
    ...content.caseStudies[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json({ success: true, caseStudy: content.caseStudies[index] });
});

// Delete case study (admin only)
router.delete('/case-studies/:id', requireAdmin, (req, res) => {
  const index = content.caseStudies.findIndex(cs => cs.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Case study not found' });
  }

  content.caseStudies.splice(index, 1);
  res.json({ success: true, message: 'Case study deleted successfully' });
});

// ========================================
// WHITE PAPERS MANAGEMENT
// ========================================

// Get all white papers (public)
router.get('/white-papers', (req, res) => {
  const whitePapers = content.whitePapers.filter(wp => wp.published);
  res.json({ success: true, whitePapers });
});

// Get single white paper (public)
router.get('/white-papers/:id', (req, res) => {
  const whitePaper = content.whitePapers.find(wp => 
    (wp.id === parseInt(req.params.id) || wp.slug === req.params.slug) && wp.published
  );
  
  if (!whitePaper) {
    return res.status(404).json({ error: 'White paper not found' });
  }
  
  res.json({ success: true, whitePaper });
});

// Create white paper (admin only)
router.post('/white-papers', requireAdmin, [
  body('title').notEmpty().trim(),
  body('excerpt').notEmpty().trim(),
  body('pdfUrl').notEmpty().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const newWhitePaper = {
    id: getNextId('whitePapers'),
    ...req.body,
    published: req.body.published !== false,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  content.whitePapers.push(newWhitePaper);
  res.json({ success: true, whitePaper: newWhitePaper });
});

// Update white paper (admin only)
router.put('/white-papers/:id', requireAdmin, (req, res) => {
  const index = content.whitePapers.findIndex(wp => wp.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'White paper not found' });
  }

  content.whitePapers[index] = {
    ...content.whitePapers[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json({ success: true, whitePaper: content.whitePapers[index] });
});

// Delete white paper (admin only)
router.delete('/white-papers/:id', requireAdmin, (req, res) => {
  const index = content.whitePapers.findIndex(wp => wp.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'White paper not found' });
  }

  content.whitePapers.splice(index, 1);
  res.json({ success: true, message: 'White paper deleted successfully' });
});

// ========================================
// REPORTS MANAGEMENT
// ========================================

// Get all reports (public)
router.get('/reports', (req, res) => {
  const reports = content.reports.filter(r => r.published);
  res.json({ success: true, reports });
});

// Get single report (public)
router.get('/reports/:id', (req, res) => {
  const report = content.reports.find(r => 
    (r.id === parseInt(req.params.id) || r.slug === req.params.slug) && r.published
  );
  
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  res.json({ success: true, report });
});

// Create report (admin only)
router.post('/reports', requireAdmin, [
  body('title').notEmpty().trim(),
  body('excerpt').notEmpty().trim(),
  body('pdfUrl').notEmpty().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const newReport = {
    id: getNextId('reports'),
    ...req.body,
    published: req.body.published !== false,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  content.reports.push(newReport);
  res.json({ success: true, report: newReport });
});

// Update report (admin only)
router.put('/reports/:id', requireAdmin, (req, res) => {
  const index = content.reports.findIndex(r => r.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Report not found' });
  }

  content.reports[index] = {
    ...content.reports[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json({ success: true, report: content.reports[index] });
});

// Delete report (admin only)
router.delete('/reports/:id', requireAdmin, (req, res) => {
  const index = content.reports.findIndex(r => r.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Report not found' });
  }

  content.reports.splice(index, 1);
  res.json({ success: true, message: 'Report deleted successfully' });
});

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

// Helper function to match search query
function matchesSearch(item, query) {
  if (!query || !item) return false;
  
  const searchTerms = query.toLowerCase().split(' ');
  const searchText = [
    item.title || '',
    item.excerpt || item.description || '',
    item.content || '',
    ...(item.tags || []),
    item.category || '',
    item.author || ''
  ].join(' ').toLowerCase();
  
  return searchTerms.every(term => searchText.includes(term));
}

// Global search endpoint (public)
router.get('/search', (req, res) => {
  const { q: query, type, category, limit = 10, page = 1 } = req.query;
  
  if (!query || query.trim().length < 2) {
    return res.json({ 
      success: false, 
      message: 'Search query must be at least 2 characters long' 
    });
  }
  
  const searchTerm = query.trim();
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let allResults = [];
  
  // Search function for content arrays
  const searchInContent = (contentArray, contentType) => {
    if (!contentArray || !Array.isArray(contentArray)) return [];
    
    return contentArray
      .filter(item => {
        // Only search published/active content
        if (item.published === false || item.active === false) return false;
        
        // Filter by category if specified
        if (category && item.category !== category) return false;
        
        return matchesSearch(item, searchTerm);
      })
      .map(item => ({
        ...item,
        contentType,
        relevanceScore: calculateRelevance(item, searchTerm)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  };
  
  // Search across all content types or specific type
  if (!type || type === 'all') {
    allResults = [
      ...searchInContent(content.blogs, 'blog'),
      ...searchInContent(content.news, 'news'),
      ...searchInContent(content.events, 'event'),
      ...searchInContent(content.webinars, 'webinar'),
      ...searchInContent(content.videos, 'video'),
      ...searchInContent(content.caseStudies, 'case-study'),
      ...searchInContent(content.whitePapers, 'white-paper'),
      ...searchInContent(content.reports, 'report'),
      ...searchInContent(content.glossary, 'glossary'),
      ...searchInContent(content.leadership, 'leadership')
    ];
  } else {
    const contentMap = {
      'blogs': content.blogs,
      'news': content.news,
      'events': content.events,
      'webinars': content.webinars,
      'videos': content.videos,
      'case-studies': content.caseStudies,
      'white-papers': content.whitePapers,
      'reports': content.reports,
      'glossary': content.glossary,
      'leadership': content.leadership
    };
    
    allResults = searchInContent(contentMap[type], type);
  }
  
  // Pagination
  const total = allResults.length;
  const results = allResults.slice(offset, offset + parseInt(limit));
  
  res.json({
    success: true,
    results,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    },
    query: searchTerm,
    type: type || 'all',
    category: category || null
  });
});

// Helper function to calculate relevance score
function calculateRelevance(item, query) {
  let score = 0;
  const queryLower = query.toLowerCase();
  
  // Title matches get highest score
  if (item.title && item.title.toLowerCase().includes(queryLower)) {
    score += 10;
    if (item.title.toLowerCase() === queryLower) score += 20;
  }
  
  // Exact tag matches
  if (item.tags && item.tags.some(tag => tag.toLowerCase() === queryLower)) {
    score += 8;
  }
  
  // Category matches
  if (item.category && item.category.toLowerCase() === queryLower) {
    score += 6;
  }
  
  // Content/excerpt matches
  if (item.excerpt && item.excerpt.toLowerCase().includes(queryLower)) {
    score += 4;
  }
  
  if (item.content && item.content.toLowerCase().includes(queryLower)) {
    score += 2;
  }
  
  // Author matches
  if (item.author && item.author.toLowerCase().includes(queryLower)) {
    score += 3;
  }
  
  return score;
}

// ========================================
// STATS ROUTES (Admin only)
// ========================================

// Get content statistics
router.get('/stats', requireAdmin, (req, res) => {
  const stats = {
    careers: {
      total: content.careers.length,
      active: content.careers.filter(c => c.active).length
    },
    news: {
      total: content.news.length,
      published: content.news.filter(n => n.published).length
    },
    blogs: {
      total: content.blogs.length,
      published: content.blogs.filter(b => b.published).length
    },
    videos: {
      total: content.videos.length,
      published: content.videos.filter(v => v.published).length
    },
    events: {
      total: content.events.length,
      upcoming: content.events.filter(e => e.status === 'upcoming').length
    },
    webinars: {
      total: content.webinars.length,
      upcoming: content.webinars.filter(w => w.status === 'upcoming').length
    },
    glossary: {
      total: content.glossary.length,
      published: content.glossary.filter(g => g.published).length
    },
    leadership: {
      total: content.leadership.length,
      active: content.leadership.filter(l => l.active).length
    },
    caseStudies: {
      total: content.caseStudies.length,
      published: content.caseStudies.filter(cs => cs.published).length
    },
    whitePapers: {
      total: content.whitePapers.length,
      published: content.whitePapers.filter(wp => wp.published).length
    },
    reports: {
      total: content.reports.length,
      published: content.reports.filter(r => r.published).length
    }
  };

  res.json({ stats });
});

export default router;
