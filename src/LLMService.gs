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
