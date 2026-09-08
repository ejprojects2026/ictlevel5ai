/* Temporary headless test of the real teacher.js class flow.
   Serves the project, stubs /api/ai and speechSynthesis, drives the UI.

   Env knobs:
     TTS_MODE = normal | stall | error | missing   (voice engine behaviour)
     AI_MODE  = ok | fail | hang                    (grader behaviour)
     AI_DELAY = milliseconds to delay the grade      (>1000 => "slow" path)
     AI_VERDICT = correct | partial | incorrect      (override the derived verdict)

   The grader contract this stub honours (matches assets/js/teacher.js callGrader):
     REQUEST : POST { system, message, model, max_tokens, temperature }
               where message = "QUESTION: …\nEXPECTED: …\nREQUIRED: …\nSTUDENT: …"
     RESPONSE: 200 { reply, model }  where reply is a JSON string
               {"verdict":"correct|partial|incorrect","score":0,"feedback":"…","missing":[…],"correction":"…"}
               or a real error status (>=400) when the grader is unavailable. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const PORT = 8177;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon" };

// TTS_MODE is injected into the page: normal | stall | error | missing
const TTS_MODE = process.env.TTS_MODE || "normal";
const AI_MODE = process.env.AI_MODE || "ok"; // ok | fail | hang
const AI_DELAY = parseInt(process.env.AI_DELAY || "0", 10) || 0;
const SLOW = AI_DELAY > 1000;                 // exercises the 1s thinking/waiting path
const TTS_LIVE = TTS_MODE !== "missing";      // waiting/fail lines only speak when TTS exists

// Build a valid grader reply from the STUDENT answer in the request message, so the
// test can drive correct/partial/incorrect just by varying the typed answer. An
// explicit AI_VERDICT overrides the heuristic.
function graderReply(message) {
  const student = ((/STUDENT:\s*([\s\S]*)$/.exec(message || "") || [, ""])[1] || "").toLowerCase();
  let verdict = process.env.AI_VERDICT;
  if (!verdict) {
    if (/redundan|normal|anomal|table/.test(student)) verdict = "correct";
    else if (student.trim().length < 15) verdict = "incorrect";
    else verdict = "partial";
  }
  const score = verdict === "correct" ? 92 : verdict === "partial" ? 60 : 20;
  const feedback =
    verdict === "correct" ? "Exactly right — you covered the key idea." :
    verdict === "partial" ? "Good start, but you're missing the point about reducing redundancy." :
    "That's not quite it — the core idea is organising data to reduce redundancy.";
  return JSON.stringify({
    verdict, score, feedback,
    missing: verdict === "correct" ? [] : ["reducing redundancy"],
    correction: "Normalization organises data into related tables to reduce redundancy."
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/ai") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (AI_MODE === "hang") return; // never respond: exercises the client timeout
      let j = {};
      try { j = JSON.parse(body || "{}"); } catch (_) { }
      // The grader always sends an allow-listed model and a "STUDENT:" line.
      const isGrader = !!j.model || /STUDENT:/.test(j.message || "") || /grader/i.test(j.system || "");
      const respond = () => {
        if (AI_MODE === "fail") {
          // Total grader failure: return a real error status like api/ai.js does on
          // full failover (502/504). The client maps any non-OK response to
          // GRADER_UNAVAILABLE and must advance gracefully, never mark the student wrong.
          res.writeHead(502, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "stub upstream failure (all models)" }));
        }
        if (isGrader) {
          const reply = graderReply(j.message);
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ reply, model: j.model || "stub-grader" }));
        }
        // Non-grader request should not happen (teaching is local). Harmless reply.
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reply: "OK", model: j.model || "stub" }));
      };
      if (AI_DELAY > 0) setTimeout(respond, AI_DELAY); else respond();
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
    // Inject the TTS stub BEFORE teacher.js runs.
    const stub = `<script>window.__TTS_MODE=${JSON.stringify(TTS_MODE)};(function(){
      var mode=window.__TTS_MODE;
      if(mode==="missing"){try{delete window.speechSynthesis;}catch(e){}
        try{Object.defineProperty(window,"speechSynthesis",{get:function(){return undefined;},configurable:true});}catch(e){}
        window.__speechLog=[];return;}
      var log=[];window.__speechLog=log;
      // window.speechSynthesis is a READ-ONLY accessor on Window: a plain
      // assignment silently fails and the page keeps using the real engine
      // (which never fires onstart in headless Chrome, so nothing is ever
      // logged and every TTS_MODE behaved like a no-op). defineProperty is
      // the only way to actually install the stub.
      function install(name,value){
        try{Object.defineProperty(window,name,{value:value,configurable:true,writable:true});}
        catch(e){try{window[name]=value;}catch(e2){}}
      }
      install("SpeechSynthesisUtterance",function(t){this.text=t;});
      install("speechSynthesis",{
        getVoices:function(){return [{name:"Microsoft David",lang:"en-US"}];},
        onvoiceschanged:null,
        speak:function(u){log.push(u.text);
          if(mode==="stall")return;                       // never fires an event
          if(mode==="error"){setTimeout(function(){u.onerror&&u.onerror({});},5);return;}
          setTimeout(function(){u.onstart&&u.onstart();},1);
          setTimeout(function(){u.onend&&u.onend();},60);  // slow-ish voice
        },
        cancel:function(){},resume:function(){},pause:function(){}
      });
    })();</script>`;
    data = Buffer.from(String(data).replace("<script src=\"assets/js/ui.js\"></script>", stub + "\n  <script src=\"assets/js/ui.js\"></script>"));
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  res.end(data);
});

await new Promise((r) => server.listen(PORT, r));

// ── Drive Chrome over the DevTools protocol (no npm deps) ──
const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  process.env.LOCALAPPDATA + "/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
].find((p) => p && fs.existsSync(p));
if (!CHROME) { console.log("NO_BROWSER"); server.close(); process.exit(2); }

const userDir = path.join(ROOT, "_chromeprofile");
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=9333", "--user-data-dir=" + userDir,
  "--window-size=1280,900", "about:blank"
], { stdio: "ignore" });

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch("http://127.0.0.1:9333/json/version");
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("devtools not reachable");
}

const ws = new WebSocket(await wsUrl());
await new Promise((r) => (ws.onopen = r));
let msgId = 0;
const waiters = new Map();
const logs = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); }
  if (m.method === "Runtime.consoleAPICalled") {
    logs.push((m.params.type || "log") + ": " + (m.params.args || []).map(a => a.value ?? a.description ?? "").join(" "));
  }
  if (m.method === "Runtime.exceptionThrown") {
    logs.push("EXCEPTION: " + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text));
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
await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/teacher.html` }, sessionId);
await new Promise((r) => setTimeout(r, 1500));

async function evalJs(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.result?.exceptionDetails) return { __error: r.result.exceptionDetails.exception?.description };
  return r.result?.result?.value;
}

const snap = `(() => {
  const t = (id) => { const e=document.getElementById(id); return e ? e.textContent.trim() : null; };
  const vis = (id) => { const e=document.getElementById(id); if(!e) return false;
    if (e.classList.contains("hidden") || e.classList.contains("empty")) return false;
    return e.getClientRects().length > 0; };
  const log = window.__speechLog || [];
  return { say: t("sayText"), sayLen: (t("sayText")||"").length, phase: t("phaseChip"),
    question: t("questionText"), questionVisible: vis("questionBox"),
    answerVisible: vis("answerArea"), continueVisible: vis("continueRow"),
    continueLabel: t("continueBtn"), feedbackVisible: vis("feedback"),
    verdict: t("verdict"), feedbackText: t("verdictText"),
    submitDisabled: !!document.getElementById("submitAnswerBtn")?.disabled,
    boardVisible: vis("board"), screen: ["setup","class","results"].find(s=>{
      const e=document.getElementById("screen-"+s); return e && e.classList.contains("active"); }),
    spoken: log.length, status: t("statusText"), score: t("scoreNum"),
    grade: t("scoreGrade"),
    zeroScoreSpoken: log.some(x=>/scored 0 out of 100/i.test(x)),
    waitingSpoken: log.some(x=>/Give me a moment/i.test(x)),
    failLineSpoken: log.some(x=>/move on to the next point|Thanks for your answer/i.test(x)),
    sorrySpoken: log.some(x=>/Sorry, I couldn'?t check/i.test(x)) };
})()`;

async function waitFor(cond, label, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await evalJs(snap);
    if (s && !s.__error && cond(s)) return s;
    await new Promise((r) => setTimeout(r, 200));
  }
  const s = await evalJs(snap);
  throw new Error(`TIMEOUT waiting for ${label}\nlast state: ${JSON.stringify(s)}`);
}

const steps = [];
function ok(name, detail) { steps.push({ name, pass: true, detail }); console.log("PASS  " + name + (detail ? "  — " + detail : "")); }
function fail(name, err) { steps.push({ name, pass: false, detail: String(err) }); console.log("FAIL  " + name + "  — " + err); }

try {
  console.log(`\n=== TTS_MODE=${TTS_MODE}  AI_MODE=${AI_MODE}  AI_DELAY=${AI_DELAY}${SLOW ? " (slow)" : ""} ===`);

  // 1. Start class
  const first = await evalJs(`(() => {
    const s = document.getElementById("subjectSelect");
    s.value = s.options[1].value; s.dispatchEvent(new Event("change"));
    const l = document.getElementById("lessonSelect");
    l.value = l.options[1].value; l.dispatchEvent(new Event("change"));
    document.getElementById("startClassBtn").click();
    return { subject: s.value, lesson: l.value };
  })()`);
  ok("1. start class", JSON.stringify(first));

  // 2. Welcome text appears
  let s = await waitFor((x) => x.screen === "class" && x.sayLen > 40, "welcome text");
  ok("2. welcome text renders", `${s.sayLen} chars, phase=${s.phase}`);

  // 3. Continue appears
  s = await waitFor((x) => x.continueVisible, "continue button");
  ok("3. continue button appears", s.continueLabel);

  // 4/5. Click continue -> teaching text (loaded LOCALLY from teacherData.js, no AI)
  await evalJs(`document.getElementById("continueBtn").click()`);
  s = await waitFor((x) => x.sayLen > 60, "teaching text");
  ok("5. teaching text renders (local, no AI)", `${s.sayLen} chars, board=${s.boardVisible}`);

  // 6. Question appears
  s = await waitFor((x) => x.questionVisible && x.question, "question");
  ok("6. question appears (local, no AI)", JSON.stringify(s.question).slice(0, 60));

  // 7. Answer box + submit
  s = await waitFor((x) => x.answerVisible && !x.submitDisabled, "answer area");
  ok("7. answer area + submit appear", `spokenChunks=${s.spoken}`);

  // 8. Submit a good answer.
  await evalJs(`(() => { const a=document.getElementById("answerInput");
    a.value="Normalization organizes data into related tables to reduce redundancy and avoid update anomalies.";
    document.getElementById("submitAnswerBtn").click(); return true; })()`);
  ok("8. submit accepted");

  if (AI_MODE === "ok") {
    // 8b/8c. Requirement 1: the thinking state + the waiting line appear ONLY when
    // grading is slow (> ~1s). For a fast grade neither should occur (checked at 9b).
    if (SLOW) {
      try {
        const th = await waitFor((x) => /thinking/i.test(x.phase || "") || /thinking/i.test(x.status || ""), "thinking state (slow grade)", 2500);
        ok("8b. thinking state shown for slow grade", `phase=${th.phase} status=${th.status}`);
      } catch (e) { fail("8b. thinking state shown for slow grade", e.message); }
      if (TTS_LIVE) {
        const wl = await waitFor((x) => x.waitingSpoken, "waiting line (slow grade)", 3000).catch(() => null);
        if (wl) ok("8c. waiting line spoken for slow grade");
        else fail("8c. waiting line spoken for slow grade", "not found in speech log");
      }
    }

    // 9. Feedback appears with a real verdict label — proves the grader JSON parsed.
    const s9 = await waitFor((x) => x.feedbackVisible && x.feedbackText && /Correct|Almost|Not quite/i.test(x.verdict || ""), "feedback + verdict", SLOW ? 8000 : 20000);
    ok("9. feedback + verdict render", `${s9.verdict}: ${(s9.feedbackText || "").slice(0, 50)}`);

    // 9b. Requirement 1: a FAST grade must NOT have played the waiting line.
    if (!SLOW && TTS_LIVE) {
      if (!s9.waitingSpoken) ok("9b. fast grade played NO waiting line");
      else fail("9b. fast grade played NO waiting line", "waiting line was spoken on a fast grade");
    }
  } else {
    // Requirement 4: grader failure (fail/hang) must NEVER show an error and NEVER
    // block — a short line is spoken and the class auto-advances past the question.
    // A hung grader is bounded by teacher.js GRADE_TOTAL_BUDGET_MS (20 s of shared
    // budget across the whole model chain), NOT by a single request timeout — so the
    // graceful advance cannot arrive before ~20 s. Allow for that plus the fail line
    // being rendered/spoken. ("fail" answers instantly with an error, so 8 s is fine.)
    const budget = AI_MODE === "hang" ? 30000 : 8000;
    const adv = await waitFor(
      (x) => x.failLineSpoken || x.screen === "results" || x.continueVisible || (x.answerVisible && !x.submitDisabled),
      "graceful auto-advance after grader failure", budget);
    if (adv.sorrySpoken) fail("9. grader failure shows NO 'Sorry' error", "the old 'Sorry, I couldn't check' line was spoken");
    else ok("9. grader failure shows NO 'Sorry' error");
    if (TTS_LIVE) {
      const line = adv.failLineSpoken ? adv : await waitFor((x) => x.failLineSpoken, "graceful move-on line", 4000).catch(() => null);
      if (line) ok("9b. graceful 'move on' line spoken on grader failure");
      else fail("9b. graceful 'move on' line spoken on grader failure", "not found in speech log");
    }
  }

  // 10/11. The class must always reach results without getting stuck — for a working
  // grader (ok) and for a permanently-failing grader (fail), since a grader failure
  // must never block the lesson. (hang is too slow to fully drive here.)
  if (AI_MODE === "hang") {
    ok("11. full-class drive skipped for hang mode (single-question graceful advance already verified)");
  } else {
    // Time-based budget: with the TTS stub actually working, a full class now
    // spends real time speaking, so a fixed 60-iteration cap was too small.
    const driveDeadline = Date.now() + (SLOW ? 180000 : 120000);
    while (Date.now() < driveDeadline) {
      s = await evalJs(snap);
      if (s.screen === "results") break;
      if (s.continueVisible) {
        await evalJs(`document.getElementById("continueBtn").click()`);
      } else if (s.answerVisible && !s.submitDisabled) {
        await evalJs(`(() => { const a=document.getElementById("answerInput");
          a.value="Normalization organizes data into related tables to reduce redundancy and avoid anomalies.";
          document.getElementById("submitAnswerBtn").click(); return true; })()`);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    // The results ring counts the score UP over ~900ms, so reading it immediately
    // samples a mid-animation frame (a "score=23" that is really 100). Wait for the
    // number to stop changing before asserting on it.
    let prevScore = null, stable = 0;
    for (let i = 0; i < 30; i++) {
      const cur = (await evalJs(snap)).score;
      if (cur === prevScore) { if (++stable >= 3) break; } else stable = 0;
      prevScore = cur;
      await new Promise((r) => setTimeout(r, 150));
    }
    s = await evalJs(snap);
    if (s.screen === "results") ok("11. full class reaches results without blocking", `score=${s.score}`);
    else fail("11. full class reaches results without blocking", `stuck: ${JSON.stringify(s)}`);

    // 12. When the grader never worked, EVERY answer is "unverified": nothing was
    // graded, so the results must say so instead of reporting a 0 the student never
    // earned — on screen AND in the spoken wrap-up.
    if (AI_MODE === "fail" && s.screen === "results") {
      if (/not graded/i.test(s.grade || "")) ok("12. ungraded class shows 'Not graded'", s.grade);
      else fail("12. ungraded class shows 'Not graded'", `grade="${s.grade}"`);
      if (!s.zeroScoreSpoken) ok("12b. ungraded class never says 'scored 0 out of 100'");
      else fail("12b. ungraded class never says 'scored 0 out of 100'", "the 0/100 line was spoken");
    }
  }
} catch (e) {
  fail("flow", e.message);
}

const failed = steps.filter((x) => !x.pass);
console.log("\nconsole output:");
logs.slice(0, 25).forEach((l) => console.log("  " + l));
console.log(`\nRESULT ${TTS_MODE}/${AI_MODE}${SLOW ? "/slow" : ""}: ${steps.length - failed.length}/${steps.length} passed`);

ws.close();
try { chrome.kill(); } catch (_) {}
server.close();
await new Promise((r) => setTimeout(r, 300));
process.exit(failed.length ? 1 : 0);
