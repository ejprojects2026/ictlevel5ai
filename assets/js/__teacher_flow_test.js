/* ============================================================
   __teacher_flow_test.js — headless logic harness for teacher.js
   Proves the class flow renders text and buttons even when the
   speech engine is missing, stalls, errors, or is muted.

   Run:  node assets/js/__teacher_flow_test.js
   No dependencies. Stubs just enough DOM + Web Speech to load the
   real teacher.js IIFE and drive the intro/teach/answer flow.
   This file is a dev-only test; it is not referenced by the site.
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ── Tiny fake DOM ───────────────────────────────────────────
let idSeq = 0;
function mkEl(tag) {
  const children = [];
  const listeners = {};
  const el = {
    tagName: (tag || "div").toUpperCase(),
    _id: "el" + (idSeq++),
    children,
    listeners,
    style: {},
    dataset: {},
    hidden: false,
    disabled: false,
    _text: "",
    _html: "",
    attributes: {},
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle(c, force) {
        const has = this._s.has(c);
        const want = force === undefined ? !has : !!force;
        if (want) this._s.add(c); else this._s.delete(c);
        return want;
      },
      contains(c) { return this._s.has(c); }
    },
    get className() { return [...this.classList._s].join(" "); },
    set className(v) { this.classList._s = new Set(String(v).split(/\s+/).filter(Boolean)); },
    get textContent() { return this._text; },
    set textContent(v) { this._text = v == null ? "" : String(v); this._html = this._text; },
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v == null ? "" : String(v); this._text = this._html.replace(/<[^>]*>/g, ""); },
    get value() { return this._value || ""; },
    set value(v) { this._value = v == null ? "" : String(v); },
    get offsetWidth() { return 100; },
    appendChild(c) { children.push(c); return c; },
    removeChild(c) { const i = children.indexOf(c); if (i >= 0) children.splice(i, 1); return c; },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k]; },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener(type, fn) {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter((f) => f !== fn);
    },
    dispatch(type, ev) { (listeners[type] || []).forEach((f) => f(ev || {})); },
    click() { this.dispatch("click", {}); },
    focus() {},
    scrollIntoView() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    cloneNode() { return mkEl(tag); },
    closest() { return null; }
  };
  return el;
}

const registry = {};
function reg(id, tag) { const e = mkEl(tag); e._id = id; e.attributes.id = id; registry[id] = e; return e; }

// Every id teacher.js looks up via getElementById.
[
  "screen-setup","screen-class","screen-results",
  "subjectSelect","lessonSelect","subjectHint","lessonHint","lessonOutline","outlineList","startClassBtn",
  "classSubject","classLesson","phaseChip","endClassBtn","progressWrap","progressBar","qCounter","masteryVal",
  "avatar","statusPill","statusText","muteBtn","replayBtn","stopBtn",
  "teacherSay","sayText","board","boardConcept","boardPoints","boardCode",
  "feedback","verdict","verdictText","questionBox","questionText","answerArea","transcript","answerInput",
  "micBtn","submitAnswerBtn","skipQuestionBtn","continueRow","continueBtn",
  "resultsTitle","resultsSubtitle","scoreFill","scoreNum","scoreGrade","scoreSub",
  "statAnswered","statCorrect","statAccuracy","statConcepts",
  "goodList","workList","goodNone","workNone","recoTitle","recoSub","recoGoBtn","retryBtn","newLessonBtn"
].forEach((id) => reg(id));
// scoreFill needs an r attribute for the results ring.
registry.scoreFill.attributes.r = "52";

const documentStub = {
  readyState: "complete",
  getElementById: (id) => registry[id] || null,
  createElement: (tag) => mkEl(tag),
  createDocumentFragment: () => {
    const f = mkEl("frag");
    f.appendChild = function (c) { this.children.push(c); return c; };
    return f;
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  hidden: false
};

// ── Configurable speech-engine stub ────────────────────────
// mode: "normal" | "stall" (never fires events) | "error" | "missing"
function makeSpeech(mode) {
  if (mode === "missing") return { synth: undefined, Utter: undefined };
  const synth = {
    _utters: [],
    getVoices: () => [{ name: "Microsoft David", lang: "en-US" }],
    onvoiceschanged: null,
    speak(u) {
      this._utters.push(u);
      if (mode === "stall") return;                     // deliberately never resolve
      if (mode === "error") { setTimeout(() => u.onerror && u.onerror({}), 5); return; }
      setTimeout(() => u.onstart && u.onstart({}), 1);   // normal
      setTimeout(() => u.onend && u.onend({}), 8);
    },
    cancel() {},
    resume() {}
  };
  function Utter(text) { this.text = text; this.onstart = this.onend = this.onerror = null; }
  return { synth, Utter };
}

// ── Curriculum data + a stubbed AI backend (fetch) ─────────
function loadTeacherData(sandbox) {
  const code = fs.readFileSync(path.join(__dirname, "teacherData.js"), "utf8");
  vm.runInContext(code, sandbox, { filename: "teacherData.js" });
}

function makeFetch(behavior) {
  // behavior: "ok" (valid grader verdict) | "fail" (reject) | "hang" (never resolve, honours abort)
  return function fetchStub(url, opts) {
    if (behavior === "fail") return Promise.reject(new Error("network down"));
    if (behavior === "hang") {
      return new Promise((_, reject) => {
        if (opts && opts.signal) opts.signal.addEventListener &&
          opts.signal.addEventListener("abort", () => reject(new Error("aborted")));
      });
    }
    // Grader contract (matches teacher.js callGrader / api/ai.js): the reply is a
    // JSON *string* carrying a verdict, wrapped in { reply, model }.
    let model = "stub-grader";
    try { const b = JSON.parse((opts && opts.body) || "{}"); if (b.model) model = b.model; } catch (_) { }
    const reply = JSON.stringify({
      verdict: "correct",
      score: 90,
      feedback: "That's right — you captured the key idea.",
      missing: [],
      correction: "A stubbed concept used for testing."
    });
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ reply, model }) });
  };
}

// ── Build a sandbox and load the real teacher.js ───────────
function buildSandbox({ speechMode, fetchBehavior, muted }) {
  const timers = new Set();
  const sandbox = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout: (fn, ms, ...a) => { const t = setTimeout(fn, ms, ...a); timers.add(t); return t; },
    clearTimeout: (t) => { clearTimeout(t); timers.delete(t); },
    setInterval: (fn, ms, ...a) => setInterval(fn, ms, ...a),
    clearInterval: (t) => clearInterval(t),
    performance: { now: () => Date.now() },
    requestAnimationFrame: (fn) => setTimeout(() => fn(Date.now()), 0),
    Promise, Set, Map, JSON, Math, Number, String, Array, Object, Boolean, Date, RegExp, isNaN,
    AbortController: typeof AbortController === "function" ? AbortController : undefined,
    Error
  };
  const speech = makeSpeech(speechMode);
  const win = {
    document: documentStub,
    speechSynthesis: speech.synth,
    SpeechSynthesisUtterance: speech.Utter,
    SpeechRecognition: undefined,
    webkitSpeechRecognition: undefined,
    // Keep flow assertions fast; the typewriter itself is covered separately
    // from this speech/failure harness.
    matchMedia: () => ({ matches: true }),
    scrollTo: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    requestAnimationFrame: sandbox.requestAnimationFrame,
    confirm: () => true,
    fetch: makeFetch(fetchBehavior)
  };
  win.window = win;
  sandbox.window = win;
  sandbox.document = documentStub;
  sandbox.navigator = { userAgent: "node", userAgentData: null };
  sandbox.fetch = win.fetch;
  sandbox.SpeechSynthesisUtterance = speech.Utter;
  sandbox.speechSynthesis = speech.synth;
  sandbox.matchMedia = win.matchMedia;
  vm.createContext(sandbox);

  loadTeacherData(sandbox);
  const teacherCode = fs.readFileSync(path.join(__dirname, "teacher.js"), "utf8");
  vm.runInContext(teacherCode, sandbox, { filename: "teacher.js" });
  if (muted) registry.muteBtn.click(); // toggle mute on
  return { sandbox, win, speech };
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Assertions ─────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra ? "  → " + extra : "")); }
}

function pickFirstSubjectLesson(win) {
  const d = win.teacherData;
  const subj = d.subjects[0];
  const lsn = subj.lessons[0];
  return { subjectId: subj.id, lessonId: lsn.id };
}

async function runScenario(label, cfg) {
  console.log("\n▶ " + label);
  // Fresh DOM text between scenarios.
  Object.values(registry).forEach((e) => { e._text = ""; e._html = ""; e.classList._s = new Set(); });
  registry.scoreFill.attributes.r = "52";

  const { win, speech } = buildSandbox(cfg);
  const { subjectId, lessonId } = pickFirstSubjectLesson(win);

  // Drive the start button exactly like a user click.
  registry.subjectSelect.value = subjectId;
  registry.subjectSelect.dispatch("change", {});
  registry.lessonSelect.value = lessonId;
  registry.lessonSelect.dispatch("change", {});
  registry.startClassBtn.disabled = false;
  registry.startClassBtn.click();

  // Mobile Chrome may require the first speak() call to happen in this click,
  // not after the intro's async typewriter work. The real teacher code must
  // therefore issue the intro synchronously from the Start interaction.
  if (cfg.speechMode === "normal" && !cfg.muted) {
    ok(label + " · intro speech starts inside Start click", speech.synth._utters.length === 1);
    // Simulate Android Chrome completing its asynchronous voice discovery.
    // This must select voices for later lines, not replay the intro outside the
    // activating gesture or cancel current speech.
    speech.synth.onvoiceschanged();
    ok(label + " · async voices update does not replay intro", speech.synth._utters.length === 1);
  }

  // Give the intro a moment (typewriter guard is generous; text renders fast).
  await delay(400);

  ok(label + " · class screen active", registry["screen-class"].classList.contains("active"));
  ok(label + " · E.J.AI SAYS text is not empty", registry.sayText.textContent.length > 0,
     "got: '" + registry.sayText.textContent.slice(0, 40) + "'");
  ok(label + " · intro shows a Continue button", !registry.continueRow.classList.contains("hidden"));

  // Advance into the first teaching step.
  registry.continueBtn.click();
  await delay(cfg.speechMode === "stall" ? 3200 : 500);
  ok(label + " · teaching text rendered", registry.sayText.textContent.length > 0);
  ok(label + " · board populated", !registry.board.classList.contains("empty"));
  ok(label + " · question shown", !registry.questionBox.classList.contains("empty"));
  ok(label + " · answer area visible", !registry.answerArea.classList.contains("hidden"));

  // Answer the question — the flow must move on regardless of speech.
  registry.answerInput.value = "A stubbed concept used for testing.";
  registry.submitAnswerBtn.click();
  await delay(600);
  const movedOn = !registry.continueRow.classList.contains("hidden") ||
                  !registry.answerArea.classList.contains("hidden") ||
                  !registry.feedback.classList.contains("empty");
  ok(label + " · answer produced feedback / next action", movedOn);
}

(async () => {
  console.log("teacher.js flow harness — speech must never block the class");
  await runScenario("normal voice + AI ok", { speechMode: "normal", fetchBehavior: "ok", muted: false });
  await runScenario("STALLED voice (no events)", { speechMode: "stall", fetchBehavior: "ok", muted: false });
  await runScenario("voice ERRORS", { speechMode: "error", fetchBehavior: "ok", muted: false });
  await runScenario("voice MISSING (unsupported)", { speechMode: "missing", fetchBehavior: "ok", muted: false });
  await runScenario("MUTED", { speechMode: "normal", fetchBehavior: "ok", muted: true });
  await runScenario("voice stall + AI network FAIL", { speechMode: "stall", fetchBehavior: "fail", muted: false });

  console.log("\n──────────────────────────────");
  console.log("RESULT: " + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
