const InterviewRound = require('../models/InterviewRound');

// @desc    Add interview round
// @route   POST /api/interviews
// @access  Auth
const addRound = async (req, res) => {
  try {
    const { candidateId, roundName, interviewerName, score, feedback, date, time } = req.body;

    // Check if the date+time slot is already occupied
    const existing = await InterviewRound.findOne({ date: new Date(date), time });
    if (existing) {
      const occupiedCandidate = await require('../models/Candidate').findById(existing.candidateId).select('name');
      return res.status(400).json({
        success: false,
        message: `This time slot (${time} on ${new Date(date).toLocaleDateString()}) is already occupied by ${occupiedCandidate?.name || 'another candidate'}`
      });
    }

    const round = await InterviewRound.create({
      candidateId,
      roundName,
      interviewerName,
      score: score || 0,
      feedback: feedback || '',
      date,
      time: time || '10:00',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: round
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get interview rounds for a candidate
// @route   GET /api/interviews/:candidateId
// @access  HR only
const getRounds = async (req, res) => {
  try {
    const rounds = await InterviewRound.find({ candidateId: req.params.candidateId })
      .populate('createdBy', 'name email')
      .sort('date');

    res.json({
      success: true,
      count: rounds.length,
      data: rounds
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get occupied interview schedule (all booked date+time slots)
// @route   GET /api/interviews/schedule/occupied
// @access  Auth (both HR and Employee can see)
const getOccupiedSchedule = async (req, res) => {
  try {
    // Get all interviews from today onwards
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rounds = await InterviewRound.find({ date: { $gte: today } })
      .populate('candidateId', 'name')
      .populate('createdBy', 'name')
      .select('date time roundName interviewerName candidateId')
      .sort('date time');

    res.json({
      success: true,
      count: rounds.length,
      data: rounds
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update interview round
// @route   PUT /api/interviews/:id
// @access  Auth
const updateRound = async (req, res) => {
  try {
    const round = await InterviewRound.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Interview round not found'
      });
    }

    res.json({
      success: true,
      data: round
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete interview round
// @route   DELETE /api/interviews/:id
// @access  HR only
const deleteRound = async (req, res) => {
  try {
    const round = await InterviewRound.findByIdAndDelete(req.params.id);

    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Interview round not found'
      });
    }

    res.json({
      success: true,
      message: 'Interview round deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { addRound, getRounds, getOccupiedSchedule, updateRound, deleteRound };
