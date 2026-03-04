#!/usr/bin/env node
/**
 * Unified dev script — installs Python deps, starts backend, starts Next.js.
 * Cross-platform (Windows + Linux/macOS).
 *
 * Usage:  npm run dev
 */

import { spawn, execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BACKEND_DIR = resolve(ROOT, 'backend');

const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 8000;
const HEALTH_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}/api/health`;
const HEALTH_TIMEOUT_S = 60;
const IS_WIN = process.platform === 'win32';

// Detect python executable name (python3 on Unix, python on Windows)
const PYTHON = IS_WIN ? 'python' : 'python3';

// ── Helpers ──────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`\x1b[36m[dev]\x1b[0m ${msg}`);
}

function logError(msg) {
  console.error(`\x1b[31m[dev]\x1b[0m ${msg}`);
}

/** Run a command synchronously, inheriting stdio. Returns true on success. */
function runSync(cmd, args, opts = {}) {
  try {
    execSync([cmd, ...args].join(' '), {
      stdio: 'inherit',
      cwd: opts.cwd || ROOT,
      shell: true,
    });
    return true;
  } catch {
    return false;
  }
}

/** Spawn a long-running process. Returns the ChildProcess. */
function spawnProcess(cmd, args, opts = {}) {
  return spawn(cmd, args, {
    cwd: opts.cwd || ROOT,
    stdio: 'inherit',
    shell: true,
    ...opts,
  });
}

/** Poll the health endpoint until it responds or timeout. */
function waitForHealth() {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      if (elapsed > HEALTH_TIMEOUT_S) {
        clearInterval(interval);
        reject(new Error(`Backend did not become healthy within ${HEALTH_TIMEOUT_S}s`));
        return;
      }

      const req = http.get(HEALTH_URL, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          resolve();
        }
        res.resume(); // drain
      });
      req.on('error', () => { /* not ready yet */ });
      req.end();
    }, 1000);
  });
}

// ── Main ─────────────────────────────────────────────────────────────────

const children = [];
let exiting = false;

/**
 * Kill a child process tree.
 * On Windows, `child.kill()` only kills the shell wrapper, leaving the real
 * process alive. Use `taskkill /T /F /PID` to kill the entire tree.
 */
function killChild(child) {
  if (!child || child.exitCode !== null) return; // already dead
  try {
    if (IS_WIN && child.pid) {
      execSync(`taskkill /T /F /PID ${child.pid}`, { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  } catch { /* already exited */ }
}

function cleanup() {
  if (exiting) return;
  exiting = true;
  for (const child of children) killChild(child);
}

process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
process.on('exit', cleanup);

async function main() {
  // 1. Install Python dependencies
  log('Installing Python dependencies…');
  const pipOk = runSync(PYTHON, [
    '-m', 'pip', 'install', '-r', 'requirements.txt',
    '--extra-index-url', 'https://download.pytorch.org/whl/cpu',
    '--quiet',
  ], { cwd: BACKEND_DIR });

  if (!pipOk) {
    logError('Failed to install Python dependencies. Is Python 3.11+ installed?');
    process.exit(1);
  }
  log('Python dependencies ready.');

  // 2. Start backend
  log(`Starting backend on ${BACKEND_HOST}:${BACKEND_PORT}…`);
  const backend = spawnProcess(PYTHON, [
    '-m', 'uvicorn', 'app:app',
    '--host', BACKEND_HOST,
    '--port', String(BACKEND_PORT),
    '--reload',
  ], { cwd: BACKEND_DIR });
  children.push(backend);

  backend.on('exit', (code) => {
    if (code !== null && code !== 0) {
      logError(`Backend exited with code ${code}`);
    }
  });

  // 3. Wait for backend health
  log('Waiting for backend health check…');
  try {
    await waitForHealth();
    log('Backend is healthy ✓');
  } catch (err) {
    logError(err.message);
    logError('Continuing anyway — the backend may still be loading the model.');
  }

  // 4. Start Next.js dev server
  log('Starting Next.js dev server…');
  const frontend = spawnProcess('npx', ['next', 'dev'], { cwd: ROOT });
  children.push(frontend);

  frontend.on('exit', (code) => {
    cleanup();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  logError(err.message);
  cleanup();
  process.exit(1);
});
