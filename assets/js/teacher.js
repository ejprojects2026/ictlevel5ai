/* ============================================================
   teacher.js — AI Teacher (E.J.AI) for VTA ICT Level 5
   A live, conversational class: teach → ask → listen → evaluate
   → feedback → practice → mini test → results.

   Reuses the site's single AI backend (api/ai)
   via its extended { system, history, max_tokens } contract.
   Curriculum grounding + fallbacks come from teacherData.js.
   Speech uses the browser Web Speech API with safe fallbacks.
   ============================================================ */
(function () {
  "use strict";

  const API_URL = "/api/ai";

  // ── Element references ──────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const el = {
    // screens
    screenSetup: $("screen-setup"),
    screenClass: $("screen-class"),
    screenResults: $("screen-results"),
    // setup
    subjectSelect: $("subjectSelect"),
    lessonSelect: $("lessonSelect"),
    subjectHint: $("subjectHint"),
    lessonHint: $("lessonHint"),
    lessonOutline: $("lessonOutline"),
    outlineList: $("outlineList"),
    startClassBtn: $("startClassBtn"),
    // class chrome
    classSubject: $("classSubject"),
    classLesson: $("classLesson"),
    phaseChip: $("phaseChip"),
    endClassBtn: $("endClassBtn"),
    progressWrap: $("progressWrap"),
    progressBar: $("progressBar"),
    qCounter: $("qCounter"),
    masteryVal: $("masteryVal"),
    // stage
    avatar: $("avatar"),
    statusPill: $("statusPill"),
    statusText: $("statusText"),
    muteBtn: $("muteBtn"),
    replayBtn: $("replayBtn"),
    stopBtn: $("stopBtn"),
    // interaction
    teacherSay: $("teacherSay"),
    sayText: $("sayText"),
    board: $("board"),
    boardConcept: $("boardConcept"),
    boardPoints: $("boardPoints"),
    boardCode: $("boardCode"),
    feedback: $("feedback"),
    verdict: $("verdict"),
    verdictText: $("verdictText"),
    questionBox: $("questionBox"),
    questionText: $("questionText"),
    answerArea: $("answerArea"),
    transcript: $("transcript"),
    answerInput: $("answerInput"),
    micBtn: $("micBtn"),
    submitAnswerBtn: $("submitAnswerBtn"),
    skipQuestionBtn: $("skipQuestionBtn"),
    continueRow: $("continueRow"),
    continueBtn: $("continueBtn"),
    // results
    resultsSubtitle: $("resultsSubtitle"),
    scoreFill: $("scoreFill"),
    scoreNum: $("scoreNum"),
    scoreGrade: $("scoreGrade"),
    scoreSub: $("scoreSub"),
    statAnswered: $("statAnswered"),
    statCorrect: $("statCorrect"),
    statAccuracy: $("statAccuracy"),
    statConcepts: $("statConcepts"),
    goodList: $("goodList"),
    workList: $("workList"),
    goodNone: $("goodNone"),
    workNone: $("workNone"),
    recoTitle: $("recoTitle"),
    recoSub: $("recoSub"),
    recoGoBtn: $("recoGoBtn"),
    retryBtn: $("retryBtn"),
    newLessonBtn: $("newLessonBtn")
  };
  // ── Class state ─────────────────────────────────────────────
  const state = {
    subject: null,        // subject object
    lesson: null,         // lesson object
    steps: [],            // linear class script
    stepIndex: -1,        // current step
    answers: [],          // { concept, verdict, score, qid, mode } — score is the AI's validated 0-100, or null when skipped/unverified
    totalQuestions: 0,    // number of questions in this class
    questionNum: 0,       // current question index (1-based)
    muted: false,
    lastSpoken: "",       // for replay
    pending: null,        // { concept, question, expected, mode } awaiting an answer
    consumedQids: new Set(),
    renderedQids: new Set(),
    advancedQids: new Set(),
    currentQid: null,
    pendingQid: null,
    nextQid: 0,
    runToken: 0,
    advanceLocked: false,
    reco: null,           // { subjectId, lessonId } recommended next
    busy: false,          // guard against double actions
    mastery: {},          // conceptName -> { attempts, scoreSum, correct, partial, lastMisconception }
    testPlan: [],         // concepts chosen for the mini-test (adaptive, at runtime)
    testAskIndex: 0       // pointer into testPlan
  };

  // QID management functions
  function assignQid() {
    return state.nextQid++;
  }

  function advanceAfterQuestion(qid) {
    // A question has one terminal transition. Every caller supplies the qid it
    // owns, so a stale evaluator or a double click cannot advance a new one.
    if (qid === null || qid === undefined || state.advanceLocked || state.advancedQids.has(qid)) return;
    if (state.currentQid !== qid && !state.consumedQids.has(qid)) return;
    state.advanceLocked = true;
    state.consumedQids.add(qid);
    state.advancedQids.add(qid);
    if (state.currentQid === qid) state.currentQid = null;
    state.pending = null;
    state.pendingQid = null;
    state.busy = false;
    showAnswerArea(false);
    state.advanceLocked = false;
    nextStep();
  }

  // Skip question handler
  function skipQuestion() {
    if (state.busy || !state.pending) return;
    if (state.currentQid === null || state.pendingQid !== state.currentQid || state.consumedQids.has(state.currentQid)) return;

    // Lock immediately — disable both buttons to prevent double-click/rapid clicks
    state.busy = true;
    el.submitAnswerBtn.disabled = true;
    el.skipQuestionBtn.disabled = true;

    // Capture qid at skip time so we can verify it's the right one
    const qid = state.currentQid;

    // Record skip as a distinct outcome. It does not affect mastery or score.
    if (qid !== null) {
      state.answers.push({
        concept: state.pending.concept.name,
        verdict: "skipped",
        score: null,
        qid,
        mode: state.pending.mode
      });
    }

    stopSpeaking();

    // Advance exactly once
    advanceAfterQuestion(qid);
  }

  const TEST_QUESTIONS = 3;   // mini-test size
  const hasTeacherData = typeof window !== "undefined" && window.teacherData;

  // ── Screen navigation ───────────────────────────────────────
  function showScreen(name) {
    [el.screenSetup, el.screenClass, el.screenResults].forEach((s) => {
      if (s) s.classList.remove("active");
    });
    const target =
      name === "class" ? el.screenClass :
        name === "results" ? el.screenResults : el.screenSetup;
    if (target) target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Setup: populate subjects ────────────────────────────────
  function populateSubjects() {
    if (!hasTeacherData) {
      el.subjectHint.textContent = "Curriculum data unavailable — please refresh.";
      return;
    }
    const frag = document.createDocumentFragment();
    window.teacherData.subjects.forEach((subj) => {
      const opt = document.createElement("option");
      opt.value = subj.id;
      opt.textContent = `${subj.icon}  ${subj.name}`;
      frag.appendChild(opt);
    });
    el.subjectSelect.appendChild(frag);
  }

  function onSubjectChange() {
    const subj = window.teacherData.getSubject(el.subjectSelect.value);
    // reset lesson select
    el.lessonSelect.innerHTML =
      '<option value="" disabled selected hidden>Choose a lesson…</option>';
    el.lessonSelect.disabled = !subj;
    el.lessonHint.textContent = "";
    el.lessonOutline.classList.add("empty");
    el.startClassBtn.disabled = true;
    if (!subj) return;
    el.subjectHint.textContent = subj.blurb || "";
    const frag = document.createDocumentFragment();
    subj.lessons.forEach((lsn) => {
      const opt = document.createElement("option");
      opt.value = lsn.id;
      opt.textContent = lsn.title;
      frag.appendChild(opt);
    });
    el.lessonSelect.appendChild(frag);
  }
  function onLessonChange() {
    const subj = window.teacherData.getSubject(el.subjectSelect.value);
    const lsn = window.teacherData.getLesson(el.subjectSelect.value, el.lessonSelect.value);
    if (!subj || !lsn) {
      el.lessonOutline.classList.add("empty");
      el.startClassBtn.disabled = true;
      return;
    }
    el.lessonHint.textContent = lsn.summary || "";
    // preview concepts
    el.outlineList.innerHTML = "";
    lsn.concepts.forEach((c) => {
      const li = document.createElement("li");
      li.textContent = c.name;
      el.outlineList.appendChild(li);
    });
    el.lessonOutline.classList.toggle("empty", lsn.concepts.length === 0);
    el.startClassBtn.disabled = false;
  }

  // ── Defensive normalisation ─────────────────────────────────
  // Turn any lesson/concept (possibly missing fields) into a safe internal
  // shape the engine can rely on, so partial or bad data never crashes a class.
  function normalizeConcept(raw) {
    const c = raw && typeof raw === "object" ? raw : {};
    const name = (typeof c.name === "string" && c.name.trim()) ? c.name.trim() : "This concept";
    return {
      name,
      note: (typeof c.note === "string" && c.note.trim()) ? c.note.trim() : ("Key idea in " + name),
      mistake: (typeof c.mistake === "string") ? c.mistake.trim() : "",
      teaching: c.teaching && typeof c.teaching === "object" ? c.teaching : {}
    };
  }
  function normalizeLesson(raw) {
    const l = raw && typeof raw === "object" ? raw : {};
    const title = (typeof l.title === "string" && l.title.trim()) ? l.title.trim() : "This lesson";
    const rawConcepts = Array.isArray(l.concepts) ? l.concepts : [];
    const concepts = rawConcepts.map(normalizeConcept).filter((c) => c.name);
    const difficulty = (typeof l.difficulty === "number" && l.difficulty >= 1 && l.difficulty <= 4)
      ? Math.round(l.difficulty) : 2;
    return {
      id: l.id || "lesson",
      title,
      summary: (typeof l.summary === "string") ? l.summary : "",
      difficulty,
      objectives: Array.isArray(l.objectives)
        ? l.objectives.filter((o) => typeof o === "string" && o.trim()).map((o) => o.trim()) : [],
      prerequisites: Array.isArray(l.prerequisites)
        ? l.prerequisites.filter((p) => typeof p === "string") : [],
      concepts,
      curriculumStatus: typeof l.curriculumStatus === "string" ? l.curriculumStatus : "supplemental",
      officialArea: typeof l.officialArea === "string" ? l.officialArea : "",
      officialCode: typeof l.officialCode === "string" ? l.officialCode : ""
    };
  }

  // ── Build the class script from the chosen lesson ───────────
  function buildSteps(lesson) {
    const steps = [{ type: "intro" }];
    // Teaching phase: each concept is taught, then its question is asked.
    lesson.concepts.forEach((concept) => {
      steps.push({ type: "teach", concept });
    });
    // Mini-test phase: a few exam-style questions across the concepts.
    if (lesson.concepts.length) {
      steps.push({ type: "test-intro" });
      // Concepts are chosen adaptively at runtime (see selectTestConcepts),
      // so the test covers weak/untested concepts — not just the first few.
      const testCount = Math.min(TEST_QUESTIONS, Math.max(1, lesson.concepts.length));
      for (let i = 0; i < testCount; i++) {
        steps.push({ type: "ask", mode: "test" });
      }
    }
    steps.push({ type: "finish" });
    return steps;
  }

  // Even spread of n indices so the test can cover the whole lesson,
  // including a last concept a modulo cycle would always skip.
  // spreadOrder(4) -> [0, 3, 1, 2]; spreadOrder(3) -> [0, 2, 1].
  function spreadOrder(n) {
    if (n <= 1) return n === 1 ? [0] : [];
    const order = [];
    const seen = new Set();
    const push = (i) => {
      i = Math.round(i);
      if (i >= 0 && i < n && !seen.has(i)) { seen.add(i); order.push(i); }
    };
    push(0); push(n - 1);
    let seg = 2;
    while (order.length < n) {
      for (let k = 1; k < seg && order.length < n; k++) push((k * (n - 1)) / seg);
      seg *= 2;
    }
    return order;
  }
  // Choose which concepts the mini-test asks about: weakest first (target what
  // the student struggled with), then fill remaining slots by an even spread
  // across ALL concepts so nothing is permanently skipped (fixes the old
  // "always tests the first three concepts" bug).
  function selectTestConcepts(lesson) {
    const concepts = (lesson && lesson.concepts) || [];
    const n = concepts.length;
    if (!n) return [];
    const count = Math.min(TEST_QUESTIONS, n);
    const spread = spreadOrder(n);
    const spreadRank = {};
    spread.forEach((idx, r) => { spreadRank[idx] = r; });
    const picked = [];
    const used = new Set();
    // 1) Weak concepts (mastery score < 1), weakest first; ties broken by spread
    //    order so equally-weak concepts still cover the whole lesson.
    const weak = concepts
      .map((c, i) => ({ i, c, s: masteryScore(c.name) }))
      .filter((x) => x.s < 1)
      .sort((a, b) => (a.s - b.s) || (spreadRank[a.i] - spreadRank[b.i]));
    for (const w of weak) {
      if (picked.length >= count) break;
      if (!used.has(w.i)) { used.add(w.i); picked.push(w.c); }
    }
    // 2) Fill remaining slots via an even spread across all concepts.
    for (const idx of spread) {
      if (picked.length >= count) break;
      if (!used.has(idx)) { used.add(idx); picked.push(concepts[idx]); }
    }
    // 3) Safety: if still short (fewer concepts than questions), wrap around.
    for (let i = 0; picked.length < count; i++) picked.push(concepts[i % n]);
    return picked;
  }

  function updateProgress() {
    const total = state.steps.length - 1; // exclude 'finish' sentinel
    const done = Math.max(0, Math.min(state.stepIndex, total));
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    el.progressBar.style.width = pct + "%";
    if (el.progressWrap) el.progressWrap.setAttribute("aria-valuenow", String(pct));
  }
  // ── Text-to-speech engine (SpeechSynthesis) ────────────────
  // Speech state only. The typewriter has its own state (see `typer` below) so
  // that cancelling speech can never interrupt the on-screen text.
  const ttsSupported = (() => {
    try {
      return !!(window.speechSynthesis && typeof window.speechSynthesis.speak === "function" &&
        typeof window.SpeechSynthesisUtterance === "function");
    } catch (_) { return false; }
  })();

  const tts = {
    supported: ttsSupported,
    voice: null,
    ready: false,
    generation: 0,
    active: null,
    gestureIntro: null
  };

  // Prefer an English MALE voice; fall back safely to any English voice.
  // FIX #6: Returns true if voices were actually found, so callers can
  // detect whether the voice list was populated yet.
  function pickVoice() {
    if (!tts.supported) return false;
    let voices = [];
    try { voices = window.speechSynthesis.getVoices() || []; } catch (_) { voices = []; }
    if (!voices.length) return false;
    const en = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
    const pool = en.length ? en : voices;
    const maleHints = [
      "google uk english male", "microsoft david", "microsoft mark",
      "microsoft guy", "daniel", "alex", "fred", "david", "james",
      "george", "male", "rishi", "arthur"
    ];
    let chosen = null;
    for (const hint of maleHints) {
      chosen = pool.find((v) => v.name.toLowerCase().includes(hint));
      if (chosen) break;
    }
    // Prefer explicitly non-female if nothing matched
    if (!chosen) chosen = pool.find((v) => !/female|zira|susan|samantha|victoria|hazel|fiona/i.test(v.name));
    tts.voice = chosen || pool[0] || null;
    tts.ready = true;
    return true;
  }

  if (tts.supported) {
    try {
      pickVoice();
      // Android Chrome commonly populates this list after the page has loaded.
      // Updating the selected voice is enough for the next utterance; never
      // speak from this event because it is not a user gesture and could replay
      // an old lesson line over the current one.
      window.speechSynthesis.onvoiceschanged = () => {
        pickVoice();
      };
    } catch (_) { /* a broken voice list must not stop the class */ }
  }

  function splitSpeech(text, maxChars) {
    const limit = maxChars || 240;
    const words = String(text || "").trim().split(/\s+/);
    const chunks = [];
    let current = "";
    words.forEach((word) => {
      const next = current ? current + " " + word : word;
      if (current && next.length > limit) { chunks.push(current); current = word; }
      else current = next;
    });
    if (current) chunks.push(current);
    return chunks;
  }

  // Cancels only speech. The typewriter is deliberately left alone: text must
  // always finish rendering even when speech is stopped, muted or restarted.
  function cancelSpeechQueue() {
    tts.generation++;
    tts.active = null;
    // Lip-sync: the mouth animates only while audio is truly playing.
    el.avatar.classList.remove("is-voicing");
    if (tts.supported) {
      try { window.speechSynthesis.cancel(); } catch (_) { }
      try { window.speechSynthesis.resume(); } catch (_) { }
    }
  }

  // How long to wait for a voice engine to actually START a chunk before giving up
  // on it. Long enough for a real engine to warm up, short enough that a stalled or
  // missing engine never noticeably holds the lesson.
  const SPEECH_START_TIMEOUT_MS = 2500;

  // FIX #5: The watchdog on a single slow chunk now only cancels + resolves
  // THAT chunk (so the outer loop can continue to the next one), rather than
  // leaving the entire speech promise unresolved or aborting remaining chunks.
  // The chunk resolves with false so the caller logs a miss but carries on.
  function speakChunk(chunk, generation) {
    return new Promise((resolve) => {
      if (!tts.supported || state.muted || generation !== tts.generation || !chunk) return resolve(false);
      let u;
      try {
        u = new SpeechSynthesisUtterance(chunk);
        if (tts.voice) u.voice = tts.voice;
        u.lang = (tts.voice && tts.voice.lang) || "en-US";
        u.rate = 1.02; u.pitch = 1.0; u.volume = 1.0;
      } catch (_) { return resolve(false); }
      let settled = false;
      // Per-chunk watchdog. It is deliberately NOT stored on `tts`: only the
      // chunk that armed it may clear it, so a cancel elsewhere can never leave
      // this promise unresolved.
      let watchdog = null;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        if (watchdog) { clearTimeout(watchdog); watchdog = null; }
        resolve(ok);
      };
      u.onstart = () => {
        // Real audio has begun: swap the short "did it ever start?" watchdog for
        // the longer "did it ever finish?" one, sized to the chunk.
        if (watchdog) { clearTimeout(watchdog); watchdog = null; }
        if (!settled) {
          const seconds = Math.max(6, Math.min(25, chunk.length / 8));
          watchdog = setTimeout(() => {
            try { window.speechSynthesis.cancel(); } catch (_) { }
            try { window.speechSynthesis.resume(); } catch (_) { }
            done(false); // this chunk over-ran; the loop continues
          }, seconds * 1000);
        }
        // Start the mouth ONLY when real audio begins — never on the silent
        // gap between setAvatarState("speaking") and the first sound.
        if (generation === tts.generation) {
          el.avatar.classList.add("is-voicing");
        }
      };
      u.onend = () => done(generation === tts.generation);
      u.onerror = () => done(false);
      try {
        window.speechSynthesis.speak(u);
        // FIX #5: Watchdog recovers by cancelling only this stalled utterance
        // and resolving the chunk promise with false. The outer speak() loop
        // then checks generation: if it still matches, it CONTINUES to the
        // next chunk rather than aborting the whole speech sequence.
        //
        // Requirement 12: this first watchdog is a SHORT "did speech ever start?"
        // timer. A voice engine that accepts speak() but never fires onstart (a
        // stalled or broken engine) used to hold the chunk for 10-40 s, and a long
        // explanation stacked one such wait per chunk — freezing the lesson for
        // minutes. Now a chunk that has not started within START_TIMEOUT_MS is
        // abandoned immediately; onstart replaces this with the duration watchdog.
        watchdog = setTimeout(() => {
          try { window.speechSynthesis.cancel(); } catch (_) { }
          // Resume so the synthesis queue stays usable for the next chunk.
          try { window.speechSynthesis.resume(); } catch (_) { }
          done(false); // never started; loop continues without it
        }, SPEECH_START_TIMEOUT_MS);
      } catch (_) { done(false); }
    });
  }

  // Speak in bounded sequential utterances; every new response invalidates the
  // old one. This is FIRE-AND-FORGET on purpose: nothing in the class flow may
  // ever wait on speech, so a slow, stalled, missing or failing voice engine
  // cannot hold up the lesson. Returns a promise for callers that only want to
  // know when the voice finished (e.g. the avatar state), never for gating UI.
  function speak(text) {
    const spoken = String(text || "").trim();
    state.lastSpoken = spoken;
    cancelSpeechQueue();
    if (!tts.supported || state.muted || !spoken) return Promise.resolve({ cancelled: false });
    // Re-check immediately before every utterance. This captures voice lists
    // that arrived without (or just before) voiceschanged, while leaving the
    // browser's default available as a reliable fallback when none is exposed.
    pickVoice();
    const generation = tts.generation;
    const chunks = splitSpeech(spoken, 240);
    const run = (async () => {
      for (const chunk of chunks) {
        if (generation !== tts.generation) return { cancelled: true };
        // FIX #5: A false return from speakChunk (timeout or error on ONE
        // chunk) no longer breaks the loop — we continue to the next chunk
        // provided the generation is still current.
        const ok = await speakChunk(chunk, generation);
        if (!ok && generation !== tts.generation) return { cancelled: true };
        // If ok===false but generation still matches: stalled chunk recovered;
        // remaining chunks can still play — do NOT break.
      }
      if (generation !== tts.generation) return { cancelled: true };
      tts.active = null;
      // Audio finished naturally: stop the mouth.
      el.avatar.classList.remove("is-voicing");
      return { cancelled: false };
    })();
    tts.active = { promise: run };
    // Never surface a speech rejection to the flow.
    return run.catch(() => ({ cancelled: true }));
  }
  function stopSpeaking() { cancelSpeechQueue(); }

  function toggleMute() {
    state.muted = !state.muted;
    if (state.muted) stopSpeaking();
    el.muteBtn.textContent = state.muted ? "🔇" : "🔊";
    el.muteBtn.classList.toggle("is-muted", state.muted);
    el.muteBtn.setAttribute("aria-label", state.muted ? "Unmute voice" : "Mute voice");
  }

  function replayLast() {
    if (!state.lastSpoken) return;
    setAvatarState("speaking");
    speak(state.lastSpoken).then((r) => { if (!r || !r.cancelled) setAvatarState("idle"); });
  }

  // ── Avatar + status control ─────────────────────────────────
  const STATUS = {
    idle: { text: "Ready", cls: "" },
    speaking: { text: "Teaching", cls: "is-speaking" },
    thinking: { text: "Thinking", cls: "is-thinking" },
    listening: { text: "Listening", cls: "is-listening" }
  };

  function setAvatarState(s) {
    el.avatar.classList.remove("state-idle", "state-speaking", "state-thinking");
    // Leaving the speaking state (idle/thinking) must never leave the mouth
    // mid-animation; is-voicing is (re)armed by real audio via u.onstart.
    if (s !== "speaking") el.avatar.classList.remove("is-voicing");
    const avatarCls =
      s === "speaking" ? "state-speaking" :
        s === "thinking" ? "state-thinking" : "state-idle";
    el.avatar.classList.add(avatarCls);
    const meta = STATUS[s] || STATUS.idle;
    el.statusPill.classList.remove("is-speaking", "is-thinking", "is-listening");
    if (meta.cls) el.statusPill.classList.add(meta.cls);
    el.statusText.textContent = meta.text;
  }

  // ── Typewriter reveal (runs alongside speech) ───────────────
  const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Typewriter state is separate from speech state, so speech can never cancel
  // the text. Each run owns its own timers; a new run settles the previous one
  // rather than clearing shared state, so no run can ever be left unresolved.
  const typer = { generation: 0, abortCurrent: null };

  // Always resolves, and always leaves the full text on screen.
  function typeText(text) {
    return new Promise((resolve) => {
      // Settle any run still in flight (it will not touch the DOM after this).
      if (typer.abortCurrent) { const abort = typer.abortCurrent; typer.abortCurrent = null; abort(); }
      // Increment only after the previous run has finalized its full text.
      const generation = ++typer.generation;

      const full = text == null ? "" : String(text);
      let timer = null, guard = null, settled = false;

      const finish = (showAll) => {
        if (settled) return;
        settled = true;
        if (timer) { clearInterval(timer); timer = null; }
        if (guard) { clearTimeout(guard); guard = null; }
        if (typer.abortCurrent === finish) typer.abortCurrent = null;
        // Only the newest run owns the display.
        if (generation === typer.generation) {
          // Always show full text when finishing, even if aborted
          el.sayText.textContent = full;
          el.teacherSay.classList.remove("typing");
        }
        resolve();
      };
      typer.abortCurrent = finish;
      el.teacherSay.classList.add("typing");

      if (reduceMotion || !full) {
        el.sayText.textContent = full;
        finish(true);
        return;
      }

      el.sayText.textContent = "";
      let i = 0;
      const step = Math.max(1, Math.round(full.length / 140));
      timer = setInterval(() => {
        if (generation !== typer.generation) { finish(false); return; }
        i += step;
        el.sayText.textContent = full.slice(0, i);
        if (i >= full.length) finish(true);
      }, 18);

      // Hard ceiling: if the interval is throttled (background tab) or lost for
      // any reason, snap the full text in and let the flow continue.
      const budget = Math.min(12000, 1200 + Math.ceil(full.length / step) * 18 * 3);
      guard = setTimeout(() => finish(true), budget);
    });
  }

  // Blank the caption and retire any in-flight reveal, so a previous line can't
  // keep typing over the next phase.
  function clearSayText() {
    if (typer.abortCurrent) { const abort = typer.abortCurrent; typer.abortCurrent = null; abort(); }
    typer.generation++;
    el.sayText.textContent = "";
    el.teacherSay.classList.remove("typing");
  }

  // FIX #8: speakBackground now uses the resolved value of the speak() promise
  // rather than comparing a pre-captured generation number (which was always
  // off by one because speak() increments generation inside cancelSpeechQueue
  // before returning). The avatar returns to idle only when no newer speech is
  // active, detected via tts.active being null.
  function speakBackground(text) {
    setAvatarState("speaking");
    const voicePromise = speak(text);
    voicePromise.then((r) => {
      if (r && r.cancelled) return;
      // Only reset to idle if no newer speech has started.
      if (!tts.active) setAvatarState("idle");
    });
    if (!tts.supported || state.muted) setAvatarState("idle");
  }

  // Say = show the text and start the voice. Only the TEXT is awaited; speech is
  // started in the background and its outcome never gates the class flow — unless
  // a caller opts to wait on the returned `voice` promise (see waitForSpeech).
  async function say(text, opts) {
    opts = opts || {};
    setAvatarState("speaking");
    await typeText(text);
    const generation = tts.generation + 1;   // the generation speak() will claim
    const voice = speak(text);               // fire-and-forget
    if (!opts.keepState) {
      // Settle the avatar once the voice ends, unless a newer line took over.
      voice.then((r) => {
        if (r && r.cancelled) return;
        if (generation !== tts.generation) return;
        setAvatarState("idle");
      });
    }
    // Expose the voice + its generation so a caller can await the spoken line
    // finishing before it proceeds (never the text — that already rendered).
    return { cancelled: false, voice, generation };
  }

  // Wait for a spoken line (returned by say) to finish before proceeding. The
  // chunk-level start and duration watchdogs guarantee that its promise settles
  // if TTS stalls or fails, so this must not use a shorter text-length timeout:
  // that timeout could advance to a question and cancel the final chunk.
  function waitForSpeech(said, text) {
    const voice = said && said.voice;
    // Nothing is actually being spoken — do not hold the flow at all.
    if (!tts.supported || state.muted || !voice) return Promise.resolve();
    // speak() always resolves (never rejects); the rejection handler is
    // belt-and-suspenders for an unexpected engine error.
    return voice.then(() => undefined, () => undefined);
  }
  // ── Speech-to-text engine (SpeechRecognition) ──────────────
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const stt = { supported: !!SR, rec: null, recording: false, baseText: "" };

  function initSTT() {
    if (!stt.supported) {
      // Graceful fallback: hide mic, keep text answering fully usable.
      el.micBtn.style.display = "none";
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      stt.recording = true;
      el.micBtn.classList.add("is-recording");
      el.micBtn.textContent = "⏺️";
      el.transcript.classList.add("active");
      el.transcript.innerHTML = '<span class="interim">Listening… speak your answer.</span>';
      setAvatarState("listening");
    };

    rec.onresult = (event) => {
      let finalTxt = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalTxt += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (finalTxt) {
        stt.baseText = (stt.baseText ? stt.baseText + " " : "") + finalTxt.trim();
        el.answerInput.value = stt.baseText;
      }
      el.transcript.innerHTML =
        (stt.baseText ? escapeHtml(stt.baseText) + " " : "") +
        (interim ? '<span class="interim">' + escapeHtml(interim) + "</span>" : "");
    };

    rec.onerror = () => { stopRecording(); };
    rec.onend = () => { stopRecording(); };
    stt.rec = rec;
  }

  function stopRecording() {
    stt.recording = false;
    el.micBtn.classList.remove("is-recording");
    el.micBtn.textContent = "🎤";
    el.transcript.classList.remove("active");
    setAvatarState("idle");
  }

  function toggleMic() {
    if (!stt.supported || !stt.rec) return;
    if (stt.recording) { try { stt.rec.stop(); } catch (_) { } return; }
    stopSpeaking();
    stt.baseText = el.answerInput.value.trim();
    try { stt.rec.start(); } catch (_) { /* already started */ }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }
  // ── AI backend layer: GRADING ONLY ─────────────────────────
  // E.J.AI calls the AI for exactly one purpose: to grade an answer the student
  // has submitted. All lesson content and questions are programmed in
  // teacherData.js (see buildTeachTurn / buildQuestion) and never touch the API,
  // so loading a lesson or showing a question makes ZERO /api/ai calls.
  // ── Grading time budget ────────────────────────────────────────────────
  // GRADE_TOTAL_BUDGET_MS is a SHARED deadline covering the whole grading of one
  // answer — every fallback attempt included. Without it, N fallbacks each waiting
  // their own full timeout would stack (2 x 12 s = 24 s of silence), so the budget
  // is set once when grading starts and every attempt is capped by whatever is left.
  // PER_ATTEMPT_TIMEOUT_MS is deliberately LONGER than the server's 9 s budget
  // (api/ai.js TOTAL_BUDGET_MS) so the browser receives the server's real HTTP
  // response instead of aborting first (the old stack produced the opaque
  // "signal is aborted without reason").
  const GRADE_TOTAL_BUDGET_MS = 20000;
  const PER_ATTEMPT_TIMEOUT_MS = 11000;

  // The grader model chain. api/ai.js allow-lists which model a request may select
  // and ALSO fails over internally on transport errors; the client re-sends with the
  // NEXT head model when a reply comes back but is not valid grader JSON (something
  // the server cannot detect, since it never inspects the reply body). Must stay in
  // sync with api/ai.js ALLOWED_REQUEST_MODELS. All three are verified-live, cheap
  // and fast on OpenRouter. None supports/needs response_format for this task, so
  // grading uses a compact JSON prompt + parse/validate/failover.
  const GRADER_MODEL = "deepseek/deepseek-v4-flash-0731";
  const GRADER_FALLBACK_MODELS = ["google/gemini-2.5-flash-lite", "openai/gpt-4.1-nano"];
  const GRADER_MODEL_CHAIN = [GRADER_MODEL, ...GRADER_FALLBACK_MODELS];

  // Submit UX timing/lines. The teacher only LOOKS busy if grading is slow: after
  // THINKING_DELAY_MS with no grade yet, show the thinking state and say the
  // waiting line ONCE. A grade that arrives sooner cancels the timer, so a fast
  // answer never triggers the waiting speech. GRADER_FAIL_LINE is the graceful
  // "move on" spoken when every grader fails — the student is never marked wrong.
  const THINKING_DELAY_MS = 1000;
  const WAITING_LINE = "Give me a moment, I'm checking your answer.";
  const GRADER_FAIL_LINE = "Thanks for your answer. Let's move on to the next point.";
  // Short, cheap, JSON-only grader prompt. The AI is the ONLY thing that decides
  // the verdict; the score is supporting information and must never convert it.
  const GRADER_SYSTEM = [
    "You are an ICT exam grader. Judge the student's answer to the question using the required points. Judge meaning, not wording. Accept valid synonyms, paraphrases, concise answers and valid equivalent examples.",
    "correct = all essential points are satisfied and no major error.",
    "partial = main idea is correct but an important point is missing or there is a minor fixable misunderstanding.",
    "incorrect = core idea is wrong, unrelated, evasive, meaningless, or has a major factual error.",
    "Do not use keyword matching. Do not require the expected answer wording.",
    "Judge ONLY the REQUIRED points listed for this specific question. If REQUIRED lists one point, do not demand a second one. Never invent extra requirements the question did not ask for.",
    "REFERENCE CONTEXT is teaching material, not a rubric. Use it only to check factual accuracy; never require its particular example, its extra details or its wording. A different valid example that answers the question is correct. Extra correct information must not lower the verdict.",
    "feedback: one or two short sentences for text-to-speech. If correct, briefly confirm; if partial, say what was right and exactly what is missing; if incorrect, name the misconception and give the correct idea.",
    "score is a REQUIRED number and must match the verdict band: correct 80-100, partial 40-79, incorrect 0-39. Choose the number that reflects how complete the answer is inside that band.",
    "Always write every value in English, even when the student answers in another language.",
    "Reply with ONLY the JSON object below, on a single line — no prose, no explanation, no reasoning, no markdown or code fences, nothing before or after it. Keep feedback to one or two short sentences so the JSON is never truncated.",
    "{\"verdict\":\"correct|partial|incorrect\",\"score\":0,\"feedback\":\"...\",\"missing\":[\"...\"],\"correction\":\"...\"}"
  ].join("\n");

  // ── Background grading PREPARATION (static only — NEVER calls the AI) ──────
  // Requirement 5A. While the student learns, pre-assemble the STATIC half of the
  // grader request: the system prompt is constant, and the QUESTION / EXPECTED /
  // REQUIRED lines depend only on the question, never on the student. Caching that
  // prefix means Submit only appends the student's actual answer and POSTs at once,
  // with no compacting or JSON assembly on the hot path.
  //
  // This is NOT pre-grading. It never calls the grader, never predicts or creates a
  // verdict, never records an attempt, and never touches score/mastery — it only
  // builds and caches strings. The single AI call still happens in callGrader, only
  // after the student clicks Submit.
  const graderPrepCache = new Map(); // grader key -> { key, question, expected, messagePrefix }

  const compactForGrader = (value, limit) =>
    String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);

  // Cache key. The question TEXT alone is not a safe key: two different concepts
  // can generate identical question wording (every question is templated from
  // `Explain {name} ... apply it to this situation: {subject-wide application}`),
  // and the same concept is asked in both the learn and the mini-test phase. Keying
  // on text alone would serve the FIRST concept's EXPECTED/REQUIRED when a later
  // concept happened to produce the same sentence — grading the student against the
  // wrong rubric. Lesson + concept + mode identifies the asked item exactly.
  function graderKeyFor(concept, mode) {
    const lessonId = (state.lesson && state.lesson.id) || "";
    const conceptName = (concept && concept.name) || "";
    return lessonId + "::" + conceptName + "::" + (mode || "");
  }

  // Pure builder for a question's static grader payload (everything except the
  // student's answer). Same format callGrader has always sent, so a cached prep and
  // a freshly built one are byte-identical.
  function buildGraderPrep(key, question, expected, required) {
    const requiredPoints = Array.isArray(required)
      ? required.map((point) => compactForGrader(point, 240)).filter(Boolean).slice(0, 5)
      : [];
    const messagePrefix = [
      "QUESTION: " + compactForGrader(question, 900),
      "REFERENCE CONTEXT (not required): " + compactForGrader(expected, 1200),
      "REQUIRED: " + JSON.stringify(requiredPoints)
    ].join("\n");
    return {
      key: String(key || ""),
      question: String(question || ""),
      expected: String(expected || ""),
      messagePrefix
    };
  }

  // Idempotent cache fill. Safe to call repeatedly: it never makes a network request
  // and never predicts a grade. A cached entry is REUSED only when its question and
  // expected answer still match what is being asked; anything else is rebuilt, so a
  // stale or colliding entry can never be graded against.
  function prepareGrader(key, question, expected, required) {
    const cacheKey = String(key || "");
    if (!cacheKey || !String(question || "")) return null;
    const prep = graderPrepCache.get(cacheKey);
    if (prep && prep.question === String(question || "") && prep.expected === String(expected || "")) {
      return prep;
    }
    const fresh = buildGraderPrep(cacheKey, question, expected, required);
    graderPrepCache.set(cacheKey, fresh);
    return fresh;
  }

  // Look one step ahead and pre-assemble the NEXT question's grader payload when its
  // concept is already known — teaching steps carry their concept, and mini-test
  // steps do too once the adaptive plan is fixed (state.testPlan). This only READS
  // curriculum data through the same pure builders the flow uses; it never advances
  // the test pointer, mutates state, or touches the current question.
  function prepareNextGrader() {
    const next = state.steps[state.stepIndex + 1];
    if (!next) return;
    let concept = null;
    let mode = null;
    if (next.type === "teach") { concept = next.concept; mode = "learn"; }
    else if (next.type === "ask") {
      mode = next.mode || "test";
      // Mini-test concepts are assigned at runtime; runAsk reads plan[testAskIndex]
      // then increments, so by now testAskIndex already points at the NEXT one.
      concept = next.concept || (state.testPlan && state.testPlan[state.testAskIndex]) || null;
    }
    if (!concept) return;
    const data = mode === "learn" ? buildTeachTurn(concept) : buildQuestion(concept);
    prepareGrader(graderKeyFor(concept, mode), data.question, data.expected, data.required);
  }

  // Prepare the ACTIVE question (if one is awaiting an answer) and the upcoming one.
  // Scheduled off the hot path via scheduleIdle so it can never delay teaching text,
  // TTS, question rendering or the student typing.
  function prepareGradingAhead() {
    const p = state.pending;
    if (p && p.question && state.currentQid !== null &&
        state.pendingQid === state.currentQid && !state.consumedQids.has(state.currentQid)) {
      prepareGrader(graderKeyFor(p.concept, p.mode), p.question, p.expected, p.required);
    }
    prepareNextGrader();
  }

  // Run work when the browser is idle so preparation never competes with rendering
  // or speech. Falls back to a macrotask where requestIdleCallback is unavailable
  // (Safari, jsdom, the Node test harness). Errors are swallowed — preparation is a
  // best-effort optimisation whose failure must never reach the student.
  function scheduleIdle(fn) {
    const run = () => { try { fn(); } catch (_) { } };
    try {
      if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(run, { timeout: 800 });
        return;
      }
    } catch (_) { }
    setTimeout(run, 0);
  }

  // One grader request against ONE model. `prep` is the background-prepared static
  // payload (requirement 5A) — only the STUDENT line is assembled here, on the hot
  // path. This function is the ONE and ONLY place the AI grader is called.
  //
  // timeoutMs bounds the WHOLE attempt: request, response body and JSON parsing.
  // fetch() resolves as soon as the headers arrive, so a timer cleared at that point
  // would leave `res.json()` unbounded — a server that sends headers then stalls the
  // body would hang the submit forever with the student stuck on "Checking…". The
  // timer therefore stays armed until the reply is fully parsed, and the deadline is
  // also raced independently so a browser without AbortController still times out
  // instead of hanging.
  async function callGrader(prep, answer, model, timeoutMs) {
    const message = prep.messagePrefix + "\nSTUDENT: " + compactForGrader(answer, 3500);
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    let timedOut = false;
    let timer = null;

    const attempt = (async () => {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: GRADER_SYSTEM, message, model, max_tokens: 300, temperature: 0.2 }),
        signal: ctrl ? ctrl.signal : undefined
      });
      // Body read + parse stay INSIDE the timeout window above.
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      // The server may legitimately fail over to a fallback grader (api/ai.js) when
      // the primary is down/slow, so a differing model is expected, not an error —
      // the fallback follows the same JSON grader prompt, so its grade is just as
      // valid and the student never has to resubmit. Log it for visibility only.
      if (data.model && data.model !== model) console.info("E.J.AI graded by fallback model:", data.model);
      return data.reply || "";
    })();

    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        if (ctrl) { try { ctrl.abort(); } catch (_) { } }
        reject(new Error("grader timed out after " + timeoutMs + " ms"));
      }, timeoutMs);
    });

    try {
      return await Promise.race([attempt, deadline]);
    } catch (e) {
      // Relabel the opaque "signal is aborted without reason" so logs name the
      // real cause. Everything here is a FAILED ATTEMPT; evaluateAnswer decides
      // whether budget remains to fail over to the next model.
      if (timedOut || (e && e.name === "AbortError")) {
        throw new Error("grader timed out after " + timeoutMs + " ms");
      }
      throw new Error("grader request failed: " + ((e && e.message) || e));
    } finally {
      if (timer) clearTimeout(timer);
      // Never leave an unhandled rejection behind when the deadline lost the race.
      attempt.catch(() => { });
    }
  }

  // Robustly extract a JSON object from an LLM reply.
  function parseJSON(raw) {
    if (!raw) return null;
    let t = String(raw).trim();
    // strip code fences
    t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start !== -1 && end > start) {
      const slice = t.slice(start, end + 1);
      try { return JSON.parse(slice); } catch (_) { }
      // remove trailing commas, then retry
      try { return JSON.parse(slice.replace(/,\s*([}\]])/g, "$1")); } catch (_) { }
    }
    // Truncated (no closing brace, e.g. hit max_tokens) or otherwise malformed:
    // salvage the fields we need by regex so a valid verdict is still recovered.
    // This reads ONLY the model's own output — never keyword grading.
    const salvaged = salvageGrade(t);
    if (salvaged) return salvaged;
    return null;
  }

  // Recover the grader fields from a reply that would not JSON.parse. Returns an
  // object only when a valid verdict is present; feedback/score/correction are
  // best-effort and may be omitted (normalizeVerdict supplies sane defaults).
  function salvageGrade(text) {
    // Guard against the model echoing the schema line from the system prompt
    // ({"verdict":"correct|partial|incorrect","score":0,...}). The old regex matched
    // the literal enum inside that echo and salvaged verdict "correct" with the
    // placeholder score — silently turning a non-answer into a pass. An echo is not
    // a grade: refuse to salvage anything from a reply containing the enum literal,
    // and never accept a verdict that is immediately followed by "|".
    if (/correct\s*\|\s*partial\s*\|\s*incorrect/i.test(text)) return null;
    const vm = /"?verdict"?\s*:\s*"?(correct|partial|incorrect)\b"?(?!\s*\|)/i.exec(text);
    if (!vm) return null;
    const out = { verdict: vm[1].toLowerCase() };
    const unq = (s) => { try { return JSON.parse('"' + s + '"'); } catch (_) { return s; } };
    const fm = /"feedback"\s*:\s*"((?:\\.|[^"\\])*)"/i.exec(text);
    if (fm) out.feedback = unq(fm[1]);
    const sm = /"score"\s*:\s*(-?\d+(?:\.\d+)?)/i.exec(text);
    if (sm) out.score = Number(sm[1]);
    const cm = /"correction"\s*:\s*"((?:\\.|[^"\\])*)"/i.exec(text);
    if (cm) out.correction = unq(cm[1]);
    return out;
  }
  // ── Programmed lesson content (NO AI) ──────────────────────
  // The explanation, board and check question are built entirely from the
  // curriculum in teacherData.js, so a lesson loads instantly with no API call
  // and no "thinking" state. The AI is used only to grade a submitted answer.
  function buildTeachTurn(concept) {
    const question = (concept.teaching && concept.teaching.check)
      || `In your own words, what is ${concept.name}, and where would you use it?`;
    return {
      explanation: fallbackTeaching(concept),
      board: { concept: concept.name, points: fallbackPoints(concept), code: "" },
      question,
      expected: teachingExpected(concept),
      required: requiredFromConcept(concept, question)
    };
  }

  function fallbackTeaching(concept) {
    const t = concept.teaching || {};
    return [
      `${concept.name}: ${t.definition || concept.note}`,
      t.purpose ? `Why it matters: ${t.purpose}` : "",
      t.how ? `How it works: ${t.how}` : "",
      t.example ? `Example: ${t.example}` : "",
      t.commonMistake ? `Watch out for this mistake: ${t.commonMistake}` : "",
      t.connections ? `Connection: ${t.connections}` : ""
    ].filter(Boolean).join("\n\n");
  }
  function fallbackPoints(concept) {
    const t = concept.teaching || {};
    return [t.definition || concept.note, t.how, t.example, t.commonMistake ? `Common mistake: ${t.commonMistake}` : ""].filter(Boolean).slice(0, 5);
  }
  function teachingExpected(concept) {
    const t = concept.teaching || {};
    return [t.definition || concept.note, t.how, t.example, t.application, t.connections].filter(Boolean).join(" ");
  }

  // Essential-points rubric handed to the grader, derived from the QUESTION that is
  // actually asked. Only genuinely essential points belong here — NOT every detail —
  // so a concise correct answer still passes.
  //
  // This used to be a blind [definition, how] for every question. That was wrong on
  // both halves: `teaching.how` is a bucket string shared by every concept matching
  // the same name regex (and a generic default when none match), so the grader was
  // told to require a point that often had nothing to do with the question; and the
  // second point was demanded even when the question only asked for one thing.
  // Now the definition is always required (every question asks the student to
  // explain the concept) and a second point is added ONLY when the question text
  // actually asks for it.
  function requiredFromConcept(concept, question) {
    const t = (concept && concept.teaching) || {};
    const name = (concept && concept.name) || "the concept";
    const q = String(question || "");
    const points = [];

    const definition = t.definition || (concept && concept.note);
    if (definition) points.push(String(definition).trim());

    if (/apply it to this situation/i.test(q)) {
      points.push("Applies " + name + " to the specific situation described in the question.");
    } else if (/where would you use it/i.test(q)) {
      points.push("Names a realistic situation where " + name + " would be used.");
    } else if (/with an example/i.test(q)) {
      points.push("Gives a concrete example of " + name + ".");
    }

    if (/what could go wrong|risk(?:s)?(?: or limitation(?:s)?)?|if it is used incorrectly|limitation(?:s)? (?:a practitioner )?should review/i.test(q)) {
      points.push("Explains a relevant risk, limitation or consequence of using " + name + " incorrectly.");
    }

    return points.filter(Boolean).slice(0, 3);
  }
  // ── Programmed mini-test question (NO AI) ──────────────────
  // Comes straight from the concept's programmed check prompt — instant, no API.
  function buildQuestion(concept) {
    const question = (concept.teaching && concept.teaching.check)
      || `Explain ${concept.name} with an example.`;
    return {
      question,
      expected: teachingExpected(concept),
      required: requiredFromConcept(concept, question)
    };
  }
  // ── AI operation: evaluate a student's answer (the ONE grader path) ──
  // JavaScript does NOT semantically grade the answer. It calls the DeepSeek
  // grader, validates the JSON shape and verdict enum, and normalises the fields.
  // No keyword matching, token overlap, score thresholds, missing.length or
  // answer-length ever decides or overrides the verdict the AI chose.

  // Returned by evaluateAnswer when the grader cannot produce a valid verdict
  // (invalid JSON twice, or an API/network failure). The caller must NOT mark the
  // student wrong: it keeps the current question and offers a retry.
  const GRADER_UNAVAILABLE = { unavailable: true };

  // The score band each verdict must fall inside. This is the validation rule for
  // the AI's own number (requirement 3) — NOT a verdict-to-score conversion table.
  const SCORE_BANDS = { correct: [80, 100], partial: [40, 79], incorrect: [0, 39] };

  // Don't start a grader attempt with less than this left of the shared budget.
  const MIN_GRADE_ATTEMPT_MS = 2500;

  // Grade one answer. Walks the model chain under ONE shared deadline, so the
  // student waits at most GRADE_TOTAL_BUDGET_MS in total no matter how many
  // fallbacks run — never the full per-attempt timeout once per model.
  //
  // A fallback is taken for BOTH failure kinds (requirement 5):
  //   - the request failed (timeout / network / HTTP error), and
  //   - the request succeeded but the reply was not valid grader JSON.
  // The student is never asked to resubmit, and no verdict is ever invented: if
  // every model in the chain fails, this returns GRADER_UNAVAILABLE and the caller
  // records nothing at all.
  async function evaluateAnswer(prep, answer) {
    const deadline = Date.now() + GRADE_TOTAL_BUDGET_MS;
    for (let i = 0; i < GRADER_MODEL_CHAIN.length; i++) {
      const remaining = deadline - Date.now();
      // Don't start an attempt that cannot realistically finish inside the budget.
      if (remaining < MIN_GRADE_ATTEMPT_MS) {
        console.warn("grading budget exhausted; " + remaining + " ms left");
        break;
      }
      const model = GRADER_MODEL_CHAIN[i];
      const timeoutMs = Math.min(PER_ATTEMPT_TIMEOUT_MS, remaining);
      let reply;
      try {
        reply = await callGrader(prep, answer, model, timeoutMs);
      } catch (e) {
        console.warn("grader [" + model + "] request failed:", e.message);
        continue; // request failure -> fail over to the next model
      }
      const verdict = normalizeVerdict(parseJSON(reply), prep.expected);
      if (verdict) return verdict;
      console.warn("grader [" + model + "] returned invalid JSON; failing over");
      // invalid grader JSON -> fail over to the next model
    }
    return GRADER_UNAVAILABLE;
  }

  // Validate + coerce the grader JSON to the internal shape. Returns null when the
  // reply is unusable — missing JSON, a verdict outside the three allowed values, or
  // no finite score — so evaluateAnswer fails over to the next model in the chain and,
  // if none succeeds, the answer is recorded as unverified rather than marked wrong.
  // The verdict is authoritative; the score is the AI's own number, validated (clamped)
  // into the band its verdict implies and never replaced by a per-verdict constant.
  function normalizeVerdict(j, expected) {
    if (!j || typeof j !== "object") return null;
    const verdict = String(j.verdict || "").toLowerCase().trim();
    const band = SCORE_BANDS[verdict];
    if (!band) return null;
    // The AI's own number is the score we keep — it is never replaced by a fixed
    // per-verdict constant. A reply with no usable number is INCOMPLETE grader
    // output, not a licence to invent one: it is rejected so evaluateAnswer fails
    // over to the next model, exactly as it would for any other malformed JSON.
    const scoreRaw = Number(j.score);
    if (!Number.isFinite(scoreRaw)) return null;
    // Validate the AI's score against the band its own verdict implies. The verdict
    // is authoritative (requirement 2), so a number outside the band is clamped into
    // it rather than being allowed to contradict the verdict it came with.
    const score = Math.max(band[0], Math.min(band[1], Math.round(scoreRaw)));
    const missing = Array.isArray(j.missing)
      ? j.missing.map((s) => String(s).trim()).filter(Boolean).slice(0, 5) : [];
    const correction = String(j.correction || "").trim();
    return {
      verdict,
      score,
      missing,
      feedback: String(j.feedback || "").trim() || defaultFeedback(verdict),
      // Drives the "The key idea is: …" spoken line for non-correct answers.
      correctAnswer: correction || String(expected || "").trim(),
      misconception: verdict === "correct" ? "" : (correction || missing[0] || "")
    };
  }

  function defaultFeedback(verdict) {
    if (verdict === "correct") return "That's right — well done!";
    if (verdict === "partial") return "You're on the right track, but it's not complete yet.";
    return "Not quite — let's look at the correct idea together.";
  }

  // ── Mastery model (built ONLY from real, AI-graded answer activity) ───
  // ONE store, used by everything: the on-screen mastery chip, the adaptive
  // mini-test selection and the results lists. It accumulates the AI's own
  // validated 0-100 scores, so mastery can never disagree with the score the
  // student was actually given. Only successfully graded answers reach this —
  // skipped and unverified (grader-unavailable) answers never call recordAttempt.
  function masteryFor(name) {
    if (!state.mastery[name]) {
      state.mastery[name] = { attempts: 0, scoreSum: 0, correct: 0, partial: 0, lastMisconception: "" };
    }
    return state.mastery[name];
  }
  function recordAttempt(name, verdict, score, misconception) {
    const m = masteryFor(name);
    m.attempts++;
    m.scoreSum += Math.max(0, Math.min(100, Number(score) || 0));
    if (verdict === "correct") m.correct++;
    else if (verdict === "partial") m.partial++;
    if (misconception) m.lastMisconception = misconception;
    return m;
  }
  // Mean AI score for a concept, normalised to 0..1.
  function masteryScore(name) {
    const m = state.mastery[name];
    if (!m || !m.attempts) return 0;
    return (m.scoreSum / m.attempts) / 100;
  }
  // Labels sit on the SAME boundaries as SCORE_BANDS, so a concept whose answers
  // the AI marked "correct" (80-100) always reads Strong or better, "partial"
  // (40-79) reads Developing or Good, and "incorrect" (0-39) reads Needs practice.
  function masteryLabel(name) {
    const m = state.mastery[name];
    if (!m || !m.attempts) return "Not assessed";
    const s = masteryScore(name);
    if (s >= 0.9) return "Excellent";
    if (s >= 0.8) return "Strong";
    if (s >= 0.6) return "Good";
    if (s >= 0.4) return "Developing";
    return "Needs practice";
  }
  // ── Interaction UI helpers ──────────────────────────────────
  const PHASES = {
    welcome: { text: "Welcome", cls: "is-teaching" },
    teaching: { text: "👨‍🏫 Teaching", cls: "is-teaching" },
    turn: { text: "🎤 Your turn", cls: "is-turn" },
    thinking: { text: "🧠 E.J.AI thinking", cls: "is-thinking" },
    correct: { text: "✅ Correct", cls: "is-correct" },
    retry: { text: "💡 Try again", cls: "is-retry" },
    challenge: { text: "🔥 Challenge", cls: "is-challenge" },
    testintro: { text: "🎯 Mini-test", cls: "is-turn" },
    complete: { text: "🏆 Complete", cls: "is-correct" }
  };
  function setPhase(key, rawText) {
    const p = PHASES[key];
    const text = p ? p.text : (rawText || key);
    el.phaseChip.className = "phase-chip" + (p && p.cls ? " " + p.cls : "");
    el.phaseChip.textContent = text;
    if (!p || p.cls !== "is-challenge") {
      el.phaseChip.classList.remove("pop");
      void el.phaseChip.offsetWidth; // restart the pop animation
      el.phaseChip.classList.add("pop");
    }
  }

  // Concept mastery = how much of the lesson's material the student has shown they
  // know, across ALL of its concepts (a concept not yet answered counts as 0, so the
  // chip climbs as the class progresses). Reads the SAME masteryScore() the adaptive
  // mini-test and the results lists use, so the displayed number can never disagree
  // with the mastery driving question selection.
  function conceptMastery() {
    const lesson = state.lesson;
    const concepts = (lesson && lesson.concepts) || [];
    if (!concepts.length) return 0;
    let sum = 0;
    concepts.forEach((c) => { sum += masteryScore(c.name); });
    return Math.round(Math.min(1, sum / concepts.length) * 100);
  }
  function updateMetrics(qLabel) {
    if (el.qCounter) {
      if (qLabel) el.qCounter.textContent = qLabel;
      else if (state.totalQuestions) {
        el.qCounter.textContent =
          "Question " + Math.min(state.questionNum, state.totalQuestions) +
          " of " + state.totalQuestions;
      }
    }
    if (el.masteryVal) el.masteryVal.textContent = conceptMastery() + "%";
  }

  function showBoard(board) {
    el.boardConcept.textContent = board.concept || "";
    el.boardPoints.innerHTML = "";
    (board.points || []).forEach((p) => {
      if (!p) return;
      const li = document.createElement("li");
      li.textContent = p;
      el.boardPoints.appendChild(li);
    });
    if (board.code) {
      el.boardCode.textContent = board.code;
      el.boardCode.hidden = false;
    } else {
      el.boardCode.textContent = "";
      el.boardCode.hidden = true;
    }
    el.board.classList.remove("empty");
  }
  function clearBoard() { el.board.classList.add("empty"); }

  // FIX #9: showQuestion no longer scrolls itself. The caller is responsible
  // for scrolling after showAnswerArea(true) so we never scroll to a hidden
  // element. showQuestion only renders the question text and reveals the box.
  function showQuestion(text) {
    el.questionText.textContent = text || "";
    el.questionBox.classList.remove("empty");
    // Do NOT scroll here — answerArea may still be hidden at this point.
    // The caller must call showAnswerArea(true) then scrollToInteraction.
  }
  function renderQuestionForQid(qid, text) {
    if (qid === null || state.consumedQids.has(qid) || state.renderedQids.has(qid)) return false;
    state.renderedQids.add(qid);
    showQuestion(text);
    return true;
  }
  function clearQuestion() { el.questionBox.classList.add("empty"); }

  // Transient "checking…" state shown in the SAME feedback card the verdict will
  // land in. It does NOT scroll: on Submit the viewport moves UP to the teacher
  // (scrollToTeacher) while grading runs; the verdict later calls its own scroll.
  function showChecking() {
    el.feedback.classList.remove("empty", "correct", "partial", "incorrect");
    el.feedback.classList.add("checking");
    el.verdict.textContent = "Checking…";
    el.verdictText.textContent = "E.J.AI is checking your answer…";
  }

  function showFeedback(verdict, text) {
    el.feedback.classList.remove("empty", "checking", "correct", "partial", "incorrect");
    el.feedback.classList.add(verdict);
    el.verdict.textContent =
      verdict === "correct" ? "Correct" : verdict === "partial" ? "Almost" : "Not quite";
    el.verdictText.textContent = text || "";
    scrollToInteraction("feedback");
  }
  function clearFeedback() {
    el.feedback.classList.add("empty");
    el.feedback.classList.remove("checking", "correct", "partial", "incorrect");
  }

  // FIX #9: showAnswerArea scrolls to the answer AFTER revealing the element
  // (via requestAnimationFrame in scrollToInteraction), so scrollIntoView always
  // targets a visible element and is never called on a hidden container.
  function showAnswerArea(show) {
    el.answerArea.classList.toggle("hidden", !show);
    if (show) {
      el.answerInput.value = "";
      el.transcript.innerHTML = "";
      el.transcript.classList.remove("active");
      el.submitAnswerBtn.disabled = false;
      el.skipQuestionBtn.disabled = false;
      // Scroll AFTER the element is visible.
      scrollToInteraction("answer");
    } else if (stt.recording) {
      try { stt.rec.stop(); } catch (_) { }
    }
  }

  function scrollToInteraction(kind) {
    const target = kind === "feedback" ? el.feedback : el.answerArea;
    if (!target || target.classList.contains("hidden") || target.classList.contains("empty")) return;
    // Feedback anchors to the top (with a navbar offset via scroll-margin-top)
    // so "checking…" and the verdict land at the same stable position — the
    // viewport barely moves between the two. The answer area stays centred.
    const block = kind === "feedback" ? "start" : "center";
    window.requestAnimationFrame(() => {
      try {
        target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block, inline: "nearest" });
      } catch (_) { try { target.scrollIntoView(); } catch (__) { } }
    });
  }

  // On Submit, bring the E.J.AI teacher card into view (scroll UP) so the student
  // watches the teacher while their answer is graded. Prefers the whole
  // .teacher-stage; falls back to the avatar, then to the top of the page.
  // scroll-margin-top on .teacher-stage (teacher.css) clears the sticky navbar.
  function scrollToTeacher() {
    const stage = (el.avatar && typeof el.avatar.closest === "function" && el.avatar.closest(".teacher-stage")) || el.avatar;
    if (!stage) return;
    window.requestAnimationFrame(() => {
      try {
        stage.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start", inline: "nearest" });
      } catch (_) {
        try { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); } catch (__) { }
      }
    });
  }

  function showContinue(label) {
    el.continueBtn.textContent = label || "Continue →";
    el.continueRow.classList.remove("hidden");
    if (!el.feedback.classList.contains("empty")) scrollToInteraction("feedback");
  }
  function hideContinue() { el.continueRow.classList.add("hidden"); }
  // ── Flow controller ─────────────────────────────────────────
  function introText() {
    const names = state.lesson.concepts.map((c) => c.name);
    const preview = names.slice(0, 3).join(", ");
    return `Hi, I'm E.J.AI, your teacher for today. Welcome to ${state.subject.name}. ` +
      `In this lesson, "${state.lesson.title}", we'll cover ${preview}` +
      (names.length > 3 ? ", and more." : ".") +
      ` I'll explain each idea, then ask you a question. Ready? Let's begin.`;
  }

  function startClass(subjectId, lessonId) {
    const subj = window.teacherData.getSubject(subjectId);
    const lsn = window.teacherData.getLesson(subjectId, lessonId);
    if (!subj || !lsn) return;
    state.subject = subj;
    state.lesson = normalizeLesson(lsn);
    state.steps = buildSteps(state.lesson);
    state.totalQuestions = state.steps.filter((s) => s.type === "teach" || s.type === "ask").length;
    state.questionNum = 0;
    state.stepIndex = -1;
    state.answers = [];
    state.mastery = {};
    state.testPlan = [];
    state.testAskIndex = 0;
    state.busy = false;
    state.runToken++;
    state.consumedQids = new Set();
    state.renderedQids = new Set();
    state.advancedQids = new Set();
    state.currentQid = null;
    state.pendingQid = null;
    state.nextQid = 0;
    state.advanceLocked = false;
    graderPrepCache.clear(); // drop any grader payloads prepared for a previous class
    el.classSubject.textContent = `${subj.icon}  ${subj.name}`;
    el.classLesson.textContent = lsn.title;
    clearBoard(); clearQuestion(); clearFeedback();
    showAnswerArea(false); hideContinue();
    clearSayText();
    updateProgress();
    updateMetrics("Lesson starting…");
    showScreen("class");
    // Start the first real utterance while the Start/Retry/Recommendation click
    // is still active. Mobile Chrome can discard speech first requested after an
    // async typewriter/microtask, even though the click began the lesson. The
    // selected voice is used when available; otherwise the utterance deliberately
    // lets Chrome choose its available default instead of failing silently.
    const initialText = introText();
    setAvatarState("speaking");
    const initialVoice = speak(initialText);
    const initialSpeech = { runToken: state.runToken, text: initialText, voice: initialVoice };
    tts.gestureIntro = initialSpeech;
    initialVoice.then((result) => {
      // Do not let an old intro reset the avatar while another line is speaking.
      if ((!result || !result.cancelled) && tts.gestureIntro === initialSpeech && !tts.active) {
        setAvatarState("idle");
      }
    });
    if (!tts.supported || state.muted) setAvatarState("idle");
    nextStep();
  }

  function nextStep() {
    state.stepIndex++;
    updateProgress();
    const step = state.steps[state.stepIndex];
    if (!step) { finishClass(); return; }
    // A step must never be able to strand the class: any unexpected error still
    // leaves the learner a Continue button.
    Promise.resolve()
      .then(() => runStep(step))
      .catch((e) => {
        console.error("step failed:", e);
        state.busy = false;
        setAvatarState("idle");
        if (!el.sayText.textContent) {
          el.sayText.textContent = "Sorry, something went wrong on my side. Let's carry on.";
        }
        showContinue("Continue →");
      });
  }

  async function runStep(step) {
    hideContinue();
    clearFeedback();
    switch (step.type) {
      case "intro": return runIntro();
      case "teach": return runTeach(step.concept);
      case "test-intro": return runTestIntro();
      case "ask": return runAsk(step.concept, step.mode);
      case "finish": return finishClass();
      default: return nextStep();
    }
  }

  async function runIntro() {
    const runToken = state.runToken;
    setPhase("welcome");
    updateMetrics("Lesson intro");
    clearBoard(); clearQuestion(); showAnswerArea(false);
    const intro = introText();
    // startClass already issued this exact line in the activating click. Keep
    // the normal caption timing, but do not cancel and replay the utterance.
    const initial = tts.gestureIntro;
    const usedGestureSpeech = initial && initial.runToken === runToken && initial.text === intro;
    await typeText(intro);
    if (!usedGestureSpeech) speakBackground(intro);
    // The class can be ended or restarted while the intro is still speaking; without
    // this check the old run would paint its Continue button over the results screen.
    if (runToken !== state.runToken) return;
    showContinue("Start learning →");
    // Requirement 5A: pre-warm the very first question's grader payload while the
    // student reads the intro — purely static, no AI.
    scheduleIdle(prepareNextGrader);
  }
  async function runTeach(concept) {
    const runToken = state.runToken;
    setPhase("teaching");
    clearQuestion(); showAnswerArea(false); clearBoard();
    clearSayText();
    // Programmed lesson content loads instantly from teacherData.js — no API
    // call and no "thinking" state.
    const turn = buildTeachTurn(concept);
    // Board first (visual anchor), then render + speak the explanation.
    showBoard(turn.board);
    const said = await say(turn.explanation);
    // Let E.J.AI actually finish speaking the teaching before moving on. The
    // text is already on screen; this only holds the scroll/question until the
    // spoken explanation settles, including the TTS failure watchdogs.
    await waitForSpeech(said, turn.explanation);
    if (runToken !== state.runToken) return;
    // Ask the paired question (spoken + pinned, but keep the explanation caption).
    const qid = assignQid();
    state.currentQid = qid;
    state.pendingQid = qid;
    state.pending = { concept, question: turn.question, expected: turn.expected, required: turn.required, mode: "learn" };
    // If the question cannot be rendered (qid already consumed/rendered, or the
    // class moved on), roll the pending state back. Leaving it set would strand the
    // class with a question that has no visible answer area and no way forward.
    if (!renderQuestionForQid(qid, turn.question)) {
      if (state.currentQid === qid) state.currentQid = null;
      if (state.pendingQid === qid) { state.pendingQid = null; state.pending = null; }
      return;
    }
    // Speak the question in the background — the answer area must not wait for it.
    speakBackground(turn.question);
    state.questionNum++;
    setPhase("turn");
    updateMetrics();
    showAnswerArea(true);
    el.answerInput.focus();
    // Requirement 5A: background-prepare grading for THIS question and the next one,
    // off the hot path. No AI call, no scoring — only cached string assembly so that
    // Submit can fire the grader request immediately.
    scheduleIdle(prepareGradingAhead);
  }

  async function runTestIntro() {
    const runToken = state.runToken;
    setPhase("testintro");
    updateMetrics("Mini-test");
    clearBoard(); clearQuestion(); showAnswerArea(false);
    // Pick the mini-test concepts adaptively from real performance so far.
    state.testPlan = selectTestConcepts(state.lesson);
    state.testAskIndex = 0;
    const line =
      "Great work getting through the lesson! Now let's do a short mini-test to check what you remember. " +
      "Answer each question as best you can.";
    await say(line);
    // End Class / Retake during this line must not resurrect the mini-test.
    if (runToken !== state.runToken) return;
    showContinue("Start mini-test →");
    // Requirement 5A: the adaptive plan is now fixed, so pre-warm the first
    // mini-test question's grader payload while the student reads this intro.
    scheduleIdle(prepareNextGrader);
  }

  async function runAsk(concept, mode) {
    const runToken = state.runToken;
    setPhase(mode === "test" ? "challenge" : "turn");
    clearBoard(); showAnswerArea(false);
    // The class may have been ended/restarted between the step dispatch and here;
    // consuming a mini-test slot for a dead run would desynchronise the plan.
    if (runToken !== state.runToken) return;
    // In the mini-test, the concept is assigned at runtime from the adaptive plan.
    if (!concept) {
      const plan = state.testPlan || [];
      concept = plan[state.testAskIndex++] || state.lesson.concepts[0];
    }
    // Programmed question loads instantly from teacherData.js — no API call.
    const q = buildQuestion(concept);
    const qid = assignQid();
    state.currentQid = qid;
    state.pendingQid = qid;
    state.pending = { concept, question: q.question, expected: q.expected, required: q.required, mode: mode || "test" };
    // Show the question first, then speak in background, then reveal the answer
    // area so the scroll target is always visible when scrollToInteraction fires.
    // Roll pending state back if the question cannot be rendered (see runTeach).
    if (!renderQuestionForQid(qid, q.question)) {
      if (state.currentQid === qid) state.currentQid = null;
      if (state.pendingQid === qid) { state.pendingQid = null; state.pending = null; }
      return;
    }
    state.questionNum++;
    if (mode !== "test") setPhase("turn");
    updateMetrics();
    speakBackground(q.question);
    showAnswerArea(true);
    el.answerInput.focus();
    // Requirement 5A: background-prepare grading for THIS question and the next one
    // (see runTeach). Static-only, off the hot path.
    scheduleIdle(prepareGradingAhead);
  }

  // ── Answer submission + evaluation ─────────────────────────
  // NOTE: there is deliberately no verdict->score table here any more. The score
  // stored for an answer is the AI's own validated number (see SCORE_BANDS).

  // Public entry point: guarantees the busy flag is released and the learner is
  // never left without a way forward, whatever fails inside.
  function handleSubmit() {
    submitAnswer().catch((e) => {
      console.error("submit failed:", e);
      if (state.currentQid === null) return;
      state.busy = false;
      el.submitAnswerBtn.disabled = false;
      el.skipQuestionBtn.disabled = false;
      setAvatarState("idle");
      showContinue("Continue →");
    });
  }

  async function submitAnswer() {
    if (state.busy || !state.pending) return;
    if (state.currentQid === null || state.pendingQid !== state.currentQid || state.consumedQids.has(state.currentQid)) return;
    const answer = el.answerInput.value.trim();
    if (!answer) {
      el.answerInput.focus();
      el.answerInput.classList.add("nudge");
      setTimeout(() => el.answerInput.classList.remove("nudge"), 400);
      return;
    }
    if (stt.recording) { try { stt.rec.stop(); } catch (_) { } }
    state.busy = true;
    el.submitAnswerBtn.disabled = true;
    el.skipQuestionBtn.disabled = true;
    // Cancel any lingering speech (e.g. the question still being read) so nothing
    // overlaps the grading feedback — only one voice ever plays at a time.
    stopSpeaking();
    // Requirement 1: the moment Submit is pressed, scroll UP to the teacher so the
    // student watches E.J.AI while the answer is graded.
    scrollToTeacher();

    const pending = state.pending;
    const { concept, question } = pending;
    // Capture the qid at submission time so a stale async result from a different
    // question can be discarded — never render feedback for the wrong qid.
    const qid = state.currentQid;

    // Requirement 5A: take the background-prepared static payload for THIS exact
    // question. prepareGrader is keyed by lesson+concept+mode and re-verifies the
    // question/expected text, so a warm cache is used immediately and a missing or
    // mismatched entry is rebuilt here — never graded against the wrong rubric.
    const prep = prepareGrader(
      graderKeyFor(concept, pending.mode), question, pending.expected, pending.required
    ) || buildGraderPrep("", question, pending.expected, pending.required);

    // Requirement 1: only LOOK busy if grading is slow. If the grade arrives within
    // THINKING_DELAY_MS this timer is cleared and never fires, so a fast answer
    // shows no thinking state and plays no waiting line. If grading is still running
    // after the delay, show thinking + say the waiting line exactly once.
    let waitingTimer = setTimeout(() => {
      waitingTimer = null;
      if (state.currentQid !== qid || state.consumedQids.has(qid)) return;
      setPhase("thinking");
      showChecking();
      if (!state.muted && tts.supported) {
        // speak() (not say()) so the waiting line never disturbs the caption/typewriter.
        // gen identifies the generation speak() will claim (cancelSpeechQueue increments it).
        const gen = tts.generation + 1;
        const v = speak(WAITING_LINE);
        setAvatarState("speaking"); // lip-sync (is-voicing) still only arms on real audio (u.onstart)
        v.then((r) => {
          if (r && r.cancelled) return;
          if (gen !== tts.generation) return; // a newer line took over
          if (state.currentQid === qid && !state.consumedQids.has(qid)) setAvatarState("thinking");
        });
      } else {
        setAvatarState("thinking");
      }
    }, THINKING_DELAY_MS);

    let result;
    try {
      result = await evaluateAnswer(prep, answer);
    } finally {
      // Grade is in (or errored) — stop the pending "slow" treatment either way.
      if (waitingTimer) { clearTimeout(waitingTimer); waitingTimer = null; }
    }

    // Verify this result still belongs to the active question — a Skip, a new
    // question, or the class ending while awaiting the grader invalidates it.
    if (state.currentQid !== qid || state.consumedQids.has(qid)) {
      clearFeedback();
      return;
    }
    // Cancel the waiting line if it is still speaking, so it never overlaps the verdict.
    stopSpeaking();

    // Requirement 4: grader unavailable (invalid JSON twice, or an API/network/
    // total-failover failure). NEVER mark the student wrong and NEVER show an error.
    // Say a short, friendly line and auto-advance — the lesson is never blocked, and
    // this question is left out of mastery/score (no recordAttempt) rather than failed.
    if (result.unavailable) {
      clearFeedback();
      setPhase("turn");
      showAnswerArea(false);
      // Requirement 4: log it as UNVERIFIED so results can tell "we could not check
      // this" apart from "skipped", and so it is excluded from the score rather than
      // counted as a zero. No verdict, no score, no mastery, no attempt is invented.
      state.answers.push({
        concept: concept.name, verdict: "unverified", score: null, qid: qid, mode: pending.mode
      });
      const said = await say(GRADER_FAIL_LINE);
      await waitForSpeech(said, GRADER_FAIL_LINE);
      if (state.currentQid !== qid || state.consumedQids.has(qid)) return;
      advanceAfterQuestion(qid);
      return;
    }

    // Record real activity. The score stored is the AI's OWN validated 0-100 number
    // (normalizeVerdict clamps it into the band its verdict implies) — never a fixed
    // 100/50/0 derived from the verdict.
    recordAttempt(concept.name, result.verdict, result.score, result.misconception);
    state.answers.push({
      concept: concept.name, verdict: result.verdict, score: result.score, qid: qid, mode: pending.mode
    });

    // Every submitted qid is terminal. Feedback is shown before consuming it.
    showAnswerArea(false);
    let spoken = result.feedback;
    if (result.verdict !== "correct" && result.correctAnswer) {
      spoken += ` The key idea is: ${result.correctAnswer}`;
    }
    setPhase(result.verdict === "correct" ? "correct" : "retry");
    updateMetrics();
    showFeedback(result.verdict, spoken);

    // Requirement 2: show the verdict + explanation, then AUTO-CONTINUE for every
    // verdict (correct / almost / incorrect). Finish the complete feedback text and
    // its bounded speech before the single advance so nothing is cut off.
    const feedbackSaid = await say(spoken);
    await waitForSpeech(feedbackSaid, spoken);
    // Verify qid is still active after speech — stale results must not continue.
    // Both halves matter: currentQid moving on, AND this qid having been consumed
    // (by Skip, End Class or a finish) while the feedback was being spoken. The
    // consumed check used to be missing here even though the two earlier stale
    // guards have it, which let a late feedback advance the class a second time.
    if (state.currentQid !== qid || state.consumedQids.has(qid)) return;

    advanceAfterQuestion(qid);
  }

  // Two clicks dispatched in the same frame both saw the button as visible and both
  // called nextStep(), silently skipping a step. hideContinue() alone is not a guard
  // because the second click's handler is already queued. continueLocked closes that
  // window; it is released on the next macrotask, by which time the step that
  // nextStep() started has taken ownership of the UI.
  let continueLocked = false;
  function onContinue() {
    if (state.busy || continueLocked) return;
    if (el.continueRow && el.continueRow.classList.contains("hidden")) return;
    continueLocked = true;
    setTimeout(() => { continueLocked = false; }, 0);
    hideContinue();
    clearFeedback();
    nextStep();
  }
  // ── Results ─────────────────────────────────────────────────
  function computeResults() {
    // Requirement 4: the final score is the MEAN OF THE AI'S OWN SCORES over the
    // answers that were actually graded. Two kinds of entry are excluded from BOTH
    // the numerator and the denominator, so neither can drag the score down:
    //   - "skipped"    — the student chose not to answer (no AI call was made)
    //   - "unverified" — every grader in the chain failed, so there is no real grade
    // A graded answer always carries a finite AI score, so the isFinite test is what
    // separates "graded" from "not graded" rather than the old `a.score || 0`, which
    // silently turned a legitimate 0 into a non-answer.
    const graded = state.answers.filter((a) => Number.isFinite(a.score));
    const answered = graded.length;
    const correct = graded.filter((a) => a.verdict === "correct").length;
    const partial = graded.filter((a) => a.verdict === "partial").length;
    const skipped = state.answers.filter((a) => a.verdict === "skipped").length;
    const unverified = state.answers.filter((a) => a.verdict === "unverified").length;
    const sumScore = graded.reduce((t, a) => t + a.score, 0);
    const score = answered ? Math.round(sumScore / answered) : 0;
    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;

    // Strengths vs. needs-practice come from the mastery model (real activity).
    const good = [], work = [];
    const assessed = Object.keys(state.mastery).filter((n) => state.mastery[n].attempts > 0);
    assessed.forEach((name) => {
      const label = masteryLabel(name);
      const strong = label === "Good" || label === "Strong" || label === "Excellent";
      const entry = { name, label, misconception: state.mastery[name].lastMisconception || "" };
      (strong ? good : work).push(entry);
    });
    // Weakest first in the practice list.
    work.sort((a, b) => masteryScore(a.name) - masteryScore(b.name));
    const conceptsCovered = assessed.length;
    return { answered, correct, partial, skipped, unverified, score, accuracy, good, work, conceptsCovered };
  }

  function gradeFor(score, answered) {
    // Nothing was graded — every question was skipped, or the grader was unavailable
    // for all of them. A 0 here would read as "you failed" for something that was
    // never actually assessed, so say plainly that there is no grade to give.
    if (!answered) {
      return {
        grade: "Not graded",
        sub: "No answers were graded this time, so there's no score to show. Try the lesson again."
      };
    }
    if (score >= 85) return { grade: "Excellent — Grade A", sub: "Outstanding understanding of this lesson." };
    if (score >= 70) return { grade: "Good — Grade B", sub: "Solid grasp, with a little polish needed." };
    if (score >= 50) return { grade: "Fair — Grade C", sub: "You're getting there — review the flagged concepts." };
    return { grade: "Keep practising — Grade D", sub: "Revisit this lesson and try again. You've got this!" };
  }

  function paintScoreRing(score) {
    const r = parseFloat(el.scoreFill.getAttribute("r")) || 52;
    const circ = 2 * Math.PI * r;
    el.scoreFill.style.strokeDasharray = String(circ);
    // start empty, then animate to value
    el.scoreFill.style.strokeDashoffset = String(circ);
    requestAnimationFrame(() => {
      el.scoreFill.style.strokeDashoffset = String(circ * (1 - Math.max(0, Math.min(100, score)) / 100));
    });
    // count-up number
    const startT = performance.now();
    const dur = reduceMotion ? 0 : 900;
    function tick(now) {
      const p = dur ? Math.min(1, (now - startT) / dur) : 1;
      el.scoreNum.textContent = String(Math.round(p * score));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function fillConceptList(listEl, noneEl, items) {
    listEl.innerHTML = "";
    if (!items.length) {
      noneEl.hidden = false;
      return;
    }
    noneEl.hidden = true;
    items.forEach((item) => {
      const li = document.createElement("li");
      if (typeof item === "string") {
        li.textContent = item;
      } else {
        // Show the specific misconception when we have one, else the mastery label.
        const detail = item.misconception || item.label;
        li.textContent = detail ? `${item.name} — ${detail}` : item.name;
      }
      listEl.appendChild(li);
    });
  }

  async function finishClass() {
    stopSpeaking();
    state.runToken++;
    if (state.currentQid !== null) state.consumedQids.add(state.currentQid);
    state.currentQid = null;
    state.pendingQid = null;
    state.pending = null;
    state.busy = false;
    if (stt.recording) { try { stt.rec.stop(); } catch (_) { } }
    setPhase("complete");
    updateMetrics("Class complete");
    el.progressBar.style.width = "100%";
    if (el.progressWrap) el.progressWrap.setAttribute("aria-valuenow", "100");

    const r = computeResults();
    const g = gradeFor(r.score, r.answered);

    el.resultsSubtitle.textContent =
      `${state.subject.name} · ${state.lesson.title}`;
    paintScoreRing(r.score);
    el.scoreGrade.textContent = g.grade;
    el.scoreSub.textContent = g.sub;
    el.statAnswered.textContent = String(r.answered);
    el.statCorrect.textContent = String(r.correct);
    el.statAccuracy.textContent = r.accuracy + "%";
    el.statConcepts.textContent = String(r.conceptsCovered);

    fillConceptList(el.goodList, el.goodNone, r.good);
    fillConceptList(el.workList, el.workNone, r.work);

    // Recommendation: if the score is low, review THIS lesson first;
    // otherwise move on to the next lesson.
    let reco = null, recoTitle = "", recoSub = "";
    if (r.score < 50) {
      reco = { subjectId: state.subject.id, lessonId: state.lesson.id };
      recoTitle = "Review: " + state.lesson.title;
      recoSub = `${state.subject.icon} ${state.subject.name} — revisit this lesson to strengthen the flagged concepts.`;
    } else {
      const next = window.teacherData.recommendNext(state.subject.id, state.lesson.id);
      if (next && next.lesson) {
        reco = { subjectId: next.subject.id, lessonId: next.lesson.id };
        recoTitle = next.lesson.title;
        recoSub = `${next.subject.icon} ${next.subject.name} — ${next.lesson.summary || ""}`;
      }
    }
    if (reco) {
      state.reco = reco;
      el.recoTitle.textContent = recoTitle;
      el.recoSub.textContent = recoSub;
      el.recoGoBtn.disabled = false;
    } else {
      state.reco = null;
      el.recoGoBtn.disabled = true;
    }

    showScreen("results");
    // A short spoken wrap-up (respects mute). It must agree with what the screen
    // says: when nothing was graded, gradeFor() shows "Not graded", so announcing
    // "you scored 0 out of 100" would read as a failure for work that was never
    // assessed. Only quote a number when there is a real one to quote.
    const wrap = !r.answered
      ? `That's the end of the class. I wasn't able to grade any answers this time, so there's no score to give you — let's run through the lesson again.`
      : r.score >= 70
        ? `Fantastic effort! You scored ${r.score} out of 100. ${r.work.length ? "Just review the concepts I've flagged for practice." : "You understood everything — brilliant!"}`
        : `Good try! You scored ${r.score} out of 100. Let's practise the flagged concepts and try again — you'll improve fast.`;
    setAvatarState("idle");
    speak(wrap);
  }
  // ── Event wiring ────────────────────────────────────────────
  function wireEvents() {
    el.subjectSelect.addEventListener("change", onSubjectChange);
    el.lessonSelect.addEventListener("change", onLessonChange);

    el.startClassBtn.addEventListener("click", () => {
      if (el.startClassBtn.disabled) return;
      startClass(el.subjectSelect.value, el.lessonSelect.value);
    });

    el.submitAnswerBtn.addEventListener("click", handleSubmit);
    el.answerInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    });

    el.micBtn.addEventListener("click", toggleMic);
    el.muteBtn.addEventListener("click", toggleMute);
    el.replayBtn.addEventListener("click", replayLast);
    el.stopBtn.addEventListener("click", () => { stopSpeaking(); setAvatarState("idle"); });
    el.continueBtn.addEventListener("click", onContinue);

    el.endClassBtn.addEventListener("click", () => {
      if (state.answers.length && !window.confirm("End the class now and see your results so far?")) return;
      stopSpeaking();
      finishClass();
    });

    el.retryBtn.addEventListener("click", () => {
      stopSpeaking();
      startClass(state.subject.id, state.lesson.id);
    });
    el.newLessonBtn.addEventListener("click", () => {
      stopSpeaking();
      showScreen("setup");
    });
    el.recoGoBtn.addEventListener("click", () => {
      if (!state.reco) return;
      stopSpeaking();
      startClass(state.reco.subjectId, state.reco.lessonId);
    });

    el.skipQuestionBtn.addEventListener("click", skipQuestion);

    // Stop speech if the user leaves the page.
    window.addEventListener("beforeunload", stopSpeaking);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopSpeaking();
    });
  }

  // ── Init ────────────────────────────────────────────────────
  function init() {
    if (!el.screenSetup) return; // not the teacher page
    populateSubjects();
    initSTT();
    el.muteBtn.textContent = "🔊";
    wireEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
