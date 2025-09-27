function categorizeBatch_(emails, rulesText, model, projectId, location, fallback, apiKey) {
  const prompt = buildCategorizePrompt_(rulesText, emails, ['reply_needed','review','todo','summarize'], fallback);
  const payload = { contents: [{ role: 'user', parts: [{ text: prompt }]}] };

  if (PropertiesService.getScriptProperties().getProperty('DEBUG') === 'true') {
    console.log(JSON.stringify({
      promptSent: {
        promptLength: prompt.length,
        emailCount: emails.length,
        model: model,
        fallback: fallback,
        promptPreview: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : '')
      }
    }, null, 2));
  }

  // If API key is present, use Generative Language API (AI Studio) endpoint; else use Vertex OAuth.
  const useApiKey = !!apiKey;
  const url = useApiKey
    ? ('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey))
    : ('https://' + location + '-aiplatform.googleapis.com/v1/projects/' + encodeURIComponent(projectId) + '/locations/' + encodeURIComponent(location) + '/publishers/google/models/' + encodeURIComponent(model) + ':generateContent');
  const headers = useApiKey ? {} : { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
  const opts = {
    method: 'post',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const parseOut = function(txt) {
    try {
      const first = extractFirstJson_(txt);
      return first && Array.isArray(first.emails) ? first.emails : null;
    } catch (e) { return null; }
  };

  let res = UrlFetchApp.fetch(url, opts);
  let json = {};
  try { json = JSON.parse(res.getContentText()); } catch (e) { json = {}; }
  if (PropertiesService.getScriptProperties().getProperty('DEBUG') === 'true') {
    console.log(JSON.stringify({ requestChars: prompt.length, httpStatus: res.getResponseCode(), apiMode: useApiKey ? 'apiKey' : 'vertex', raw: json }, null, 2));
  }
  let txt = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text) || '';
  let out = parseOut(txt);

  if (!out) {
    const model2 = model; // optionally escalate
    const url2 = useApiKey
      ? ('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model2) + ':generateContent?key=' + encodeURIComponent(apiKey))
      : ('https://' + location + '-aiplatform.googleapis.com/v1/projects/' + encodeURIComponent(projectId) + '/locations/' + encodeURIComponent(location) + '/publishers/google/models/' + encodeURIComponent(model2) + ':generateContent');
    res = UrlFetchApp.fetch(url2, opts);
    try { json = JSON.parse(res.getContentText()); } catch (e) { json = {}; }
    if (PropertiesService.getScriptProperties().getProperty('DEBUG') === 'true') {
      console.log(JSON.stringify({ retry: true, httpStatus: res.getResponseCode(), raw: json }, null, 2));
    }
    txt = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text) || '';
    out = parseOut(txt);
  }

  if (!out) {
    if (PropertiesService.getScriptProperties().getProperty('DEBUG') === 'true') {
      console.log(JSON.stringify({ parsedEmails: null, reason: 'malformed-json-or-empty' }, null, 2));
    }
    return emails.map(function(e) { return { id: e.id, required_action: null, reason: 'fallback-on-error' }; });
  }
  return out;
}

function extractFirstJson_(txt) {
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) return null;
  return JSON.parse(m[0]);
}

function enforceBudget_(nCalls, dailyLimit) {
  const d = new Date();
  const key = 'BUDGET_' + d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
  const props = PropertiesService.getScriptProperties();
  const cur = parseInt(props.getProperty(key) || '0', 10);
  if (cur + nCalls > dailyLimit) return false;
  props.setProperty(key, String(cur + nCalls));
  return true;
}

/**
 * Phase 3: AI Summarization - Web App Service Extension
 * Added for Interactive Web App Agent
 */

/**
 * Generate consolidated summary of multiple emails using AI service
 * Follows "The Economist's World in Brief" style with bold formatting
 * Returns: { success: boolean, summary: string, error?: string }
 */
function generateConsolidatedSummary_(emailContents, config) {
  try {
    if (!emailContents || emailContents.length === 0) {
      return {
        success: false,
        error: 'No email content provided for summarization'
      };
    }

    // Get configuration
    const cfg = getConfig_();
    const model = cfg.MODEL_PRIMARY;
    const apiKey = cfg.GEMINI_API_KEY;
    const projectId = cfg.PROJECT_ID;
    const location = cfg.LOCATION;

    // Check budget
    if (!enforceBudget_(1, cfg.DAILY_GEMINI_BUDGET)) {
      return {
        success: false,
        error: 'Daily AI budget exceeded. Please try again tomorrow.'
      };
    }

    // Combine all email content for single AI request
    let combinedContent = `EMAILS TO SUMMARIZE (${emailContents.length} total):\n\n`;

    for (let i = 0; i < emailContents.length; i++) {
      const email = emailContents[i];
      combinedContent += `--- EMAIL ${i + 1} ---\n`;
      combinedContent += `From: ${email.from}\n`;
      combinedContent += `Subject: ${email.subject}\n`;
      combinedContent += `Date: ${email.date}\n`;
      combinedContent += `Content: ${email.body.substring(0, cfg.BODY_CHARS || 1200)}\n\n`;
    }

    // Build web links section if provided
    let webLinksSection = '';
    if (config.includeWebLinks && config.includeWebLinks.length > 0) {
      webLinksSection = '\n\nWEB LINKS FOUND IN EMAILS:\n' + config.includeWebLinks.join('\n');
    }

    // Prepare prompt for consolidated summary in "The Economist's World in Brief" style
    const prompt = `Please create a consolidated summary of these ${emailContents.length} emails in the style of "The Economist's World in Brief" - concise, direct, and informative.

REQUIREMENTS:
1. Create ONE unified summary covering all emails
2. Use **bold formatting** for important terms, people, places, and proper nouns
3. Group related topics together intelligently
4. Keep the tone professional, authoritative, and concise
5. Extract and mention important web URLs from the email content
6. Focus on key insights, decisions, and actionable information
7. Maximum length: 400 words
8. Structure: Brief introduction, then organized by themes/topics
9. Include context that helps understand the significance of information

STYLE NOTES:
- Write like a seasoned journalist summarizing global events
- Be direct and factual, avoid unnecessary adjectives
- Use present tense where appropriate
- Group similar topics under implicit themes
- Prioritize information by importance and urgency

${combinedContent}${webLinksSection}

Please provide only the summary text with **bold** formatting for key terms. Do not include introductory phrases like "Here is a summary" - start directly with the content.`;

    // Prepare API request using existing patterns
    const payload = {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    };

    // Debug logging following existing pattern
    if (cfg.DEBUG) {
      Logger.log(`LLMService.generateConsolidatedSummary_: Processing ${emailContents.length} emails, prompt length: ${prompt.length}`);
    }

    // Choose API endpoint based on available credentials (following existing pattern)
    const useApiKey = !!apiKey;
    const url = useApiKey
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
      : `https://${location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;

    const headers = useApiKey ? {} : { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: headers,
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    // Make API call
    const response = UrlFetchApp.fetch(url, options);
    const responseText = response.getContentText();
    let json = {};

    try {
      json = JSON.parse(responseText);
    } catch (parseError) {
      Logger.log('LLM API JSON parse error: ' + parseError.toString());
      return {
        success: false,
        error: 'Failed to parse AI service response'
      };
    }

    if (response.getResponseCode() !== 200) {
      Logger.log('LLM API error: ' + responseText);
      return {
        success: false,
        error: `AI service error: ${response.getResponseCode()}`
      };
    }

    // Extract summary text from response (following existing pattern)
    const summaryText = json.candidates
      && json.candidates[0]
      && json.candidates[0].content
      && json.candidates[0].content.parts
      && json.candidates[0].content.parts[0]
      && json.candidates[0].content.parts[0].text;

    if (!summaryText) {
      return {
        success: false,
        error: 'No summary text received from AI service'
      };
    }

    if (cfg.DEBUG) {
      Logger.log(`LLMService.generateConsolidatedSummary_: Generated ${summaryText.length} characters`);
    }

    return {
      success: true,
      summary: summaryText.trim()
    };

  } catch (error) {
    Logger.log('LLMService.generateConsolidatedSummary_ error: ' + error.toString());
    return {
      success: false,
      error: 'Failed to generate summary: ' + error.toString()
    };
  }
}
