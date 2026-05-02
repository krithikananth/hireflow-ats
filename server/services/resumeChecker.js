/**
 * Local ATS Resume Scorer — no external API needed.
 * Uses keyword matching, skill extraction, and heuristic scoring
 * to evaluate resume fit against job requirements.
 * 
 * Falls back from Gemini API → local scorer automatically.
 */

const https = require('https');

// ─── Common skill keywords by category ─────────────────────────────────────────
const SKILL_CATEGORIES = {
  programming: ['javascript', 'python', 'java', 'c++', 'c#', 'typescript', 'ruby', 'php', 'swift', 'kotlin', 'go', 'rust', 'scala', 'perl', 'r', 'matlab', 'dart', 'lua', 'shell', 'bash', 'powershell', 'sql', 'nosql', 'graphql'],
  frontend: ['react', 'angular', 'vue', 'svelte', 'next.js', 'nextjs', 'nuxt', 'html', 'css', 'sass', 'scss', 'less', 'tailwind', 'bootstrap', 'material ui', 'chakra', 'jquery', 'webpack', 'vite', 'redux', 'zustand', 'responsive design', 'ui/ux', 'figma'],
  backend: ['node.js', 'nodejs', 'express', 'django', 'flask', 'spring', 'spring boot', 'asp.net', '.net', 'rails', 'laravel', 'fastapi', 'nest.js', 'nestjs', 'microservices', 'rest api', 'restful', 'grpc', 'middleware'],
  database: ['mongodb', 'mysql', 'postgresql', 'postgres', 'sqlite', 'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'firebase', 'supabase', 'oracle', 'sql server', 'mariadb', 'neo4j'],
  devops: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'google cloud', 'ci/cd', 'jenkins', 'github actions', 'terraform', 'ansible', 'nginx', 'apache', 'linux', 'devops', 'cloud', 'serverless', 'lambda'],
  data: ['machine learning', 'deep learning', 'data science', 'data analysis', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'nlp', 'computer vision', 'ai', 'artificial intelligence', 'big data', 'spark', 'hadoop', 'tableau', 'power bi', 'data visualization'],
  mobile: ['react native', 'flutter', 'ios', 'android', 'swift', 'kotlin', 'mobile development', 'xamarin', 'ionic'],
  tools: ['git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'slack', 'agile', 'scrum', 'kanban', 'postman', 'swagger', 'vs code', 'intellij'],
  soft: ['leadership', 'communication', 'teamwork', 'problem solving', 'analytical', 'creative', 'management', 'collaboration', 'mentoring', 'presentation', 'critical thinking', 'time management', 'adaptability'],
  design: ['figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'wireframing', 'prototyping', 'user research', 'design thinking', 'accessibility', 'ui design', 'ux design', 'graphic design', 'typography', 'color theory'],
  testing: ['jest', 'mocha', 'cypress', 'selenium', 'junit', 'pytest', 'testing', 'unit testing', 'integration testing', 'qa', 'quality assurance', 'test automation', 'tdd', 'bdd'],
  security: ['cybersecurity', 'penetration testing', 'owasp', 'encryption', 'ssl', 'tls', 'authentication', 'authorization', 'oauth', 'jwt', 'security audit', 'firewall', 'vulnerability']
};

// Experience level keywords
const EXPERIENCE_KEYWORDS = {
  entry: ['intern', 'internship', 'fresher', 'entry level', 'junior', 'trainee', 'graduate', 'student'],
  mid: ['2 years', '3 years', '4 years', '5 years', 'mid level', 'mid-level', 'associate', 'professional'],
  senior: ['senior', 'lead', 'principal', 'architect', 'manager', '6 years', '7 years', '8 years', '9 years', '10 years', '10+ years', 'expert', 'specialist']
};

// Education keywords
const EDUCATION_KEYWORDS = ['bachelor', 'master', 'phd', 'doctorate', 'b.tech', 'b.e', 'm.tech', 'm.e', 'bca', 'mca', 'b.sc', 'm.sc', 'bba', 'mba', 'degree', 'university', 'college', 'diploma', 'certification', 'certified', 'institute'];

/**
 * Extract matching skills from text
 */
function extractSkills(text) {
  const lower = text.toLowerCase();
  const found = {};
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    found[category] = skills.filter(skill => lower.includes(skill));
  }
  return found;
}

/**
 * Calculate keyword overlap between resume and job description
 */
function calculateKeywordOverlap(resumeText, jobText) {
  const resumeWords = new Set(resumeText.toLowerCase().replace(/[^a-z0-9\s.#+]/g, ' ').split(/\s+/).filter(w => w.length > 2));
  const jobWords = jobText.toLowerCase().replace(/[^a-z0-9\s.#+]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const jobUnique = [...new Set(jobWords)];

  if (jobUnique.length === 0) return 0.5;

  const matches = jobUnique.filter(w => resumeWords.has(w));
  return matches.length / jobUnique.length;
}

/**
 * Detect experience level from text
 */
function detectExperience(text) {
  const lower = text.toLowerCase();
  // Try to find years of experience
  const yearMatch = lower.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/);
  if (yearMatch) return parseInt(yearMatch[1]);

  if (EXPERIENCE_KEYWORDS.senior.some(k => lower.includes(k))) return 7;
  if (EXPERIENCE_KEYWORDS.mid.some(k => lower.includes(k))) return 3;
  if (EXPERIENCE_KEYWORDS.entry.some(k => lower.includes(k))) return 1;
  return 0;
}

/**
 * Check for education mentions
 */
function detectEducation(text) {
  const lower = text.toLowerCase();
  return EDUCATION_KEYWORDS.filter(k => lower.includes(k));
}

/**
 * Local ATS scoring — no API needed
 */
function localScoreResume({ candidateName, resumeText, jobTitle, jobDepartment, jobDescription }) {
  const resume = resumeText || '';
  const job = `${jobTitle} ${jobDepartment} ${jobDescription}`;

  // Extract data
  const resumeSkills = extractSkills(resume);
  const jobSkills = extractSkills(job);
  const keywordOverlap = calculateKeywordOverlap(resume, job);
  const resumeExperience = detectExperience(resume);
  const education = detectEducation(resume);

  // Count matched vs required skills
  let matchedSkillCount = 0;
  let requiredSkillCount = 0;
  const matchedSkillsList = [];
  const missingSkillsList = [];

  for (const [category, jobCatSkills] of Object.entries(jobSkills)) {
    for (const skill of jobCatSkills) {
      requiredSkillCount++;
      if (resumeSkills[category]?.includes(skill)) {
        matchedSkillCount++;
        matchedSkillsList.push(skill);
      } else {
        missingSkillsList.push(skill);
      }
    }
  }

  // Count total resume skills (bonus for having extra skills)
  const totalResumeSkills = Object.values(resumeSkills).flat().length;

  // ── Calculate sub-scores ──
  // Skills match (0-10)
  let skillsMatch;
  if (requiredSkillCount === 0) {
    // No specific skills in job description — score based on total resume skills
    skillsMatch = Math.min(totalResumeSkills * 0.8, 10);
  } else {
    skillsMatch = Math.round((matchedSkillCount / requiredSkillCount) * 10);
  }
  // Bonus for having extra relevant skills
  if (totalResumeSkills > matchedSkillCount) {
    skillsMatch = Math.min(skillsMatch + 1, 10);
  }

  // Experience match (0-10)
  let experienceMatch;
  if (resumeExperience >= 5) experienceMatch = 9;
  else if (resumeExperience >= 3) experienceMatch = 7;
  else if (resumeExperience >= 1) experienceMatch = 5;
  else experienceMatch = Math.min(Math.round(keywordOverlap * 6), 6);

  // Presentation score (0-10) — based on resume length, structure, education
  let presentationScore = 4; // base
  if (resume.length > 500) presentationScore += 1;
  if (resume.length > 1000) presentationScore += 1;
  if (resume.length > 2000) presentationScore += 1;
  if (education.length > 0) presentationScore += 1;
  if (education.length > 1) presentationScore += 1;
  if (resume.includes('@') || resume.includes('http') || resume.includes('linkedin')) presentationScore += 1;
  presentationScore = Math.min(presentationScore, 10);

  // Overall score — weighted average
  const overallScore = Math.round((skillsMatch * 0.45 + experienceMatch * 0.35 + presentationScore * 0.20));

  // Build strengths
  const strengths = [];
  if (matchedSkillsList.length > 0) strengths.push(`Relevant skills: ${matchedSkillsList.slice(0, 5).join(', ')}`);
  if (totalResumeSkills > 5) strengths.push(`Strong technical profile with ${totalResumeSkills} identifiable skills`);
  if (resumeExperience >= 3) strengths.push(`${resumeExperience}+ years of experience detected`);
  if (education.length > 0) strengths.push(`Educational background: ${education.slice(0, 3).join(', ')}`);
  if (keywordOverlap > 0.3) strengths.push('Good keyword alignment with job requirements');
  if (strengths.length === 0) strengths.push('Resume submitted for review');

  // Build weaknesses
  const weaknesses = [];
  if (missingSkillsList.length > 0) weaknesses.push(`Missing job skills: ${missingSkillsList.slice(0, 4).join(', ')}`);
  if (resumeExperience < 2) weaknesses.push('Limited work experience mentioned');
  if (resume.length < 500) weaknesses.push('Resume is brief — lacks detail');
  if (education.length === 0) weaknesses.push('No educational qualifications detected');
  if (keywordOverlap < 0.2) weaknesses.push('Low keyword match with job description');
  if (weaknesses.length === 0) weaknesses.push('No major gaps identified');

  // Recommendation
  let recommendation;
  if (overallScore >= 8) recommendation = 'Strongly recommended — excellent fit for this role. Proceed to interview.';
  else if (overallScore >= 6) recommendation = 'Good candidate — worth considering for an interview round.';
  else if (overallScore >= 4) recommendation = 'Partial fit — may need additional screening or skill assessment.';
  else recommendation = 'Weak match — consider other candidates or request a more detailed resume.';

  const overallSummary = `${candidateName}'s resume was evaluated against the ${jobTitle} position in ${jobDepartment}. ` +
    `The candidate shows ${matchedSkillCount} matching skill(s) out of ${requiredSkillCount || 'unspecified'} required, ` +
    `with ${totalResumeSkills} total technical skills identified. ` +
    (resumeExperience > 0 ? `Approximately ${resumeExperience} year(s) of experience detected.` : 'Experience level could not be determined from the resume.');

  return {
    overallScore,
    skillsMatch,
    experienceMatch,
    presentationScore,
    overallSummary,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 3),
    recommendation
  };
}

// ─── Gemini API caller (optional, used as first attempt) ──────────────────────
let keyIndex = 0;

function getNextApiKey() {
  const keys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) return null;
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return { key, keyNumber: ((keyIndex - 1) % keys.length) + 1, totalKeys: keys.length };
}

function callGemini(body, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function tryGeminiAPI({ candidateName, resumeText, jobTitle, jobDepartment, jobDescription }) {
  const trimmed = resumeText ? resumeText.substring(0, 8000) : '';
  const prompt = `You are an expert ATS resume evaluator.
Candidate: ${candidateName}
Applying for: ${jobTitle} (${jobDepartment})
Job description: ${jobDescription || 'Not provided'}
Resume: ${trimmed || 'Not provided'}
Respond ONLY with JSON: {"overallScore":<0-10>,"skillsMatch":<0-10>,"experienceMatch":<0-10>,"presentationScore":<0-10>,"overallSummary":"<summary>","strengths":["<s1>","<s2>","<s3>"],"weaknesses":["<w1>","<w2>"],"recommendation":"<rec>"}
Scoring: 8-10 excellent, 6-7 good, 4-5 partial, 0-3 poor.`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  const totalKeys = (process.env.GEMINI_API_KEY || '').split(',').filter(k => k.trim()).length;
  const maxAttempts = Math.max(totalKeys, 2);

  for (let i = 0; i < maxAttempts; i++) {
    const keyInfo = getNextApiKey();
    if (!keyInfo) return null;
    try {
      const { statusCode, data } = await callGemini(body, keyInfo.key);
      if (statusCode === 429) {
        console.log(`⏳ Gemini key ${keyInfo.keyNumber} rate limited, trying next...`);
        await sleep(1000);
        continue;
      }
      if (statusCode !== 200) return null;
      const parsed = JSON.parse(data);
      if (parsed.error) return null;
      const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) return null;
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch { continue; }
  }
  return null;
}

// ─── Main export: tries Gemini first, falls back to local scorer ──────────────
async function analyzeResume(params) {
  console.log(`🔄 ATS check for: ${params.candidateName}`);

  // Try Gemini API first (if keys are configured)
  if (process.env.GEMINI_API_KEY) {
    try {
      const geminiResult = await tryGeminiAPI(params);
      if (geminiResult && geminiResult.overallScore !== undefined) {
        console.log(`✅ Gemini AI score: ${geminiResult.overallScore}/10`);
        return geminiResult;
      }
    } catch (err) {
      console.log(`⚠️ Gemini unavailable: ${err.message}`);
    }
  }

  // Fallback: local keyword-based scoring (always works, always free)
  console.log(`📊 Using local ATS scorer for: ${params.candidateName}`);
  const localResult = localScoreResume(params);
  console.log(`✅ Local ATS score: ${localResult.overallScore}/10`);
  return localResult;
}

module.exports = { analyzeResume };
