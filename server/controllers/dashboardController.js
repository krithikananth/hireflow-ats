const Candidate = require('../models/Candidate');
const InterviewRound = require('../models/InterviewRound');
const Job = require('../models/Job');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Auth
const getStats = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const [totalCandidates, totalJobs, selectedCount, rejectedCount, stageCounts] = await Promise.all([
      Candidate.countDocuments({ companyId }),
      Job.countDocuments({ companyId }),
      Candidate.countDocuments({ companyId, currentStage: 'Selected' }),
      Candidate.countDocuments({ companyId, currentStage: 'Rejected' }),
      Candidate.aggregate([
        { $match: { companyId } },
        { $group: { _id: '$currentStage', count: { $sum: 1 } } }
      ])
    ]);

    // Convert stage counts to object
    const stageMap = {};
    stageCounts.forEach(s => { stageMap[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        totalCandidates,
        totalJobs,
        selectedCount,
        rejectedCount,
        stageCounts: stageMap
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get today's interviews
// @route   GET /api/dashboard/today
// @access  Auth
const getTodayInterviews = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const interviews = await InterviewRound.find({
      date: { $gte: today, $lt: tomorrow }
    })
      .populate({
        path: 'candidateId',
        select: 'name email currentStage jobId',
        populate: { path: 'jobId', select: 'title department' }
      })
      .populate('createdBy', 'name')
      .sort('date');

    res.json({
      success: true,
      count: interviews.length,
      data: interviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get pipeline summary (candidates per stage)
// @route   GET /api/dashboard/pipeline
// @access  Auth
const getPipeline = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const pipeline = await Candidate.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: '$currentStage',
          count: { $sum: 1 },
          candidates: {
            $push: {
              _id: '$_id',
              name: '$name',
              email: '$email'
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: pipeline
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get job-wise candidate count
// @route   GET /api/dashboard/job-stats
// @access  Auth
const getJobStats = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const jobStats = await Candidate.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: '$jobId',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: '_id',
          as: 'job'
        }
      },
      { $unwind: '$job' },
      {
        $project: {
          jobTitle: '$job.title',
          department: '$job.department',
          count: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: jobStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { getStats, getTodayInterviews, getPipeline, getJobStats };
