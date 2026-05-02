const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/candidates', require('./routes/candidateRoutes'));
app.use('/api/interviews', require('./routes/interviewRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'HireFlow ATS Server is running' });
});



// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start server AFTER DB connects
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // On startup: clean up candidate ATS statuses
  try {
    const Candidate = require('./models/Candidate');
    
    // 1. Reset stuck 'pending'/'processing' → 'skipped' (failed API calls or restarts)
    const stuck = await Candidate.updateMany(
      { resumeCheckStatus: { $in: ['pending', 'processing'] } },
      { $set: { resumeCheckStatus: 'skipped' } }
    );
    if (stuck.modifiedCount > 0) {
      console.log(`🧹 Reset ${stuck.modifiedCount} stuck candidates → 'skipped'`);
    }
    
    // 2. Mark 'failed' candidates without resume as 'skipped' (no resume = can't check)
    const noResume = await Candidate.updateMany(
      { resumeCheckStatus: 'failed', $or: [{ resumeLink: '' }, { resumeLink: { $exists: false } }] },
      { 
        $set: { 
          resumeCheckStatus: 'skipped',
          resumeAnalysis: { overallSummary: 'No resume file was uploaded for this candidate.', strengths: [], weaknesses: [], recommendation: 'Upload a resume to enable ATS analysis.' }
        }
      }
    );
    if (noResume.modifiedCount > 0) {
      console.log(`📄 Marked ${noResume.modifiedCount} candidates without resumes → 'skipped'`);
    }
  } catch (err) {
    console.error('⚠️ Startup cleanup error:', err.message);
  }
  
  const server = app.listen(PORT, () => {
    console.log(`🚀 HireFlow ATS Server running on port ${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${PORT} busy, trying ${Number(PORT) + 1}...`);
      app.listen(Number(PORT) + 1, () => {
        console.log(`🚀 HireFlow ATS Server running on port ${Number(PORT) + 1}`);
      });
    } else {
      console.error(err);
      process.exit(1);
    }
  });

  process.on('SIGTERM', () => { server.close(); process.exit(0); });
  process.on('SIGINT', () => { server.close(); process.exit(0); });
};

startServer();
