import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9339;
const profile = await mkdtemp(join(tmpdir(), 'niulai-star-test-'));
const browser = spawn(browserPath, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--disable-extensions',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForJson(url, attempts = 50) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await sleep(100);
  }
  throw new Error(`Browser did not become ready at ${url}`);
}

class DevTools {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.events = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.onopen = resolve;
      this.socket.onerror = reject;
    });
    this.socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const request = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) request.reject(new Error(message.error.message));
        else request.resolve(message.result);
        return;
      }
      const listeners = this.events.get(message.method) || [];
      listeners.splice(0).forEach(resolve => resolve(message.params));
    };
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  once(method) {
    return new Promise(resolve => {
      const listeners = this.events.get(method) || [];
      listeners.push(resolve);
      this.events.set(method, listeners);
    });
  }

  until(method, predicate) {
    return new Promise(resolve => {
      const listen = () => this.once(method).then(params => {
        if (predicate(params)) resolve(params);
        else listen();
      });
      listen();
    });
  }
}

let devtools;
try {
  const pages = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  const page = pages.find(target => target.type === 'page');
  devtools = new DevTools(page.webSocketDebuggerUrl);
  await devtools.ready;
  await devtools.send('Page.enable');
  await devtools.send('Runtime.enable');
  await devtools.send('Debugger.enable');

  const platformerParsed = devtools.until(
    'Debugger.scriptParsed',
    event => /platformer\.js/.test(event.url),
  );
  const gameUrl = pathToFileURL(join(process.cwd(), 'index.html')).href;
  await devtools.send('Page.navigate', { url: gameUrl });
  const { scriptId } = await platformerParsed;
  const { scriptSource } = await devtools.send('Debugger.getScriptSource', { scriptId });
  const breakpointLine = scriptSource
    .split('\n')
    .findIndex(line => line.includes('c.mesh.position.y = c.base'));
  assert.notEqual(breakpointLine, -1, 'collection loop should exist in platformer.js');
  const breakpoint = await devtools.send('Debugger.setBreakpoint', {
    location: { scriptId, lineNumber: breakpointLine },
  });

  for (let attempt = 0; attempt < 50; attempt++) {
    const ready = await devtools.send('Runtime.evaluate', {
      expression: 'document.readyState === "complete" && !!document.getElementById("play")',
      returnByValue: true,
    });
    if (ready.result.value) break;
    await sleep(100);
  }

  const paused = Promise.race([
    devtools.once('Debugger.paused'),
    sleep(5000).then(() => { throw new Error('collection loop breakpoint was not reached'); }),
  ]);
  await devtools.send('Runtime.evaluate', {
    expression: 'document.getElementById("play").click()',
  });
  const pause = await paused;
  const callFrameId = pause.callFrames[0].callFrameId;

  await devtools.send('Debugger.evaluateOnCallFrame', {
    callFrameId,
    expression: `
      player.pos.set(27, 4.47, 0);
      player.vel.set(0, 0, 0);
      collectibles.forEach((collectible, index) => {
        collectible.collected = index !== 8;
        collectible.mesh.visible = index === 8;
      });
      player.stars = 0;
      score.textContent = '星星 0 / 9';
    `,
  });
  await devtools.send('Debugger.removeBreakpoint', { breakpointId: breakpoint.breakpointId });
  await devtools.send('Debugger.resume');
  await sleep(150);

  const score = await devtools.send('Runtime.evaluate', {
    expression: 'document.getElementById("score").textContent',
    returnByValue: true,
  });
  assert.equal(
    score.result.value,
    '星星 1 / 9',
    'the final star should be collected when it overlaps the calf body',
  );
  console.log('PASS: final star overlaps the calf collection hitbox');
} finally {
  devtools?.socket.close();
  const browserExited = new Promise(resolve => browser.once('exit', resolve));
  browser.kill();
  await Promise.race([browserExited, sleep(2000)]);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
