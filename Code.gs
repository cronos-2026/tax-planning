/**
 * GAS web app backend for the tax-planning GitHub Pages site.
 * Configure Script Properties before deployment. See ../GAS-DEPLOY.md.
 */
const CONFIG = Object.freeze({
  OWNER: 'cronos-2026',
  REPO: 'tax-planning',
  BRANCH: 'main',
  CONFIG_PATH: 'tax-config.json',
  AUDIT_PATH: 'admin-login-log.json',
  SESSION_TTL: 1800,
  RESULT_TTL: 120,
  MAX_BODY: 45000
});

function doGet(e) {
  const p = (e && e.parameter) || {};
  const callback = String(p.callback || '');
  if (!/^cb_[a-zA-Z0-9_]{1,60}$/.test(callback)) return ContentService.createTextOutput('/* invalid callback */');
  const result = takeResult_(String(p.requestId || ''));
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  const requestId = String(p.requestId || '');
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(requestId)) return ContentService.createTextOutput('bad request');
  let result;
  try {
    const body = String(p.payload || '');
    if (body.length > CONFIG.MAX_BODY) throw new Error('請求內容過大');
    const data = body ? JSON.parse(body) : {};
    result = route_(String(p.action || ''), data);
  } catch (err) {
    result = { ok: false, error: safeMessage_(err) };
  }
  CacheService.getScriptCache().put('result:' + requestId, JSON.stringify(result), CONFIG.RESULT_TTL);
  return ContentService.createTextOutput('accepted');
}

function route_(action, data) {
  if (action === 'login') return login_(data);
  if (action === 'publicConfig') return { ok: true, config: githubRead_(CONFIG.CONFIG_PATH).json };
  const session = requireSession_(data.session);
  if (action === 'check') {
    const current = githubRead_(CONFIG.CONFIG_PATH);
    return { ok: true, version: current.json.siteVersion || '', config: current.json };
  }
  if (action === 'saveConfig') {
    validateConfig_(data.config);
    const current = githubRead_(CONFIG.CONFIG_PATH);
    const version = String(data.config.siteVersion || '');
    githubWrite_(CONFIG.CONFIG_PATH, data.config, current.sha, 'Update tax config ' + version);
    return { ok: true, version: version, savedBy: session.account };
  }
  if (action === 'syncAudit') {
    const logs = Array.isArray(data.logs) ? data.logs.slice(-2000) : [];
    const current = githubRead_(CONFIG.AUDIT_PATH, true);
    const merged = mergeLogs_(current.json && current.json.logs || [], logs, data.deletedIds || []);
    githubWrite_(CONFIG.AUDIT_PATH, { schemaVersion: 1, updatedAt: new Date().toISOString(), logs: merged }, current.sha,
      'Update admin login audit');
    return { ok: true, count: merged.length };
  }
  throw new Error('不支援的操作');
}

function login_(data) {
  const props = PropertiesService.getScriptProperties();
  const user = String(data.account || '').trim();
  const pass = String(data.password || '');
  const accounts = [
    { username: props.getProperty('ADMIN_USERNAME'), password: props.getProperty('ADMIN_PASSWORD'), role: 'primary' },
    { username: props.getProperty('SECONDARY_ADMIN_USERNAME'), password: props.getProperty('SECONDARY_ADMIN_PASSWORD'), role: 'secondary' }
  ].filter(function (item) { return item.username && item.password; });
  if (!accounts.length) throw new Error('後端尚未完成管理員設定');
  const matched = accounts.find(function (item) {
    return user === item.username && constantTimeEqual_(pass, item.password);
  });
  if (!matched) {
    throw new Error('帳號或密碼錯誤');
  }
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('session:' + token, JSON.stringify({ account: user, role: matched.role }), CONFIG.SESSION_TTL);
  return { ok: true, token: token, role: matched.role, expiresIn: CONFIG.SESSION_TTL };
}

function requireSession_(token) {
  if (!token || !/^[a-f0-9-]{60,80}$/i.test(String(token))) throw new Error('登入已逾時，請重新登入');
  const raw = CacheService.getScriptCache().get('session:' + token);
  if (!raw) throw new Error('登入已逾時，請重新登入');
  return JSON.parse(raw);
}

function githubRead_(path, allowMissing) {
  const response = githubRequest_(path, 'get');
  if (response.getResponseCode() === 404 && allowMissing) return { sha: null, json: null };
  const body = parseGithub_(response);
  const bytes = Utilities.base64Decode(String(body.content || '').replace(/\s/g, ''));
  return { sha: body.sha, json: JSON.parse(Utilities.newBlob(bytes).getDataAsString('UTF-8')) };
}

function githubWrite_(path, value, sha, message) {
  const text = JSON.stringify(value, null, 2);
  const payload = { message: message, content: Utilities.base64Encode(text, Utilities.Charset.UTF_8), branch: CONFIG.BRANCH };
  if (sha) payload.sha = sha;
  const response = UrlFetchApp.fetch(githubUrl_(path), {
    method: 'put', contentType: 'application/json', payload: JSON.stringify(payload),
    headers: githubHeaders_(), muteHttpExceptions: true
  });
  parseGithub_(response);
}

function githubRequest_(path, method) {
  return UrlFetchApp.fetch(githubUrl_(path), { method: method, headers: githubHeaders_(), muteHttpExceptions: true });
}
function githubUrl_(path) {
  return 'https://api.github.com/repos/' + CONFIG.OWNER + '/' + CONFIG.REPO + '/contents/' +
    path.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(CONFIG.BRANCH);
}
function githubHeaders_() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('後端尚未設定 GitHub Token');
  return { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token,
    'X-GitHub-Api-Version': '2022-11-28' };
}
function parseGithub_(response) {
  let data;
  try { data = JSON.parse(response.getContentText()); } catch (_) { data = {}; }
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error(data.message || ('GitHub API HTTP ' + response.getResponseCode()));
  }
  return data;
}
function validateConfig_(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('參數格式錯誤');
  const text = JSON.stringify(config);
  if (text.length > CONFIG.MAX_BODY) throw new Error('稅務參數超過大小限制');
  if (!/^\d{4}\.\d{2}\.\d{2}_v\d+$/.test(String(config.siteVersion || ''))) throw new Error('版本格式錯誤');
}
function mergeLogs_(existing, incoming, deletedIds) {
  const deleted = new Set(deletedIds.map(String));
  const map = new Map();
  existing.concat(incoming).forEach(function (item) {
    if (item && item.id && !deleted.has(String(item.id))) map.set(String(item.id), item);
  });
  return Array.from(map.values()).sort(function (a, b) {
    return String(a.loginAt || '').localeCompare(String(b.loginAt || ''));
  }).slice(-2000);
}
function takeResult_(id) {
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(id)) return { ok: false, error: '無效的請求識別碼' };
  const cache = CacheService.getScriptCache();
  const key = 'result:' + id;
  const raw = cache.get(key);
  if (!raw) return { ok: false, pending: true };
  cache.remove(key);
  return JSON.parse(raw);
}
function constantTimeEqual_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function safeMessage_(err) { return String(err && err.message || '伺服器錯誤').slice(0, 240); }
