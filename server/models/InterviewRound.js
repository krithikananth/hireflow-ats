const mongoose = require('mongoose');

const interviewRoundSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: [true, 'Candidate ID is required']
  },
  roundName: {
    type: String,
    required: [true, 'Round name is required'],
    trim: true
  },
  interviewerName: {
    type: String,
    required: [true, 'Interviewer name is required'],
    trim: true
  },
  score: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  feedback: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    required: [true, 'Interview date is required']
  },
  time: {
    type: String,
    required: [true, 'Interview time is required'],
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for fast lookups by candidate and date
interviewRoundSchema.index({ candidateId: 1 });
interviewRoundSchema.index({ date: 1 });

module.exports = mongoose.model('InterviewRound', interviewRoundSchema);
