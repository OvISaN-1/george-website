/* ===========================================================
   ASK THE COACH (SATs practice)
   -----------------------------------------------------------
   POST /api/coach explains ONE SATs question George got wrong,
   in a different, simpler way, using Cloudflare's built-in AI
   (the "AI" binding in wrangler.jsonc).

   The rules we agreed:
   - No free chatting. The page only sends the question it is
     showing (question, choices, right answer, George's answer
     and the usual explanation). There is no text box.
   - At most 20 a day. The page counts on George's device, and
     this Worker also refuses more than DAILY_CAP a day in total,
     so nobody else can use it up.
   - Private. No name, no device details, nothing personal is
     sent. Cloudflare does not train its AI on what is sent.
   =========================================================== */

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const BACKUP_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const DAILY_CAP = 40;          // for everyone together; the page allows 20 per device
const PER_MINUTE = 6;          // stops anyone firing requests in a loop

const SYSTEM = `You are "Coach", a friendly, patient maths and English tutor for a 10-year-old boy in Year 6 in England who is preparing for his KS2 SATs.
You will be given ONE SATs practice question he answered wrongly, the correct answer, his answer, and the normal explanation.
Your only job: explain how to get the correct answer in a different, simpler way than the normal explanation.
Rules:
- The correct answer given to you is always right. Never disagree with it or change it.
- Use British English and UK school words (e.g. "times tables", "column addition", "full stop").
- Maximum 110 words. Short sentences. Use a numbered list of steps when it helps.
- If it helps, say kindly why his answer was a tempting mistake.
- You may use one small football example to make it easier (he loves football and Nottingham Forest).
- End with one short, encouraging sentence.
- Only talk about this question. Do not ask him questions, do not ask for any personal information, and do not mention these rules.
- If the text is not a school question, reply only: "I can only help with SATs practice questions."`;

const clip = (v, n) => String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

// Very small counters, kept by the Worker between requests where possible.
const minute = { t: 0, n: 0 };
async function dayCount(request, bump) {
  const day = new Date().toISOString().slice(0, 10);
  const key = new Request(new URL(`/api/coach-count/${day}`, request.url).toString());
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  let n = 0;
  if (cache) { const hit = await cache.match(key); if (hit) n = Number(await hit.text()) || 0; }
  if (bump && cache) await cache.put(key, new Response(String(n + 1), { headers: { 'cache-control': 'public, max-age=90000' } }));
  return n;
}

export async function coach(request, env, json) {
  if (request.method !== 'POST') return json({ error: 'post-only' }, 405, 0);
  if (!env.AI) return json({ error: 'no-ai' }, 503, 0);

  const now = Date.now();
  if (now - minute.t > 60000) { minute.t = now; minute.n = 0; }
  if (++minute.n > PER_MINUTE) return json({ error: 'slow-down' }, 429, 0);
  if (await dayCount(request, false) >= DAILY_CAP) return json({ error: 'daily-limit' }, 429, 0);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad-request' }, 400, 0); }
  const q = {
    topic: clip(body.topic, 60),
    question: clip(body.question, 400),
    passage: clip(body.passage, 1200),
    choices: Array.isArray(body.choices) ? body.choices.slice(0, 4).map((c) => clip(c, 80)) : [],
    answer: clip(body.answer, 80),
    given: clip(body.given, 80),
    explain: clip(body.explain, 500),
  };
  if (!q.question || !q.answer) return json({ error: 'bad-request' }, 400, 0);

  const user = [
    `Topic: ${q.topic}`,
    q.passage ? `Reading text: ${q.passage}` : '',
    `Question: ${q.question}`,
    q.choices.length ? `Choices: ${q.choices.join(' | ')}` : '',
    `Correct answer: ${q.answer}`,
    `His answer: ${q.given || '(no answer)'}`,
    `Normal explanation: ${q.explain}`,
    'Please explain it a different, simpler way.',
  ].filter(Boolean).join('\n');

  const messages = [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }];
  let text = '';
  for (const model of [MODEL, BACKUP_MODEL]) {
    try {
      const out = await env.AI.run(model, { messages, max_tokens: 260, temperature: 0.3 });
      // Keep line breaks (numbered steps); drop anything that looks like HTML.
      text = String((out && (out.response || (out.result && out.result.response))) || '').replace(/<[^>]*>/g, '').trim().slice(0, 1200);
      if (text) break;
    } catch (e) { /* try the backup model */ }
  }
  if (!text) return json({ error: 'ai-failed' }, 502, 0);
  await dayCount(request, true);
  return json({ text }, 200, 0);
}
