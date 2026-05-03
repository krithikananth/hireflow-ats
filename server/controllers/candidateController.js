const Candidate = require('../models/Candidate');
const { PIPELINE_STAGES } = require('../models/Candidate');
const Job = require('../models/Job');
const { analyzeResume } = require('../services/resumeChecker');
const { sendStageChangeToHR, sendNewCandidateToHR } = require('../services/emailService');
const User = require('../models/User');
const pdfParse = require('pdf-parse');

// ─── Internal helper: run ATS check after candidate creation ──────────────────
async function runResumeCheck(candidateId, resumeText) {
  try {
    const candidate = await Candidate.findById(candidateId).populate('jobId', 'title department description');
    if (!candidate) return;

    // Mark as processing
    await Candidate.findByIdAndUpdate(candidateId, { resumeCheckStatus: 'processing' });

    const analysis = await analyzeResume({
      candidateName: candidate.name,
      resumeText:    resumeText,
      jobTitle:      candidate.jobId?.title || 'Unknown',
      jobDepartment: candidate.jobId?.department || 'Unknown',
      jobDescription: candidate.jobId?.description || ''
    });

    await Candidate.findByIdAndUpdate(candidateId, {
      resumeScore: analysis.overallScore,
      resumeAnalysis: {
        overallSummary:    analysis.overallSummary,
        strengths:         analysis.strengths || [],
        weaknesses:        analysis.weaknesses || [],
        recommendation:    analysis.recommendation,
        skillsMatch:       analysis.skillsMatch,
        experienceMatch:   analysis.experienceMatch,
        presentationScore: analysis.presentationScore
      },
      resumeCheckedAt:    new Date(),
      resumeCheckStatus: 'done'
    });

    console.log(`✅ Resume checked for candidate ${candidate.name} — score: ${analysis.overallScore}/10`);
  } catch (err) {
    console.error(`❌ Resume check failed for ${candidateId}:`, err.message);
    await Candidate.findByIdAndUpdate(candidateId, { resumeCheckStatus: 'failed' });
  }
}

// @desc    Add new candidate
// @route   POST /api/candidates
// @access  Auth
const addCandidate = async (req, res) => {
  try {
    const { name, email, phone, jobId, assignedHR } = req.body;
    let resumeText = '';
    let resumeFileName = '';

    if (req.file) {
      resumeFileName = req.file.originalname;
      if (req.file.mimetype === 'application/pdf') {
        const data = await pdfParse(req.file.buffer);
        resumeText = data.text;
      } else {
        resumeText = req.file.buffer.toString('utf-8');
      }
    }

    const existing = await Candidate.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A candidate with this email already exists' });
    }

    const candidate = await Candidate.create({
      name, email, phone, resumeLink: resumeFileName, jobId,
      assignedHR: assignedHR || req.user._id,
      addedBy: req.user._id,
      companyId: req.user.companyId,
      currentStage: 'Applied',
      resumeCheckStatus: resumeText ? 'pending' : 'skipped'
    });

    const populated = await Candidate.findById(candidate._id)
      .populate('jobId', 'title department')
      .populate('assignedHR', 'name email')
      .populate('addedBy', 'name email');

    // Send HR notification email BEFORE response (Render kills process after response)
    try {
      const hrUser = await User.findById(populated.assignedHR?._id || assignedHR);
      const jobTitle = populated.jobId?.title || 'Open Position';

      if (hrUser) {
        console.log(`📧 Notifying HR: ${hrUser.email} about new candidate ${name}`);
        await sendNewCandidateToHR({ hrEmail: hrUser.email, hrName: hrUser.name, candidateName: name, candidateEmail: email, jobTitle, addedByName: req.user.name });
      }
    } catch (e) { console.error('❌ Email error (addCandidate):', e.message); }

    res.status(201).json({ success: true, data: populated });

    // ATS check can still be fire-and-forget (it's a long operation)
    if (resumeText) {
      setImmediate(() => runResumeCheck(candidate._id, resumeText));
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get candidates (role-based)
// @route   GET /api/candidates
// @access  Auth
const getCandidates = async (req, res) => {
  try {
    const { stage, jobId, search } = req.query;
    const filter = {};

    if (req.user.role === 'HR') {
      filter.assignedHR = req.user._id;
    } else {
      filter.addedBy = req.user._id;
    }

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

    // Employee gets limited fields — no pipeline/resume info
    if (req.user.role === 'Employee') {
      const limited = candidates.map(c => ({
        _id: c._id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        resumeLink: c.resumeLink,
        jobId: c.jobId,
        assignedHR: c.assignedHR,
        createdAt: c.createdAt,
        resumeCheckStatus: c.resumeCheckStatus // let employee see check status (not the score)
      }));
      return res.json({ success: true, count: limited.length, data: limited });
    }

    // HR gets everything including resume score
    res.json({ success: true, count: candidates.length, data: candidates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    res.json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get ATS resume score (HR only, assigned HR only)
// @route   GET /api/candidates/:id/resume-score
// @access  HR
const getResumeScore = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('jobId', 'title department');

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Only the assigned HR can see the resume score
    if (!candidate.assignedHR || candidate.assignedHR.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the assigned HR can view this resume score' });
    }

    res.json({
      success: true,
      data: {
        resumeScore:       candidate.resumeScore,
        resumeAnalysis:    candidate.resumeAnalysis,
        resumeCheckedAt:   candidate.resumeCheckedAt,
        resumeCheckStatus: candidate.resumeCheckStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update candidate
// @route   PUT /api/candidates/:id
// @access  Auth
const updateCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('jobId', 'title department')
      .populate('assignedHR', 'name email')
      .populate('addedBy', 'name email');

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    res.json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update candidate stage (Kanban)
// @route   PUT /api/candidates/:id/stage
// @access  HR only
const updateStage = async (req, res) => {
  try {
    const { stage } = req.body;

    if (!PIPELINE_STAGES.includes(stage)) {
      return res.status(400).json({ success: false, message: `Invalid stage. Valid: ${PIPELINE_STAGES.join(', ')}` });
    }

    const candidate = await Candidate.findByIdAndUpdate(req.params.id, { currentStage: stage }, { new: true })
      .populate('jobId', 'title department')
      .populate('assignedHR', 'name email')
      .populate('addedBy', 'name email');

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Send HR notification email BEFORE response
    try {
      const hrEmail = candidate.assignedHR?.email;
      const hrName = candidate.assignedHR?.name || 'HR Team';
      const jobTitle = candidate.jobId?.title || 'Open Position';

      if (hrEmail) {
        console.log(`📧 Notifying HR: ${hrEmail} about ${candidate.name} → ${stage}`);
        await sendStageChangeToHR({ hrEmail, hrName, candidateName: candidate.name, jobTitle, newStage: stage });
      }
    } catch (e) { console.error('❌ Email error (updateStage):', e.message); }

    res.json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete candidate
// @route   DELETE /api/candidates/:id
// @access  HR only
const deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }
    res.json({ success: true, message: 'Candidate deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { addCandidate, getCandidates, getCandidate, getResumeScore, updateCandidate, updateStage, deleteCandidate };
