const express = require('express');
const router = express.Router();
const { createJob, getJobs, getJob, updateJob, deleteJob } = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(protect, authorize('HR'), createJob)
  .get(protect, getJobs);

router.route('/:id')
  .get(protect, getJob)
  .put(protect, authorize('HR'), updateJob)
  .delete(protect, authorize('HR'), deleteJob);

module.exports = router;
