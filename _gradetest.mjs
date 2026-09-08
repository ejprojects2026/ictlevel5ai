/* Headless grading-path tests for teacher.js (requirement 14).
   Complements _flowtest.mjs (end-to-end flow) by driving the cases that
   only the grader contract exercises:

     SCEN=badjson      every model returns unparseable text -> no fake verdict,
                       chain is walked, question excluded from the score
     SCEN=fallback     model #1 returns garbage, model #2 returns a real grade ->
                       the student still gets graded and never resubmits
     SCEN=schemaecho   the model echoes the prompt's schema line verbatim ->
                       must NOT be salvaged into a fake "correct"
     SCEN=lowscore     verdict correct but score 12 (out of band) -> stored score
                       is validated into the correct band, not 12 and not 100
     SCEN=skip         Skip -> no AI call at all, no score, immediate advance
     SCEN=double       Submit clicked 3x in one frame -> exactly ONE grader call
     SCEN=stale        Skip fires while a grade is in flight -> the late response
                       must not paint feedback or advance the new question

   Run: node _gradetest.mjs           (runs every scenario)
        SCEN=stale node _gradetest.mjs
*/
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const PORT = 8199;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon" };

const GOOD = (verdict = "correct", score = 92) => JSON.stringify({
  verdict, score,
  feedback: "Good — you covered the key idea.",
  missing: [], correction: "Model correction text."
});
// The exact schema line from GRADER_SYSTEM, which salvageGrade must refuse.
const SCHEMA_ECHO =
  'Sure! {"verdict":"correct|partial|incorrect","score":0,"feedback":"...","missing":["..."],"correction":"..."}';

let scen = process.env.SCEN || "";
let calls = [];            // { model, delay } per grader request
let CHROME_PROC = null;

function replyFor(model) {
  if (scen === "badjson") return "I think the student did fine, honestly.";
  if (scen === "schemaecho") return SCHEMA_ECHO;
  if (scen === "lowscore") return GOOD("correct", 12);
  if (scen === "fallback") {
    // First model (the primary) fails to produce JSON; the next one grades.
    return calls.length <= 1 ? "no json here at all" : GOOD("partial", 55);
  }
  return GOOD();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/ai") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let j = {};
      try { j = JSON.parse(body || "{}"); } catch (_) { }
      calls.push({ model: j.model || "(none)", at: Date.now() });
      const send = () => {
        const reply = replyFor(j.model);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reply, model: j.model }));
      };
      // "stale" needs the grade to land AFTER the test has skipped the question.
      if (scen === "stale") setTimeout(send, 2500); else send();
    });
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p === "/") p = "/teacher.html";
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end("not found");
  }
  let data = fs.readFileSync(file);
  if (p === "/teacher.html") {
    // Silent, instant TTS so timing is deterministic and nothing blocks.
    const stub = `<script>(function(){
      var log=[];window.__speechLog=log;
      function install(n,v){try{Object.defineProperty(window,n,{value:v,configurable:true,writable:true});}
        catch(e){try{window[n]=v;}catch(e2){}}}
      install("SpeechSynthesisUtterance",function(t){this.text=t;});
      install("speechSynthesis",{
        getVoices:function(){return [{name:"Microsoft David",lang:"en-US"}];},
        onvoiceschanged:null,
        speak:function(u){log.push(u.text);
          setTimeout(function(){u.onstart&&u.onstart();},1);
          setTimeout(function(){u.onend&&u.onend();},5);},
        cancel:function(){},resume:function(){},pause:function(){}
      });
    })();</script>`;
    data = Buffer.from(String(data).replace(
      '<script src="assets/js/ui.js"></script>', stub + '\n  <script src="assets/js/ui.js"></script>'));
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  res.end(data);
});

await new Promise((r) => server.listen(PORT, r));

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  process.env.LOCALAPPDATA + "/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe"
].find((p) => p && fs.existsSync(p));
if (!CHROME) { console.log("NO_BROWSER"); server.close(); process.exit(2); }

CHROME_PROC = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=9344", "--user-data-dir=" + path.join(ROOT, "_chromeprofile2"),
  "--window-size=1280,900", "about:blank"
], { stdio: "ignore" });

async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch("http://127.0.0.1:9344/json/version");
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch (_) { }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("devtools not reachable");
}

const ws = new WebSocket(await wsUrl());
await new Promise((r) => (ws.onopen = r));
let msgId = 0;
const waiters = new Map();
const pageLogs = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") {
    pageLogs.push("EXCEPTION: " + (m.params.exceptionDetails?.exception?.description ||
      m.params.exceptionDetails?.text));
  }
  // End Class asks for confirmation via the native window.confirm(). With Page.enable
  // on, Chrome will NOT auto-dismiss it: the dialog blocks the renderer and the
  // Runtime.evaluate that clicked the button never returns, deadlocking the whole
  // suite. Accept it here so the real confirm path is still exercised.
  if (m.method === "Page.javascriptDialogOpening") {
    ws.send(JSON.stringify({
      id: ++msgId, method: "Page.handleJavaScriptDialog",
      params: { accept: true }, sessionId: m.sessionId
    }));
  }
};
function send(method, params, sessionId) {
  const id = ++msgId;
  return new Promise((res) => { waiters.set(id, res); ws.send(JSON.stringify({ id, method, params, sessionId })); });
}
const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Runtime.enable", {}, sessionId);
await send("Page.enable", {}, sessionId);

async function evalJs(expr) {
  const r = await send("Runtime.evaluate",
    { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.result?.exceptionDetails) return { __error: r.result.exceptionDetails.exception?.description };
  return r.result?.result?.value;
}

const snap = `(() => {
  const t=(id)=>{const e=document.getElementById(id);return e?e.textContent.trim():null;};
  const vis=(id)=>{const e=document.getElementById(id);if(!e)return false;
    if(e.classList.contains("hidden")||e.classList.contains("empty"))return false;
    return e.getClientRects().length>0;};
  return { phase:t("phaseChip"), question:t("questionText"), questionVisible:vis("questionBox"),
    answerVisible:vis("answerArea"), continueVisible:vis("continueRow"),
    feedbackVisible:vis("feedback"), verdict:t("verdict"), feedbackText:t("verdictText"),
    submitDisabled:!!document.getElementById("submitAnswerBtn")?.disabled,
    mastery:t("masteryVal"), score:t("scoreNum"),
    screen:["setup","class","results"].find(s=>{
      const e=document.getElementById("screen-"+s);return e&&e.classList.contains("active");}) };
})()`;

async function waitFor(cond, label, ms = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await evalJs(snap);
    if (s && !s.__error && cond(s)) return s;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`TIMEOUT ${label}: ${JSON.stringify(await evalJs(snap))}`);
}

const results = [];
function ok(n, d) { results.push({ n, pass: true, d }); console.log("  PASS  " + n + (d ? " — " + d : "")); }
function bad(n, d) { results.push({ n, pass: false, d }); console.log("  FAIL  " + n + " — " + d); }

// Wait until no NEW grader request has arrived for `quiet` ms, so a slow tail of
// fallback attempts from the previous scenario cannot be counted against the next.
async function drainCalls(quiet = 2000, max = 40000) {
  const t0 = Date.now();
  let last = calls.length, lastChange = Date.now();
  while (Date.now() - t0 < max) {
    await new Promise((r) => setTimeout(r, 250));
    if (calls.length !== last) { last = calls.length; lastChange = Date.now(); }
    else if (Date.now() - lastChange >= quiet) return;
  }
}

// The results ring counts the score UP over ~900 ms (paintScoreRing), so reading
// scoreNum the instant the results screen appears samples a mid-animation frame —
// a settled 92 reads as "5". Wait for the number to stop changing before asserting
// on it, otherwise the baseline is meaningless.
async function settleScore(tries = 30) {
  let prev = null, stable = 0, s = await evalJs(snap);
  for (let i = 0; i < tries; i++) {
    s = await evalJs(snap);
    if (s.score === prev) { if (++stable >= 3) break; } else stable = 0;
    prev = s.score;
    await new Promise((r) => setTimeout(r, 100));
  }
  return s;
}

// Drive a fresh class up to the first answerable question.
async function toFirstQuestion() {
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/teacher.html` }, sessionId);
  await new Promise((r) => setTimeout(r, 1200));
  calls = []; // reset AFTER navigation, so in-flight requests from the previous
              // scenario (aborted by the reload) cannot land in this one's count.
  await evalJs(`(()=>{const s=document.getElementById("subjectSelect");
    s.value=s.options[1].value;s.dispatchEvent(new Event("change"));
    const l=document.getElementById("lessonSelect");
    l.value=l.options[1].value;l.dispatchEvent(new Event("change"));
    document.getElementById("startClassBtn").click();return 1;})()`);
  await waitFor((x) => x.continueVisible, "intro continue");
  await evalJs(`document.getElementById("continueBtn").click()`);
  return waitFor((x) => x.answerVisible && !x.submitDisabled, "first question");
}
const typeAnswer = (txt) => evalJs(
  `(()=>{const a=document.getElementById("answerInput");a.value=${JSON.stringify(txt)};return 1;})()`);
const clickSubmit = () => evalJs(`document.getElementById("submitAnswerBtn").click()`);

const ANSWER = "A variable is a named store for a value, and in the college program it holds the fee amount.";

async function run(name) {
  scen = name;
  console.log(`\n=== SCEN=${name} ===`);
  await toFirstQuestion();

  if (name === "skip") {
    await evalJs(`document.getElementById("skipQuestionBtn").click()`);
    // Skip must advance without ever calling the grader.
    await waitFor((x) => !x.answerVisible || x.continueVisible ||
      x.question !== null, "advance after skip", 8000);
    await new Promise((r) => setTimeout(r, 1200));
    if (calls.length === 0) ok("skip makes ZERO grader calls");
    else bad("skip makes ZERO grader calls", `${calls.length} call(s)`);
    const s = await evalJs(snap);
    if (s.mastery === "0%") ok("skip leaves mastery at 0%", s.mastery);
    else bad("skip leaves mastery at 0%", `mastery=${s.mastery}`);
    return;
  }

  if (name === "double") {
    await typeAnswer(ANSWER);
    await evalJs(`(()=>{const b=document.getElementById("submitAnswerBtn");
      b.click();b.click();b.click();return 1;})()`);
    await waitFor((x) => x.feedbackVisible && /Correct|Almost|Not quite/i.test(x.verdict || ""),
      "feedback after double submit");
    await new Promise((r) => setTimeout(r, 800));
    if (calls.length === 1) ok("3 rapid submits -> exactly ONE grader call");
    else bad("3 rapid submits -> exactly ONE grader call", `${calls.length} calls`);
    return;
  }

  if (name === "stale") {
    // Grade ONE question for real first, so the results screen carries a non-zero
    // score — otherwise "the score did not change" would be trivially true at 0.
    scen = "ok";
    await typeAnswer(ANSWER);
    await clickSubmit();
    await waitFor((x) => x.feedbackVisible && /Correct|Almost|Not quite/i.test(x.verdict || ""),
      "first question graded");
    const q2 = await waitFor((x) => x.answerVisible && !x.submitDisabled, "second question", 30000);
    void q2;
    // Now make the NEXT grade slow, submit, and end the class while it is in flight.
    scen = "stale";
    await typeAnswer(ANSWER);
    await clickSubmit();
    await new Promise((r) => setTimeout(r, 300));   // grade is in flight (2.5s delay)
    // Skip is disabled during grading, so end the question the way the app can:
    // navigate the class on via the End Class button, then confirm the late
    // grade neither paints feedback nor advances anything.
    await evalJs(`document.getElementById("endClassBtn").click()`);
    await waitFor((x) => x.screen === "results", "results after end class", 8000);
    const before = await settleScore();
    await new Promise((r) => setTimeout(r, 3500)); // late grade lands here
    const after = await evalJs(snap);
    if (after.screen === "results") ok("stale grade does not leave the results screen");
    else bad("stale grade does not leave the results screen", after.screen);
    if (before.score !== "0" && after.score === before.score) {
      ok("stale grade does not change the score", `score stayed ${after.score}`);
    } else if (before.score === "0") {
      bad("stale grade does not change the score", "baseline score was 0 — test not meaningful");
    } else {
      bad("stale grade does not change the score", `${before.score} -> ${after.score}`);
    }
    if (!after.feedbackVisible) ok("stale grade paints no feedback");
    else bad("stale grade paints no feedback", `verdict=${after.verdict}`);
    return;
  }

  // Grading-contract scenarios
  await typeAnswer(ANSWER);
  await clickSubmit();

  if (name === "fallback") {
    const s = await waitFor((x) => x.feedbackVisible && /Correct|Almost|Not quite/i.test(x.verdict || ""),
      "graded via fallback model");
    ok("invalid JSON from model #1 still yields a real grade", `${s.verdict}`);
    const models = calls.map((c) => c.model);
    if (models.length >= 2 && models[0] !== models[1]) {
      ok("fallback switched to a DIFFERENT model", models.join(" -> "));
    } else bad("fallback switched to a DIFFERENT model", models.join(" -> "));
    return;
  }

  if (name === "badjson" || name === "schemaecho") {
    // No valid grade anywhere in the chain: must advance gracefully, never show a
    // verdict, and never count the question.
    await waitFor((x) => x.answerVisible || x.continueVisible || x.screen === "results",
      "graceful advance after unusable grader output", 30000);
    await drainCalls(); // let the whole chain finish before counting models
    const s = await evalJs(snap);
    if (!s.feedbackVisible) ok("no verdict rendered from unusable grader output");
    else bad("no verdict rendered from unusable grader output", `verdict=${s.verdict}`);
    if (s.mastery === "0%") ok("unusable grader output does not create mastery", s.mastery);
    else bad("unusable grader output does not create mastery", `mastery=${s.mastery}`);
    const models = calls.map((c) => c.model);
    if (new Set(models).size >= 2) ok("walked the model chain", models.join(" -> "));
    else bad("walked the model chain", models.join(" -> "));
    return;
  }

  if (name === "lowscore") {
    const s = await waitFor((x) => x.feedbackVisible && /Correct/i.test(x.verdict || ""),
      "graded with out-of-band score");
    // correct + score 12 -> validated up into the 80-100 band -> mastery 20% of a
    // 4-concept lesson is one concept at >=80 => 20..25%.
    const m = parseInt(s.mastery, 10);
    if (m >= 20) ok("out-of-band score validated into the verdict band", `mastery=${s.mastery}`);
    else bad("out-of-band score validated into the verdict band", `mastery=${s.mastery} (expected >=20%)`);
    return;
  }
}

const ALL = ["badjson", "fallback", "schemaecho", "lowscore", "skip", "double", "stale"];
const toRun = process.env.SCEN ? [process.env.SCEN] : ALL;
for (const s of toRun) {
  try { await run(s); } catch (e) { bad(s + " (scenario)", e.message); }
}

const failed = results.filter((r) => !r.pass);
if (pageLogs.length) { console.log("\npage errors:"); pageLogs.slice(0, 10).forEach((l) => console.log("  " + l)); }
console.log(`\nRESULT: ${results.length - failed.length}/${results.length} passed`);
ws.close();
try { CHROME_PROC.kill(); } catch (_) { }
server.close();
await new Promise((r) => setTimeout(r, 300));
process.exit(failed.length ? 1 : 0);
