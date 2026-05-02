const https = require('https');

/**
 * API Key rotation — cycles through multiple keys to avoid rate limits.
 * Set GEMINI_API_KEY as a comma-separated list of keys in your .env:
 * GEMINI_API_KEY=key1,key2,key3
 */
let keyIndex = 0;

function getNextApiKey() {
  const keys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error('GEMINI_API_KEY is not set in environment variables');
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return { key, keyNumber: ((keyIndex - 1) % keys.length) + 1, totalKeys: keys.length };
}

/**
 * Makes a single Gemini API call. Returns status + data.
 */
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

    req.on('error', (e) => {
      console.error('❌ Gemini request network error:', e.message);
      reject(e);
    });
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Gemini API request timed out after 60s')); });
    req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calls the Google Gemini API to perform ATS resume scoring.
 * Rotates through multiple API keys and retries on 429 rate limit errors.
 * @param {object} params
 * @returns {Promise<object>} analysis result
 */
async function analyzeResume({ candidateName, resumeText, jobTitle, jobDepartment, jobDescription }) {
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

  console.log(`🔄 ATS check for: ${candidateName} (resume: ${trimmedResume.length} chars)`);

  // Try each API key, then retry with backoff
  const totalKeys = (process.env.GEMINI_API_KEY || '').split(',').filter(k => k.trim()).length;
  const MAX_ATTEMPTS = Math.max(totalKeys * 2, 4); // At least 4 attempts, or 2x the number of keys

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { key, keyNumber, totalKeys: total } = getNextApiKey();
    const { statusCode, data } = await callGemini(body, key);
    console.log(`📡 Gemini status: ${statusCode} (key ${keyNumber}/${total}, attempt ${attempt}/${MAX_ATTEMPTS})`);

    if (statusCode === 429) {
      if (attempt < MAX_ATTEMPTS) {
        // If we have more keys, try the next one immediately; otherwise wait
        if (attempt % total !== 0) {
          console.log(`⏳ Key ${keyNumber} rate limited. Trying next key...`);
          await sleep(1000); // brief pause before trying next key
        } else {
          const delay = 15000; // wait 15s after cycling through all keys
          console.log(`⏳ All keys rate limited. Waiting ${delay / 1000}s before retry cycle...`);
          await sleep(delay);
        }
        continue;
      } else {
        console.error('❌ All API keys exhausted after max retries');
        throw new Error('Gemini API rate limit exceeded on all keys. Please try again in a few minutes.');
      }
    }

    if (statusCode !== 200) {
      console.error(`❌ Gemini HTTP ${statusCode}:`, data.substring(0, 500));
      throw new Error(`Gemini API returned HTTP ${statusCode}`);
    }

    // Parse successful response
    try {
      const parsed = JSON.parse(data);
      if (parsed.error) {
        console.error('❌ Gemini API error:', parsed.error.message);
        throw new Error(parsed.error.message || 'Gemini API error');
      }
      const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) {
        console.error('❌ Empty response from Gemini:', data.substring(0, 500));
        throw new Error('Gemini returned empty response');
      }
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);
      console.log(`✅ ATS score for ${candidateName}: ${result.overallScore}/10 (key ${keyNumber})`);
      return result;
    } catch (e) {
      console.error('❌ Parse error:', e.message, '| Raw:', data.substring(0, 300));
      throw new Error('Failed to parse AI response: ' + e.message);
    }
  }
}

module.exports = { analyzeResume };
