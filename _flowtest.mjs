/* Temporary headless test of the real teacher.js class flow.
   Serves the project, stubs /api/ai and speechSynthesis, drives the UI. */
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

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/ai") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (AI_MODE === "hang") return; // never respond: exercises the timeout
      if (AI_MODE === "fail") {
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "stub failure" }));
      }
      let instruction = "";
      try { const j = JSON.parse(body); instruction = (j.history || []).map(h => h.content).join("\n"); } catch (_) {}
      let reply;
      if (/Judge the actual question/.test(instruction)) {
        reply = JSON.stringify({ result: "correct", score: 95, reason: "covers the required ideas about database normalization and redundancy",
          missing: [], corrections: [], feedback: "Exactly right, well explained.",
          correctAnswer: "Normalization organizes data to reduce redundancy.", misconception: "" });
      } else if (/Ask ONE short exam-style question/.test(instruction)) {
        reply = JSON.stringify({ question: "STUB TEST QUESTION: explain the idea in your own words.", expected: "A clear explanation of the concept." });
      } else if (/struggling with/.test(instruction)) {
        reply = JSON.stringify({ explanation: "STUB REMEDIATION EXPLANATION.", board: { concept: "Retry", points: ["a", "b"], code: "" },
          question: "STUB REMEDIATION QUESTION?", expected: "x" });
      } else {
        reply = JSON.stringify({ explanation: "STUB TEACHING EXPLANATION. " + "Padding sentence. ".repeat(20),
          board: { concept: "Stub concept", points: ["point one", "point two", "point three"], code: "" },
          question: "STUB TEACHING QUESTION?", expected: "The ideal answer mentions redundancy." });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ reply }));
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
      window.SpeechSynthesisUtterance=function(t){this.text=t;};
      window.speechSynthesis={
        getVoices:function(){return [{name:"Microsoft David",lang:"en-US"}];},
        onvoiceschanged:null,
        speak:function(u){log.push(u.text);
          if(mode==="stall")return;                       // never fires an event
          if(mode==="error"){setTimeout(function(){u.onerror&&u.onerror({});},5);return;}
          setTimeout(function(){u.onstart&&u.onstart();},1);
          setTimeout(function(){u.onend&&u.onend();},60);  // slow-ish voice
        },
        cancel:function(){},resume:function(){},pause:function(){}
      };
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
  return { say: t("sayText"), sayLen: (t("sayText")||"").length, phase: t("phaseChip"),
    question: t("questionText"), questionVisible: vis("questionBox"),
    answerVisible: vis("answerArea"), continueVisible: vis("continueRow"),
    continueLabel: t("continueBtn"), feedbackVisible: vis("feedback"),
    verdict: t("verdict"), feedbackText: t("verdictText"),
    submitDisabled: !!document.getElementById("submitAnswerBtn")?.disabled,
    boardVisible: vis("board"), screen: ["setup","class","results"].find(s=>{
      const e=document.getElementById("screen-"+s); return e && e.classList.contains("active"); }),
    spoken: (window.__speechLog||[]).length, status: t("statusText"), score: t("scoreNum") };
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
  console.log(`\n=== TTS_MODE=${TTS_MODE}  AI_MODE=${AI_MODE} ===`);

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

  // 4/5. Click continue -> teaching text
  await evalJs(`document.getElementById("continueBtn").click()`);
  s = await waitFor((x) => x.sayLen > 60 && /STUB TEACHING EXPLANATION|Padding|:/.test(x.say || ""), "teaching text");
  ok("5. teaching text renders", `${s.sayLen} chars, board=${s.boardVisible}`);

  // 6. Question appears
  s = await waitFor((x) => x.questionVisible && x.question, "question");
  ok("6. question appears", JSON.stringify(s.question).slice(0, 60));

  // 7. Answer box + submit
  s = await waitFor((x) => x.answerVisible && !x.submitDisabled, "answer area");
  ok("7. answer area + submit appear", `spokenChunks=${s.spoken}`);

  // 8. Submit works
  await evalJs(`(() => { const a=document.getElementById("answerInput");
    a.value="Normalization organizes data into related tables to reduce redundancy and avoid update anomalies.";
    document.getElementById("submitAnswerBtn").click(); return true; })()`);
  ok("8. submit accepted");

  // 9. Feedback appears
  s = await waitFor((x) => x.feedbackVisible && x.feedbackText, "feedback");
  ok("9. feedback appears", `${s.verdict}: ${(s.feedbackText || "").slice(0, 50)}`);

  // 10. Continue works after feedback
  s = await waitFor((x) => x.continueVisible || x.answerVisible || x.screen === "results", "post-feedback affordance");
  if (s.continueVisible) {
    await evalJs(`document.getElementById("continueBtn").click()`);
    s = await waitFor((x) => x.sayLen > 20 || x.screen === "results", "next step after continue");
    ok("10. continue advances the class", `phase=${s.phase} screen=${s.screen}`);
  } else {
    ok("10. class advanced to next prompt without continue", `answerVisible=${s.answerVisible} phase=${s.phase}`);
  }

  // Drive the rest of the class to the results screen.
  let guard = 0;
  while (guard++ < 40) {
    s = await evalJs(snap);
    if (s.screen === "results") break;
    if (s.continueVisible) { await evalJs(`document.getElementById("continueBtn").click()`); }
    else if (s.answerVisible && !s.submitDisabled) {
      await evalJs(`(() => { const a=document.getElementById("answerInput");
        a.value="Normalization organizes data into related tables to reduce redundancy and avoid anomalies.";
        document.getElementById("submitAnswerBtn").click(); return true; })()`);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  s = await evalJs(snap);
  if (s.screen === "results") ok("11. full class reaches results", `score=${s.score}`);
  else fail("11. full class reaches results", `stuck: ${JSON.stringify(s)}`);
} catch (e) {
  fail("flow", e.message);
}

const failed = steps.filter((x) => !x.pass);
console.log("\nconsole output:");
logs.slice(0, 25).forEach((l) => console.log("  " + l));
console.log(`\nRESULT ${TTS_MODE}/${AI_MODE}: ${steps.length - failed.length}/${steps.length} passed`);

ws.close();
try { chrome.kill(); } catch (_) {}
server.close();
await new Promise((r) => setTimeout(r, 300));
process.exit(failed.length ? 1 : 0);
