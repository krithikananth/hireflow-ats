const https = require('https');

/**
 * Calls the Google Gemini API to perform ATS resume scoring.
 * @param {object} params
 * @returns {Promise<object>} analysis result
 */
async function analyzeResume({ candidateName, resumeText, jobTitle, jobDepartment, jobDescription }) {
  const prompt = `You are an expert ATS (Applicant Tracking System) resume evaluator.

Candidate: ${candidateName}
Applying for: ${jobTitle} (${jobDepartment} department)
Job description: ${jobDescription || 'Not provided'}
Resume content: 
${resumeText || 'Not provided'}

${resumeText
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

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message || 'Gemini API error'));
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const clean = text.replace(/```json|```/g, '').trim();
          resolve(JSON.parse(clean));
        } catch (e) {
          reject(new Error('Failed to parse AI response: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timed out')); });
    req.write(body);
    req.end();
  });
}

module.exports = { analyzeResume };
