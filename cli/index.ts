#!/usr/bin/env npx tsx

/**
 * Teneo Protocol CLI
 * SECURITY: Wallet keys are encrypted at rest (AES-256-GCM) and used for local signing only.
 * Only cryptographic signatures are transmitted — never the key itself.
 *
 * Architecture: CLI commands route through a background daemon process that maintains
 * a persistent WebSocket connection to Teneo Protocol. The daemon auto-starts on first
 * use and auto-stops after a configurable inactivity timeout.
 */

import "dotenv/config";
import { Command } from "commander";
import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  isAddress,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as allChains from "viem/chains";
import * as nodeCrypto from "node:crypto";
import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import * as nodeOs from "node:os";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

// ─── Config ──────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.TENEO_PRIVATE_KEY;
const DEFAULT_ROOM = process.env.TENEO_DEFAULT_ROOM || "";
const CLI_FILE_DIR = nodePath.dirname(fileURLToPath(import.meta.url));
const GREETING_INSTALL_FILE = nodePath.join(CLI_FILE_DIR, "greetings.install.md");

// Build chain ID lookup from all viem-supported chains
const CHAIN_BY_ID: Record<number, Chain> = {};
for (const key of Object.keys(allChains)) {
  const c = (allChains as Record<string, unknown>)[key];
  if (c && typeof c === "object" && "id" in c)
    CHAIN_BY_ID[(c as Chain).id] = c as Chain;
}

// ─── Wallet Storage ──────────────────────────────────────────────────────────

const WALLET_DIR = nodePath.join(nodeOs.homedir(), ".teneo-wallet");
const WALLET_FILE = nodePath.join(WALLET_DIR, "wallet.json");
const SECRET_FILE = nodePath.join(WALLET_DIR, ".secret");
const WALLET_VERSION = 1;

interface WalletData {
  version: number;
  address: string;
  encryptedKey: string;
  iv: string;
  authTag: string;
  createdAt: string;
}

class WalletConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletConfigurationError";
  }
}

function buildWalletRecoveryMessage(reason: string): string {
  return `${reason} Fix or remove the wallet files in "${WALLET_DIR}", or run "teneo-cli wallet-init --force" to replace them.`;
}

function ensureWalletDir() {
  if (!nodeFs.existsSync(WALLET_DIR))
    nodeFs.mkdirSync(WALLET_DIR, { recursive: true, mode: 0o700 });
}

function readMasterSecret(createIfMissing: boolean): Buffer {
  ensureWalletDir();
  if (nodeFs.existsSync(SECRET_FILE)) {
    const hex = nodeFs.readFileSync(SECRET_FILE, "utf8").trim();
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
      throw new WalletConfigurationError(buildWalletRecoveryMessage(`Wallet secret "${SECRET_FILE}" is invalid.`));
    }
    return Buffer.from(hex, "hex");
  }
  if (!createIfMissing) {
    throw new WalletConfigurationError(buildWalletRecoveryMessage(`Wallet secret "${SECRET_FILE}" is missing for the existing wallet.`));
  }
  return writeNewMasterSecret();
}

function writeNewMasterSecret(): Buffer {
  ensureWalletDir();
  const secret = nodeCrypto.randomBytes(32);
  nodeFs.writeFileSync(SECRET_FILE, secret.toString("hex"), { mode: 0o600 });
  nodeFs.chmodSync(SECRET_FILE, 0o600);
  return secret;
}

function encryptPK(pk: string, masterSecret: Buffer) {
  const iv = nodeCrypto.randomBytes(12);
  const cipher = nodeCrypto.createCipheriv("aes-256-gcm", masterSecret, iv);
  const encrypted = Buffer.concat([cipher.update(pk, "utf8"), cipher.final()]);
  return {
    encryptedKey: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptPK(encryptedKey: string, iv: string, authTag: string, masterSecret: Buffer): string {
  const decipher = nodeCrypto.createDecipheriv("aes-256-gcm", masterSecret, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedKey, "base64")), decipher.final()]).toString("utf8");
}

function normalizeWalletData(data: unknown): WalletData {
  if (!data || typeof data !== "object") {
    throw new WalletConfigurationError(buildWalletRecoveryMessage(`Wallet file "${WALLET_FILE}" is not a valid JSON object.`));
  }

  const wallet = data as Partial<WalletData>;
  const version = wallet.version ?? WALLET_VERSION;
  if (!Number.isInteger(version) || version < 1) {
    throw new WalletConfigurationError(buildWalletRecoveryMessage(`Wallet file "${WALLET_FILE}" has an unsupported version.`));
  }
  if (!wallet.address || typeof wallet.address !== "string" || !isAddress(wallet.address)) {
    throw new WalletConfigurationError(buildWalletRecoveryMessage(`Wallet file "${WALLET_FILE}" is missing a valid address.`));
  }
  for (const field of ["encryptedKey", "iv", "authTag", "createdAt"] as const) {
    if (!wallet[field] || typeof wallet[field] !== "string") {
      throw new WalletConfigurationError(buildWalletRecoveryMessage(`Wallet file "${WALLET_FILE}" is missing "${field}".`));
    }
  }

  return {
    version,
    address: wallet.address,
    encryptedKey: wallet.encryptedKey,
    iv: wallet.iv,
    authTag: wallet.authTag,
    createdAt: wallet.createdAt,
  };
}

function loadWallet(): WalletData | null {
  if (!nodeFs.existsSync(WALLET_FILE)) return null;
  try {
    return normalizeWalletData(JSON.parse(nodeFs.readFileSync(WALLET_FILE, "utf8")));
  } catch (err) {
    if (err instanceof WalletConfigurationError) throw err;
    throw new WalletConfigurationError(buildWalletRecoveryMessage(`Wallet file "${WALLET_FILE}" could not be read.`));
  }
}

function saveWallet(data: WalletData) {
  ensureWalletDir();
  nodeFs.writeFileSync(WALLET_FILE, JSON.stringify({ ...data, version: WALLET_VERSION }, null, 2), { mode: 0o600 });
  nodeFs.chmodSync(WALLET_FILE, 0o600);
}

function autoCreateWallet(options: { resetSecret?: boolean } = {}): { address: string; privateKey: string } {
  console.error(JSON.stringify({ info: "No wallet found — generating a new one automatically..." }));
  const privateKey = nodeCrypto.randomBytes(32).toString("hex");
  const account = privateKeyToAccount(`0x${privateKey}` as `0x${string}`);
  const secret = options.resetSecret ? writeNewMasterSecret() : readMasterSecret(true);
  const encrypted = encryptPK(privateKey, secret);
  saveWallet({
    version: WALLET_VERSION,
    address: account.address,
    encryptedKey: encrypted.encryptedKey,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    createdAt: new Date().toISOString(),
  });
  console.error(JSON.stringify({ info: `Wallet created: ${account.address}` }));
  console.error(JSON.stringify({ info: `Fund this address with USDC on one of the supported payment chains: ${formatSupportedWalletChains()}.` }));
  return { address: account.address, privateKey };
}

function getWalletAddress(): string {
  if (PRIVATE_KEY) {
    const key = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
    return privateKeyToAccount(key as `0x${string}`).address;
  }
  const wallet = loadWallet();
  if (wallet) return wallet.address;
  return autoCreateWallet().address;
}

function requireKey(): string {
  if (PRIVATE_KEY) return PRIVATE_KEY;
  const wallet = loadWallet();
  if (wallet) {
    const secret = readMasterSecret(false);
    try {
      return decryptPK(wallet.encryptedKey, wallet.iv, wallet.authTag, secret);
    } catch {
      throw new WalletConfigurationError(buildWalletRecoveryMessage("Wallet decryption failed. The wallet secret does not match the stored wallet."));
    }
  }
  return autoCreateWallet().privateKey;
}

// ─── USDC Chain Config ───────────────────────────────────────────────────────

const USDC_ADDRESSES: Record<string, `0x${string}`> = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  avax: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  peaq: "0xbbA60da06c2c5424f03f7434542280FCAd453d10",
  xlayer: "0x74b7F16337b8972027F6196A17a631aC6dE26d22",
};

const WALLET_CHAIN_MAP: Record<string, Chain> = {
  base: allChains.base,
  avax: allChains.avalanche,
  peaq: defineChain({
    id: 3338, name: "PEAQ",
    nativeCurrency: { name: "PEAQ", symbol: "PEAQ", decimals: 18 },
    rpcUrls: { default: { http: ["https://peaq.api.onfinality.io/public"] } },
  }),
  xlayer: defineChain({
    id: 196, name: "XLayer",
    nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
    rpcUrls: { default: { http: ["https://rpc.xlayer.tech"] } },
  }),
};

const SUPPORTED_WALLET_CHAINS = Object.keys(WALLET_CHAIN_MAP);

function formatSupportedWalletChains(): string {
  return SUPPORTED_WALLET_CHAINS.join(", ");
}

function formatSupportedWalletChainsForFlag(): string {
  return SUPPORTED_WALLET_CHAINS.join("|");
}

const ERC20_BALANCE_ABI = [{ inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }] as const;
const ERC20_TRANSFER_ABI = [{ inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }] as const;
const ERC20_TRANSFER_EVENT = { type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }] } as const;


// ─── Output Helpers ──────────────────────────────────────────────────────────

const JSON_FLAG = process.argv.includes("--json");
const PRICE_CONFIRM_THRESHOLD_MICRO_USDC = 1_500n; // 0.15 cents = 0.0015 USDC

function out(data: unknown) { console.log(JSON.stringify(data, null, 2)); }

function fail(msg: string): never {
  if (JSON_FLAG) console.error(JSON.stringify({ error: msg }));
  else console.error(`Error: ${msg}`);
  process.exit(1);
}

function parseQuotedPriceMicroUsdc(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.round(value * 1_000_000));
  }
  if (typeof value === "string" && value.trim() !== "") {
    const trimmed = value.trim();
    if (/^-?\d+$/.test(trimmed)) return BigInt(trimmed);
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return BigInt(Math.round(parsed * 1_000_000));
  }
  return 0n;
}

function formatMicroUsdc(microUsdc: bigint): string {
  const sign = microUsdc < 0n ? "-" : "";
  const abs = microUsdc < 0n ? -microUsdc : microUsdc;
  const whole = abs / 1_000_000n;
  const frac = (abs % 1_000_000n).toString().padStart(6, "0");
  return `${sign}${whole}.${frac}`;
}

function getQuotedPriceBreakdown(quote: any): { basePrice: bigint; facilitatorFee: bigint; total: bigint; currency: string } {
  const basePrice = parseQuotedPriceMicroUsdc(quote?.pricing?.pricePerUnit ?? quote?.pricing?.price_per_unit);
  const facilitatorFee = parseQuotedPriceMicroUsdc(
    quote?.facilitatorFee ??
    quote?.facilitator_fee ??
    quote?.settlement?.facilitatorFee ??
    quote?.settlement?.facilitator_fee,
  );
  return {
    basePrice,
    facilitatorFee,
    total: basePrice + facilitatorFee,
    currency: quote?.pricing?.currency || "USDC",
  };
}

async function confirmQuotedPrice(quote: any, commandText: string): Promise<void> {
  const { basePrice, facilitatorFee, total, currency } = getQuotedPriceBreakdown(quote);
  if (total <= PRICE_CONFIRM_THRESHOLD_MICRO_USDC) return;

  const threshold = formatMicroUsdc(PRICE_CONFIRM_THRESHOLD_MICRO_USDC);
  const totalFormatted = formatMicroUsdc(total);
  const breakdown = facilitatorFee > 0n
    ? ` (${formatMicroUsdc(basePrice)} base + ${formatMicroUsdc(facilitatorFee)} facilitator fee)`
    : "";
  const message = `Quoted payment for "${commandText}" is ${totalFormatted} ${currency}${breakdown}, above the confirmation threshold of ${threshold} ${currency}.`;

  if (!process.stdin.isTTY) {
    fail(`${message} Re-run with --ignore-price to execute without interactive confirmation.`);
  }

  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = (await rl.question(`${message} Execute? [y/N] `)).trim().toLowerCase();
    if (answer !== "y" && answer !== "yes") {
      fail("Command cancelled.");
    }
  } finally {
    rl.close();
  }
}

function normalizeDaemonError(error: string): string {
  if (error.includes("Not connected to Teneo network")) {
    return "Connection to Teneo network was lost. The daemon is reconnecting — please retry in a few seconds.";
  }
  return error;
}

function loadGreetingInstallMarkdown(): string {
  try {
    return nodeFs.readFileSync(GREETING_INSTALL_FILE, "utf8").trim();
  } catch {
    return "";
  }
}

function renderMarkdownForConsole(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      let formatted = line;
      if (line.startsWith("### ")) formatted = `  ${line.slice(4)}`;
      else if (line.startsWith("## ")) formatted = `${line.slice(3)}`;
      else if (line.startsWith("- ")) formatted = `  ${line}`;
      return formatted.replace(/`/g, "");
    })
    .join("\n")
    .trim();
}

const GREETING_INSTALL_TEXT = renderMarkdownForConsole(loadGreetingInstallMarkdown());
const DAEMON_START_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.TENEO_DAEMON_START_TIMEOUT_MS);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 30_000;
})();

function parseTokenId(value: string | undefined, source = "--token-id"): number | undefined {
  if (value === undefined) return undefined;
  const tokenId = Number(value);
  if (!Number.isInteger(tokenId)) fail(`${source} must be a whole number`);
  return tokenId;
}

function parseUsdcAmount(amount: string): bigint {
  if (!/^\d+(?:\.\d{1,6})?$/.test(amount)) {
    fail("Invalid amount. Use a positive USDC amount with up to 6 decimal places.");
  }

  const [wholePart, fractionalPart = ""] = amount.split(".");
  const normalizedFraction = fractionalPart.padEnd(6, "0");
  const rawAmount = BigInt(wholePart) * 1_000_000n + BigInt(normalizedFraction);
  if (rawAmount <= 0n) fail("Amount must be at least 0.000001 USDC.");
  return rawAmount;
}

function pad(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len - 1) + " " : str + " ".repeat(len - str.length);
}

function padCenter(str: string, len: number): string {
  if (str.length >= len) return str.substring(0, len);
  const left = Math.floor((len - str.length) / 2);
  return " ".repeat(left) + str + " ".repeat(len - str.length - left);
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Daemon Communication ───────────────────────────────────────────────────

const DAEMON_PID_FILE = nodePath.join(WALLET_DIR, "daemon.pid");
const DAEMON_PORT_FILE = nodePath.join(WALLET_DIR, "daemon.port");

function getDaemonPort(): number | null {
  try {
    const port = Number.parseInt(nodeFs.readFileSync(DAEMON_PORT_FILE, "utf8").trim(), 10);
    return Number.isInteger(port) && port > 0 ? port : null;
  }
  catch { return null; }
}

function getDaemonPid(): number | null {
  try {
    const pid = Number.parseInt(nodeFs.readFileSync(DAEMON_PID_FILE, "utf8").trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function isDaemonRunning(): boolean {
  try {
    const pid = getDaemonPid();
    if (!pid) return false;
    process.kill(pid, 0);
    return true;
  } catch { return false; }
}

interface DaemonHealth {
  status?: string;
  authenticated?: boolean;
  idle_timeout_ms?: number;
  last_connection_error?: string | null;
  last_connection_error_name?: string | null;
}

async function fetchDaemonHealth(port: number): Promise<DaemonHealth | null> {
  try {
    const res = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    return await res.json() as DaemonHealth;
  } catch {
    return null;
  }
}

async function stopDaemonBestEffort(port = getDaemonPort()): Promise<void> {
  if (port) {
    try {
      await fetch(`http://localhost:${port}/stop`, { method: "POST", signal: AbortSignal.timeout(2000) });
      await sleep(200);
    } catch {}
  }

  const pid = getDaemonPid();
  if (pid) {
    try { process.kill(pid, "SIGTERM"); } catch {}
  }
}

async function startDaemonSafe(options: { requireAuthenticated?: boolean } = {}): Promise<{ port?: number; health?: DaemonHealth | null; error?: string }> {
  const requireAuthenticated = options.requireAuthenticated ?? true;
  console.error(JSON.stringify({ info: "Starting daemon..." }));

  // Prefer pre-compiled .mjs (fast), fall back to .ts via tsx
  const mjsPath = nodePath.join(CLI_FILE_DIR, "daemon.mjs");
  const tsPath = nodePath.join(CLI_FILE_DIR, "daemon.ts");
  const usePrecompiled = nodeFs.existsSync(mjsPath);
  const child = usePrecompiled
    ? spawn("node", [mjsPath], { detached: true, stdio: "ignore", cwd: CLI_FILE_DIR, env: { ...process.env } })
    : spawn("npx", ["tsx", tsPath], { detached: true, stdio: "ignore", cwd: CLI_FILE_DIR, env: { ...process.env } });
  child.unref();

  let lastError: string | undefined;
  const deadline = Date.now() + DAEMON_START_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(500);
    const port = getDaemonPort();
    if (!port) continue;

    const health = await fetchDaemonHealth(port);
    if (!health) continue;

    if (health.authenticated) {
      console.error(JSON.stringify({ info: `Daemon ready on port ${port}` }));
      return { port, health };
    }

    if (!requireAuthenticated) {
      console.error(JSON.stringify({ info: `Daemon HTTP server ready on port ${port}` }));
      return { port, health };
    }

    if (health.last_connection_error) {
      lastError = health.last_connection_error;
      if (requireAuthenticated && health.last_connection_error_name === "WalletConfigurationError") {
        await stopDaemonBestEffort(port);
        return { error: lastError };
      }
    }
  }

  if (requireAuthenticated) {
    await stopDaemonBestEffort();
  }
  return {
    error: lastError
      ? `Daemon failed to authenticate within ${DAEMON_START_TIMEOUT_MS}ms. ${lastError}`
      : `Daemon failed to authenticate within ${DAEMON_START_TIMEOUT_MS}ms.`,
  };
}

async function startDaemon(): Promise<number> {
  const result = await startDaemonSafe();
  if (result.error || !result.port) fail(result.error || "Daemon failed to start.");
  return result.port;
}

async function getHealthStatus(): Promise<Record<string, unknown>> {
  let port = getDaemonPort();
  let running = !!port && isDaemonRunning();
  let health = running && port ? await fetchDaemonHealth(port) : null;

  if ((!running || !health) && !running) {
    const started = await startDaemonSafe({ requireAuthenticated: false });
    if (started.port) {
      port = started.port;
      running = true;
      health = started.health ?? await fetchDaemonHealth(port);
    } else {
      return {
        status: "stopped",
        port: null,
        connected: false,
        authenticated: false,
        daemon_status: null,
        idle_timeout_ms: null,
        last_connection_error: started.error || null,
      };
    }
  }

  return {
    status: running ? "running" : "stopped",
    port: port ?? null,
    connected: health?.status === "ready" || health?.status === "connected",
    authenticated: health?.authenticated ?? false,
    daemon_status: health?.status ?? (running ? "starting" : null),
    idle_timeout_ms: health?.idle_timeout_ms ?? null,
    last_connection_error: health?.last_connection_error ?? null,
  };
}

async function execViaDaemon(command: string, args: Record<string, any> = {}): Promise<any> {
  const response = await tryExecViaDaemon(command, args);
  if (response.error) fail(response.error);
  return response.result;
}

async function tryExecViaDaemon(command: string, args: Record<string, any> = {}): Promise<{ result?: any; error?: string }> {
  let port = getDaemonPort();
  if (!port || !isDaemonRunning()) {
    const started = await startDaemonSafe();
    if (started.error || !started.port) return { error: started.error || "Daemon failed to start." };
    port = started.port;
  }

  let res: Response;
  try {
    res = await fetch(`http://localhost:${port}/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, args }),
    });
  } catch (err: any) {
    // Daemon may have crashed — try restarting once
    console.error(JSON.stringify({ warn: "Daemon connection lost, restarting..." }));
    const restarted = await startDaemonSafe();
    if (restarted.error || !restarted.port) return { error: restarted.error || "Daemon failed to start." };
    port = restarted.port;
    res = await fetch(`http://localhost:${port}/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, args }),
    });
  }
  const data = await res.json() as any;
  if (data.error) {
    return { error: normalizeDaemonError(data.error) };
  }
  return { result: data.result };
}

async function resolveRoom(opt?: string): Promise<string> {
  if (opt) return opt;
  if (DEFAULT_ROOM) return DEFAULT_ROOM;
  // Auto-resolve: use the first available room (every user gets a default private room on connect)
  const result = await execViaDaemon("rooms");
  if (result.rooms && result.rooms.length > 0) {
    const room = result.rooms[0];
    console.error(JSON.stringify({ info: `Using room: ${room.name || room.id}` }));
    return room.id;
  }
  // No rooms at all — create one
  console.error(JSON.stringify({ info: "No rooms found — creating one..." }));
  const created = await execViaDaemon("create-room", { name: "Default Room" });
  const roomId = created.room?.id;
  if (!roomId) fail("Failed to auto-create room.");
  console.error(JSON.stringify({ info: `Room created: ${roomId}` }));
  return roomId;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const program = new Command();
program.name("teneo-cli").version("2.0.57")
  .description("Teneo Protocol CLI. Private keys are NEVER transmitted.")
  .option("--json", "Machine-readable JSON output");
if (GREETING_INSTALL_TEXT) {
  program.addHelpText("afterAll", `\n${GREETING_INSTALL_TEXT}\n`);
}

// ─── Daemon Control ─────────────────────────────────────────────────────────

program.command("daemon")
  .description("Manage the background daemon (start | stop | status)")
  .argument("<action>", "start | stop | status")
  .action(async (action: string) => {
    switch (action) {
      case "start": {
        if (isDaemonRunning()) {
          out({ status: "already_running", port: getDaemonPort() });
          return;
        }
        const port = await startDaemon();
        out({ status: "started", port });
        break;
      }
      case "stop": {
        const port = getDaemonPort();
        if (!port || !isDaemonRunning()) { out({ status: "not_running" }); return; }
        await stopDaemonBestEffort(port);
        out({ status: "stopped" });
        break;
      }
      case "status": {
        const running = isDaemonRunning();
        const port = getDaemonPort();
        const health = running && port ? await fetchDaemonHealth(port) : null;
        out({
          status: running ? "running" : "stopped",
          port,
          authenticated: health?.authenticated ?? false,
          daemon_status: health?.status ?? null,
          idle_timeout_ms: health?.idle_timeout_ms ?? null,
          last_connection_error: health?.last_connection_error ?? null,
        });
        break;
      }
      default:
        fail(`Unknown daemon action: ${action}. Use: start | stop | status`);
    }
  });

// ─── Health ─────────────────────────────────────────────────────────────────

program.command("health")
  .description("Check connection health")
  .action(async () => {
    console.error(`teneo-cli v${program.version()}`);
    out(await getHealthStatus());
  });

// ─── Browse & Query Network Agents ──────────────────────────────────────────
// These commands let you discover and interact with agents deployed by others.
// To deploy and manage your OWN agents, use: teneo-cli agent --help

program.command("discover")
  .description("Browse all network agents with commands and pricing (JSON)")
  .action(async () => { out(await execViaDaemon("discover")); });

program.command("list-agents").alias("agents")
  .description("Browse agents on the Teneo network (use 'agent' commands to deploy your own)")
  .option("--online", "Show only online agents")
  .option("--free", "Show only agents with free commands")
  .option("--search <keyword>", "Search by name/description")
  .action(async (opts: any) => {
    const result = await execViaDaemon("list-agents", {
      online: opts.online, free: opts.free, search: opts.search,
    });

    if (JSON_FLAG) { out(result); return; }

    const agents = result.agents || [];
    if (agents.length === 0) { console.log("No agents found."); return; }

    const col = { id: 28, name: 28, status: 8, cmds: 6, price: 14 };
    console.log("");
    console.log(pad("AGENT ID", col.id) + pad("NAME", col.name) + pad("STATUS", col.status) + pad("CMDS", col.cmds) + pad("PRICE RANGE", col.price));
    console.log("-".repeat(col.id + col.name + col.status + col.cmds + col.price));

    for (const agent of agents) {
      const prices = agent.commands.map((c: any) => c.price);
      const minP = Math.min(...(prices.length ? prices : [0]));
      const maxP = Math.max(...(prices.length ? prices : [0]));
      let priceRange = maxP === 0 ? "FREE" : minP === 0 ? `FREE-$${maxP}` : minP === maxP ? `$${minP}` : `$${minP}-$${maxP}`;
      console.log(pad(agent.agent_id, col.id) + pad(agent.agent_name, col.name) + (agent.is_online ? "ON    " : "OFF   ") + "  " + pad(String(agent.commands.length), col.cmds) + priceRange);
    }
    console.log(`\n${agents.length} agent(s) found.`);
  });

program.command("info").alias("agent-details")
  .description("Show details, commands, and pricing for a network agent")
  .argument("<agentId>")
  .action(async (agentId: string) => {
    const result = await execViaDaemon("info", { agentId });

    if (result.error === "not_found") {
      if (JSON_FLAG) { out(result); } else {
        console.error(`Agent "${agentId}" not found.`);
        if (result.suggestions?.length) {
          console.log("\nDid you mean:");
          result.suggestions.forEach((s: string) => console.log(`  ${s}`));
        }
      }
      process.exit(1);
    }

    if (JSON_FLAG) { out(result); return; }

    const agent = result;
    console.log("\n" + "=".repeat(56));
    console.log(`  ${padCenter(agent.agent_name, 54)}`);
    console.log("=".repeat(56));
    console.log(`  ID:          ${agent.agent_id}`);
    console.log(`  Type:        ${agent.type}`);
    console.log(`  Status:      ${agent.is_online ? "ONLINE" : "OFFLINE"}`);
    if (agent.description) console.log(`  Description: ${agent.description}`);

    if (agent.commands?.length > 0) {
      console.log(`\n  COMMANDS (${agent.commands.length}):`);
      console.log("  " + "-".repeat(60));
      for (const cmd of agent.commands) {
        const price = !cmd.price || cmd.price === 0 ? "FREE" : `$${cmd.price} USDC/${cmd.task_unit || "query"}`;
        console.log(`\n  ${cmd.usage}`);
        if (cmd.description) console.log(`    ${cmd.description}`);
        console.log(`    Price: ${price}`);
        if (cmd.parameters?.length > 0) {
          console.log(`    Parameters:`);
          const maxName = Math.max(...cmd.parameters.map((p: any) => (p.name || "").length));
          const maxType = Math.max(...cmd.parameters.map((p: any) => (p.type || "string").length));
          for (const p of cmd.parameters) {
            const name = (p.name || "").padEnd(maxName);
            const type = (p.type || "string").padEnd(maxType);
            const req = p.required !== false ? "(required)" : "(optional)";
            const desc = p.description || "";
            console.log(`      ${name}  ${type}  ${req}  ${desc}`);
          }
        }
      }
    }
    console.log(`\n  QUERY THIS AGENT:`);
    console.log(`    teneo-cli command ${agent.agent_id} "${agent.commands?.[0]?.trigger || "help"}" --room <roomId>\n`);
  });

// ─── Query Network Agents (via daemon) ──────────────────────────────────────

program.command("command")
  .description("Send a command to a network agent and get a response")
  .argument("<agent>", "Internal agent ID (e.g. x-agent-enterprise-v2)")
  .argument("<cmd>", "Command string: {trigger} {argument}")
  .option("--room <roomId>")
  .option("--timeout <ms>", "Response timeout", "120000")
  .option("--chain <chain>", `Payment chain (${formatSupportedWalletChainsForFlag()})`)
  .option("--network <network>", "Payment network (alias for --chain)")
  .option("--ignore-price", "Execute without the pre-execution price confirmation gate")
  .action(async (agent: string, cmd: string, opts: any) => {
    const room = await resolveRoom(opts.room);
    const chain = opts.chain || opts.network;
    const timeout = parseInt(opts.timeout, 10);
    const commandText = `@${agent} ${cmd}`;
    let quoteTaskId: string | undefined;

    if (!opts.ignorePrice) {
      const quote = await execViaDaemon("quote", { message: commandText, room, chain });
      await confirmQuotedPrice(quote, commandText);
      if (typeof quote?.taskId === "string" && quote.taskId) {
        quoteTaskId = quote.taskId;
      }
    }

    out(await execViaDaemon("command", { agent, cmd, room, chain, timeout, quoteTaskId }));
  });

program.command("quote")
  .description("Check price for a command (does not execute)")
  .argument("<message>")
  .option("--room <roomId>")
  .option("--chain <chain>", `Payment chain (${formatSupportedWalletChainsForFlag()})`)
  .option("--network <network>", "Payment network (alias for --chain)")
  .action(async (message: string, opts: any) => {
    const room = await resolveRoom(opts.room);
    const chain = opts.chain || opts.network;
    out(await execViaDaemon("quote", { message, room, chain }));
  });

// ─── Room Management (via daemon) ──────────────────────────────────────────

program.command("rooms").description("List all rooms")
  .action(async () => { out(await execViaDaemon("rooms")); });

program.command("room-agents").description("List agents in room").argument("<roomId>")
  .action(async (roomId: string) => { out(await execViaDaemon("room-agents", { roomId })); });

program.command("create-room").description("Create room").argument("<name>")
  .option("--description <desc>").option("--public", "Make room public", false)
  .action(async (name: string, opts: any) => {
    out(await execViaDaemon("create-room", { name, description: opts.description, isPublic: opts.public }));
  });

program.command("update-room").description("Update room").argument("<roomId>")
  .option("--name <name>").option("--description <desc>")
  .action(async (roomId: string, opts: any) => {
    out(await execViaDaemon("update-room", { roomId, name: opts.name, description: opts.description }));
  });

program.command("delete-room").description("Delete room").argument("<roomId>")
  .action(async (roomId: string) => { out(await execViaDaemon("delete-room", { roomId })); });

program.command("add-agent").description("Add agent to room").argument("<roomId>").argument("<agentId>")
  .action(async (roomId: string, agentId: string) => { out(await execViaDaemon("add-agent", { roomId, agentId })); });

program.command("remove-agent").description("Remove agent from room").argument("<roomId>").argument("<agentId>")
  .action(async (roomId: string, agentId: string) => { out(await execViaDaemon("remove-agent", { roomId, agentId })); });

program.command("owned-rooms").description("List rooms you own")
  .action(async () => { out(await execViaDaemon("owned-rooms")); });

program.command("shared-rooms").description("List rooms shared with you")
  .action(async () => { out(await execViaDaemon("shared-rooms")); });

program.command("subscribe").description("Subscribe to public room").argument("<roomId>")
  .action(async (roomId: string) => { out(await execViaDaemon("subscribe", { roomId })); });

program.command("unsubscribe").description("Unsubscribe from room").argument("<roomId>")
  .action(async (roomId: string) => { out(await execViaDaemon("unsubscribe", { roomId })); });

program.command("room-available-agents").description("List agents available to add to a room").argument("<roomId>")
  .action(async (roomId: string) => { out(await execViaDaemon("room-available-agents", { roomId })); });

// ─── Wallet Management (local — no daemon needed) ──────────────────────────

program.command("wallet-init").description("Show wallet status or create a new wallet")
  .option("--force", "Force create a new wallet even if one exists")
  .action(async (opts: any) => {
    if (!opts.force) {
      if (PRIVATE_KEY) { out({ status: "env_var_set", note: "Private key found in environment." }); return; }
      const existing = loadWallet();
      if (existing) { out({ status: "exists", address: existing.address, createdAt: existing.createdAt }); return; }
    }
    const { address } = autoCreateWallet({ resetSecret: !!opts.force });
    out({ status: "created", address, note: `New wallet generated. Fund with USDC on one of the supported payment chains: ${formatSupportedWalletChains()}.` });
  });

program.command("wallet-address").description("Show wallet public address")
  .action(async () => {
    if (PRIVATE_KEY) {
      const key = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
      out({ address: privateKeyToAccount(key as `0x${string}`).address, source: "environment_variable" });
      return;
    }

    const wallet = loadWallet();
    if (wallet) { out({ address: wallet.address, createdAt: wallet.createdAt }); }
    else {
      const { address } = autoCreateWallet();
      out({ address, source: "auto_generated" });
    }
  });

program.command("wallet-pubkey").description("Show wallet public key")
  .action(async () => {
    const key = requireKey();
    const hex = key.startsWith("0x") ? key : `0x${key}`;
    const account = privateKeyToAccount(hex as `0x${string}`);
    out({ address: account.address, publicKey: account.publicKey });
  });

program.command("wallet-export-key").description("Export private key (DANGEROUS)")
  .action(async () => {
    const wallet = loadWallet();
    if (!wallet) fail(PRIVATE_KEY ? "No wallet file. Key is in environment." : "No wallet. Run wallet-init first.");
    const secret = readMasterSecret(false);
    let key: string;
    try {
      key = decryptPK(wallet.encryptedKey, wallet.iv, wallet.authTag, secret);
    } catch {
      fail(buildWalletRecoveryMessage("Wallet decryption failed. The wallet secret does not match the stored wallet."));
    }
    console.error(JSON.stringify({ warning: "PRIVATE KEY EXPORTED. Never share this." }));
    out({ address: wallet.address, privateKey: key });
  });

program.command("wallet-balance").description("Check USDC and native token balances on supported chains")
  .option("--chain <chain>", `Specific chain (${formatSupportedWalletChainsForFlag()})`)
  .action(async (opts: any) => {
    const address = getWalletAddress();
    const chainsToCheck = opts.chain ? [opts.chain] : SUPPORTED_WALLET_CHAINS;
    const results: Record<string, any> = {};
    for (const chainName of chainsToCheck) {
      const chain = WALLET_CHAIN_MAP[chainName];
      const usdcAddr = USDC_ADDRESSES[chainName];
      if (!chain || !usdcAddr) { results[chainName] = { error: `Unknown chain: ${chainName}` }; continue; }
      try {
        const client = createPublicClient({ chain, transport: http() });
        const [usdcBalance, nativeBalance] = await Promise.all([
          client.readContract({
            address: usdcAddr, abi: ERC20_BALANCE_ABI, functionName: "balanceOf", args: [address as `0x${string}`],
          }),
          client.getBalance({ address: address as `0x${string}` }),
        ]);
        const nativeSym = chain.nativeCurrency.symbol;
        const nativeDec = chain.nativeCurrency.decimals;
        results[chainName] = {
          usdc: (Number(usdcBalance) / 1e6).toFixed(6),
          usdc_raw: usdcBalance.toString(),
          [nativeSym.toLowerCase()]: (Number(nativeBalance) / 10 ** nativeDec).toFixed(8),
          [`${nativeSym.toLowerCase()}_raw`]: nativeBalance.toString(),
        };
      } catch (err: any) { results[chainName] = { error: err.message }; }
    }
    out({ address, balances: results });
  });

program.command("wallet-send").description("Send USDC to any address")
  .argument("<amount>", "Amount in USDC").argument("<to>", "Destination address").argument("<chain>", `Chain (${formatSupportedWalletChainsForFlag()})`)
  .action(async (amountStr: string, to: string, chainName: string) => {
    const rawAmount = parseUsdcAmount(amountStr);
    if (!isAddress(to)) fail("Invalid address. Must be a valid EVM address.");
    const chain = WALLET_CHAIN_MAP[chainName];
    const usdcAddr = USDC_ADDRESSES[chainName];
    if (!chain || !usdcAddr) fail(`Unknown chain: ${chainName}. Supported: ${formatSupportedWalletChains()}`);
    const key = requireKey();
    const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`);
    const wc = createWalletClient({ account, chain, transport: http() });
    const txHash = await wc.writeContract({
      address: usdcAddr, abi: ERC20_TRANSFER_ABI, functionName: "transfer",
      args: [to as `0x${string}`, rawAmount],
    });
    out({ status: "sent", txHash, amount: amountStr, chain: chainName, to });
  });

program.command("check-balance").description("Check USDC balances across all payment networks (via daemon)")
  .option("--chain <chain>", "Check specific chain only")
  .action(async (opts: any) => { out(await execViaDaemon("check-balance", { chain: opts.chain })); });

program.command("export-login").description("Print export TENEO_PRIVATE_KEY=... for shell reuse")
  .action(async () => {
    const key = requireKey();
    // Print to stdout so it can be eval'd: eval $(teneo-cli export-login)
    console.log(`export TENEO_PRIVATE_KEY=${key}`);
  });

// ─── Agent Deployment ────────────────────────────────────────────────────────

const BACKEND_REST_URL = process.env.TENEO_BACKEND_URL || "https://backend.developer.chatroom.teneo-protocol.ai";

const VALID_CATEGORIES = [
  "Trading", "Finance", "Crypto", "Social Media", "Lead Generation",
  "E-Commerce", "SEO", "News", "Real Estate", "Travel", "Automation",
  "Developer Tools", "AI", "Integrations", "Open Source", "Jobs",
  "Price Lists", "Other",
] as const;

const VALID_AGENT_TYPES = ["command", "nlp", "commandless", "mcp"] as const;
const VALID_PRICE_TYPES = ["task-transaction"] as const;
const VALID_TASK_UNITS = ["per-query", "per-item"] as const;
const VALID_PARAM_TYPES = ["string", "number", "username", "boolean", "url", "id", "interval", "datetime", "enum"] as const;

interface MetadataValidationError {
  field: string;
  message: string;
}

interface AgentCapability {
  name: string;
  description: string;
}

function validateAgentId(agentId: string): string | null {
  if (!agentId) return "agent_id is required (canonical field; legacy agentId is deprecated)";
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(agentId) && !/^[a-z0-9]$/.test(agentId))
    return "agent_id must use lowercase letters, numbers, hyphens only, and start/end with a letter or number";
  return null;
}

function validateMetadata(meta: any): MetadataValidationError[] {
  const errors: MetadataValidationError[] = [];
  if (!meta.name) errors.push({ field: "name", message: "name is required" });
  // Canonical format is snake_case, but accept legacy camelCase for backward compatibility.
  const agentId = meta.agent_id || meta.agentId;
  if (!agentId) errors.push({ field: "agent_id", message: "agent_id is required" });
  else {
    const idErr = validateAgentId(agentId);
    if (idErr) errors.push({ field: "agent_id", message: idErr });
  }
  const shortDesc = meta.short_description || meta.shortDescription;
  if (!shortDesc) errors.push({ field: "short_description", message: "short_description is required" });
  if (!meta.description) errors.push({ field: "description", message: "description is required" });
  const agentType = meta.agent_type || meta.agentType;
  if (!agentType) errors.push({ field: "agent_type", message: "agent_type is required" });
  else if (!VALID_AGENT_TYPES.includes(agentType))
    errors.push({ field: "agent_type", message: `agent_type must be one of: ${VALID_AGENT_TYPES.join(", ")}` });
  if (!meta.capabilities || !Array.isArray(meta.capabilities) || meta.capabilities.length === 0) {
    errors.push({ field: "capabilities", message: "at least one capability is required" });
  } else {
    for (let i = 0; i < meta.capabilities.length; i++) {
      const capability = meta.capabilities[i];
      if (!capability || typeof capability !== "object") {
        errors.push({ field: `capabilities[${i}]`, message: "capability must be an object" });
        continue;
      }
      if (!capability.name || typeof capability.name !== "string" || !capability.name.trim()) {
        errors.push({ field: `capabilities[${i}].name`, message: "capability name is required" });
      }
      if (!capability.description || typeof capability.description !== "string" || !capability.description.trim()) {
        errors.push({ field: `capabilities[${i}].description`, message: "capability description is required" });
      }
    }
  }
  if (!meta.categories || !Array.isArray(meta.categories) || meta.categories.length === 0)
    errors.push({ field: "categories", message: "at least one category is required" });
  else {
    for (const cat of meta.categories) {
      if (!VALID_CATEGORIES.includes(cat))
        errors.push({ field: "categories", message: `invalid category "${cat}". Valid: ${VALID_CATEGORIES.join(", ")}` });
    }
  }
  if (meta.commands && Array.isArray(meta.commands)) {
    for (let i = 0; i < meta.commands.length; i++) {
      const cmd = meta.commands[i];
      if (!cmd.trigger) errors.push({ field: `commands[${i}].trigger`, message: "trigger is required" });
      if (!cmd.description) errors.push({ field: `commands[${i}].description`, message: "description is required" });
      if (cmd.pricePerUnit !== undefined && (typeof cmd.pricePerUnit !== "number" || cmd.pricePerUnit < 0))
        errors.push({ field: `commands[${i}].pricePerUnit`, message: "pricePerUnit must be a non-negative number" });
      if (cmd.priceType && !VALID_PRICE_TYPES.includes(cmd.priceType))
        errors.push({ field: `commands[${i}].priceType`, message: `priceType must be one of: ${VALID_PRICE_TYPES.join(", ")}` });
      if (cmd.taskUnit && !VALID_TASK_UNITS.includes(cmd.taskUnit))
        errors.push({ field: `commands[${i}].taskUnit`, message: `taskUnit must be one of: ${VALID_TASK_UNITS.join(", ")}` });
      if (cmd.parameters && Array.isArray(cmd.parameters)) {
        for (let j = 0; j < cmd.parameters.length; j++) {
          const p = cmd.parameters[j];
          if (!p.name) errors.push({ field: `commands[${i}].parameters[${j}].name`, message: "parameter name is required" });
          if (p.type && !VALID_PARAM_TYPES.includes(p.type))
            errors.push({ field: `commands[${i}].parameters[${j}].type`, message: `type must be one of: ${VALID_PARAM_TYPES.join(", ")}` });
          if (p.type === "enum" && (!p.options || !Array.isArray(p.options) || p.options.length === 0))
            errors.push({ field: `commands[${i}].parameters[${j}].options`, message: "enum type requires non-empty options array" });
        }
      }
    }
  }
  return errors;
}

function toKebabCase(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildDefaultCapabilities(agentId: string, categories: string[], shortDescription: string): AgentCapability[] {
  const capabilities: AgentCapability[] = [];
  const seen = new Set<string>();

  for (const category of categories) {
    const capabilityName = toKebabCase(category);
    if (!capabilityName || seen.has(capabilityName)) continue;
    seen.add(capabilityName);
    capabilities.push({
      name: capabilityName,
      description: `Handles ${category.toLowerCase()} tasks. ${shortDescription}`.trim(),
    });
  }

  if (capabilities.length > 0) return capabilities;

  return [{
    name: agentId,
    description: shortDescription || `Capability for ${agentId}`,
  }];
}

const agentCmd = program.command("agent").description("Deploy your own agents on the Teneo network");
agentCmd.addHelpCommand(false);
const agentHelpText = `Usage: teneo agent <command>

Deploy your own agents on the Teneo network.

Workflow:
  create <name>            Create a new agent project (scaffolds Go code + metadata)
  deploy <directory>       Build, mint NFT, and start as background service
  publish <agentId>        Make your agent public (free, reviewed within 72h)

Management:
  status <agentId>         Show agent status (network + local service)
  logs <agentId>           Tail agent logs
  list                     List all your agents
  services [--paths]       List locally installed agent services
  undeploy <agentId>       Stop and remove background service
  unpublish <agentId>      Remove from public listing

Utilities:
  validate <file>          Validate a metadata JSON file
`;
(agentCmd as any).helpInformation = () => `${agentHelpText}\n`;

// ─── Token Registry ─────────────────────────────────────────────────────────
// Stores token IDs and local work dirs so publish/unpublish don't need manual input.

const TOKEN_REGISTRY_FILE = nodePath.join(WALLET_DIR, "agent-tokens.json");

interface AgentRegistryEntry {
  token_id?: number;
  work_dir?: string;
}

function loadTokenRegistry(): Record<string, AgentRegistryEntry> {
  try {
    if (nodeFs.existsSync(TOKEN_REGISTRY_FILE)) {
      return JSON.parse(nodeFs.readFileSync(TOKEN_REGISTRY_FILE, "utf8"));
    }
  } catch {}
  return {};
}

function saveAgentRegistryEntry(agentId: string, updates: AgentRegistryEntry): void {
  ensureWalletDir();
  const reg = loadTokenRegistry();
  reg[agentId] = { ...reg[agentId], ...updates };
  nodeFs.writeFileSync(TOKEN_REGISTRY_FILE, JSON.stringify(reg, null, 2));
}

function saveTokenToRegistry(agentId: string, tokenId: number, workDir?: string): void {
  saveAgentRegistryEntry(agentId, {
    token_id: tokenId,
    ...(workDir ? { work_dir: workDir } : {}),
  });
}

function saveWorkDirToRegistry(agentId: string, workDir: string): void {
  saveAgentRegistryEntry(agentId, { work_dir: workDir });
}

function removeTokenFromRegistry(agentId: string): void {
  const reg = loadTokenRegistry();
  if (reg[agentId]) {
    delete reg[agentId];
    nodeFs.writeFileSync(TOKEN_REGISTRY_FILE, JSON.stringify(reg, null, 2));
  }
}

async function waitForTokenId(agentId: string, timeoutMs = 30000): Promise<number | null> {
  const logFile = nodePath.join(AGENT_LOG_DIR, `${agentId}.err.log`);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (nodeFs.existsSync(logFile)) {
        const content = nodeFs.readFileSync(logFile, "utf8");
        const match = content.match(/token_id=(\d+)/);
        if (match) return parseInt(match[1]);
      }
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  return null;
}

async function resolveTokenId(agentId: string, manualTokenId?: number, action = "publish"): Promise<number> {
  // 1. Manual override
  if (manualTokenId !== undefined) return manualTokenId;

  // 2. Local registry
  const reg = loadTokenRegistry();
  if (reg[agentId]?.token_id) return reg[agentId].token_id;

  // 3. Daemon (network status may include token_id)
  const daemonResult = await tryExecViaDaemon("my-agent-status", { agentId, walletAddress: getWalletAddress() });
  if (daemonResult.result?.token_id) {
    saveTokenToRegistry(agentId, daemonResult.result.token_id);
    return daemonResult.result.token_id;
  }

  // 4. Parse log file
  const logFile = nodePath.join(AGENT_LOG_DIR, `${agentId}.err.log`);
  try {
    if (nodeFs.existsSync(logFile)) {
      const content = nodeFs.readFileSync(logFile, "utf8");
      const match = content.match(/token_id=(\d+)/);
      if (match) {
        const tokenId = parseInt(match[1]);
        saveTokenToRegistry(agentId, tokenId);
        return tokenId;
      }
    }
  } catch {}

  fail(`Cannot ${action} — no token ID found. Deploy the agent first: teneo agent deploy ./${agentId}`);
}

// Ensure Go is installed — auto-install to ~/.teneo-wallet/go (no sudo required)
const GO_VERSION = "1.24.1";
const GO_LOCAL_DIR = nodePath.join(WALLET_DIR, "go");

async function ensureGo(): Promise<void> {
  const { execSync } = await import("node:child_process");

  // Add local Go to PATH if it exists
  const localGoBin = nodePath.join(GO_LOCAL_DIR, "bin");
  if (nodeFs.existsSync(localGoBin) && !process.env.PATH?.includes(localGoBin)) {
    process.env.PATH = `${localGoBin}:${process.env.PATH}`;
  }
  // Also ensure GOPATH/bin is in PATH for go-installed tools
  try {
    const gopath = execSync("go env GOPATH", { encoding: "utf8", stdio: "pipe", timeout: 5000 }).trim();
    if (gopath && !process.env.PATH?.includes(nodePath.join(gopath, "bin"))) {
      process.env.PATH = `${nodePath.join(gopath, "bin")}:${process.env.PATH}`;
    }
  } catch { /* go not found yet */ }

  // Check if Go is already available
  try {
    const version = execSync("go version", { encoding: "utf8", stdio: "pipe", timeout: 5000 }).trim();
    console.error(JSON.stringify({ info: version }));
    return;
  } catch { /* Go not found */ }

  console.error(JSON.stringify({ info: "Go not found — installing automatically (no sudo required)..." }));
  const platform = nodeOs.platform();
  const arch = nodeOs.arch();
  const goArch = arch === "arm64" ? "arm64" : "amd64";

  let tarUrl: string;
  if (platform === "darwin") {
    tarUrl = `https://go.dev/dl/go${GO_VERSION}.darwin-${goArch}.tar.gz`;
  } else if (platform === "linux") {
    tarUrl = `https://go.dev/dl/go${GO_VERSION}.linux-${goArch}.tar.gz`;
  } else {
    fail(`Cannot auto-install Go on ${platform}. Install Go ${GO_VERSION}+ manually from https://go.dev/dl/`);
    return; // unreachable but satisfies TS
  }

  try {
    // Install to ~/.teneo-wallet/go — no sudo needed
    ensureWalletDir();
    const tarPath = nodePath.join(WALLET_DIR, "go.tar.gz");
    console.error(JSON.stringify({ info: `Downloading Go ${GO_VERSION}...` }));
    execSync(`curl -fsSL "${tarUrl}" -o "${tarPath}"`, { stdio: "pipe", timeout: 120000 });

    // Remove old installation if present, extract new one
    if (nodeFs.existsSync(GO_LOCAL_DIR)) {
      execSync(`rm -rf "${GO_LOCAL_DIR}"`, { stdio: "pipe" });
    }
    execSync(`tar -C "${WALLET_DIR}" -xzf "${tarPath}"`, { stdio: "pipe", timeout: 60000 });
    nodeFs.unlinkSync(tarPath);

    // Add to PATH
    process.env.PATH = `${localGoBin}:${process.env.PATH}`;

    // Set GOPATH to userspace if not set
    if (!process.env.GOPATH) {
      process.env.GOPATH = nodePath.join(nodeOs.homedir(), "go");
    }

    const version = execSync("go version", { encoding: "utf8", stdio: "pipe", timeout: 5000 }).trim();
    console.error(JSON.stringify({ info: `Installed: ${version} (at ${GO_LOCAL_DIR})` }));
  } catch (err: any) {
    fail(`Failed to install Go: ${err.message}. Install manually from https://go.dev/dl/`);
  }
}

// Fetch latest Teneo Agent SDK version from GitHub, fallback to known version
const SDK_FALLBACK_VERSION = "v0.8.2";
async function getLatestSDKVersion(): Promise<string> {
  try {
    const res = await fetch("https://api.github.com/repos/TeneoProtocolAI/teneo-agent-sdk/tags?per_page=1", {
      headers: { "Accept": "application/vnd.github+json" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const tags = await res.json() as any[];
      if (tags.length > 0 && tags[0].name) {
        console.error(JSON.stringify({ info: `Using Teneo Agent SDK ${tags[0].name} (latest)` }));
        return tags[0].name;
      }
    }
  } catch { /* network issue — use fallback */ }
  console.error(JSON.stringify({ info: `Using Teneo Agent SDK ${SDK_FALLBACK_VERSION} (fallback)` }));
  return SDK_FALLBACK_VERSION;
}

async function scaffoldAgent(
  meta: any,
  opts: { type: string; newKey?: boolean }
): Promise<{ dir: string; agentId: string; files: string[]; keyMode: "cli_wallet" | "new_key" }> {
  await ensureGo();

  const agentId = meta.agent_id || meta.agentId;
  const dir = agentId;

  if (nodeFs.existsSync(dir)) fail(`Directory "${dir}" already exists.`);
  nodeFs.mkdirSync(dir, { recursive: true });

  // Generate or reuse key
  let agentKey: string;
  const useCliKey = !opts.newKey;
  if (useCliKey) {
    agentKey = requireKey();
    console.error(JSON.stringify({ info: "Using CLI wallet key for agent." }));
  } else {
    agentKey = nodeCrypto.randomBytes(32).toString("hex");
    console.error(JSON.stringify({ info: "Generated separate private key for agent." }));
  }

  // Fetch latest SDK version
  const sdkVersion = await getLatestSDKVersion();

  // Copy metadata
  const metaFilename = `${agentId}-metadata.json`;
  nodeFs.writeFileSync(nodePath.join(dir, metaFilename), JSON.stringify(meta, null, 2));

  // Write .env
  nodeFs.writeFileSync(nodePath.join(dir, ".env"), `PRIVATE_KEY=${agentKey}\nACCEPT_EULA=true\n`, { mode: 0o600 });

  // Write go.mod
  nodeFs.writeFileSync(nodePath.join(dir, "go.mod"), `module ${agentId}\n\ngo 1.24\n\nrequire (\n\tgithub.com/TeneoProtocolAI/teneo-agent-sdk ${sdkVersion}\n\tgithub.com/joho/godotenv v1.5.1\n)\n`);

  // Write main.go
  let mainGo: string;

  if (opts.type === "simple-openai") {
    mainGo = `package main

import (
\t"context"
\t"log"
\t"os"

\t"github.com/TeneoProtocolAI/teneo-agent-sdk/pkg/agent"
\t"github.com/joho/godotenv"
)

func main() {
\t_ = godotenv.Load()
\tctx := context.Background()

\ta := agent.NewSimpleOpenAIAgent(agent.SimpleOpenAIAgentConfig{
\t\tPrivateKey: os.Getenv("PRIVATE_KEY"),
\t\tOpenAIKey:  os.Getenv("OPENAI_API_KEY"),
\t})
\tif err := a.Run(ctx); err != nil {
\t\tlog.Fatal(err)
\t}
}
`;
  } else {
    // Build switch cases from commands
    const cases = (meta.commands || []).map((cmd: any) => {
      if (cmd.trigger === "help") {
        const triggers = (meta.commands || []).map((c: any) => c.trigger).join(", ");
        return `\tcase "help":\n\t\treturn "available commands: ${triggers}", nil`;
      }
      return `\tcase "${cmd.trigger}":\n\t\treturn fmt.Sprintf("${cmd.trigger} called with args: %v", args), nil`;
    });
    if (!meta.commands?.some((c: any) => c.trigger === "help")) {
      const triggers = (meta.commands || []).map((c: any) => c.trigger).join(", ");
      cases.push(`\tcase "help":\n\t\treturn "available commands: ${triggers}", nil`);
    }

    mainGo = `package main

import (
\t"context"
\t"encoding/json"
\t"fmt"
\t"log"
\t"os"
\t"strings"

\t"github.com/TeneoProtocolAI/teneo-agent-sdk/pkg/agent"
\t"github.com/TeneoProtocolAI/teneo-agent-sdk/pkg/nft"
\t"github.com/joho/godotenv"
)

type MyAgent struct{}

func (a *MyAgent) ProcessTask(ctx context.Context, task string) (string, error) {
\tparts := strings.Fields(task)
\tif len(parts) == 0 {
\t\treturn "no command provided — try 'help'", nil
\t}
\tcommand := parts[0]
\targs := parts[1:]

\tswitch command {
${cases.join("\n")}
\tdefault:
\t\treturn fmt.Sprintf("unknown command: %s (args: %v)", command, args), nil
\t}
}

func main() {
\t_ = godotenv.Load()

\tresult, err := nft.Mint("${metaFilename}")
\tif err != nil {
\t\tlog.Fatal(err)
\t}
\tlog.Printf("Agent ready — token_id=%d", result.TokenID)

\traw, _ := os.ReadFile("${metaFilename}")
\tvar meta struct {
\t\tName        string \`json:"name"\`
\t\tAgentID     string \`json:"agent_id"\`
\t\tDescription string \`json:"description"\`
\t}
\tjson.Unmarshal(raw, &meta)

\tcfg := agent.DefaultConfig()
\tcfg.AgentID = meta.AgentID
\tcfg.Name = meta.Name
\tcfg.Description = meta.Description
\tcfg.PrivateKey = os.Getenv("PRIVATE_KEY")

\ta, err := agent.NewEnhancedAgent(&agent.EnhancedAgentConfig{
\t\tConfig:       cfg,
\t\tAgentHandler: &MyAgent{},
\t\tTokenID:      result.TokenID,
\t})
\tif err != nil {
\t\tlog.Fatal(err)
\t}

\tif err := a.Run(); err != nil {
\t\tlog.Fatal(err)
\t}
}
`;
  }

  nodeFs.writeFileSync(nodePath.join(dir, "main.go"), mainGo);

  // Write .gitignore
  nodeFs.writeFileSync(nodePath.join(dir, ".gitignore"), `.env\n${agentId}\n`);

  // Try to run go mod tidy
  try {
    const { execSync } = await import("node:child_process");
    execSync("go mod tidy", { cwd: dir, stdio: "pipe", timeout: 30000 });
    console.error(JSON.stringify({ info: "go mod tidy completed successfully." }));
  } catch {
    console.error(JSON.stringify({ warn: "go mod tidy failed — run it manually after installing Go 1.24+." }));
  }

  return {
    dir,
    agentId,
    files: [metaFilename, "main.go", "go.mod", ".env", ".gitignore"],
    keyMode: useCliKey ? "cli_wallet" : "new_key",
  };
}

agentCmd.command("create")
  .alias("init")
  .description("Create a new agent project (scaffolds Go code + metadata)")
  .argument("<name>", "Agent name")
  .option("--id <id>", "Agent ID (kebab-case, derived from name if omitted)")
  .option("--type <type>", "Agent type (command|nlp|commandless|mcp)")
  .option("--template <template>", "Go template: enhanced (default) or simple-openai", "enhanced")
  .option("--description <desc>", "Agent description")
  .option("--short-description <desc>", "Short description")
  .option("--category <cat>", "Category (can specify multiple)", (val: string, prev: string[]) => prev.concat(val), [] as string[])
  .option("--metadata-only", "Only create metadata JSON, skip Go project scaffolding")
  .option("--new-key", "Generate a separate private key for the agent instead of reusing the CLI wallet")
  .action(async (name: string, opts: any) => {
    let agentId = opts.id;
    let agentType = opts.type || "command";
    let description = opts.description;
    let shortDescription = opts.shortDescription;
    let categories = opts.category?.length ? opts.category : [];

    // Fail with clear error if required fields are missing (no interactive prompts — LLMs can't use them)
    const missing: string[] = [];
    if (!description) missing.push("--description");
    if (!shortDescription) missing.push("--short-description");
    if (categories.length === 0) missing.push("--category");
    if (missing.length > 0) {
      const msg = `Missing required fields: ${missing.join(", ")}\n\nExample:\n  teneo agent create "My Agent" --type command \\\n    --description "Full description of what the agent does" \\\n    --short-description "One-line summary" \\\n    --category "AI"`;
      if (JSON_FLAG) { out({ error: msg }); } else { console.error(`Error: ${msg}`); }
      process.exit(1);
    }

    if (!agentId) agentId = toKebabCase(name);
    const capabilities = buildDefaultCapabilities(agentId, categories, shortDescription);

    // Top-level fields use snake_case (matches Go SDK's sdkAgentPayload struct in nft.Mint())
    // Command fields use camelCase (matches Go SDK's command struct)
    const metadata: any = {
      name,
      agent_id: agentId,
      short_description: shortDescription,
      description,
      agent_type: agentType,
      capabilities,
      commands: agentType === "command" ? [
        {
          trigger: "help",
          description: "Lists all commands and usage examples.",
          parameters: [],
          strictArg: true,
          minArgs: 0,
          maxArgs: 0,
          pricePerUnit: 0,
          priceType: "task-transaction",
          taskUnit: "per-query",
        },
      ] : [],
      nlp_fallback: agentType !== "command",
      categories,
      metadata_version: "2.4.0",
    };

    const errors = validateMetadata(metadata);
    if (errors.length > 0) {
      if (JSON_FLAG) { out({ status: "error", errors }); } else {
        console.error("Validation errors:");
        errors.forEach(e => console.error(`  ${e.field}: ${e.message}`));
      }
      process.exit(1);
    }

    const metadataOnly = opts.metadataOnly;

    // Scaffold the full Go project unless --metadata-only
    if (!metadataOnly) {
      const result = await scaffoldAgent(metadata, {
        type: opts.template || "enhanced",
        newKey: !!opts.newKey,
      });
      const metaFileRelative = `${result.dir}/${agentId}-metadata.json`;
      const metaFile = nodePath.resolve(metaFileRelative);
      const envLabel = result.keyMode === "cli_wallet"
        ? "CLI wallet key (default)"
        : "separate private key (--new-key)";

      if (JSON_FLAG) {
        out({
          status: "created",
          agent_id: agentId,
          name,
          directory: result.dir,
          agent_file: metaFile,
          files: result.files,
          key_mode: result.keyMode,
          next_steps: [
            `Edit ${metaFile} now to define commands, capabilities, pricing, and descriptions`,
            `Edit ${result.dir}/main.go to implement your agent logic in ProcessTask`,
            `Deploy it locally and mint its NFT: teneo agent deploy ./${result.dir}`,
            `Make it public after deploy: teneo agent publish ${agentId}`,
            `Check status anytime: teneo agent status ${agentId}`,
          ],
        });
      } else {
        console.log(`\nCreated agent: ${agentId}\n`);
        console.log(`  Agent file:   ${metaFileRelative}`);
        console.log(`  Edit it now:  define commands, capabilities, pricing, and descriptions`);
        console.log(``);
        console.log(`  Files:`);
        console.log(`    ${metaFileRelative}   <- commands, pricing, description`);
        console.log(`    ${result.dir}/main.go${" ".repeat(Math.max(0, metaFileRelative.length - `${result.dir}/main.go`.length))}   <- your agent logic (ProcessTask)`);
        console.log(`    ${result.dir}/.env${" ".repeat(Math.max(0, metaFileRelative.length - `${result.dir}/.env`.length))}   <- ${envLabel}`);
        console.log(``);
        console.log(`  What to do now:`);
        console.log(`  1. Edit ${metaFileRelative}`);
        console.log(`     - Add your commands to the "commands" array (trigger, description, price)`);
        console.log(`     - Refine the "capabilities" array so the backend can classify your agent correctly`);
        console.log(`     - Update the description and short_description`);
        console.log(``);
        console.log(`  2. Edit ${result.dir}/main.go`);
        console.log(`     - Implement your logic in the ProcessTask function`);
        console.log(`     - The switch/case maps command triggers to your code`);
        console.log(``);
        console.log(`  3. Deploy it locally and mint its NFT:`);
        console.log(`     teneo agent deploy ./${result.dir}`);
        console.log(``);
        console.log(`  4. Make it public after deploy succeeds:`);
        console.log(`     teneo agent publish ${agentId}`);
        console.log(``);
        console.log(`  Everything is free. Minting costs nothing. No gas fees.`);
        console.log(``);
      }
    } else {
      const filename = `${agentId}-metadata.json`;
      const agentFile = nodePath.resolve(filename);
      nodeFs.writeFileSync(filename, JSON.stringify(metadata, null, 2));
      if (JSON_FLAG) {
        out({
          status: "created",
          file: filename,
          agent_id: agentId,
          name,
          agent_file: agentFile,
          next_steps: [
            `Edit ${agentFile} now to add commands, capabilities, pricing, description, and short_description`,
            `Scaffold the Go project when ready: teneo agent create "${name}" --id ${agentId} --type ${agentType} --description "${description}" --short-description "${shortDescription}" --category "${categories[0]}"`,
            `After scaffolding, deploy it locally: teneo agent deploy ./${agentId}`,
            `After deploy, make it public: teneo agent publish ${agentId}`,
          ],
        });
      } else {
        console.log(`\nCreated agent metadata: ${filename}\n`);
        console.log(`  Agent file:   ${filename}`);
        console.log(`  Edit it now:  define commands, capabilities, pricing, and descriptions`);
        console.log(``);
        console.log(`  What to do now:`);
        console.log(`  1. Edit ${filename}`);
        console.log(`     - Add your commands to the "commands" array (trigger, description, price)`);
        console.log(`     - Refine the "capabilities" array so the backend can classify your agent correctly`);
        console.log(`     - Update the description and short_description`);
        console.log(``);
        console.log(`  2. When ready to scaffold the Go project:`);
        console.log(`     teneo agent create "${name}" --id ${agentId} --type ${agentType} --description "${description}" --short-description "${shortDescription}" --category "${categories[0]}"`);
        console.log(``);
        console.log(`  3. After scaffolding, deploy it locally:`);
        console.log(`     teneo agent deploy ./${agentId}`);
        console.log(``);
        console.log(`  4. After deploy, make it public:`);
        console.log(`     teneo agent publish ${agentId}`);
        console.log(``);
      }
    }
  });

agentCmd.command("validate")
  .description("Validate agent metadata JSON file")
  .argument("<file>", "Path to metadata JSON file")
  .action(async (file: string) => {
    if (!nodeFs.existsSync(file)) fail(`File not found: ${file}`);
    let meta: any;
    try { meta = JSON.parse(nodeFs.readFileSync(file, "utf8")); }
    catch { fail(`Invalid JSON in ${file}`); }

    const errors = validateMetadata(meta);
    if (errors.length > 0) {
      if (JSON_FLAG) { out({ status: "invalid", errors }); } else {
        console.error(`Validation failed (${errors.length} error${errors.length > 1 ? "s" : ""}):`);
        errors.forEach(e => console.error(`  ${e.field}: ${e.message}`));
      }
      process.exit(1);
    }
    out({ status: "valid", agent_id: meta.agent_id || meta.agentId, name: meta.name, commands: meta.commands?.length || 0, categories: meta.categories });
  });

async function publishAgent(agentId: string, manualTokenId?: number) {
  const tokenId = await resolveTokenId(agentId, manualTokenId, "publish");
  const { key, source } = resolveAgentSigningKey(agentId);
  const hex = key.startsWith("0x") ? key : `0x${key}`;
  const address = privateKeyToAccount(hex as `0x${string}`).address;

  const res = await fetch(`${BACKEND_REST_URL}/api/agents/${agentId}/submit-for-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creator_wallet: address, token_id: tokenId }),
  });
  const data = await res.json() as any;
  if (!res.ok) {
    const baseMessage = data.message || data.error || `HTTP ${res.status}`;
    if (/wallet does not own this agent'?s nft/i.test(baseMessage)) {
      fail(`${baseMessage}. Publish used ${source}. New agents use the CLI wallet by default. If this agent was created with a separate PRIVATE_KEY, run with TENEO_PRIVATE_KEY set to the wallet that minted the agent NFT.`);
    }
    fail(baseMessage);
  }

  const publishStatus = data.status || "submitted";

  if (JSON_FLAG) {
    out({ status: publishStatus, agentId, tokenId, wallet_source: source, ...data });
  } else {
    console.log(`\nPublished: ${agentId}\n`);
    console.log(`  Wallet:  ${address} (${source})`);

    if (publishStatus === "no_changes") {
      console.log(`  Status:  already in review; no metadata changes detected`);
    } else if (publishStatus === "resubmitted_for_review") {
      console.log(`  Status:  re-submitted for review with updated metadata`);
    } else if (publishStatus === "already_public") {
      console.log(`  Status:  already public`);
    } else {
      console.log(`  Status:  pending review (typically approved within 72h)`);
    }

    if (data.message) {
      console.log(`  Note:    ${data.message}`);
    }

    if (publishStatus !== "already_public") {
      console.log(`  Your agent will appear in the public Agent Console after review.\n`);
    } else {
      console.log("");
    }

    console.log(`  To check status:    teneo agent status ${agentId}`);
    console.log(`  To unpublish:       teneo agent unpublish ${agentId}`);
    console.log(``);
  }
}

async function unpublishAgent(agentId: string, manualTokenId?: number) {
  const tokenId = await resolveTokenId(agentId, manualTokenId, "unpublish");
  const { key, source } = resolveAgentSigningKey(agentId);
  const hex = key.startsWith("0x") ? key : `0x${key}`;
  const address = privateKeyToAccount(hex as `0x${string}`).address;

  const res = await fetch(`${BACKEND_REST_URL}/api/agents/${agentId}/withdraw-public`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creator_wallet: address, token_id: tokenId }),
  });
  const data = await res.json() as any;
  if (!res.ok) {
    const baseMessage = data.message || data.error || `HTTP ${res.status}`;
    if (/wallet does not own this agent'?s nft/i.test(baseMessage)) {
      fail(`${baseMessage}. Unpublish used ${source}. New agents use the CLI wallet by default. If this agent was created with a separate PRIVATE_KEY, run with TENEO_PRIVATE_KEY set to the wallet that minted the agent NFT.`);
    }
    fail(baseMessage);
  }

  if (JSON_FLAG) out({ status: "unpublished", agentId, tokenId, wallet_source: source, ...data });
  else {
    console.log(`\nUnpublished: ${agentId}\n`);
    console.log(`  Wallet:  ${address} (${source})`);
    console.log(``);
  }
}

agentCmd.command("publish")
  .description("Make your agent public (free, reviewed within 72h)")
  .argument("<agentId>", "Agent ID")
  .option("--token-id <id>", "NFT token ID (auto-detected if omitted)")
  .action(async (agentId: string, opts: any) => {
    await publishAgent(agentId, parseTokenId(opts.tokenId));
  });

agentCmd.command("unpublish")
  .description("Remove your agent from public listing")
  .argument("<agentId>", "Agent ID")
  .option("--token-id <id>", "NFT token ID (auto-detected if omitted)")
  .action(async (agentId: string, opts: any) => {
    await unpublishAgent(agentId, parseTokenId(opts.tokenId));
  });

agentCmd.command("list")
  .description("List agents owned by this wallet")
  .action(async () => {
    const result = await execViaDaemon("my-agents", { walletAddress: getWalletAddress() });

    if (JSON_FLAG) { out(result); return; }

    const agents = result.agents || [];
    if (agents.length === 0) { console.log("No agents found for this wallet."); return; }

    const col = { id: 28, name: 28, status: 10, token: 8 };
    console.log("");
    console.log(pad("AGENT ID", col.id) + pad("NAME", col.name) + pad("STATUS", col.status) + pad("TOKEN", col.token));
    console.log("-".repeat(col.id + col.name + col.status + col.token));
    for (const agent of agents) {
      console.log(
        pad(agent.agent_id, col.id) +
        pad(agent.agent_name, col.name) +
        pad(agent.is_online ? "ONLINE" : "OFFLINE", col.status) +
        pad(String(agent.token_id || "-"), col.token)
      );
    }
    console.log(`\n${agents.length} agent(s) owned by this wallet.`);
  });

async function getNetworkStatus(agentId: string): Promise<{ data: any | null; error: string | null }> {
  const response = await tryExecViaDaemon("my-agent-status", { agentId, walletAddress: getWalletAddress() });
  if (response.error) return { data: null, error: response.error };
  return { data: response.result, error: null };
}

async function showAgentStatus(agentId: string) {
  const networkStatus = await getNetworkStatus(agentId);
  const service = await getLocalServiceStatus(agentId);
  const daemonUnavailable = !!networkStatus.error;

  if (!networkStatus.data && service.status === "not_installed") {
    fail(`Agent '${agentId}' not found. List your agents: teneo agent list`);
  }

  if (JSON_FLAG) {
    out({
      agent_id: agentId,
      ...(networkStatus.data ? {
        name: networkStatus.data.agent_name || agentId,
        is_online: networkStatus.data.is_online,
        visibility: networkStatus.data.visibility,
        token_id: networkStatus.data.token_id,
      } : {}),
      ...(daemonUnavailable ? { note: "Network status unavailable; showing local service info only." } : {}),
      service,
    });
    return;
  }

  console.log(``);
  console.log(`  Agent:        ${networkStatus.data?.agent_name || agentId}`);
  if (networkStatus.data) {
    console.log(`  Network:      ${networkStatus.data.is_online ? "ONLINE" : "OFFLINE"}`);
    console.log(`  Visibility:   ${networkStatus.data.visibility || "unknown"}`);
    if (networkStatus.data.token_id) console.log(`  Token ID:     ${networkStatus.data.token_id}`);
  } else {
    console.log(`  Network:      unavailable (showing local service info only)`);
  }
  console.log(``);
  if (service.status !== "not_installed") {
    console.log(`  Service:      ${service.status}${service.pid ? ` (PID ${service.pid})` : ""}`);
    console.log(`  Platform:     ${service.platform}`);
    if (service.logs?.stderr) console.log(`  Logs:         ${service.logs.stderr}`);
  } else {
    console.log(`  Service:      not installed locally`);
  }
  console.log(``);
}

agentCmd.command("status")
  .description("Show agent status (network + local service)")
  .argument("<agentId>", "Agent ID")
  .action(async (agentId: string) => {
    await showAgentStatus(agentId);
  });

agentCmd.command("logs")
  .description("Tail agent logs")
  .argument("<agentId>", "Agent ID")
  .option("--lines <n>", "Number of lines to show", "50")
  .option("--no-follow", "Don't follow (just print and exit)")
  .action(async (agentId: string, opts: any) => {
    const logFile = nodePath.join(AGENT_LOG_DIR, `${agentId}.err.log`);
    if (!nodeFs.existsSync(logFile)) {
      fail(`No logs found for "${agentId}". Deploy first: teneo agent deploy ./${agentId}`);
    }
    const { spawn: spawnProc } = await import("node:child_process");
    const args = ["-n", opts.lines];
    if (opts.follow !== false) args.push("-f");
    const tail = spawnProc("tail", [...args, logFile], { stdio: "inherit" });
    tail.on("close", (code: number | null) => process.exit(code ?? 0));
  });

// ─── Agent Service Management ────────────────────────────────────────────────

const AGENT_LOG_DIR = nodePath.join(WALLET_DIR, "logs");
const SERVICE_LABEL_PREFIX = "ai.teneo.agent";
const AGENT_DEPLOY_CHAIN = "peaq";

function getServiceLabel(agentId: string): string {
  return `${SERVICE_LABEL_PREFIX}.${agentId}`;
}

function getMacPlistPath(agentId: string): string {
  return nodePath.join(nodeOs.homedir(), "Library", "LaunchAgents", `${getServiceLabel(agentId)}.plist`);
}

function getLinuxUnitPath(agentId: string): string {
  return nodePath.join(nodeOs.homedir(), ".config", "systemd", "user", `${agentId}.service`);
}

function generateMacPlist(agentId: string, binaryPath: string, workDir: string, deployChain: string): string {
  const logDir = AGENT_LOG_DIR;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${getServiceLabel(agentId)}</string>
    <key>Program</key>
    <string>${binaryPath}</string>
    <key>WorkingDirectory</key>
    <string>${workDir}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${logDir}/${agentId}.out.log</string>
    <key>StandardErrorPath</key>
    <string>${logDir}/${agentId}.err.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
        <key>TENEO_DEFAULT_CHAIN</key>
        <string>${deployChain}</string>
    </dict>
</dict>
</plist>
`;
}

function generateLinuxUnit(agentId: string, binaryPath: string, workDir: string, deployChain: string): string {
  const logs = getAgentLogPaths(agentId);
  return `[Unit]
Description=Teneo Agent: ${agentId}
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${binaryPath}
WorkingDirectory=${workDir}
Restart=always
RestartSec=5
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=TENEO_DEFAULT_CHAIN=${deployChain}
StandardOutput=append:${logs.stdout}
StandardError=append:${logs.stderr}

[Install]
WantedBy=default.target
`;
}

function getAgentLogPaths(agentId: string) {
  return {
    stdout: `${AGENT_LOG_DIR}/${agentId}.out.log`,
    stderr: `${AGENT_LOG_DIR}/${agentId}.err.log`,
  };
}

function getLogOffset(logFile: string): number {
  try {
    return nodeFs.existsSync(logFile) ? nodeFs.readFileSync(logFile, "utf8").length : 0;
  } catch {
    return 0;
  }
}

function readLogExcerpt(logFile: string, maxLines = 20, offset = 0): string | null {
  try {
    if (!nodeFs.existsSync(logFile)) return null;
    const content = nodeFs.readFileSync(logFile, "utf8");
    const recent = offset > 0 ? content.slice(offset) : content;
    const lines = recent.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    return lines.slice(-maxLines).join("\n");
  } catch {
    return null;
  }
}

function getStartupFailure(agentId: string, stderrOffset = 0): string | null {
  const logs = getAgentLogPaths(agentId);
  const recentStderr = readLogExcerpt(logs.stderr, 20, stderrOffset);
  if (!recentStderr) return null;

  const lines = recentStderr.split("\n");
  const fatalLine = [...lines].reverse().find(line => /failed to prepare deploy:|panic:|fatal:/i.test(line));
  return fatalLine || null;
}

function getLocalServiceWorkDir(agentId: string): string | null {
  const platform = nodeOs.platform();

  try {
    if (platform === "darwin") {
      const plistPath = getMacPlistPath(agentId);
      if (!nodeFs.existsSync(plistPath)) return null;
      const plist = nodeFs.readFileSync(plistPath, "utf8");
      const match = plist.match(/<key>WorkingDirectory<\/key>\s*<string>([^<]+)<\/string>/);
      return match?.[1] || null;
    }

    if (platform === "linux") {
      const unitPath = getLinuxUnitPath(agentId);
      if (!nodeFs.existsSync(unitPath)) return null;
      const unit = nodeFs.readFileSync(unitPath, "utf8");
      const match = unit.match(/^WorkingDirectory=(.+)$/m);
      return match?.[1]?.trim() || null;
    }
  } catch {}

  return null;
}

function getKnownAgentWorkDirs(agentId: string): string[] {
  const dirs = [getLocalServiceWorkDir(agentId), loadTokenRegistry()[agentId]?.work_dir]
    .filter(Boolean) as string[];
  return [...new Set(dirs)];
}

function loadPrivateKeyFromEnvFile(workDir: string): string | null {
  try {
    const envPath = nodePath.join(workDir, ".env");
    if (!nodeFs.existsSync(envPath)) return null;
    const envText = nodeFs.readFileSync(envPath, "utf8");
    const match = envText.match(/^PRIVATE_KEY\s*=\s*(.+)$/m);
    if (!match) return null;
    return match[1].trim().replace(/^['"]|['"]$/g, "");
  } catch {
    return null;
  }
}

function resolveAgentSigningKey(agentId: string): { key: string; source: string } {
  if (PRIVATE_KEY) return { key: PRIVATE_KEY, source: "TENEO_PRIVATE_KEY" };

  for (const workDir of getKnownAgentWorkDirs(agentId)) {
    const key = loadPrivateKeyFromEnvFile(workDir);
    if (key) return { key, source: `${workDir}/.env` };
  }

  return { key: requireKey(), source: "CLI wallet" };
}

async function getLocalServiceStatus(agentId: string): Promise<any> {
  const { execSync } = await import("node:child_process");
  const platform = nodeOs.platform();
  const logs = getAgentLogPaths(agentId);

  if (platform === "darwin") {
    const plistPath = getMacPlistPath(agentId);
    if (!nodeFs.existsSync(plistPath)) return { status: "not_installed" };
    try {
      const result = execSync(`launchctl list ${getServiceLabel(agentId)} 2>&1`, { encoding: "utf8", stdio: "pipe" });
      const pidMatch = result.match(/"PID"\s*=\s*(\d+)/);
      return {
        status: pidMatch ? "running" : "stopped",
        pid: pidMatch ? parseInt(pidMatch[1]) : null,
        platform: "macOS",
        plist: plistPath,
        logs,
      };
    } catch {
      return { status: "stopped", platform: "macOS", plist: plistPath, logs };
    }
  }

  if (platform === "linux") {
    const unitPath = getLinuxUnitPath(agentId);
    if (!nodeFs.existsSync(unitPath)) return { status: "not_installed" };
    try {
      const result = execSync(`systemctl --user is-active ${agentId} 2>&1`, { encoding: "utf8", stdio: "pipe" }).trim();
      const pidResult = execSync(`systemctl --user show ${agentId} --property=MainPID --value 2>&1`, { encoding: "utf8", stdio: "pipe" }).trim();
      return {
        status: result === "active" ? "running" : result,
        pid: parseInt(pidResult) || null,
        platform: "Linux",
        unit: unitPath,
        logs,
      };
    } catch {
      return { status: "stopped", platform: "Linux", unit: unitPath, logs };
    }
  }

  fail(`Unsupported platform: ${platform}`);
}

function findMetadataInDir(dir: string): any {
  const files = nodeFs.readdirSync(dir).filter(f => f.endsWith("-metadata.json"));
  if (files.length === 0) fail(`No *-metadata.json file found in ${dir}`);
  if (files.length > 1) fail(`Multiple metadata files found in ${dir}: ${files.join(", ")}. Expected exactly one.`);
  const raw = nodeFs.readFileSync(nodePath.join(dir, files[0]), "utf8");
  return JSON.parse(raw);
}

function resolveAgentDeployChain() {
  return AGENT_DEPLOY_CHAIN;
}

async function deployAgent(directory: string) {
  const { execSync } = await import("node:child_process");
  const platform = nodeOs.platform();
  if (platform !== "darwin" && platform !== "linux") fail(`Unsupported platform: ${platform}. Only macOS and Linux are supported.`);

  const absDir = nodePath.resolve(directory);
  if (!nodeFs.existsSync(absDir)) fail(`Directory not found: ${directory}. Create an agent first: teneo agent create ${nodePath.basename(directory)}`);

  const meta = findMetadataInDir(absDir);
  const metadataErrors = validateMetadata(meta);
  if (metadataErrors.length > 0) {
    if (JSON_FLAG) {
      out({ status: "invalid", errors: metadataErrors });
    } else {
      console.error("Metadata validation failed:");
      metadataErrors.forEach(error => console.error(`  ${error.field}: ${error.message}`));
    }
    process.exit(1);
  }

  const agentId = meta.agent_id || meta.agentId;
  if (!agentId) fail("agent_id not found in metadata JSON.");
  saveWorkDirToRegistry(agentId, absDir);

  // Always rebuild on deploy so metadata or code changes are applied.
  const binaryPath = nodePath.join(absDir, agentId);
  await ensureGo();
  console.error(JSON.stringify({ info: `Building ${agentId}...` }));
  try {
    execSync(`go build -o "${binaryPath}" .`, { cwd: absDir, stdio: "pipe", timeout: 120000 });
    console.error(JSON.stringify({ info: "Build successful." }));
  } catch (err: any) {
    fail(`go build failed: ${err.stderr?.toString() || err.message}`);
  }

  // Verify binary exists after build attempt
  if (!nodeFs.existsSync(binaryPath)) fail(`Binary not found at ${binaryPath} after build.`);

  // Ensure log directory exists
  if (!nodeFs.existsSync(AGENT_LOG_DIR)) {
    nodeFs.mkdirSync(AGENT_LOG_DIR, { recursive: true, mode: 0o700 });
  }
  const logs = getAgentLogPaths(agentId);
  const stderrOffset = getLogOffset(logs.stderr);
  const deployChain = resolveAgentDeployChain();

  if (platform === "darwin") {
    const plistPath = getMacPlistPath(agentId);
    const plistDir = nodePath.dirname(plistPath);
    if (!nodeFs.existsSync(plistDir)) nodeFs.mkdirSync(plistDir, { recursive: true });

    try { execSync(`launchctl unload "${plistPath}" 2>/dev/null`, { stdio: "pipe" }); } catch {}

    nodeFs.writeFileSync(plistPath, generateMacPlist(agentId, binaryPath, absDir, deployChain));
    execSync(`launchctl load "${plistPath}"`, { stdio: "pipe" });
  } else {
    const unitPath = getLinuxUnitPath(agentId);
    const unitDir = nodePath.dirname(unitPath);
    if (!nodeFs.existsSync(unitDir)) nodeFs.mkdirSync(unitDir, { recursive: true });

    nodeFs.writeFileSync(unitPath, generateLinuxUnit(agentId, binaryPath, absDir, deployChain));

    try { execSync("loginctl enable-linger $USER", { stdio: "pipe" }); } catch {}

    execSync("systemctl --user daemon-reload", { stdio: "pipe" });
    execSync(`systemctl --user enable --now ${agentId}`, { stdio: "pipe" });
  }

  console.error(JSON.stringify({ info: "Service started. Waiting for NFT mint..." }));
  const tokenId = await waitForTokenId(agentId, 30000);
  if (tokenId) saveTokenToRegistry(agentId, tokenId);

  const service = await getLocalServiceStatus(agentId);
  const startupFailure = getStartupFailure(agentId, stderrOffset);
  if (startupFailure) fail(`Deploy failed during startup: ${startupFailure}. Check logs: ${logs.stderr}`);
  if (service.status !== "running") {
    const recentStderr = readLogExcerpt(logs.stderr, 20, stderrOffset);
    fail(recentStderr
      ? `Deploy failed: service is ${service.status}.\nRecent stderr:\n${recentStderr}`
      : `Deploy failed: service is ${service.status}. Check logs: ${logs.stderr}`);
  }

  const nextSteps = [
    `teneo agent publish ${agentId}`,
    `teneo agent status ${agentId}`,
    `teneo agent logs ${agentId}`,
  ];

  if (JSON_FLAG) {
    out({
      status: tokenId ? "deployed" : "starting",
      agentId,
      tokenId: tokenId || null,
      service,
      logs,
      ...(tokenId ? {} : { warning: `NFT minting in progress — check status later: teneo agent status ${agentId}` }),
      next_steps: nextSteps,
    });
    return;
  }

  console.log(`\n${tokenId ? "Deployed" : "Deployment started"}: ${agentId}\n`);
  if (tokenId) {
    console.log(`  NFT minted:  token #${tokenId} (free, gasless)`);
  } else {
    console.log(`  NFT minting: in progress — check status later: teneo agent status ${agentId}`);
  }
  console.log(`  Service:     ${service.status}${service.pid ? ` (PID ${service.pid})` : ""}`);
  console.log(`  Logs:        ${logs.stderr}`);
  console.log(``);
  if (tokenId) {
    console.log(`  Your agent is live on the Teneo network.`);
    console.log(`  Only you can see it right now (private).`);
  } else {
    console.log(`  The local service is running, but the NFT mint is still pending.`);
  }
  console.log(``);
  console.log(`  To make it public:  teneo agent publish ${agentId}`);
  console.log(`  To check status:    teneo agent status ${agentId}`);
  console.log(`  To view logs:       teneo agent logs ${agentId}`);
  console.log(``);
}

agentCmd.command("deploy")
  .description("Build, mint NFT, and start as background service")
  .argument("<directory>", "Path to the agent project directory")
  .action(async (directory: string) => {
    await deployAgent(directory);
  });

async function undeployAgent(agentId: string) {
  const { execSync } = await import("node:child_process");
  const platform = nodeOs.platform();

  if (platform === "darwin") {
    const plistPath = getMacPlistPath(agentId);
    if (!nodeFs.existsSync(plistPath)) fail(`Service not found for "${agentId}". List services: teneo agent services`);

    try { execSync(`launchctl unload "${plistPath}"`, { stdio: "pipe" }); } catch {}
    nodeFs.unlinkSync(plistPath);
  } else if (platform === "linux") {
    const unitPath = getLinuxUnitPath(agentId);
    if (!nodeFs.existsSync(unitPath)) fail(`Service not found for "${agentId}". List services: teneo agent services`);

    try { execSync(`systemctl --user disable --now ${agentId}`, { stdio: "pipe" }); } catch {}
    nodeFs.unlinkSync(unitPath);
    try { execSync("systemctl --user daemon-reload", { stdio: "pipe" }); } catch {}
  } else {
    fail(`Unsupported platform: ${platform}`);
  }

  removeTokenFromRegistry(agentId);
  out({ status: "undeployed", agentId, platform: platform === "darwin" ? "macOS" : "Linux" });
}

agentCmd.command("undeploy")
  .description("Stop and remove background service")
  .argument("<agentId>", "Agent ID")
  .action(async (agentId: string) => {
    await undeployAgent(agentId);
  });

agentCmd.command("services")
  .description("List all locally installed agent services")
  .option("--paths", "Show installed agent working directories")
  .action(async (opts: any) => {
    const { execSync } = await import("node:child_process");
    const platform = nodeOs.platform();
    const agents: any[] = [];
    const showPaths = !!opts.paths;

    if (platform === "darwin") {
      const launchDir = nodePath.join(nodeOs.homedir(), "Library", "LaunchAgents");
      if (nodeFs.existsSync(launchDir)) {
        const plists = nodeFs.readdirSync(launchDir).filter(f => f.startsWith(`${SERVICE_LABEL_PREFIX}.`) && f.endsWith(".plist"));
        for (const plist of plists) {
          const agentId = plist.replace(`${SERVICE_LABEL_PREFIX}.`, "").replace(".plist", "");
          const label = getServiceLabel(agentId);
          let status = "stopped";
          let pid: number | null = null;
          try {
            const result = execSync(`launchctl list ${label} 2>&1`, { encoding: "utf8", stdio: "pipe" });
            const pidMatch = result.match(/"PID"\s*=\s*(\d+)/);
            if (pidMatch) { pid = parseInt(pidMatch[1]); status = "running"; }
          } catch {}
          agents.push({
            agentId,
            status,
            pid,
            plist: nodePath.join(launchDir, plist),
            work_dir: getKnownAgentWorkDirs(agentId)[0] || null,
          });
        }
      }
    } else if (platform === "linux") {
      const unitDir = nodePath.join(nodeOs.homedir(), ".config", "systemd", "user");
      if (nodeFs.existsSync(unitDir)) {
        const units = nodeFs.readdirSync(unitDir).filter(f => f.endsWith(".service"));
        for (const unit of units) {
          const agentId = unit.replace(".service", "");
          let status = "stopped";
          let pid: number | null = null;
          try {
            const result = execSync(`systemctl --user is-active ${agentId} 2>&1`, { encoding: "utf8", stdio: "pipe" }).trim();
            status = result === "active" ? "running" : result;
            if (status === "running") {
              const pidResult = execSync(`systemctl --user show ${agentId} --property=MainPID --value 2>&1`, { encoding: "utf8", stdio: "pipe" }).trim();
              pid = parseInt(pidResult) || null;
            }
          } catch {}
          agents.push({
            agentId,
            status,
            pid,
            unit: nodePath.join(unitDir, unit),
            work_dir: getKnownAgentWorkDirs(agentId)[0] || null,
          });
        }
      }
    } else {
      fail(`Unsupported platform: ${platform}`);
    }

    if (JSON_FLAG) { out({ count: agents.length, agents, platform: platform === "darwin" ? "macOS" : "Linux" }); return; }

    if (agents.length === 0) { console.log("No agent services installed."); return; }

    const col = { id: 30, status: 10, pid: 8 };
    console.log("");
    console.log(pad("AGENT ID", col.id) + pad("STATUS", col.status) + pad("PID", col.pid));
    console.log("-".repeat(col.id + col.status + col.pid));
    for (const a of agents) {
      console.log(pad(a.agentId, col.id) + pad(a.status.toUpperCase(), col.status) + pad(a.pid ? String(a.pid) : "-", col.pid));
    }
    if (showPaths) {
      console.log(``);
      console.log(`Install paths:`);
      for (const a of agents) {
        console.log(`  ${a.agentId}: ${a.work_dir || "(unknown)"}`);
      }
    }
    console.log(`\n${agents.length} service(s) installed.`);
  });

// ─── Update & Version ────────────────────────────────────────────────────────

program.command("update").description("Update the Teneo CLI to the latest version")
  .action(async () => {
    const { execSync } = await import("node:child_process");
    console.log("Updating Teneo CLI...");
    try {
      // Stop daemon before update
      await stopDaemonBestEffort();
      execSync("npx -y @teneo-protocol/cli", { stdio: "inherit" });
    } catch (err: any) {
      console.error("Update failed:", err.message || err);
      process.exit(1);
    }
  });

program.command("version").description("Show installed and latest available version")
  .action(async () => {
    const local = program.version();
    console.log(`Installed: v${local}`);
    try {
      const { execSync } = await import("node:child_process");
      const latest = execSync("npm view @teneo-protocol/cli version", { encoding: "utf-8", timeout: 10000 }).trim();
      console.log(`Latest:    v${latest}`);
      if (local !== latest) {
        console.log(`\nUpdate available! Run: ~/teneo-skill/teneo update`);
      } else {
        console.log(`\nYou're up to date.`);
      }
    } catch {
      console.log("Latest:    (could not check)");
    }
  });

// ─── Metadata Export ─────────────────────────────────────────────────────────

if (process.argv.includes("--dump-commands")) {
  function dumpCommand(cmd: Command): any {
    const entry: any = {
      name: cmd.name(), description: cmd.description(),
      arguments: cmd.registeredArguments.map((a) => ({ name: a.name(), description: a.description, required: a.required })),
      options: cmd.options.map((o) => ({ flags: o.flags, description: o.description, defaultValue: o.defaultValue })),
    };
    // Include subcommands (e.g. agent create, agent deploy, etc.)
    const subs = cmd.commands;
    if (subs && subs.length > 0) {
      entry.subcommands = subs.map(dumpCommand);
    }
    return entry;
  }
  const commands = program.commands.map(dumpCommand);
  console.log(JSON.stringify({ name: program.name(), version: program.version(), description: program.description(), commands }, null, 2));
  process.exit(0);
}

// ─── Parse ───────────────────────────────────────────────────────────────────

program.parseAsync(process.argv)
  .then(() => {
    // Let stdout flush completely before forcing exit (avoids truncation when piped).
    // Set a short timeout to allow the event loop to drain pending I/O, then exit.
    setTimeout(() => process.exit(0), 100).unref();
  })
  .catch((err) => fail(err.message || String(err)));
