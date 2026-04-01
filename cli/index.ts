#!/usr/bin/env npx tsx

/**
 * Teneo Protocol CLI
 * SECURITY: Wallet keys are encrypted at rest (AES-256-GCM) and used for local signing only.
 * Only cryptographic signatures are transmitted — never the key itself.
 *
 * Architecture: CLI commands route through a background daemon process that maintains
 * a persistent WebSocket connection to Teneo Protocol. The daemon auto-starts on first
 * use and auto-stops after 10 minutes of inactivity.
 */

import "dotenv/config";
import { Command } from "commander";
import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as allChains from "viem/chains";
import * as nodeCrypto from "node:crypto";
import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import * as nodeOs from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// ─── Config ──────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.TENEO_PRIVATE_KEY;
const DEFAULT_ROOM = process.env.TENEO_DEFAULT_ROOM || "";
const DEFAULT_CHAIN = process.env.TENEO_DEFAULT_CHAIN || "base";

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

interface WalletData {
  version: number;
  address: string;
  encryptedKey: string;
  iv: string;
  authTag: string;
  createdAt: string;
}

function ensureWalletDir() {
  if (!nodeFs.existsSync(WALLET_DIR))
    nodeFs.mkdirSync(WALLET_DIR, { recursive: true, mode: 0o700 });
}

function getOrCreateMasterSecret(): Buffer {
  ensureWalletDir();
  if (nodeFs.existsSync(SECRET_FILE)) {
    return Buffer.from(nodeFs.readFileSync(SECRET_FILE, "utf8").trim(), "hex");
  }
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

function loadWallet(): WalletData | null {
  if (!nodeFs.existsSync(WALLET_FILE)) return null;
  try { return JSON.parse(nodeFs.readFileSync(WALLET_FILE, "utf8")); } catch { return null; }
}

function saveWallet(data: WalletData) {
  ensureWalletDir();
  nodeFs.writeFileSync(WALLET_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
  nodeFs.chmodSync(WALLET_FILE, 0o600);
}

function autoCreateWallet(): { address: string; privateKey: string } {
  console.error(JSON.stringify({ info: "No wallet found — generating a new one automatically..." }));
  const privateKey = nodeCrypto.randomBytes(32).toString("hex");
  const account = privateKeyToAccount(`0x${privateKey}` as `0x${string}`);
  const secret = getOrCreateMasterSecret();
  const encrypted = encryptPK(privateKey, secret);
  saveWallet({
    address: account.address,
    encryptedKey: encrypted.encryptedKey,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    createdAt: new Date().toISOString(),
  });
  console.error(JSON.stringify({ info: `Wallet created: ${account.address}` }));
  console.error(JSON.stringify({ info: "Fund this address with USDC on Base, Avalanche, Peaq, or X Layer to use paid agents." }));
  return { address: account.address, privateKey };
}

function getWalletAddress(): string {
  const wallet = loadWallet();
  if (wallet) return wallet.address;
  if (PRIVATE_KEY) {
    const key = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
    return privateKeyToAccount(key as `0x${string}`).address;
  }
  return autoCreateWallet().address;
}

function requireKey(): string {
  if (PRIVATE_KEY) return PRIVATE_KEY;
  const wallet = loadWallet();
  if (wallet) {
    const secret = getOrCreateMasterSecret();
    return decryptPK(wallet.encryptedKey, wallet.iv, wallet.authTag, secret);
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

const ERC20_BALANCE_ABI = [{ inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }] as const;
const ERC20_TRANSFER_ABI = [{ inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }] as const;
const ERC20_TRANSFER_EVENT = { type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }] } as const;


// ─── Output Helpers ──────────────────────────────────────────────────────────

const JSON_FLAG = process.argv.includes("--json");

function out(data: unknown) { console.log(JSON.stringify(data, null, 2)); }

function fail(msg: string): never {
  if (JSON_FLAG) console.error(JSON.stringify({ error: msg }));
  else console.error(`Error: ${msg}`);
  process.exit(1);
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
  try { return parseInt(nodeFs.readFileSync(DAEMON_PORT_FILE, "utf8").trim()); }
  catch { return null; }
}

function isDaemonRunning(): boolean {
  try {
    const pid = parseInt(nodeFs.readFileSync(DAEMON_PID_FILE, "utf8").trim());
    process.kill(pid, 0);
    return true;
  } catch { return false; }
}

async function startDaemon(): Promise<number> {
  console.error(JSON.stringify({ info: "Starting daemon..." }));
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = nodePath.dirname(__filename);

  // Prefer pre-compiled .mjs (fast), fall back to .ts via tsx
  const mjsPath = nodePath.join(__dirname, "daemon.mjs");
  const tsPath = nodePath.join(__dirname, "daemon.ts");
  const usePrecompiled = nodeFs.existsSync(mjsPath);
  const child = usePrecompiled
    ? spawn("node", [mjsPath], { detached: true, stdio: "ignore", cwd: __dirname, env: { ...process.env } })
    : spawn("npx", ["tsx", tsPath], { detached: true, stdio: "ignore", cwd: __dirname, env: { ...process.env } });
  child.unref();

  // Poll /health until HTTP server is up (max 15s) — SDK connects lazily
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const port = getDaemonPort();
    if (port) {
      try {
        const res = await fetch(`http://localhost:${port}/health`);
        if (res.ok) {
          console.error(JSON.stringify({ info: `Daemon ready on port ${port}` }));
          return port;
        }
      } catch { /* not ready yet */ }
    }
  }
  fail("Daemon failed to start within 15 seconds.");
}

async function execViaDaemon(command: string, args: Record<string, any> = {}): Promise<any> {
  let port = getDaemonPort();
  if (!port || !isDaemonRunning()) {
    port = await startDaemon();
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
    port = await startDaemon();
    res = await fetch(`http://localhost:${port}/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, args }),
    });
  }
  const data = await res.json() as any;
  if (data.error) {
    if (data.error.includes("Not connected to Teneo network")) {
      fail("Connection to Teneo network was lost. The daemon is reconnecting — please retry in a few seconds.");
    }
    fail(data.error);
  }
  return data.result;
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
program.name("teneo-cli").version("2.0.26")
  .description("Teneo Protocol CLI. Private keys are NEVER transmitted.")
  .option("--json", "Machine-readable JSON output");

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
        try { await fetch(`http://localhost:${port}/stop`, { method: "POST" }); } catch {}
        out({ status: "stopped" });
        break;
      }
      case "status": {
        const running = isDaemonRunning();
        out({ status: running ? "running" : "stopped", port: getDaemonPort() });
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
    out(await execViaDaemon("health"));
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
  .option("--chain <chain>", "Payment chain (base|avax|peaq|xlayer)")
  .option("--network <network>", "Payment network (alias for --chain)")
  .action(async (agent: string, cmd: string, opts: any) => {
    const room = await resolveRoom(opts.room);
    const chain = opts.chain || opts.network;
    out(await execViaDaemon("command", { agent, cmd, room, chain, timeout: parseInt(opts.timeout) }));
  });

program.command("quote")
  .description("Check price for a command (does not execute)")
  .argument("<message>")
  .option("--room <roomId>")
  .option("--chain <chain>")
  .action(async (message: string, opts: any) => {
    const room = await resolveRoom(opts.room);
    out(await execViaDaemon("quote", { message, room, chain: opts.chain || DEFAULT_CHAIN }));
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
      const existing = loadWallet();
      if (existing) { out({ status: "exists", address: existing.address, createdAt: existing.createdAt }); return; }
      if (PRIVATE_KEY) { out({ status: "env_var_set", note: "Private key found in environment." }); return; }
    }
    const { address } = autoCreateWallet();
    out({ status: "created", address, note: "New wallet generated. Fund with USDC to use paid agents." });
  });

program.command("wallet-address").description("Show wallet public address")
  .action(async () => {
    const wallet = loadWallet();
    if (wallet) { out({ address: wallet.address, createdAt: wallet.createdAt }); }
    else if (PRIVATE_KEY) {
      const key = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
      out({ address: privateKeyToAccount(key as `0x${string}`).address, source: "environment_variable" });
    } else {
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
    const secret = getOrCreateMasterSecret();
    const key = decryptPK(wallet.encryptedKey, wallet.iv, wallet.authTag, secret);
    console.error(JSON.stringify({ warning: "PRIVATE KEY EXPORTED. Never share this." }));
    out({ address: wallet.address, privateKey: key });
  });

program.command("wallet-balance").description("Check USDC and native token balances on supported chains")
  .option("--chain <chain>", "Specific chain (base|avax|peaq|xlayer)")
  .action(async (opts: any) => {
    const address = getWalletAddress();
    const chainsToCheck = opts.chain ? [opts.chain] : ["base", "avax", "peaq", "xlayer"];
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
  .argument("<amount>", "Amount in USDC").argument("<to>", "Destination address").argument("<chain>", "Chain (base|avax|peaq|xlayer)")
  .action(async (amountStr: string, to: string, chainName: string) => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) fail("Invalid amount.");
    if (!to.startsWith("0x") || to.length !== 42) fail("Invalid address. Must be 0x + 40 hex chars.");
    const rawAmount = BigInt(Math.round(amount * 1e6));
    const chain = WALLET_CHAIN_MAP[chainName];
    const usdcAddr = USDC_ADDRESSES[chainName];
    if (!chain || !usdcAddr) fail(`Unknown chain: ${chainName}. Supported: base, avax, peaq, xlayer`);
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

function validateAgentId(agentId: string): string | null {
  if (!agentId) return "agentId is required";
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(agentId) && !/^[a-z0-9]$/.test(agentId))
    return "agentId must use lowercase letters, numbers, hyphens only, and start/end with a letter or number";
  return null;
}

function validateMetadata(meta: any): MetadataValidationError[] {
  const errors: MetadataValidationError[] = [];
  if (!meta.name) errors.push({ field: "name", message: "name is required" });
  // Accept both snake_case (SDK) and camelCase (legacy docs)
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
  if (!meta.capabilities || !Array.isArray(meta.capabilities))
    errors.push({ field: "capabilities", message: "capabilities array is required" });
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

const agentCmd = program.command("agent").description("Deploy and manage YOUR OWN agents on the Teneo network");

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
const SDK_FALLBACK_VERSION = "v0.8.0";
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

// Shared scaffold logic — used by both `agent init` and `agent scaffold`
async function scaffoldAgent(meta: any, opts: { type: string; useCliKey: boolean }): Promise<{ dir: string; agentId: string; files: string[] }> {
  await ensureGo();

  const agentId = meta.agent_id || meta.agentId;
  const dir = agentId;

  if (nodeFs.existsSync(dir)) fail(`Directory "${dir}" already exists.`);
  nodeFs.mkdirSync(dir, { recursive: true });

  // Generate or reuse key
  let agentKey: string;
  if (opts.useCliKey) {
    agentKey = requireKey();
    console.error(JSON.stringify({ info: "Using CLI wallet key for agent." }));
  } else {
    agentKey = nodeCrypto.randomBytes(32).toString("hex");
    console.error(JSON.stringify({ info: "Generated new private key for agent." }));
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

  return { dir, agentId, files: [metaFilename, "main.go", "go.mod", ".env", ".gitignore"] };
}

agentCmd.command("init")
  .description("Create agent metadata JSON and scaffold Go project")
  .option("--name <name>", "Agent name")
  .option("--id <id>", "Agent ID (kebab-case)")
  .option("--type <type>", "Agent type (command|nlp|commandless|mcp)")
  .option("--template <template>", "Go template: enhanced (default) or simple-openai", "enhanced")
  .option("--description <desc>", "Agent description")
  .option("--short-description <desc>", "Short description")
  .option("--category <cat>", "Category (can specify multiple)", (val: string, prev: string[]) => prev.concat(val), [] as string[])
  .option("--no-scaffold", "Only create metadata JSON, skip Go project scaffolding")
  .option("--use-cli-key", "Reuse the CLI wallet key for the agent")
  .action(async (opts: any) => {
    let name = opts.name;
    let agentId = opts.id;
    let agentType = opts.type || "command";
    let description = opts.description;
    let shortDescription = opts.shortDescription;
    let categories = opts.category?.length ? opts.category : [];

    // Interactive mode if required fields are missing
    if (!name || !description || !shortDescription || categories.length === 0) {
      try {
        const { input, select, checkbox } = await import("@inquirer/prompts");

        if (!name) name = await input({ message: "Agent name:" });
        if (!agentId) agentId = toKebabCase(name);
        const suggestedId = agentId;
        agentId = await input({ message: "Agent ID (kebab-case):", default: suggestedId });
        if (!shortDescription) shortDescription = await input({ message: "Short description (one line):" });
        if (!description) description = await input({ message: "Full description:" });
        agentType = await select({
          message: "Agent type:",
          choices: VALID_AGENT_TYPES.map(t => ({ value: t, name: t })),
          default: agentType,
        });
        if (categories.length === 0) {
          categories = await checkbox({
            message: "Categories (select 1-2):",
            choices: VALID_CATEGORIES.map(c => ({ value: c, name: c })),
            required: true,
          });
        }
      } catch (err: any) {
        if (err.name === "ExitPromptError") { process.exit(0); }
        throw err;
      }
    }

    if (!agentId) agentId = toKebabCase(name);

    // Top-level fields use snake_case (matches Go SDK's sdkAgentPayload struct in nft.Mint())
    // Command fields use camelCase (matches Go SDK's command struct)
    const metadata: any = {
      name,
      agent_id: agentId,
      short_description: shortDescription,
      description,
      agent_type: agentType,
      capabilities: [],
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

    // Scaffold the full Go project unless --no-scaffold
    if (opts.scaffold !== false) {
      const result = await scaffoldAgent(metadata, { type: opts.template || "enhanced", useCliKey: !!opts.useCliKey });
      out({
        status: "created",
        agent_id: agentId,
        name,
        directory: result.dir,
        files: result.files,
        next_steps: [
          `cd ${result.dir}`,
          "go mod tidy",
          `go build -o ${agentId} .`,
          `./${agentId}`,
        ],
      });
    } else {
      const filename = `${agentId}-metadata.json`;
      nodeFs.writeFileSync(filename, JSON.stringify(metadata, null, 2));
      out({ status: "created", file: filename, agent_id: agentId, name });
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

agentCmd.command("submit")
  .description("Submit agent for public review")
  .argument("<agentId>", "Agent ID")
  .argument("<tokenId>", "NFT token ID")
  .action(async (agentId: string, tokenIdStr: string) => {
    const tokenId = parseInt(tokenIdStr);
    if (isNaN(tokenId)) fail("tokenId must be a number");
    const key = requireKey();
    const hex = key.startsWith("0x") ? key : `0x${key}`;
    const address = privateKeyToAccount(hex as `0x${string}`).address;

    const res = await fetch(`${BACKEND_REST_URL}/api/agents/${agentId}/submit-for-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creator_wallet: address, token_id: tokenId }),
    });
    const data = await res.json() as any;
    if (!res.ok) fail(data.message || data.error || `HTTP ${res.status}`);
    out({ status: "submitted", agentId, tokenId, ...data });
  });

agentCmd.command("withdraw")
  .description("Withdraw agent from public back to private")
  .argument("<agentId>", "Agent ID")
  .argument("<tokenId>", "NFT token ID")
  .action(async (agentId: string, tokenIdStr: string) => {
    const tokenId = parseInt(tokenIdStr);
    if (isNaN(tokenId)) fail("tokenId must be a number");
    const key = requireKey();
    const hex = key.startsWith("0x") ? key : `0x${key}`;
    const address = privateKeyToAccount(hex as `0x${string}`).address;

    const res = await fetch(`${BACKEND_REST_URL}/api/agents/${agentId}/withdraw-public`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creator_wallet: address, token_id: tokenId }),
    });
    const data = await res.json() as any;
    if (!res.ok) fail(data.message || data.error || `HTTP ${res.status}`);
    out({ status: "withdrawn", agentId, tokenId, ...data });
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

agentCmd.command("status")
  .description("Check deployment status of an owned agent")
  .argument("<agentId>", "Agent ID")
  .action(async (agentId: string) => {
    const result = await execViaDaemon("my-agent-status", { agentId, walletAddress: getWalletAddress() });
    if (JSON_FLAG) { out(result); return; }

    if (result.error) { fail(result.error); }
    const a = result;
    console.log(`\n  Agent:      ${a.agent_name || a.agent_id}`);
    console.log(`  ID:         ${a.agent_id}`);
    console.log(`  Status:     ${a.is_online ? "ONLINE" : "OFFLINE"}`);
    console.log(`  Visibility: ${a.visibility || "unknown"}`);
    if (a.token_id) console.log(`  Token ID:   ${a.token_id}`);
    if (a.description) console.log(`  Description: ${a.description}`);
    console.log("");
  });

agentCmd.command("scaffold")
  .description("Scaffold a Go agent project from existing metadata JSON")
  .argument("<metadataFile>", "Path to metadata JSON file")
  .option("--template <template>", "Go template: enhanced (default) or simple-openai", "enhanced")
  .option("--use-cli-key", "Reuse the CLI wallet key for the agent")
  .action(async (metadataFile: string, opts: any) => {
    if (!nodeFs.existsSync(metadataFile)) fail(`File not found: ${metadataFile}`);
    let meta: any;
    try { meta = JSON.parse(nodeFs.readFileSync(metadataFile, "utf8")); }
    catch { fail(`Invalid JSON in ${metadataFile}`); }

    const errors = validateMetadata(meta);
    if (errors.length > 0) {
      console.error("Metadata validation failed:");
      errors.forEach(e => console.error(`  ${e.field}: ${e.message}`));
      process.exit(1);
    }

    const result = await scaffoldAgent(meta, { type: opts.template || "enhanced", useCliKey: !!opts.useCliKey });
    out({
      status: "scaffolded",
      directory: result.dir,
      agentId: result.agentId,
      files: result.files,
      next_steps: [
        `cd ${result.dir}`,
        "go mod tidy",
        `go build -o ${result.agentId} .`,
        `./${result.agentId}`,
      ],
    });
  });

// ─── Agent Service Management ────────────────────────────────────────────────

const AGENT_LOG_DIR = nodePath.join(WALLET_DIR, "logs");
const SERVICE_LABEL_PREFIX = "ai.teneo.agent";

function getServiceLabel(agentId: string): string {
  return `${SERVICE_LABEL_PREFIX}.${agentId}`;
}

function getMacPlistPath(agentId: string): string {
  return nodePath.join(nodeOs.homedir(), "Library", "LaunchAgents", `${getServiceLabel(agentId)}.plist`);
}

function getLinuxUnitPath(agentId: string): string {
  return nodePath.join(nodeOs.homedir(), ".config", "systemd", "user", `${agentId}.service`);
}

function generateMacPlist(agentId: string, binaryPath: string, workDir: string): string {
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
    </dict>
</dict>
</plist>
`;
}

function generateLinuxUnit(agentId: string, binaryPath: string, workDir: string): string {
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

[Install]
WantedBy=default.target
`;
}

function findMetadataInDir(dir: string): any {
  const files = nodeFs.readdirSync(dir).filter(f => f.endsWith("-metadata.json"));
  if (files.length === 0) fail(`No *-metadata.json file found in ${dir}`);
  if (files.length > 1) fail(`Multiple metadata files found in ${dir}: ${files.join(", ")}. Expected exactly one.`);
  const raw = nodeFs.readFileSync(nodePath.join(dir, files[0]), "utf8");
  return JSON.parse(raw);
}

agentCmd.command("install")
  .description("Install agent as a background service (auto-restarts on crash/reboot)")
  .argument("<directory>", "Path to the agent project directory")
  .action(async (directory: string) => {
    const { execSync } = await import("node:child_process");
    const platform = nodeOs.platform();
    if (platform !== "darwin" && platform !== "linux") fail(`Unsupported platform: ${platform}. Only macOS and Linux are supported.`);

    const absDir = nodePath.resolve(directory);
    if (!nodeFs.existsSync(absDir)) fail(`Directory not found: ${absDir}`);

    const meta = findMetadataInDir(absDir);
    const agentId = meta.agent_id || meta.agentId;
    if (!agentId) fail("agent_id not found in metadata JSON.");

    // Find or build the binary
    let binaryPath = nodePath.join(absDir, agentId);
    if (!nodeFs.existsSync(binaryPath)) {
      await ensureGo();
      console.error(JSON.stringify({ info: `Binary not found, building with go build...` }));
      try {
        execSync(`go build -o ${agentId} .`, { cwd: absDir, stdio: "pipe", timeout: 120000 });
        console.error(JSON.stringify({ info: "Build successful." }));
      } catch (err: any) {
        fail(`go build failed: ${err.stderr?.toString() || err.message}`);
      }
    }

    // Verify binary exists after build attempt
    if (!nodeFs.existsSync(binaryPath)) fail(`Binary not found at ${binaryPath} after build.`);

    // Ensure log directory exists
    if (!nodeFs.existsSync(AGENT_LOG_DIR)) {
      nodeFs.mkdirSync(AGENT_LOG_DIR, { recursive: true, mode: 0o700 });
    }

    if (platform === "darwin") {
      const plistPath = getMacPlistPath(agentId);
      const plistDir = nodePath.dirname(plistPath);
      if (!nodeFs.existsSync(plistDir)) nodeFs.mkdirSync(plistDir, { recursive: true });

      // Unload existing service if present
      try { execSync(`launchctl unload "${plistPath}" 2>/dev/null`, { stdio: "pipe" }); } catch {}

      nodeFs.writeFileSync(plistPath, generateMacPlist(agentId, binaryPath, absDir));
      execSync(`launchctl load "${plistPath}"`, { stdio: "pipe" });

      out({
        status: "installed",
        agentId,
        platform: "macOS",
        service: getServiceLabel(agentId),
        plist: plistPath,
        logs: { stdout: `${AGENT_LOG_DIR}/${agentId}.out.log`, stderr: `${AGENT_LOG_DIR}/${agentId}.err.log` },
        commands: {
          status: `launchctl list ${getServiceLabel(agentId)}`,
          stop: `launchctl unload "${plistPath}"`,
          start: `launchctl load "${plistPath}"`,
          logs: `tail -f ${AGENT_LOG_DIR}/${agentId}.err.log`,
          uninstall: `teneo-cli agent uninstall ${agentId}`,
        },
      });
    } else {
      // Linux (systemd user unit)
      const unitPath = getLinuxUnitPath(agentId);
      const unitDir = nodePath.dirname(unitPath);
      if (!nodeFs.existsSync(unitDir)) nodeFs.mkdirSync(unitDir, { recursive: true });

      nodeFs.writeFileSync(unitPath, generateLinuxUnit(agentId, binaryPath, absDir));

      // Enable lingering so user services survive logout
      try { execSync("loginctl enable-linger $USER", { stdio: "pipe" }); } catch {}

      execSync("systemctl --user daemon-reload", { stdio: "pipe" });
      execSync(`systemctl --user enable --now ${agentId}`, { stdio: "pipe" });

      out({
        status: "installed",
        agentId,
        platform: "Linux",
        service: `${agentId}.service`,
        unit: unitPath,
        commands: {
          status: `systemctl --user status ${agentId}`,
          stop: `systemctl --user stop ${agentId}`,
          start: `systemctl --user start ${agentId}`,
          logs: `journalctl --user -u ${agentId} -f`,
          uninstall: `teneo-cli agent uninstall ${agentId}`,
        },
      });
    }
  });

agentCmd.command("uninstall")
  .description("Stop and remove agent background service")
  .argument("<agentId>", "Agent ID")
  .action(async (agentId: string) => {
    const { execSync } = await import("node:child_process");
    const platform = nodeOs.platform();

    if (platform === "darwin") {
      const plistPath = getMacPlistPath(agentId);
      if (!nodeFs.existsSync(plistPath)) fail(`Service not found: ${plistPath}`);

      try { execSync(`launchctl unload "${plistPath}"`, { stdio: "pipe" }); } catch {}
      nodeFs.unlinkSync(plistPath);
      out({ status: "uninstalled", agentId, platform: "macOS" });
    } else if (platform === "linux") {
      const unitPath = getLinuxUnitPath(agentId);
      if (!nodeFs.existsSync(unitPath)) fail(`Service not found: ${unitPath}`);

      try { execSync(`systemctl --user disable --now ${agentId}`, { stdio: "pipe" }); } catch {}
      nodeFs.unlinkSync(unitPath);
      try { execSync("systemctl --user daemon-reload", { stdio: "pipe" }); } catch {}
      out({ status: "uninstalled", agentId, platform: "Linux" });
    } else {
      fail(`Unsupported platform: ${platform}`);
    }
  });

agentCmd.command("service-status")
  .description("Check if an agent is running as a background service")
  .argument("<agentId>", "Agent ID")
  .action(async (agentId: string) => {
    const { execSync } = await import("node:child_process");
    const platform = nodeOs.platform();

    if (platform === "darwin") {
      const plistPath = getMacPlistPath(agentId);
      if (!nodeFs.existsSync(plistPath)) {
        out({ status: "not_installed", agentId, platform: "macOS" });
        return;
      }
      try {
        const result = execSync(`launchctl list ${getServiceLabel(agentId)} 2>&1`, { encoding: "utf8", stdio: "pipe" });
        // Parse PID from launchctl output
        const pidMatch = result.match(/"PID"\s*=\s*(\d+)/);
        const pid = pidMatch ? parseInt(pidMatch[1]) : null;
        const exitMatch = result.match(/"LastExitStatus"\s*=\s*(\d+)/);
        const lastExit = exitMatch ? parseInt(exitMatch[1]) : null;
        out({
          status: pid ? "running" : "stopped",
          agentId,
          platform: "macOS",
          pid,
          lastExitStatus: lastExit,
          plist: plistPath,
          logs: { stdout: `${AGENT_LOG_DIR}/${agentId}.out.log`, stderr: `${AGENT_LOG_DIR}/${agentId}.err.log` },
        });
      } catch {
        out({ status: "stopped", agentId, platform: "macOS", plist: plistPath });
      }
    } else if (platform === "linux") {
      const unitPath = getLinuxUnitPath(agentId);
      if (!nodeFs.existsSync(unitPath)) {
        out({ status: "not_installed", agentId, platform: "Linux" });
        return;
      }
      try {
        const result = execSync(`systemctl --user is-active ${agentId} 2>&1`, { encoding: "utf8", stdio: "pipe" }).trim();
        const pidResult = execSync(`systemctl --user show ${agentId} --property=MainPID --value 2>&1`, { encoding: "utf8", stdio: "pipe" }).trim();
        out({
          status: result === "active" ? "running" : result,
          agentId,
          platform: "Linux",
          pid: parseInt(pidResult) || null,
          unit: unitPath,
        });
      } catch (err: any) {
        out({ status: "stopped", agentId, platform: "Linux", unit: unitPath });
      }
    } else {
      fail(`Unsupported platform: ${platform}`);
    }
  });

agentCmd.command("services")
  .description("List all locally installed agent services")
  .action(async (opts: any) => {
    const { execSync } = await import("node:child_process");
    const platform = nodeOs.platform();
    const agents: any[] = [];

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
          agents.push({ agentId, status, pid, plist: nodePath.join(launchDir, plist) });
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
          agents.push({ agentId, status, pid, unit: nodePath.join(unitDir, unit) });
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
    console.log(`\n${agents.length} service(s) installed.`);
  });

// ─── Update & Version ────────────────────────────────────────────────────────

program.command("update").description("Update the Teneo CLI to the latest version")
  .action(async () => {
    const { execSync } = await import("node:child_process");
    console.log("Updating Teneo CLI...");
    try {
      // Stop daemon before update
      try { execSync("kill $(cat ~/.teneo-daemon.pid 2>/dev/null) 2>/dev/null", { stdio: "ignore" }); } catch {}
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
    // Include subcommands (e.g. agent init, agent install, etc.)
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

program.parseAsync(process.argv).catch((err) => fail(err.message || String(err)));
