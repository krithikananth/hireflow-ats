const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
  addCandidate,
  getCandidates,
  getCandidate,
  getResumeScore,
  updateCandidate,
  updateStage,
  deleteCandidate
} = require('../controllers/candidateController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(protect, upload.single('resumeFile'), addCandidate)
  .get(protect, getCandidates);

router.route('/:id')
  .get(protect, getCandidate)
  .put(protect, updateCandidate)
  .delete(protect, authorize('HR'), deleteCandidate);

router.put('/:id/stage', protect, updateStage);
router.get('/:id/resume-score', protect, authorize('HR'), getResumeScore);

module.exports = router;
