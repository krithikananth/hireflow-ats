const Candidate = require('../models/Candidate');
const { PIPELINE_STAGES } = require('../models/Candidate');

// @desc    Add new candidate
// @route   POST /api/candidates
// @access  Auth
const addCandidate = async (req, res) => {
  try {
    const { name, email, phone, resumeLink, jobId, assignedHR } = req.body;

    const candidate = await Candidate.create({
      name,
      email,
      phone,
      resumeLink,
      jobId,
      assignedHR,
      addedBy: req.user._id,
      companyId: req.user.companyId,
      currentStage: 'Applied'
    });

    const populatedCandidate = await Candidate.findById(candidate._id)
      .populate('jobId', 'title department')
      .populate('assignedHR', 'name email')
      .populate('addedBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedCandidate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all candidates for company
// @route   GET /api/candidates
// @access  Auth
const getCandidates = async (req, res) => {
  try {
    const { stage, jobId, search } = req.query;
    const filter = { companyId: req.user.companyId };

    if (stage) filter.currentStage = stage;
    if (jobId) filter.jobId = jobId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const candidates = await Candidate.find(filter)
      .populate('jobId', 'title department')
      .populate('assignedHR', 'name email')
      .populate('addedBy', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      count: candidates.length,
      data: candidates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single candidate
// @route   GET /api/candidates/:id
// @access  Auth
const getCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('jobId', 'title department')
      .populate('assignedHR', 'name email')
      .populate('addedBy', 'name email');

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    res.json({
      success: true,
      data: candidate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update candidate
// @route   PUT /api/candidates/:id
// @access  Auth
const updateCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('jobId', 'title department')
      .populate('assignedHR', 'name email')
      .populate('addedBy', 'name email');

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    res.json({
      success: true,
      data: candidate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update candidate stage (Kanban)
// @route   PUT /api/candidates/:id/stage
// @access  Auth
const updateStage = async (req, res) => {
  try {
    const { stage } = req.body;

    if (!PIPELINE_STAGES.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid stage. Valid stages: ${PIPELINE_STAGES.join(', ')}`
      });
    }

    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { currentStage: stage },
      { new: true }
    )
      .populate('jobId', 'title department')
      .populate('assignedHR', 'name email')
      .populate('addedBy', 'name email');

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    res.json({
      success: true,
      data: candidate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete candidate
// @route   DELETE /api/candidates/:id
// @access  HR only
const deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    res.json({
      success: true,
      message: 'Candidate deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { addCandidate, getCandidates, getCandidate, updateCandidate, updateStage, deleteCandidate };
