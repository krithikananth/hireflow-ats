/**
 * Hybrid ATS Resume Scorer
 * 1. Tries Gemini AI first (if keys available and not rate-limited)
 * 2. Falls back to an intelligent local scorer with:
 *    - Name verification (checks if candidate name matches the resume)
 *    - Resume format validation (detects if document is actually a resume)
 *    - Skill matching against job description
 *    - Experience & education extraction
 */

const https = require('https');

// ─── Skill keyword database ────────────────────────────────────────────────────
const SKILL_CATEGORIES = {
  programming: ['javascript', 'python', 'java', 'c++', 'c#', 'typescript', 'ruby', 'php', 'swift', 'kotlin', 'go', 'rust', 'scala', 'perl', 'r lang', 'matlab', 'dart', 'lua', 'shell', 'bash', 'sql', 'nosql', 'graphql'],
  frontend: ['react', 'angular', 'vue', 'svelte', 'next.js', 'nextjs', 'nuxt', 'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap', 'material ui', 'jquery', 'webpack', 'vite', 'redux', 'zustand', 'responsive design', 'figma'],
  backend: ['node.js', 'nodejs', 'express', 'django', 'flask', 'spring', 'spring boot', 'asp.net', '.net', 'rails', 'laravel', 'fastapi', 'nest.js', 'microservices', 'rest api', 'restful', 'grpc'],
  database: ['mongodb', 'mysql', 'postgresql', 'postgres', 'sqlite', 'redis', 'elasticsearch', 'dynamodb', 'firebase', 'supabase', 'oracle', 'sql server', 'mariadb'],
  devops: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'google cloud', 'ci/cd', 'jenkins', 'github actions', 'terraform', 'nginx', 'linux', 'devops', 'serverless'],
  data: ['machine learning', 'deep learning', 'data science', 'data analysis', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'nlp', 'computer vision', 'ai', 'big data', 'spark', 'tableau', 'power bi'],
  mobile: ['react native', 'flutter', 'ios', 'android', 'mobile development', 'xamarin', 'ionic'],
  tools: ['git', 'github', 'gitlab', 'jira', 'agile', 'scrum', 'kanban', 'postman', 'swagger', 'vs code'],
  soft: ['leadership', 'communication', 'teamwork', 'problem solving', 'analytical', 'management', 'collaboration', 'mentoring', 'critical thinking'],
  design: ['figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'wireframing', 'prototyping', 'user research', 'ui design', 'ux design', 'graphic design'],
  testing: ['jest', 'mocha', 'cypress', 'selenium', 'junit', 'pytest', 'unit testing', 'integration testing', 'qa', 'test automation', 'tdd'],
  security: ['cybersecurity', 'penetration testing', 'owasp', 'encryption', 'authentication', 'oauth', 'jwt', 'firewall']
};

// Resume section headers that indicate a real resume
const RESUME_SECTIONS = [
  'experience', 'work experience', 'professional experience', 'employment',
  'education', 'academic', 'qualification',
  'skills', 'technical skills', 'core competencies', 'proficiencies',
  'projects', 'personal projects', 'academic projects',
  'certifications', 'certificates', 'achievements', 'awards',
  'objective', 'summary', 'profile', 'about me',
  'contact', 'references', 'publications', 'interests', 'hobbies',
  'internship', 'training', 'volunteering', 'extracurricular'
];

// ─── Name Verification ─────────────────────────────────────────────────────────
function verifyName(candidateName, resumeText) {
  if (!candidateName || !resumeText) return { found: false, score: 0 };
  
  const resumeLower = resumeText.toLowerCase().trim();
  const nameLower = candidateName.toLowerCase().trim();
  const nameParts = nameLower.split(/\s+/).filter(p => p.length > 1);
  
  // Check full name
  if (resumeLower.includes(nameLower)) {
    return { found: true, score: 10, detail: 'Full name found in resume' };
  }
  
  // Check first 500 chars (name usually appears at the top)
  const topSection = resumeLower.substring(0, 500);
  
  // Check individual name parts in top section
  const partsFoundInTop = nameParts.filter(p => topSection.includes(p));
  if (partsFoundInTop.length === nameParts.length) {
    return { found: true, score: 9, detail: 'All name parts found at top of resume' };
  }
  
  // Check individual name parts anywhere
  const partsFound = nameParts.filter(p => resumeLower.includes(p));
  if (partsFound.length === nameParts.length) {
    return { found: true, score: 7, detail: 'All name parts found in resume (not at top)' };
  }
  
  // Partial match
  if (partsFound.length > 0) {
    const ratio = partsFound.length / nameParts.length;
    return { 
      found: false, 
      score: Math.round(ratio * 5), 
      detail: `Only ${partsFound.length}/${nameParts.length} name parts found — possible name mismatch`
    };
  }
  
  return { found: false, score: 0, detail: 'Candidate name NOT found in resume — likely wrong resume uploaded' };
}

// ─── Resume Format Validator ────────────────────────────────────────────────────
function validateResumeFormat(text) {
  if (!text || text.trim().length < 50) {
    return { isResume: false, score: 0, detail: 'Document is too short to be a resume', sectionsFound: [] };
  }
  
  const lower = text.toLowerCase();
  
  // Check for resume sections
  const sectionsFound = RESUME_SECTIONS.filter(s => {
    // Match section headers (usually standalone or followed by colon/newline)
    const patterns = [
      new RegExp(`\\b${s}\\b`, 'i'),
    ];
    return patterns.some(p => p.test(lower));
  });
  
  // Check for contact info patterns
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const hasPhone = /[\+]?[\d\s\-\(\)]{7,15}/.test(text);
  const hasLinkedIn = /linkedin/i.test(text);
  const hasGitHub = /github/i.test(text);
  
  // Calculate resume confidence
  let confidence = 0;
  confidence += Math.min(sectionsFound.length * 15, 45); // Up to 45 for sections
  confidence += hasEmail ? 15 : 0;
  confidence += hasPhone ? 10 : 0;
  confidence += hasLinkedIn ? 10 : 0;
  confidence += hasGitHub ? 5 : 0;
  confidence += text.length > 500 ? 10 : 0;
  confidence += text.length > 1500 ? 5 : 0;
  
  const isResume = confidence >= 30;
  const score = Math.min(Math.round(confidence / 10), 10);
  
  let detail;
  if (confidence >= 60) detail = 'Document is clearly a professional resume';
  else if (confidence >= 30) detail = 'Document appears to be a resume';
  else detail = 'Document may NOT be a proper resume — missing standard sections';
  
  return { isResume, score, detail, sectionsFound, hasEmail, hasPhone, hasLinkedIn };
}

// ─── Skill Extraction & Matching ────────────────────────────────────────────────
function extractSkills(text) {
  const lower = text.toLowerCase();
  const found = {};
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    found[category] = skills.filter(skill => {
      // Use word boundary matching for short skill names to avoid false positives
      if (skill.length <= 3) {
        return new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
      }
      return lower.includes(skill);
    });
  }
  return found;
}

function matchSkills(resumeSkills, jobSkills) {
  const matched = [];
  const missing = [];
  let required = 0;
  
  for (const [category, jobCatSkills] of Object.entries(jobSkills)) {
    for (const skill of jobCatSkills) {
      required++;
      if (resumeSkills[category]?.includes(skill)) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    }
  }
  
  return { matched, missing, required };
}

// ─── Experience Detection ───────────────────────────────────────────────────────
function detectExperience(text) {
  const lower = text.toLowerCase();
  const results = { years: 0, level: 'unknown', details: [] };
  
  // Find explicit "X years of experience"
  const yearPatterns = [
    /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp|work)/gi,
    /(?:experience|exp)\s*(?:of\s*)?(\d+)\+?\s*(?:years?|yrs?)/gi,
    /(\d+)\+?\s*(?:years?|yrs?)\s*(?:in\s)/gi
  ];
  
  for (const pattern of yearPatterns) {
    const matches = [...lower.matchAll(pattern)];
    for (const m of matches) {
      const years = parseInt(m[1]);
      if (years > 0 && years < 50) {
        results.years = Math.max(results.years, years);
        results.details.push(`${years}+ years mentioned`);
      }
    }
  }
  
  // Count job/company entries (each is roughly 1-3 years)
  const companyIndicators = ['company', 'corporation', 'inc.', 'ltd.', 'pvt.', 'technologies', 'solutions', 'services'];
  const roleIndicators = ['developer', 'engineer', 'designer', 'analyst', 'manager', 'lead', 'intern', 'associate', 'consultant', 'specialist'];
  const roleCount = roleIndicators.filter(r => lower.includes(r)).length;
  
  // Date range detection (2020 - 2023, etc.)
  const dateRanges = lower.match(/20\d{2}\s*[-–—to]+\s*(?:20\d{2}|present|current|now)/gi);
  if (dateRanges) {
    results.details.push(`${dateRanges.length} work period(s) detected`);
    if (results.years === 0) results.years = Math.min(dateRanges.length * 2, 10);
  }
  
  // Determine level
  if (results.years >= 8 || lower.includes('principal') || lower.includes('architect')) results.level = 'expert';
  else if (results.years >= 5 || lower.includes('senior') || lower.includes('lead')) results.level = 'senior';
  else if (results.years >= 2 || lower.includes('mid') || roleCount >= 2) results.level = 'mid';
  else if (results.years >= 1 || lower.includes('junior') || lower.includes('intern')) results.level = 'entry';
  
  return results;
}

// ─── Education Detection ────────────────────────────────────────────────────────
function detectEducation(text) {
  const lower = text.toLowerCase();
  const degrees = [];
  
  const degreePatterns = [
    { pattern: /\b(?:ph\.?d|doctorate|doctoral)\b/i, level: 'PhD' },
    { pattern: /\b(?:m\.?tech|m\.?e\.?|m\.?s\.?|m\.?sc|mca|mba|master'?s?)\b/i, level: 'Masters' },
    { pattern: /\b(?:b\.?tech|b\.?e\.?|b\.?s\.?|b\.?sc|bca|bba|bachelor'?s?)\b/i, level: 'Bachelors' },
    { pattern: /\b(?:diploma|polytechnic)\b/i, level: 'Diploma' },
    { pattern: /\b(?:certification|certified|certificate)\b/i, level: 'Certification' },
  ];
  
  for (const { pattern, level } of degreePatterns) {
    if (pattern.test(lower)) degrees.push(level);
  }
  
  // Check for university/college mentions
  const hasInstitution = /\b(?:university|college|institute|school|academy)\b/i.test(lower);
  
  return { degrees, hasInstitution };
}

// ─── LOCAL ATS SCORER ───────────────────────────────────────────────────────────
function localScoreResume({ candidateName, resumeText, jobTitle, jobDepartment, jobDescription }) {
  const resume = resumeText || '';
  const job = `${jobTitle} ${jobDepartment} ${jobDescription}`;
  
  // ── Step 1: Validate resume format ──
  const formatCheck = validateResumeFormat(resume);
  
  // ── Step 2: Verify candidate name ──
  const nameCheck = verifyName(candidateName, resume);
  
  // ── Step 3: Extract & match skills ──
  const resumeSkills = extractSkills(resume);
  const jobSkills = extractSkills(job);
  const { matched, missing, required } = matchSkills(resumeSkills, jobSkills);
  const totalResumeSkills = Object.values(resumeSkills).flat().length;
  
  // ── Step 4: Detect experience ──
  const experience = detectExperience(resume);
  
  // ── Step 5: Detect education ──
  const education = detectEducation(resume);
  
  // ══════════════════════════════════════════════════════════════════════════════
  // SCORING
  // ══════════════════════════════════════════════════════════════════════════════
  
  // If document is not a resume, penalize heavily
  if (!formatCheck.isResume) {
    return {
      overallScore: 1,
      skillsMatch: 0,
      experienceMatch: 0,
      presentationScore: 1,
      overallSummary: `The uploaded document for ${candidateName} does not appear to be a valid resume. It lacks standard resume sections like Experience, Education, and Skills. Please upload a proper resume document.`,
      strengths: ['Document was uploaded and readable'],
      weaknesses: [
        formatCheck.detail,
        'Missing standard resume sections (Experience, Education, Skills)',
        'Cannot properly evaluate candidate without a valid resume'
      ],
      recommendation: 'Request the candidate to upload a proper resume before evaluation.'
    };
  }
  
  // If candidate name not found in resume, flag it
  const nameWarning = !nameCheck.found;
  
  // Skills Match (0-10)
  let skillsMatch;
  if (required === 0) {
    skillsMatch = Math.min(Math.round(totalResumeSkills * 0.6), 8);
  } else {
    skillsMatch = Math.round((matched.length / required) * 10);
    if (totalResumeSkills > matched.length + 3) skillsMatch = Math.min(skillsMatch + 1, 10);
  }
  
  // Experience Match (0-10)
  let experienceMatch;
  if (experience.years >= 7) experienceMatch = 9;
  else if (experience.years >= 5) experienceMatch = 8;
  else if (experience.years >= 3) experienceMatch = 7;
  else if (experience.years >= 1) experienceMatch = 5;
  else if (experience.level !== 'unknown') experienceMatch = 4;
  else experienceMatch = 2;
  
  // Presentation Score (0-10)
  let presentationScore = formatCheck.score;
  
  // Overall Score — weighted
  let overallScore = Math.round(
    skillsMatch * 0.40 +
    experienceMatch * 0.30 +
    presentationScore * 0.15 +
    nameCheck.score * 0.15
  );
  
  // Apply name mismatch penalty
  if (nameWarning) {
    overallScore = Math.max(overallScore - 2, 1);
  }
  
  overallScore = Math.min(Math.max(overallScore, 0), 10);
  
  // ── Build Strengths ──
  const strengths = [];
  if (nameCheck.found) strengths.push(`Resume belongs to ${candidateName} — name verified`);
  if (matched.length > 0) strengths.push(`Matching skills: ${matched.slice(0, 6).join(', ')}`);
  if (totalResumeSkills >= 8) strengths.push(`Strong technical profile — ${totalResumeSkills} skills identified`);
  else if (totalResumeSkills >= 4) strengths.push(`Decent skill set — ${totalResumeSkills} skills identified`);
  if (experience.years >= 2) strengths.push(`${experience.years}+ years of professional experience`);
  if (education.degrees.length > 0) strengths.push(`Education: ${education.degrees.join(', ')}`);
  if (formatCheck.sectionsFound.length >= 4) strengths.push('Well-structured resume with clear sections');
  if (strengths.length === 0) strengths.push('Resume was submitted and processed');
  
  // ── Build Weaknesses ──
  const weaknesses = [];
  if (nameWarning) weaknesses.push(`⚠️ ${nameCheck.detail}`);
  if (missing.length > 0) weaknesses.push(`Missing job requirements: ${missing.slice(0, 5).join(', ')}`);
  if (experience.years < 2 && experience.level === 'unknown') weaknesses.push('Limited or unclear work experience');
  if (education.degrees.length === 0) weaknesses.push('No formal education/degree detected');
  if (totalResumeSkills < 4) weaknesses.push('Few technical skills identified in resume');
  if (resume.length < 300) weaknesses.push('Resume appears very brief — may lack important details');
  if (weaknesses.length === 0) weaknesses.push('No significant gaps identified');
  
  // ── Recommendation ──
  let recommendation;
  if (nameWarning) {
    recommendation = `⚠️ Name mismatch detected. The name "${candidateName}" was not found in the uploaded resume. Please verify the correct resume was uploaded before proceeding.`;
  } else if (overallScore >= 8) {
    recommendation = 'Excellent candidate match — strongly recommend proceeding to interview.';
  } else if (overallScore >= 6) {
    recommendation = 'Good candidate — consider scheduling an initial screening call.';
  } else if (overallScore >= 4) {
    recommendation = 'Partial fit — may benefit from a skill assessment or phone screening.';
  } else {
    recommendation = 'Weak match for this role — consider other candidates or request additional information.';
  }
  
  // ── Summary ──
  const overallSummary = [
    `${candidateName}'s resume was analyzed for the ${jobTitle} position (${jobDepartment}).`,
    nameCheck.found
      ? `Name verified in resume.`
      : `⚠️ WARNING: Candidate name was NOT found in the uploaded resume.`,
    `Found ${matched.length}/${required || '?'} required skills and ${totalResumeSkills} total skills.`,
    experience.years > 0
      ? `${experience.years} year(s) of experience detected (${experience.level} level).`
      : `Experience level could not be determined.`,
    education.degrees.length > 0
      ? `Education: ${education.degrees.join(', ')}.`
      : `No formal education detected.`,
    `Resume format: ${formatCheck.detail}.`
  ].join(' ');
  
  return {
    overallScore,
    skillsMatch,
    experienceMatch,
    presentationScore,
    overallSummary,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    recommendation
  };
}

// ─── Gemini API (optional, first priority) ──────────────────────────────────────
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
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
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
Candidate name: ${candidateName}
Applying for: ${jobTitle} (${jobDepartment})
Job description: ${jobDescription || 'Not provided'}
Resume content: ${trimmed || 'Not provided'}

IMPORTANT RULES:
1. Check if the candidate name "${candidateName}" appears in the resume. If NOT found, score should be low and flag it.
2. Verify the document is actually a resume (has sections like Experience, Skills, Education).
3. Score based on how well the resume matches the job requirements.

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
      if (statusCode === 429) { await sleep(1000); continue; }
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

// ─── Main Export ────────────────────────────────────────────────────────────────
async function analyzeResume(params) {
  console.log(`🔄 ATS check for: ${params.candidateName}`);

  // Try Gemini first
  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await tryGeminiAPI(params);
      if (result && result.overallScore !== undefined) {
        console.log(`✅ Gemini AI score: ${result.overallScore}/10`);
        return result;
      }
      console.log(`⚠️ Gemini unavailable — using local scorer`);
    } catch (err) {
      console.log(`⚠️ Gemini error: ${err.message} — using local scorer`);
    }
  }

  // Fallback: local scorer (always works)
  const result = localScoreResume(params);
  console.log(`✅ Local ATS score: ${result.overallScore}/10 (name verified: ${result.strengths[0]?.includes('verified') || false})`);
  return result;
}

module.exports = { analyzeResume };
