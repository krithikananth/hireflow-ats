const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Job = require('./models/Job');
const Candidate = require('./models/Candidate');
const InterviewRound = require('./models/InterviewRound');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
    console.log('✅ Connected to MongoDB');

    // Find or create HR user
    let hr = await User.findOne({ role: 'HR' });
    if (!hr) {
      hr = await User.create({
        name: 'HR Admin',
        email: 'hr@hireflow.com',
        password: 'admin123',
        role: 'HR',
        companyId: 'HIREFLOW'
      });
      console.log('✅ Created HR user: hr@hireflow.com / admin123');
    }
    const companyId = hr.companyId;

    // Find or create Employee user
    let emp = await User.findOne({ role: 'Employee' });
    if (!emp) {
      emp = await User.create({
        name: 'Recruiter',
        email: 'recruiter@hireflow.com',
        password: 'recruit123',
        role: 'Employee',
        companyId
      });
      console.log('✅ Created Employee user: recruiter@hireflow.com / recruit123');
    }

    // Create Jobs
    const jobsData = [
      { title: 'Frontend Developer', department: 'Engineering', description: 'Build responsive UIs with React, TypeScript, and modern CSS frameworks. Work with the design team to implement pixel-perfect interfaces.' },
      { title: 'Backend Developer', department: 'Engineering', description: 'Design and build scalable APIs using Node.js and Express. Manage MongoDB databases and implement authentication systems.' },
      { title: 'UI/UX Designer', department: 'Design', description: 'Create wireframes, prototypes, and high-fidelity designs for web and mobile applications using Figma.' },
      { title: 'Data Analyst', department: 'Analytics', description: 'Analyze business data, create dashboards, and provide actionable insights to drive strategic decisions.' },
      { title: 'DevOps Engineer', department: 'Engineering', description: 'Manage CI/CD pipelines, cloud infrastructure on AWS, and ensure 99.9% uptime for all production services.' },
    ];

    // Clear existing jobs and candidates
    await Job.deleteMany({ companyId });
    await Candidate.deleteMany({ companyId });
    await InterviewRound.deleteMany({});
    console.log('🗑️  Cleared old sample data');

    const jobs = [];
    for (const j of jobsData) {
      const job = await Job.create({ ...j, companyId, createdBy: hr._id, status: 'open' });
      jobs.push(job);
    }
    console.log(`✅ Created ${jobs.length} jobs`);

    // Create Candidates
    const candidatesData = [
      { name: 'Ram Kumar', email: 'ram.kumar@gmail.com', phone: '9876543210', jobIndex: 0, stage: 'Technical Round 1', resumeLink: 'https://drive.google.com/ram-resume' },
      { name: 'Rajesh Sharma', email: 'rajesh.sharma@gmail.com', phone: '9876543211', jobIndex: 1, stage: 'Screening', resumeLink: 'https://drive.google.com/rajesh-resume' },
      { name: 'Krithik Ananth', email: 'krithik.ananth@gmail.com', phone: '9876543212', jobIndex: 0, stage: 'HR Round', resumeLink: 'https://drive.google.com/krithik-resume' },
      { name: 'Priya Lakshmi', email: 'priya.lakshmi@gmail.com', phone: '9876543213', jobIndex: 2, stage: 'Technical Round 2', resumeLink: 'https://drive.google.com/priya-resume' },
      { name: 'Arun Prasad', email: 'arun.prasad@gmail.com', phone: '9876543214', jobIndex: 3, stage: 'Applied', resumeLink: 'https://drive.google.com/arun-resume' },
      { name: 'Deepa Nair', email: 'deepa.nair@gmail.com', phone: '9876543215', jobIndex: 1, stage: 'Selected', resumeLink: 'https://drive.google.com/deepa-resume' },
      { name: 'Vijay Anand', email: 'vijay.anand@gmail.com', phone: '9876543216', jobIndex: 4, stage: 'Technical Round 1', resumeLink: 'https://drive.google.com/vijay-resume' },
      { name: 'Sathya Priya', email: 'sathya.priya@gmail.com', phone: '9876543217', jobIndex: 2, stage: 'Screening', resumeLink: 'https://drive.google.com/sathya-resume' },
      { name: 'Karthik Raja', email: 'karthik.raja@gmail.com', phone: '9876543218', jobIndex: 0, stage: 'Applied', resumeLink: 'https://drive.google.com/karthik-resume' },
      { name: 'Meena Sundari', email: 'meena.sundari@gmail.com', phone: '9876543219', jobIndex: 3, stage: 'Rejected', resumeLink: 'https://drive.google.com/meena-resume' },
    ];

    const candidates = [];
    for (const c of candidatesData) {
      const candidate = await Candidate.create({
        name: c.name,
        email: c.email,
        phone: c.phone,
        resumeLink: c.resumeLink,
        jobId: jobs[c.jobIndex]._id,
        currentStage: c.stage,
        assignedHR: hr._id,
        addedBy: emp._id,
        companyId
      });
      candidates.push(candidate);
    }
    console.log(`✅ Created ${candidates.length} candidates`);

    // Create Interview Rounds for candidates in advanced stages
    const interviewData = [
      { candidateIndex: 0, roundName: 'Technical Round 1', interviewerName: 'Suresh M.', score: 8, feedback: 'Strong React skills. Good understanding of component lifecycle and hooks. Needs improvement in TypeScript.' },
      { candidateIndex: 2, roundName: 'Technical Round 1', interviewerName: 'Anitha R.', score: 9, feedback: 'Excellent problem solving. Clean code structure. Very strong in algorithms and data structures.' },
      { candidateIndex: 2, roundName: 'Technical Round 2', interviewerName: 'Kumar S.', score: 8, feedback: 'Good system design knowledge. Understands microservices architecture well. Ready for HR round.' },
      { candidateIndex: 3, roundName: 'Technical Round 1', interviewerName: 'Pradeep K.', score: 7, feedback: 'Creative design thinking. Good Figma skills. Portfolio shows versatile design sense.' },
      { candidateIndex: 3, roundName: 'Technical Round 2', interviewerName: 'Divya M.', score: 8, feedback: 'Strong UI/UX fundamentals. User research methodology is solid. Good culture fit.' },
      { candidateIndex: 5, roundName: 'Technical Round 1', interviewerName: 'Ravi T.', score: 9, feedback: 'Outstanding Node.js skills. Excellent understanding of REST APIs and database optimization.' },
      { candidateIndex: 5, roundName: 'Technical Round 2', interviewerName: 'Lakshmi V.', score: 9, feedback: 'Top candidate. System design skills are exceptional. Highly recommend for selection.' },
      { candidateIndex: 6, roundName: 'Technical Round 1', interviewerName: 'Ganesh P.', score: 7, feedback: 'Good knowledge of Docker and Kubernetes. AWS experience is decent. Needs more hands-on CI/CD.' },
    ];

    for (const ir of interviewData) {
      await InterviewRound.create({
        candidateId: candidates[ir.candidateIndex]._id,
        roundName: ir.roundName,
        interviewerName: ir.interviewerName,
        score: ir.score,
        feedback: ir.feedback,
        date: new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000),
        createdBy: hr._id
      });
    }
    console.log(`✅ Created ${interviewData.length} interview rounds`);

    console.log('\n🎉 Seed data complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('HR Login:       hr@hireflow.com / admin123');
    console.log('Employee Login: recruiter@hireflow.com / recruit123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seed();
