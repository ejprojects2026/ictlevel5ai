/* ============================================================
   api/ai.js — E.J.AI backend for VTA ICT L5 Community (Vercel)
   Migrated from netlify/functions/ai.js. Identical API contract:
     POST { message }
       or POST { system, history, max_tokens, temperature }
     -> 200 { reply }   |   400 / 405 { error }
   Reads OPENROUTER_API_KEY from the environment (never exposed
   to the frontend). Same models, prompts, and behaviour as before.
   ============================================================ */
module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // ── Request body parsing ──────────────────────────────────────────────
  // Backward compatible: the original chat sends { message }.
  // The AI Teacher additionally sends { system, history, max_tokens, temperature }.
  // Vercel usually pre-parses JSON bodies; still tolerate a raw string body.
  let message, systemPrompt, history, maxTokens, temperature, requestedModel;
  try {
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body || "{}");
    if (!body || typeof body !== "object") body = {};
    message = body.message;
    systemPrompt = body.system;
    history = body.history;
    maxTokens = body.max_tokens;
    temperature = body.temperature;
    requestedModel = body.model;
    console.log("USER QUESTION:", typeof message === "string" ? message : "(history-based request)");
  } catch {
    return res.status(400).json({ error: "Invalid request body." });
  }

  // Valid if we have a non-empty single message OR a history with at least one user turn.
  const hasMessage = typeof message === "string" && message.trim() !== "";
  const hasHistory =
    Array.isArray(history) &&
    history.some(m => m && m.role === "user" && typeof m.content === "string" && m.content.trim() !== "");

  if (!hasMessage && !hasHistory) {
    return res.status(400).json({ error: "Message is required and must be a non-empty string." });
  }

  // ── Sanitise optional teacher params ──────────────────────────────────
  const SYSTEM_DEFAULT = "You are EJ.Ai, a helpful AI study assistant for ICT students.";
  const baseSystem =
    typeof systemPrompt === "string" && systemPrompt.trim() !== ""
      ? systemPrompt.trim()
      : SYSTEM_DEFAULT;

  // ── Language matching (applies to every request: chat AND teacher) ─────
  // E.J.AI must answer in the SAME language as the user's latest message and
  // must never drift. This rule governs language ONLY — it must not alter any
  // required output structure (JSON keys, field names, code, formatting) that
  // the base prompt above already defines.
  const LANGUAGE_RULE = [
    "",
    "LANGUAGE RULE (highest priority):",
    "- Detect the language of the user's MOST RECENT message and write your entire reply in that same language.",
    "- English -> reply in English. Sinhala (සිංහල) -> reply in Sinhala. Chinese (中文) -> reply in Chinese. Match whatever language the user actually used.",
    "- Never switch languages on your own, and never mix languages unless the user's own message mixed them.",
    "- This rule governs language only: keep any required output format, JSON keys, field names, code, and numbers exactly as instructed above and translate just the natural-language text."
  ].join("\n");

  const finalSystem = baseSystem + "\n" + LANGUAGE_RULE;

  // Clamp tokens to a safe range; keep the original 500 default.
  const parsedTokens = parseInt(maxTokens, 10);
  const finalMaxTokens = Number.isFinite(parsedTokens)
    ? Math.min(Math.max(parsedTokens, 64), 1200)
    : 500;

  const finalTemperature =
    typeof temperature === "number" && temperature >= 0 && temperature <= 2
      ? temperature
      : 0.7;

  // Build the chat messages array (system + either history or single message).
  // History is capped to the most recent turns to bound payload size.
  const chatMessages = [{ role: "system", content: finalSystem }];
  if (hasHistory) {
    const trimmed = history
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== "")
      .slice(-24);
    for (const m of trimmed) chatMessages.push({ role: m.role, content: m.content });
  } else {
    chatMessages.push({ role: "user", content: message.trim() });
  }

  // Friendly fallback message shown only when a PLAIN CHAT request cannot reach
  // any model. Structured requests (the teacher's grader) never receive this —
  // they get a real error status so the failure is visible, not masked as a reply.
  const FALLBACK_REPLY =
    "EJ.Ai is currently busy helping other students. Please try again in a few seconds.";

  // ── Model selection ───────────────────────────────────────────────────
  // DeepSeek V4 Flash 0731 (GA, released 2026-07-31). The grader (teacher.js)
  // requests it via the allow-list; plain chat uses it as the default too. No
  // substitution to another model family — if it fails, the error is surfaced
  // below so the real cause is visible instead of masked.
  // NOTE: V4 Flash 0731 does NOT support response_format, so grading relies on a
  // compact JSON prompt + parse/validate/retry (teacher.js), never response_format.
  const PRIMARY_MODEL = "deepseek/deepseek-v4-flash-0731";
  const ALLOWED_REQUEST_MODELS = new Set([PRIMARY_MODEL]);
  const selectedModel = typeof requestedModel === "string" && ALLOWED_REQUEST_MODELS.has(requestedModel)
    ? requestedModel
    : null;
  const MODELS = selectedModel ? [selectedModel] : [PRIMARY_MODEL];

  // A "structured" request carries a custom system prompt or an allow-listed
  // model — i.e. the teacher grader. Plain chat sends only { message }.
  const isStructured = selectedModel !== null || (typeof systemPrompt === "string" && systemPrompt.trim() !== "");

  // Upstream (OpenRouter) timeout so a slow/hung model can't stall the function
  // for "minutes". Kept below the client's 25 s grader timeout.
  const UPSTREAM_TIMEOUT_MS = 20000;

  // Most recent upstream failure reason, surfaced to structured callers/logs.
  let lastError = "";

  // ── Shared request payload builder ───────────────────────────────────
  function buildPayload(model) {
    return JSON.stringify({
      model,
      max_tokens: finalMaxTokens,
      temperature: finalTemperature,
      messages: chatMessages
    });
  }

  // ── Single model attempt ──────────────────────────────────────────────
  async function tryModel(model) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
    let response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ictdiploma.com",
          "X-Title": "VTA ICT L5 Community AI"
        },
        body: buildPayload(model),
        signal: ctrl.signal
      });
    } catch (fetchError) {
      // Network / DNS error, or the upstream timeout above fired (AbortError).
      lastError = fetchError.name === "AbortError"
        ? `[${model}] timed out after ${UPSTREAM_TIMEOUT_MS} ms`
        : `[${model}] fetch error: ${fetchError.message}`;
      console.error(lastError);
      return null;
    } finally {
      clearTimeout(timer);
    }

    // Non-2xx from OpenRouter (invalid model id, auth, rate limit, overload…).
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      lastError = `[${model}] HTTP ${response.status}: ${errorText.slice(0, 300)}`;
      console.error(lastError);
      return null;
    }

    // Parse the response body
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      lastError = `[${model}] JSON parse error: ${parseError.message}`;
      console.error(lastError);
      return null;
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      lastError = `[${model}] empty reply from model`;
      console.error(lastError);
      return null;
    }

    return reply;
  }

  // ── Missing credential guard ──────────────────────────────────────────
  // A missing/misnamed key is the most common silent failure. Surface it
  // explicitly instead of sending "Bearer undefined" and getting a 401.
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY is not set in the environment.");
    if (isStructured) {
      return res.status(500).json({ error: "AI grader is not configured: OPENROUTER_API_KEY is missing on the server." });
    }
    return res.status(200).json({ reply: FALLBACK_REPLY });
  }

  // ── Fallback loop ─────────────────────────────────────────────────────
  try {
    for (let i = 0; i < MODELS.length; i++) {
      const model = MODELS[i];

      // Small backoff before each retry (not before the first attempt).
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      console.log(`Attempting model: ${model}`);
      const startTime = Date.now();
      const reply = await tryModel(model);

      if (reply !== null) {
        // Success — return immediately.
        console.log(`Success with model: ${model} (${Date.now() - startTime} ms)`);
        return res.status(200).json({ reply, model });
      }

      console.warn(`Model failed, moving to next: ${model}`);
    }

    // All models exhausted. A grader/structured request gets a REAL error status
    // so the failure is visible in the client and logs — never masked as a chat
    // reply the grader cannot parse. Plain chat gets the friendly notice.
    console.error("All models failed. Last error:", lastError);
    if (isStructured) {
      return res.status(502).json({ error: "All upstream models failed.", detail: lastError });
    }
    return res.status(200).json({ reply: FALLBACK_REPLY });
  } catch (error) {
    // Catch-all for any unexpected handler error.
    console.error("Handler error:", error.message);
    if (isStructured) {
      return res.status(500).json({ error: "AI grader error.", detail: error.message });
    }
    return res.status(200).json({ reply: FALLBACK_REPLY });
  }
};
