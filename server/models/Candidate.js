const mongoose = require('mongoose');

const PIPELINE_STAGES = [
  'Applied',
  'Screening',
  'Technical Round 1',
  'Technical Round 2',
  'HR Round',
  'Selected',
  'Rejected'
];

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Candidate email is required'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  resumeLink: {
    type: String,
    trim: true,
    default: ''
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job ID is required']
  },
  currentStage: {
    type: String,
    enum: PIPELINE_STAGES,
    default: 'Applied'
  },
  assignedHR: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
candidateSchema.index({ companyId: 1, currentStage: 1 });
candidateSchema.index({ jobId: 1 });
candidateSchema.index({ assignedHR: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
module.exports.PIPELINE_STAGES = PIPELINE_STAGES;
