// ── FORGE — MORNING BRIEFING + EMAIL PANEL ────────────────────────────────────
// Connects Gmail + Google Calendar + your training data.
// Renders: AI briefing paragraph, highlighted important emails, 10 recent emails.

// ── EMAIL IMPORTANCE SCORING ──────────────────────────────────────────────────
// Returns 0–100. Anything >= 60 gets flagged as important.

function scoreEmailImportance(email) {
  let score = 0;
  const subject = (email.subject || '').toLowerCase();
  const sender  = (email.sender  || '').toLowerCase();

  // High-signal subject keywords
  const urgentKeywords = ['urgent', 'action required', 'important', 'deadline', 'asap',
    'respond', 'response needed', 'time sensitive', 'follow up', 'follow-up',
    'reminder', 'overdue', 'expir', 'confirm', 'verification', 'invoice',
    'payment', 'outstanding', 'final notice', 'offer', 'interview',
    'placement', 'internship', 'accepted', 'rejected', 'result', 'grade',
    'mark', 'assessment', 'submission', 'exam', 'results'];

  urgentKeywords.forEach(kw => {
    if (subject.includes(kw)) score += 20;
  });

  // University / placement senders (common patterns)
  const importantSenders = ['.ac.uk', 'university', 'college', 'placement',
    'careers', 'hr@', 'recruiting', 'noreply@accounts', 'linkedin',
    'gov.uk', 'hmrc', 'student finance', 'student loan'];

  importantSenders.forEach(s => {
    if (sender.includes(s)) score += 15;
  });

  // Marketing / noise signals — reduce score
  const noiseKeywords = ['unsubscribe', 'newsletter', 'sale', 'offer expires',
    'discount', 'promo', '%off', 'deal', 'black friday', 'flash sale',
    'noreply@', 'no-reply@', 'donotreply'];

  noiseKeywords.forEach(kw => {
    if (subject.includes(kw) || sender.includes(kw)) score -= 25;
  });

  return Math.max(0, Math.min(100, score));
}

function classifyEmail(email) {
  const score = scoreEmailImportance(email);
  if (score >= 60) return { tier: 'high',   label: 'Important', color: 'var(--amber)' };
  if (score >= 30) return { tier: 'medium', label: 'Notable',   color: 'var(--cyan)'  };
  return                  { tier: 'low',    label: '',           color: 'var(--text3)' };
}

// ── GMAIL FETCH ───────────────────────────────────────────────────────────────

async function fetchGmailMessages(maxResults = 10) {
  const token = gToken;
  if (!token) return { error: 'noauth' };

  try {
    // Fetch recent messages (unread + read, last ~2 days)
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.status === 403) return { error: 'scope' };
    if (res.status === 401) return { error: 'noauth' };
    if (!res.ok) return { error: 'fetch' };

    const listData = await res.json();
    const messages = listData.messages || [];
    if (!messages.length) return { emails: [] };

    // Fetch metadata for each message (subject, from, date, unread label)
    const details = await Promise.all(
      messages.map(async msg => {
        try {
          const r = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!r.ok) return null;
          const d = await r.json();
          const headers  = d.payload?.headers || [];
          const subject  = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
          const from     = headers.find(h => h.name === 'From')?.value || '';
          const dateHdr  = headers.find(h => h.name === 'Date')?.value || '';
          const isUnread = (d.labelIds || []).includes('UNREAD');

          // Parse sender display name
          const senderMatch = from.match(/^"?([^"<]+)"?\s*<?/);
          const sender = senderMatch ? senderMatch[1].trim() : from.replace(/<[^>]+>/, '').trim();

          // Parse date to relative string
          const msgDate = dateHdr ? new Date(dateHdr) : null;
          const relDate = msgDate ? relativeTime(msgDate) : '';

          return {
            id: msg.id,
            subject: subject.slice(0, 90),
            sender:  sender.slice(0, 50),
            relDate,
            isUnread,
            raw: { subject, sender: from }
          };
        } catch { return null; }
      })
    );

    return { emails: details.filter(Boolean) };
  } catch(e) {
    return { error: 'network' };
  }
}

function relativeTime(date) {
  const now   = new Date();
  const diffMs = now - date;
  const diffM  = Math.floor(diffMs / 60000);
  const diffH  = Math.floor(diffMs / 3600000);
  const diffD  = Math.floor(diffMs / 86400000);
  if (diffM < 1)  return 'just now';
  if (diffM < 60) return `${diffM}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7)  return `${diffD}d ago`;
  return date.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}

// ── CALENDAR FETCH FOR BRIEFING ───────────────────────────────────────────────

async function fetchTodayCalendarForBriefing() {
  const token = gToken;
  if (!token) return [];
  try {
    const now = new Date();
    const end = new Date(now); end.setHours(23,59,59);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now.toISOString())}&timeMax=${encodeURIComponent(end.toISOString())}&singleEvents=true&orderBy=startTime&maxResults=8`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(ev => {
      const start = ev.start?.dateTime
        ? new Date(ev.start.dateTime).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
        : 'All day';
      return `${start} — ${ev.summary || 'Untitled'}`;
    });
  } catch { return []; }
}

// ── BUILD AI BRIEFING PROMPT ──────────────────────────────────────────────────

function buildBriefingPrompt({ session, weather, recovery, nutrition, weekStats, calendarEvents, importantEmails }) {
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayName  = dayNames[new Date().getDay()];

  const recText = recovery
    ? `${recovery.sleep || '?'}h sleep, Fitbit recovery score ${recovery.fitbit || 'not logged'}`
    : 'Not logged yet';

  const nutText = nutrition
    ? `${nutrition.kcal} kcal, ${nutrition.protein}g protein (yesterday)`
    : 'No nutrition logged yesterday';

  const calText = calendarEvents.length
    ? calendarEvents.join('\n')
    : 'No events today';

  const emailText = importantEmails.length
    ? importantEmails.map(e => `• [${e.classification.label || 'Email'}] "${e.subject}" from ${e.sender}`).join('\n')
    : 'No flagged emails';

  return `You are FORGE, a no-nonsense performance AI for an athlete named Callum (6'3", lean bulk, 80kg → 90kg goal).

Today is ${dayName}. Write Callum a sharp morning briefing. 3–4 sentences MAX. Tone: direct mentor, not a hype man. Surface only what matters. If any flagged emails are time-sensitive, weave them in concisely. End with one specific action for today tied to training, nutrition, or an urgent email.

--- SESSION ---
${session.label}${session.focus ? ` (${session.focus} focus)` : ''} · ${session.type}
Week: ${weekStats.sessionsHit}/${weekStats.totalTrainDays} sessions · ${weekStats.streak}-day streak

--- RECOVERY ---
${recText}

--- NUTRITION (yesterday) ---
${nutText} · Target: 3,100 kcal / 165g protein

--- WEATHER (Leeds) ---
${weather || 'Not available'}

--- CALENDAR ---
${calText}

--- FLAGGED EMAILS ---
${emailText}

Start directly. No preamble.`;
}

// ── CALL CLAUDE ───────────────────────────────────────────────────────────────

async function generateBriefingText(prompt) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.find(b => b.type === 'text')?.text || null;
  } catch { return null; }
}

// ── RENDER EMAIL PANEL ────────────────────────────────────────────────────────

function renderEmailPanel(emailResult) {
  const panel = document.getElementById('emailPanelContent');
  if (!panel) return;

  if (emailResult.error === 'scope' || emailResult.error === 'noauth') {
    panel.innerHTML = `
      <div class="email-connect-prompt">
        <span>Connect Gmail to see your inbox</span>
        <button class="btn-sm" id="gmailConnectBtnPanel">Connect Gmail</button>
      </div>`;
    document.getElementById('gmailConnectBtnPanel')?.addEventListener('click', connectDrive);
    return;
  }

  if (emailResult.error) {
    panel.innerHTML = `<div class="email-empty">Gmail unavailable — check connection</div>`;
    return;
  }

  const emails = emailResult.emails || [];
  if (!emails.length) {
    panel.innerHTML = `<div class="email-empty">Inbox clear ✓</div>`;
    return;
  }

  panel.innerHTML = emails.map((email, i) => {
    const cls    = classifyEmail(email);
    const isHigh = cls.tier === 'high';
    const isMed  = cls.tier === 'medium';
    return `
      <div class="email-row ${isHigh ? 'email-row--important' : isMed ? 'email-row--notable' : ''}" style="animation-delay:${i * 40}ms">
        <div class="email-row-left">
          ${isHigh ? `<div class="email-importance-dot" style="background:var(--amber)"></div>` : ''}
          ${isMed  ? `<div class="email-importance-dot" style="background:var(--cyan)"></div>` : ''}
          ${!isHigh && !isMed ? `<div class="email-importance-dot" style="background:var(--bg4)"></div>` : ''}
          <div class="email-row-body">
            <div class="email-sender ${email.isUnread ? 'email-sender--unread' : ''}">${escHtml(email.sender)}</div>
            <div class="email-subject ${isHigh ? 'email-subject--important' : ''}">${escHtml(email.subject)}</div>
          </div>
        </div>
        <div class="email-meta">
          ${isHigh ? `<span class="email-badge email-badge--important">Important</span>` : ''}
          ${isMed  ? `<span class="email-badge email-badge--notable">Notable</span>` : ''}
          <span class="email-time">${email.relDate}</span>
        </div>
      </div>`;
  }).join('');
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── RENDER AI BRIEFING TEXT ───────────────────────────────────────────────────

function renderBriefingText(text) {
  const el = document.getElementById('morningBriefingText');
  if (!el) return;
  el.innerHTML = text
    .split('\n')
    .filter(l => l.trim())
    .map((line, i) =>
      `<p class="briefing-line" style="animation-delay:${i * 100}ms">${escHtml(line)}</p>`
    ).join('');
}

function setBriefingLoading() {
  const el = document.getElementById('morningBriefingText');
  if (el) el.innerHTML = `
    <div class="briefing-loading">
      <div class="briefing-loading-dot"></div>
      <div class="briefing-loading-dot"></div>
      <div class="briefing-loading-dot"></div>
      <span class="briefing-loading-label">Generating briefing…</span>
    </div>`;
}

function setEmailLoading() {
  const el = document.getElementById('emailPanelContent');
  if (el) el.innerHTML = `
    <div class="briefing-loading">
      <div class="briefing-loading-dot"></div>
      <div class="briefing-loading-dot"></div>
      <div class="briefing-loading-dot"></div>
      <span class="briefing-loading-label">Loading inbox…</span>
    </div>`;
}

// ── MAIN ENTRY ────────────────────────────────────────────────────────────────

async function renderMorningBriefing() {
  setBriefingLoading();
  setEmailLoading();

  // ── Collect static data ──
  const dow      = new Date().getDay();
  const session  = PLAN[dow];
  const weekStats = getWeeklyStats();
  const recovery  = getTodayRecovery();
  const nutrition = DB.nutrition.find(n => n.date === daysAgo(1));

  const weatherEl = document.getElementById('weatherContent');
  const weather   = weatherEl ? weatherEl.textContent.replace(/\s+/g, ' ').trim() : null;

  // ── Fetch Gmail + Calendar in parallel ──
  const [emailResult, calendarEvents] = await Promise.all([
    fetchGmailMessages(10),
    fetchTodayCalendarForBriefing()
  ]);

  // ── Render email panel immediately (don't wait for AI) ──
  renderEmailPanel(emailResult);

  // ── Work out important emails to feed into prompt ──
  const importantEmails = (emailResult.emails || [])
    .map(e => ({ ...e, classification: classifyEmail(e) }))
    .filter(e => e.classification.tier !== 'low');

  // ── Check briefing cache ──
  const cacheKey = 'forge_briefing_' + today();
  const cached   = localStorage.getItem(cacheKey);

  if (cached) {
    renderBriefingText(cached);
    updateBriefingTime(false);
    return;
  }

  // ── Generate fresh briefing ──
  const prompt = buildBriefingPrompt({
    session, weather, recovery, nutrition, weekStats, calendarEvents, importantEmails
  });

  const briefingText = await generateBriefingText(prompt);

  if (!briefingText) {
    const el = document.getElementById('morningBriefingText');
    if (el) el.innerHTML = `<p style="color:var(--text3);font-size:13px">Briefing unavailable — check connection or API key.</p>`;
    return;
  }

  localStorage.setItem(cacheKey, briefingText);
  renderBriefingText(briefingText);
  updateBriefingTime(true);
}

function updateBriefingTime(fresh) {
  const el = document.getElementById('briefingTimestamp');
  if (!el) return;
  const t = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  el.textContent = t + (fresh ? '' : ' · cached');
}

function refreshBriefing() {
  localStorage.removeItem('forge_briefing_' + today());
  renderMorningBriefing();
}

// ── AUTO-INIT ─────────────────────────────────────────────────────────────────
// Wait 2s after DOMContentLoaded so gToken is populated from Drive auth.

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    renderMorningBriefing();

    document.getElementById('briefingRefreshBtn')
      ?.addEventListener('click', refreshBriefing);
  }, 2000);
});
