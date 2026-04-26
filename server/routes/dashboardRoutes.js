const express = require('express');
const router = express.Router();
const { getStats, getTodayInterviews, getPipeline, getJobStats } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/stats', protect, getStats);
router.get('/today', protect, getTodayInterviews);
router.get('/pipeline', protect, getPipeline);
router.get('/job-stats', protect, getJobStats);

module.exports = router;
