#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, execSync } from "node:child_process";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = PROJECT_ROOT;
const RUNTIME_DIR = path.join(APP_DIR, ".runtime");
const DEFAULT_LOG_DIR = path.join(APP_DIR, "logs");

const LOG_DIR = process.env.LOG_DIR || DEFAULT_LOG_DIR;
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const LOG_ROTATE_MAX_MB = Number.parseInt(process.env.LOG_ROTATE_MAX_MB || "200", 10);
const LOG_ROTATE_KEEP = Number.parseInt(process.env.LOG_ROTATE_KEEP || "7", 10);

const PID_FILE = path.join(RUNTIME_DIR, "dev.pid");
const STATUS_FILE = path.join(RUNTIME_DIR, "dev-server.status.json");
const STDOUT_LOG = path.join(LOG_DIR, "dev.stdout.log");
const STDERR_LOG = path.join(LOG_DIR, "dev.stderr.log");
const COMBINED_LOG = path.join(LOG_DIR, "dev.combined.log");

const STATUS_LEVEL = new Set(["debug", "info", "warn", "error"]);
const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const ACTION = process.argv[2] || "start";

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(filePath) {
  fs.mkdirSync(filePath, { recursive: true });
}

function levelAllows(level) {
  return LEVELS[level] >= LEVELS[LOG_LEVEL] && STATUS_LEVEL.has(level);
}

function writeLog(filePath, value) {
  ensureDir(LOG_DIR);
  fs.appendFileSync(filePath, `${value}\n`, { encoding: "utf8" });
}

function logJson(level, message, meta = {}) {
  if (!levelAllows(level)) return;
  const payload = {
    ts: nowIso(),
    level,
    message,
    ...meta,
  };
  const event = JSON.stringify(payload);
  writeLog(COMBINED_LOG, event);
}

function streamLabel(rawLine) {
  const line = String(rawLine || "").replace(/\n+$/, "");
  const output = line.split(/\r?\n/).filter(Boolean);
  return output;
}

function maybeBoundPort(line) {
  const match = line.match(/- Local:\s+http:\/\/localhost:(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function isPidAlive(pid) {
  if (!pid || !Number.isFinite(pid)) return false;
  try {
    process.kill(pid, "0");
    return true;
  } catch {
    return false;
  }
}

function cleanupOrphanedStatus() {
  if (!fs.existsSync(PID_FILE)) return null;
  try {
    const pid = Number.parseInt(fs.readFileSync(PID_FILE, "utf8"), 10);
    if (!isPidAlive(pid)) {
      fs.rmSync(PID_FILE);
      return null;
    }
    return pid;
  } catch {
    return null;
  }
}

function baseStatus() {
  return {
    startedAt: nowIso(),
    pid: process.pid,
    ppid: process.ppid,
    command: "npm run dev",
    cwd: APP_DIR,
    port: Number.isFinite(PORT) ? PORT : 3000,
    status: "starting",
    logPaths: {
      stdout: STDOUT_LOG,
      stderr: STDERR_LOG,
      combined: COMBINED_LOG,
    },
    boundPort: Number.isFinite(PORT) ? PORT : 3000,
  };
}

function writeStatus(payload) {
  ensureDir(RUNTIME_DIR);
  const status = {
    ...baseStatus(),
    ...payload,
    pid: payload.pid ?? process.pid,
    status: payload.status || "stopped",
    exitReason: payload.exitReason || undefined,
  };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), "utf8");
}

function rotateLog(filePath) {
  if (!fs.existsSync(filePath)) return;
  const keep = Number.isFinite(LOG_ROTATE_KEEP) ? Math.max(1, LOG_ROTATE_KEEP) : 7;
  const maxBytes = Math.max(1, Number.isFinite(LOG_ROTATE_MAX_MB) ? LOG_ROTATE_MAX_MB : 200) * 1024 * 1024;
  const stat = fs.statSync(filePath);
  if (stat.size <= maxBytes) return;

  for (let i = keep; i >= 1; i -= 1) {
    const source = i === 1 ? filePath : `${filePath}.${i - 1}`;
    const dest = `${filePath}.${i}`;
    if (fs.existsSync(dest)) {
      if (i === keep) {
        fs.rmSync(dest);
      } else {
        fs.rmSync(dest);
      }
    }
    if (fs.existsSync(source)) {
      fs.renameSync(source, dest);
    }
  }
  writeLog(filePath, `"rotated at ${nowIso()}"`);
}

function rotateLogs() {
  rotateLog(STDOUT_LOG);
  rotateLog(STDERR_LOG);
  rotateLog(COMBINED_LOG);
}

function attachStreams(child, runningStatus) {
  let boundPort = runningStatus.boundPort || runningStatus.port;

  const forward = (source, chunk) => {
    const lines = streamLabel(chunk);
    const out = source === "stdout" ? STDOUT_LOG : STDERR_LOG;
    for (const line of lines) {
      writeLog(out, `[${nowIso()}][${source}] ${line}`);
      writeLog(COMBINED_LOG, `[${nowIso()}][${source}] ${line}`);
      const foundPort = maybeBoundPort(line);
      if (foundPort) {
        boundPort = foundPort;
      }
    }
    writeStatus({ ...runningStatus, status: "running", boundPort });
  };

  child.stdout?.on("data", (chunk) => forward("stdout", chunk));
  child.stderr?.on("data", (chunk) => forward("stderr", chunk));
  child.on("error", (error) => {
    writeLog(COMBINED_LOG, `[${nowIso()}][manager] ${error.message}`);
    logJson("error", "dev server child process error", {
      event: "dev.child.error",
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  });

  child.on("exit", (code, signal) => {
    const finalStatus = code === null ? `signal:${signal}` : `code:${code}`;
    writeStatus({
      ...runningStatus,
      status: isPidAlive(runningStatus.pid || 0) ? "stopped" : "stopped",
      boundPort,
      exitReason: finalStatus,
    });
    logJson("warn", "dev server exited", {
      event: "dev.server.exit",
      level: "warn",
      durationMs: Date.now() - new Date(runningStatus.startedAt).getTime(),
      error: {
        name: "process_exit",
        message: finalStatus,
      },
    });
  });
}

function ensureFreshRuntime() {
  cleanupOrphanedStatus();
  ensureDir(LOG_DIR);
  ensureDir(RUNTIME_DIR);
}

function start() {
  ensureFreshRuntime();
  if (cleanupOrphanedStatus() && isPidAlive(cleanupOrphanedStatus())) {
    console.log("Dev server controller already running. Use status/stop first.");
    process.exit(1);
  }

  rotateLogs();

  const childEnv = {
    ...process.env,
    PORT: String(Number.isFinite(PORT) ? PORT : 3000),
    LOG_LEVEL,
    LOG_DIR,
  };

  const child = spawn("npm", ["run", "dev"], {
    cwd: APP_DIR,
    env: childEnv,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const managerPid = process.pid;
  fs.writeFileSync(PID_FILE, String(managerPid), "utf8");

  const status = baseStatus();
  status.pid = managerPid;
  status.childPid = child.pid;
  status.status = "running";
  status.boundPort = Number.isFinite(PORT) ? PORT : 3000;
  writeStatus(status);

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logJson("warn", "shutdown requested", {
      event: "dev.server.shutdown",
      level: "warn",
      error: {
        name: signal || "manual-stop",
        message: "shutdown signal received",
      },
    });
    if (child.pid) {
      child.kill("SIGINT");
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("uncaughtException", (error) => {
    writeLog(COMBINED_LOG, `[${nowIso()}][manager] ${error.stack || error.message}`);
    logJson("error", "uncaught exception", {
      event: "dev.runtime.uncaughtException",
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  });
  process.on("unhandledRejection", (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    writeLog(COMBINED_LOG, `[${nowIso()}][manager] ${message}`);
    logJson("error", "unhandled rejection", {
      event: "dev.runtime.unhandledRejection",
      error: {
        name: reason instanceof Error ? reason.name : "UnhandledRejection",
        message,
        stack,
      },
    });
  });

  attachStreams(child, status);

  child.on("exit", () => {
    if (isPidAlive(managerPid)) {
      fs.rmSync(PID_FILE, { force: true });
    }
  });
}

function status() {
  if (!fs.existsSync(STATUS_FILE)) {
    console.log(JSON.stringify({ status: "stopped" }, null, 2));
    return;
  }

  const parsed = readJson(STATUS_FILE);
  const managerAlive = isPidAlive(parsed.pid);
  const childAlive = isPidAlive(parsed.childPid);
  const derived = {
    ...parsed,
    status: childAlive ? parsed.status : "stopped",
    managerAlive,
    childAlive,
  };
  if (!managerAlive && parsed.status !== "stopped") {
    derived.status = "stopped";
    derived.exitReason = "orphaned_controller";
  }
  fs.writeFileSync(STATUS_FILE, JSON.stringify(derived, null, 2), "utf8");
  console.log(JSON.stringify(derived, null, 2));
}

function stop() {
  if (!fs.existsSync(STATUS_FILE)) {
    console.log("No status file. Server not running.");
    return;
  }

  const parsed = readJson(STATUS_FILE);
  const childPid = parsed.childPid;
  const controllerPid = parsed.pid;

  if (childPid && isPidAlive(childPid)) {
    logJson("warn", "stopping child process", { event: "dev.server.stop", pid: childPid });
    process.kill(childPid, "SIGINT");
  }

  if (controllerPid && isPidAlive(controllerPid) && controllerPid !== process.pid) {
    process.kill(controllerPid, "SIGINT");
  }

  const stillRunning = isPidAlive(childPid) || isPidAlive(controllerPid);
  const nextStatus = {
    ...parsed,
    status: stillRunning ? "stopping" : "stopped",
    exitReason: stillRunning ? parsed.exitReason : "requested_stop",
  };
  writeStatus(nextStatus);
  if (!stillRunning) {
    fs.rmSync(PID_FILE, { force: true });
  }
  console.log(JSON.stringify(nextStatus, null, 2));
}

function tail() {
  if (!fs.existsSync(COMBINED_LOG)) {
    console.log("No combined log file yet. Start the server first.");
    return;
  }
  const child = spawn("tail", ["-n", "120", "-f", COMBINED_LOG], {
    stdio: "inherit",
  });
  child.on("close", () => {
    process.exit(0);
  });
}

function help() {
  console.log("Usage: dev-server.mjs [start|status|stop|tail|rotate]");
}

function main() {
  switch (ACTION) {
    case "start":
      start();
      break;
    case "status":
      status();
      break;
    case "stop":
      stop();
      break;
    case "tail":
      tail();
      break;
    case "rotate":
      rotateLogs();
      console.log("Log rotation completed");
      break;
    case "help":
      help();
      break;
    default:
      help();
      process.exit(1);
  }
}

main();
