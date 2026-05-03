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

// Email diagnostic endpoint (temporary — remove after testing)
app.get('/api/test-email', async (req, res) => {
  try {
    const { sendStageChangeToCandidate } = require('./services/emailService');
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
      return res.json({ success: false, error: 'EMAIL_USER or EMAIL_PASS not set', emailUser: !!emailUser, emailPass: !!emailPass });
    }

    await sendStageChangeToCandidate({
      candidateEmail: emailUser,
      candidateName: 'Test Candidate',
      jobTitle: 'Test Position',
      newStage: 'Screening',
      hrName: 'Test HR'
    });

    res.json({ success: true, message: 'Test email sent to ' + emailUser });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
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

  // On startup: reset any candidates not in final state ('done'/'skipped') → 'skipped'
  // This catches stuck pending/processing/failed from previous deploys or API failures
  try {
    const Candidate = require('./models/Candidate');
    const result = await Candidate.updateMany(
      { resumeCheckStatus: { $nin: ['done', 'skipped'] } },
      { $set: { resumeCheckStatus: 'skipped' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`🧹 Reset ${result.modifiedCount} stuck candidates → 'skipped'`);
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
