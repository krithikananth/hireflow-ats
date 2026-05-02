const https = require('https');

/**
 * Calls the Google Gemini API to perform ATS resume scoring.
 * @param {object} params
 * @returns {Promise<object>} analysis result
 */
async function analyzeResume({ candidateName, resumeText, jobTitle, jobDepartment, jobDescription }) {
  // Truncate resume text to avoid exceeding API limits (keep first 8000 chars)
  const trimmedResume = resumeText ? resumeText.substring(0, 8000) : '';

  const prompt = `You are an expert ATS (Applicant Tracking System) resume evaluator.

Candidate: ${candidateName}
Applying for: ${jobTitle} (${jobDepartment} department)
Job description: ${jobDescription || 'Not provided'}
Resume content: 
${trimmedResume || 'Not provided'}

${trimmedResume
  ? 'Resume content is provided above. Evaluate the candidate fit for this role based on all available information.'
  : 'No resume was provided. Do a basic fit evaluation based on the job requirements.'}

Respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{
  "overallScore": <number 0-10>,
  "skillsMatch": <number 0-10>,
  "experienceMatch": <number 0-10>,
  "presentationScore": <number 0-10>,
  "overallSummary": "<2-3 sentence summary of candidate fit>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "recommendation": "<one clear hiring recommendation>"
}

Scoring: 8-10 excellent, 6-7 good, 4-5 partial, 0-3 poor. Output only JSON.`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  console.log(`🔄 Calling Gemini API for candidate: ${candidateName} (resume length: ${trimmedResume.length} chars)`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          console.log(`📡 Gemini API response status: ${res.statusCode}`);
          if (res.statusCode !== 200) {
            console.error(`❌ Gemini API HTTP error ${res.statusCode}:`, data.substring(0, 500));
            return reject(new Error(`Gemini API returned HTTP ${res.statusCode}`));
          }
          const parsed = JSON.parse(data);
          if (parsed.error) {
            console.error('❌ Gemini API error:', parsed.error.message);
            return reject(new Error(parsed.error.message || 'Gemini API error'));
          }
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!text) {
            console.error('❌ Gemini returned empty text. Full response:', data.substring(0, 500));
            return reject(new Error('Gemini returned empty response'));
          }
          const clean = text.replace(/```json|```/g, '').trim();
          const result = JSON.parse(clean);
          console.log(`✅ Gemini analysis complete — score: ${result.overallScore}/10`);
          resolve(result);
        } catch (e) {
          console.error('❌ Failed to parse Gemini response:', e.message, '| Raw:', data.substring(0, 300));
          reject(new Error('Failed to parse AI response: ' + e.message));
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Gemini request network error:', e.message);
      reject(e);
    });
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Gemini API request timed out after 60s')); });
    req.write(body);
    req.end();
  });
}

module.exports = { analyzeResume };
