const express = require('express');
const router = express.Router();
const {
  addCandidate,
  getCandidates,
  getCandidate,
  updateCandidate,
  updateStage,
  deleteCandidate
} = require('../controllers/candidateController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(protect, addCandidate)
  .get(protect, getCandidates);

router.route('/:id')
  .get(protect, getCandidate)
  .put(protect, updateCandidate)
  .delete(protect, authorize('HR'), deleteCandidate);

router.put('/:id/stage', protect, updateStage);

module.exports = router;
