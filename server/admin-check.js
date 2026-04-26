const dns = require('dns');
dns.setServers(['8.8.8.8']);
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI, { family: 4 }).then(async () => {
  const users = await User.find({}).select('name email role companyId lastActive createdAt');
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  HireFlow ATS — All Registered Users');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`  Total Users: ${users.length}`);
  console.log(`  HR Users:    ${users.filter(u => u.role === 'HR').length}`);
  console.log(`  Employees:   ${users.filter(u => u.role === 'Employee').length}`);
  console.log('\n───────────────────────────────────────────────────────────────');
  
  users.forEach((u, i) => {
    const now = new Date();
    const isOnline = u.lastActive && (now - u.lastActive) < 5 * 60 * 1000;
    const lastActive = u.lastActive ? u.lastActive.toLocaleString() : 'Never';
    const joined = u.createdAt ? u.createdAt.toLocaleString() : 'Unknown';
    
    console.log(`\n  ${i + 1}. ${u.name}`);
    console.log(`     Email:       ${u.email}`);
    console.log(`     Role:        ${u.role}`);
    console.log(`     Company ID:  ${u.companyId}`);
    console.log(`     Status:      ${isOnline ? '🟢 Online' : '⚫ Offline'}`);
    console.log(`     Last Active: ${lastActive}`);
    console.log(`     Joined:      ${joined}`);
  });
  
  console.log('\n═══════════════════════════════════════════════════════════════\n');
  process.exit(0);
});
