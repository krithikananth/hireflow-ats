const express = require('express');
const router = express.Router();
const { addRound, getRounds, updateRound, deleteRound } = require('../controllers/interviewController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, addRound);
router.get('/:candidateId', protect, authorize('HR'), getRounds);
router.put('/:id', protect, updateRound);
router.delete('/:id', protect, authorize('HR'), deleteRound);

module.exports = router;
