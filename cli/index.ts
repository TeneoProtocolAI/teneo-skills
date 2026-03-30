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
program.name("teneo-cli").version("2.0.11")
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

// ─── Agent Discovery (via daemon) ───────────────────────────────────────────

program.command("discover")
  .description("Full JSON manifest of all agents, commands, and pricing — designed for AI agent consumption")
  .action(async () => { out(await execViaDaemon("discover")); });

program.command("list-agents").alias("agents")
  .description("List all agents on the Teneo network")
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
  .description("Show agent details, commands, and pricing")
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
      }
    }
    console.log(`\n  QUERY THIS AGENT:`);
    console.log(`    teneo-cli command ${agent.agent_id} "${agent.commands?.[0]?.trigger || "help"}" --room <roomId>\n`);
  });

// ─── Agent Commands (via daemon) ────────────────────────────────────────────

program.command("command")
  .description("Direct command to agent (use internal agent ID, not display name)")
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
  const commands = program.commands.map((cmd) => ({
    name: cmd.name(), description: cmd.description(),
    arguments: cmd.registeredArguments.map((a) => ({ name: a.name(), description: a.description, required: a.required })),
    options: cmd.options.map((o) => ({ flags: o.flags, description: o.description, defaultValue: o.defaultValue })),
  }));
  console.log(JSON.stringify({ name: program.name(), version: program.version(), description: program.description(), commands }, null, 2));
  process.exit(0);
}

// ─── Parse ───────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => fail(err.message || String(err)));
