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

  // ── Model selection ───────────────────────────────────────────────────
  // Primary grader: DeepSeek V4 Flash 0731 (GA, released 2026-07-31). The grader
  // (teacher.js) requests it via the allow-list; plain chat uses it as the default.
  // NOTE: V4 Flash 0731 does NOT support response_format, so grading relies on a
  // compact JSON prompt + parse/validate/failover (teacher.js), never response_format.
  const PRIMARY_MODEL = "deepseek/deepseek-v4-flash-0731";
  // Automatic failover graders, verified against OpenRouter's live model list.
  // Both are cheap AND fast, and each sits on a DIFFERENT provider than the
  // primary on purpose: a DeepSeek outage must not also take out the fallback.
  // Prices (per 1M tokens, in/out) at the time of writing:
  //   deepseek/deepseek-v4-flash-0731  $0.14 / $0.28   (primary)
  //   google/gemini-2.5-flash-lite     $0.10 / $0.40
  //   openai/gpt-4.1-nano              $0.10 / $0.40
  // Both follow the same compact-JSON grader prompt, so a fallback grade is just
  // as valid — the student never has to resubmit and no verdict is ever faked.
  const FALLBACK_MODELS = ["google/gemini-2.5-flash-lite", "openai/gpt-4.1-nano"];
  const ALLOWED_REQUEST_MODELS = new Set([PRIMARY_MODEL, ...FALLBACK_MODELS]);
  const selectedModel = typeof requestedModel === "string" && ALLOWED_REQUEST_MODELS.has(requestedModel)
    ? requestedModel
    : null;
  // The model chain: the requested (or primary) model first, then the remaining
  // fallbacks. On ANY failure of one, the loop below fails over to the next.
  const head = selectedModel || PRIMARY_MODEL;
  const MODELS = [head, ...FALLBACK_MODELS.filter((m) => m !== head)];

  // A "structured" request carries a custom system prompt or an allow-listed
  // model — i.e. the teacher grader. Plain chat sends only { message }.
  const isStructured = selectedModel !== null || (typeof systemPrompt === "string" && systemPrompt.trim() !== "");

  // ── Language policy ───────────────────────────────────────────────────
  // Plain chat: E.J.AI answers in the SAME language as the user's latest message.
  // Structured (grader) requests are the exception and MUST stay English: the
  // verdict values ("correct" | "partial" | "incorrect") are English enum tokens
  // and the client rejects anything outside that enum, so a translated reply
  // would be discarded as invalid and cost the student a real grade.
  const LANGUAGE_RULE = [
    "",
    "LANGUAGE RULE (highest priority):",
    "- Detect the language of the user's MOST RECENT message and write your entire reply in that same language.",
    "- English -> reply in English. Sinhala (සිංහල) -> reply in Sinhala. Chinese (中文) -> reply in Chinese. Match whatever language the user actually used.",
    "- Never switch languages on your own, and never mix languages unless the user's own message mixed them.",
    "- This rule governs language only: keep any required output format, JSON keys, field names, code, and numbers exactly as instructed above and translate just the natural-language text."
  ].join("\n");

  const ENGLISH_RULE = [
    "",
    "LANGUAGE RULE (highest priority):",
    "- Write the ENTIRE reply in English, no matter what language the student's answer is written in.",
    "- Grade the student's meaning even when they answer in another language, but every value you output (verdict, feedback, missing, correction) must be English."
  ].join("\n");

  const finalSystem = baseSystem + "\n" + (isStructured ? ENGLISH_RULE : LANGUAGE_RULE);

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

  // Upstream (OpenRouter) timing. Kept comfortably BELOW two hard limits so the
  // function always returns its OWN clean error instead of being force-killed:
  //   1. Vercel's serverless max duration (10 s on Hobby). Overrunning it gets the
  //      function killed and surfaces to the browser as an opaque hang (which the
  //      client's AbortController reports as "signal is aborted without reason").
  //   2. The client's 12 s grader fetch timeout (teacher.js AI_TIMEOUT_MS), so the
  //      browser receives this response rather than aborting first.
  // TOTAL_BUDGET_MS bounds ALL model attempts combined; PER_MODEL_TIMEOUT_MS caps a
  // single attempt so a slow primary still leaves time to fail over to a fallback
  // inside the same budget. A fresh attempt is only started if MIN_ATTEMPT_MS of
  // budget remains, so the function never overruns. No inter-model backoff: failing
  // over to a DIFFERENT model needs no wait, and the budget is spent on answering.
  const TOTAL_BUDGET_MS = 9000;
  const PER_MODEL_TIMEOUT_MS = 5000;
  const MIN_ATTEMPT_MS = 1500;
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  // Most recent upstream failure, surfaced to structured callers/logs.
  // lastFailure is the structured form returned in the (temporary) 502 diagnostic.
  let lastError = "";
  let lastFailure = null;

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
  // timeoutMs bounds THIS attempt only; the caller passes whatever remains of the
  // shared budget (capped at PER_MODEL_TIMEOUT_MS) so one slow model can't starve
  // the fallback.
  async function tryModel(model, timeoutMs) {
    const ctrl = new AbortController();
    // The timer stays armed for the WHOLE attempt — request, response body and
    // JSON parsing — and is cleared only in the outer finally. fetch() resolves
    // as soon as the headers arrive, so clearing it any earlier would leave the
    // body read unbounded: a model that streams headers then stalls mid-body
    // would hang past the total budget and get the function killed with no
    // response at all. Aborting the controller also tears down the body stream,
    // so an AbortError can surface from the read as well as from the request.
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
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
        const timedOut = fetchError.name === "AbortError";
        lastError = timedOut
          ? `[${model}] timed out after ${timeoutMs} ms`
          : `[${model}] fetch error: ${fetchError.message}`;
        lastFailure = { model, stage: timedOut ? "timeout" : "network", message: timedOut ? `timed out after ${timeoutMs} ms` : fetchError.message };
        console.error(lastError);
        return null;
      }

      // Non-2xx from OpenRouter (invalid model id, auth, credits, rate limit…).
      // Preserve the EXACT upstream status and body — this IS the real error.
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        lastError = `[${model}] HTTP ${response.status}: ${errorText}`;
        lastFailure = { model, stage: "upstream_http", status: response.status, body: errorText.slice(0, 1500) };
        console.error(lastError);
        return null;
      }

      // Read + parse the response body, still inside the abort window above.
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        const timedOut = parseError.name === "AbortError";
        lastError = timedOut
          ? `[${model}] timed out after ${timeoutMs} ms while reading the response body`
          : `[${model}] JSON parse error: ${parseError.message}`;
        lastFailure = {
          model,
          stage: timedOut ? "timeout" : "parse",
          message: timedOut ? `timed out after ${timeoutMs} ms reading body` : parseError.message
        };
        console.error(lastError);
        return null;
      }

      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        lastError = `[${model}] empty reply from model`;
        lastFailure = { model, stage: "empty_reply", body: JSON.stringify(data).slice(0, 1500) };
        console.error(lastError);
        return null;
      }

      return reply;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Missing credential guard ──────────────────────────────────────────
  // A missing/misnamed key is the most common silent failure. Surface it
  // explicitly instead of sending "Bearer undefined" and getting a 401.
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY is not set in the environment.");
    if (isStructured) {
      return res.status(500).json({
        error: "AI grader is not configured: OPENROUTER_API_KEY is missing on the server."
      });
    }
    return res.status(200).json({ reply: FALLBACK_REPLY });
  }

  // ── Fallback loop ─────────────────────────────────────────────────────
  try {
    for (let i = 0; i < MODELS.length; i++) {
      const model = MODELS[i];

      // Only start an attempt if enough of the SHARED budget remains for it to
      // have a real chance; otherwise stop and let the total-failure path run.
      // This is checked for every attempt including the first: the handler can
      // already have spent time getting here, and a non-positive timeoutMs would
      // make setTimeout fire immediately and abort the request before it began.
      // No inter-model backoff: a fallback is a DIFFERENT model, so there is nothing
      // to wait for, and every spare millisecond is better spent answering.
      const remaining = deadline - Date.now();
      if (remaining < MIN_ATTEMPT_MS) {
        console.warn(`Skipping remaining models: only ${remaining} ms of budget left`);
        break;
      }
      // Each attempt is capped BOTH by the per-model cap and by whatever is left
      // of the shared budget, so one slow model can never consume the whole
      // budget and starve the fallbacks.
      const timeoutMs = Math.min(PER_MODEL_TIMEOUT_MS, remaining);

      console.log(`Attempting model: ${model} (timeout ${timeoutMs} ms)`);
      const startTime = Date.now();
      const reply = await tryModel(model, timeoutMs);

      if (reply !== null) {
        // Success — return immediately.
        console.log(`Success with model: ${model} (${Date.now() - startTime} ms)`);
        return res.status(200).json({ reply, model });
      }

      console.warn(`Model failed, moving to next: ${model}`);
    }

    // All models exhausted. A grader/structured request gets a REAL error status
    // with the EXACT upstream cause — never masked as a chat reply the grader
    // cannot parse. Plain chat still gets the friendly notice.
    console.error("All models failed. Last error:", lastError);
    if (isStructured) {
      // TEMPORARY DIAGNOSTIC: the response body carries the exact upstream status
      // and body plus key/model/endpoint info so the cause is visible in
      // Chrome → Network → /api/ai → Response. Trim this back once the cause is found.
      const upstreamMsg = lastFailure
        ? (lastFailure.status
            ? `OpenRouter HTTP ${lastFailure.status}: ${String(lastFailure.body || "").slice(0, 200)}`
            : `${lastFailure.stage}: ${String(lastFailure.message || lastFailure.body || "").slice(0, 200)}`)
        : "no upstream response was captured";
      // A timeout / network failure is a gateway timeout (504); an upstream error
      // reply, parse failure or empty completion is a bad gateway (502). Distinct
      // codes make the real cause visible in Network → /api/ai instead of hidden.
      const timedOutOrNetwork = lastFailure && (lastFailure.stage === "timeout" || lastFailure.stage === "network");
      const statusCode = timedOutOrNetwork ? 504 : 502;
      // Report the cause WITHOUT leaking secret material: the upstream stage and
      // status are enough to diagnose, so the raw upstream body and the API key
      // length (a real, if minor, disclosure to an unauthenticated caller) are
      // deliberately not returned. The full body is still in the server log above.
      return res.status(statusCode).json({
        error: upstreamMsg,
        upstream: lastFailure
          ? { model: lastFailure.model, stage: lastFailure.stage, status: lastFailure.status || null }
          : null,
        models_tried: MODELS
      });
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
