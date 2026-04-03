#!/usr/bin/env npx tsx

/**
 * Teneo Protocol CLI Daemon
 * Maintains a persistent WebSocket connection to Teneo Protocol.
 * CLI commands talk to this daemon via local HTTP instead of opening
 * a new WebSocket connection for every single command.
 *
 * Auto-starts on first CLI command, auto-stops after a configurable idle timeout.
 */

import "dotenv/config";
import * as http from "node:http";
import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import * as nodeOs from "node:os";
import { TeneoSDK, SDKConfigBuilder } from "@teneo-protocol/sdk";
import {
  createWalletClient,
  createPublicClient,
  http as viemHttp,
  defineChain,
  isAddress,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as allChains from "viem/chains";
import * as nodeCrypto from "node:crypto";

// ─── Config ──────────────────────────────────────────────────────────────────

const WS_URL =
  process.env.TENEO_WS_URL ||
  "wss://backend.developer.chatroom.teneo-protocol.ai/ws";
const PRIVATE_KEY = process.env.TENEO_PRIVATE_KEY;
const DEFAULT_ROOM = process.env.TENEO_DEFAULT_ROOM || "";
const DAEMON_PORT = parseInt(process.env.TENEO_DAEMON_PORT || "19876");
const DEFAULT_IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const IDLE_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.TENEO_DAEMON_IDLE_TIMEOUT_MS);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_IDLE_TIMEOUT_MS;
})();
const TX_FOLLOWUP_TIMEOUT_MS = 60_000; // wait up to 60s for follow-up trigger_wallet_tx after a confirmed TX

// Tracks the in-flight startup connection so /health can wait for it
let connectingPromise: Promise<void> | null = null;

// x402 payment network mapping
const CHAIN_TO_CAIP2: Record<string, string> = {
  base: "eip155:8453",
  peaq: "eip155:3338",
  avalanche: "eip155:43114",
  avax: "eip155:43114",
  xlayer: "eip155:196",
  "x-layer": "eip155:196",
};

const CHAIN_TO_USDC: Record<string, string> = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  peaq: "0xbbA60da06c2c5424f03f7434542280FCAd453d10",
  avalanche: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  avax: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  xlayer: "0x74b7F16337b8972027F6196A17a631aC6dE26d22",
  "x-layer": "0x74b7F16337b8972027F6196A17a631aC6dE26d22",
};

const PAYMENT_CHAIN_DISPLAY_PREFERENCE = ["base", "avax", "xlayer", "peaq"] as const;

function getPaymentChainKey(chainName: string): string | null {
  const caip2 = CHAIN_TO_CAIP2[chainName];
  const usdc = CHAIN_TO_USDC[chainName];
  if (!caip2 || !usdc) return null;
  return `${caip2}:${usdc.toLowerCase()}`;
}

function getSupportedPaymentChains(): string[] {
  const supported = new Map<string, string>();

  const register = (chainName: string) => {
    const key = getPaymentChainKey(chainName);
    if (key && !supported.has(key)) supported.set(key, chainName);
  };

  for (const chainName of PAYMENT_CHAIN_DISPLAY_PREFERENCE) register(chainName);
  for (const chainName of Object.keys(CHAIN_TO_CAIP2)) register(chainName);

  return [...supported.values()];
}

const SUPPORTED_PAYMENT_CHAINS = getSupportedPaymentChains();

// Payment network retry priority — try these in order when a payment fails on one chain
const PAYMENT_NETWORK_PRIORITY = [...SUPPORTED_PAYMENT_CHAINS];
const BALANCE_CHECK_TIMEOUT_MS = 4_000;

const ERC20_BALANCE_ABI = [{ inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }] as const;

// ─── Payment Utilities ──────────────────────────────────────────────────────

function formatSupportedPaymentChains(): string {
  return SUPPORTED_PAYMENT_CHAINS.join(", ");
}

function formatSupportedPaymentChainsForFlag(): string {
  return SUPPORTED_PAYMENT_CHAINS.join("|");
}

function normalizePaymentChainName(chainName: string): string {
  const targetKey = getPaymentChainKey(chainName);
  if (!targetKey) return chainName;

  for (const supportedChain of SUPPORTED_PAYMENT_CHAINS) {
    if (getPaymentChainKey(supportedChain) === targetKey) return supportedChain;
  }

  return chainName;
}

function buildFundingInstruction(subject: string, chainName?: string): string {
  if (chainName) {
    return `Fund ${subject} with USDC on ${chainName} or another supported payment chain: ${formatSupportedPaymentChains()}.`;
  }
  return `Fund ${subject} with USDC on one of the supported payment chains: ${formatSupportedPaymentChains()}.`;
}

function buildPaymentFundingError(address: string, reason: string, chainName?: string): string {
  const normalizedReason = (reason || "Insufficient funds for Teneo payment").trim().replace(/\.\s*$/, "");
  return `${normalizedReason}. Active wallet: ${address}. Use this address for funding/ownership checks. ${buildFundingInstruction("this exact wallet", chainName)}`;
}

async function fetchUsdcBalance(address: string, chainName: string): Promise<{ chain: string; balance: bigint | null; error: string | null }> {
  const normalizedChain = normalizePaymentChainName(chainName);
  const usdcAddr = CHAIN_TO_USDC[normalizedChain];
  if (!usdcAddr) return { chain: chainName, balance: null, error: `Unknown chain: ${chainName}` };

  const caip2 = CHAIN_TO_CAIP2[normalizedChain];
  if (!caip2) return { chain: chainName, balance: null, error: `No CAIP2 for chain: ${chainName}` };

  const chainId = parseInt(caip2.split(":")[1]);
  const chain = getChain(chainId);

  try {
    const client = createPublicClient({ chain, transport: viemHttp() });
    const balance = await Promise.race([
      client.readContract({
        address: usdcAddr as `0x${string}`,
        abi: ERC20_BALANCE_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), BALANCE_CHECK_TIMEOUT_MS)),
    ]);
    return { chain: normalizedChain, balance: BigInt(balance), error: null };
  } catch (err: any) {
    return { chain: normalizedChain, balance: null, error: err.message };
  }
}

async function findFundedNetworks(address: string, exclude: string[] = []): Promise<{ chain: string; balance: bigint }[]> {
  const excluded = new Set(exclude.map(normalizePaymentChainName));
  const checks = PAYMENT_NETWORK_PRIORITY
    .filter(c => !excluded.has(c))
    .map(c => fetchUsdcBalance(address, c));
  const results = await Promise.all(checks);
  return results
    .filter(r => r.balance !== null && r.balance > 0n)
    .map(r => ({ chain: r.chain, balance: r.balance! }))
    .sort((a, b) => (a.balance > b.balance ? -1 : 1)); // highest balance first
}

function formatMicroUsdc(microUsdc: bigint): string {
  const sign = microUsdc < 0n ? "-" : "";
  const abs = microUsdc < 0n ? -microUsdc : microUsdc;
  const whole = abs / 1_000_000n;
  const frac = (abs % 1_000_000n).toString().padStart(6, "0");
  return `${sign}${whole}.${frac}`;
}

const WALLET_DIR = nodePath.join(nodeOs.homedir(), ".teneo-wallet");
const WALLET_FILE = nodePath.join(WALLET_DIR, "wallet.json");
const SECRET_FILE = nodePath.join(WALLET_DIR, ".secret");
const PID_FILE = nodePath.join(WALLET_DIR, "daemon.pid");
const PORT_FILE = nodePath.join(WALLET_DIR, "daemon.port");
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

// ─── Chain Config ────────────────────────────────────────────────────────────

const CHAIN_BY_ID: Record<number, Chain> = {};
for (const key of Object.keys(allChains)) {
  const c = (allChains as Record<string, unknown>)[key];
  if (c && typeof c === "object" && "id" in c)
    CHAIN_BY_ID[(c as Chain).id] = c as Chain;
}

function getChain(chainId: number): Chain {
  if (CHAIN_BY_ID[chainId]) return CHAIN_BY_ID[chainId];
  return defineChain({
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [`https://rpc.chain${chainId}.org`] } },
  });
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

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

function decryptPK(encryptedKey: string, iv: string, authTag: string, masterSecret: Buffer): string {
  const decipher = nodeCrypto.createDecipheriv("aes-256-gcm", masterSecret, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedKey, "base64")), decipher.final()]).toString("utf8");
}

function encryptPK(pk: string, masterSecret: Buffer) {
  const iv = nodeCrypto.randomBytes(12);
  const cipher = nodeCrypto.createCipheriv("aes-256-gcm", masterSecret, iv);
  const encrypted = Buffer.concat([cipher.update(pk, "utf8"), cipher.final()]);
  return { encryptedKey: encrypted.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64") };
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
  // Auto-generate wallet on first use
  log("No wallet found — generating a new one automatically...");
  const privateKey = nodeCrypto.randomBytes(32).toString("hex");
  const account = privateKeyToAccount(`0x${privateKey}` as `0x${string}`);
  const secret = readMasterSecret(true);
  const encrypted = encryptPK(privateKey, secret);
  saveWallet({
    version: WALLET_VERSION,
    address: account.address,
    encryptedKey: encrypted.encryptedKey,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    createdAt: new Date().toISOString(),
  });
  log(`Wallet created: ${account.address}`);
  log(buildFundingInstruction("this address"));
  return privateKey;
}

// ─── SDK Connection ──────────────────────────────────────────────────────────

let sdk: TeneoSDK | null = null;
let lastActivity = Date.now();
const startTime = Date.now();
let lastConnectionError: string | null = null;
let lastConnectionErrorName: string | null = null;

function log(msg: string) {
  const ts = new Date().toISOString();
  console.error(`[daemon ${ts}] ${msg}`);
}

function recordConnectionError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "Error";
  lastConnectionError = message;
  lastConnectionErrorName = name;
}

function clearConnectionError() {
  lastConnectionError = null;
  lastConnectionErrorName = null;
}

function buildSDK(key: string): TeneoSDK {
  const normalizedKey = key.startsWith("0x") ? key : `0x${key}`;
  const builder = new SDKConfigBuilder()
    .withWebSocketUrl(WS_URL)
    .withAuthentication(normalizedKey)
    .withReconnection({ enabled: true, delay: 3000, maxAttempts: 5 })
    .withCache(true, 600000, 500)
    .withPayments({
      autoApprove: true,
      quoteTimeout: 120000,
      network: CHAIN_TO_CAIP2.base,
      asset: CHAIN_TO_USDC.base,
    });
  const config = builder.build();
  config.messageTimeout = 120000;
  config.responseFormat = "both";
  return new TeneoSDK(config);
}

// Chain name lookup for formatTxHashWithChain
const CHAIN_NAMES: Record<number, string> = {
  1: "ethereum", 42161: "arbitrum", 137: "polygon",
  8453: "base", 59144: "linea", 43114: "avalanche",
  3338: "peaq", 196: "x-layer", 84532: "base-sepolia",
};

function formatTxHashWithChain(txHash: string, chainId: number): string {
  const name = CHAIN_NAMES[chainId];
  return name ? `${txHash}|${name}` : txHash;
}

function isRelevantAgentError(msg: string): boolean {
  return msg.includes("Payment verification failed") ||
    msg.includes("payment") ||
    msg.includes("Agent not found") ||
    msg.includes("not found") ||
    msg.includes("insufficient");
}

function isFlowComplete(content: string): boolean {
  const lower = content.toLowerCase();
  return lower.includes("swap completed") ||
    lower.includes("swap successful") ||
    lower.includes("swap failed") ||
    lower.includes("bridge completed") ||
    lower.includes("transfer completed");
}

function isIntermediateMessage(content: string): boolean {
  const lower = content.toLowerCase();
  return lower.includes("transaction confirmed") ||
    lower.includes("approval confirmed") ||
    lower.includes("approved") ||
    lower.includes("preparing swap") ||
    lower.includes("proceeding") ||
    lower.includes("next step");
}

async function waitForTxReceipt(chainId: number, txHash: string): Promise<{ reverted: boolean }> {
  const chain = getChain(chainId);
  const client = createPublicClient({ chain, transport: viemHttp() });
  const receipt = await client.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
  return { reverted: receipt.status === "reverted" };
}

async function signBroadcastAndConfirm(
  sdkInstance: TeneoSDK,
  account: ReturnType<typeof privateKeyToAccount>,
  taskId: string,
  tx: any,
  room: string | undefined,
): Promise<{ txHash: string; status: "confirmed" | "failed"; error?: string }> {
  const chain = getChain(tx.chainId);
  const walletClient = createWalletClient({ account, chain, transport: viemHttp() });
  const txHash = await walletClient.sendTransaction({
    to: tx.to, value: tx.value ? BigInt(tx.value) : 0n, data: tx.data || undefined, chain,
  });
  log(`TX broadcast: ${txHash}`);

  // Phase 1: tell agent we broadcasted
  await (sdkInstance as any).sendTxResult(taskId, "broadcasted", formatTxHashWithChain(txHash, tx.chainId), undefined, room, tx.chainId);

  // Phase 2: wait for on-chain confirmation
  log("Waiting for on-chain confirmation...");
  const receipt = await waitForTxReceipt(tx.chainId, txHash);
  const formattedHash = formatTxHashWithChain(txHash, tx.chainId);

  if (receipt.reverted) {
    log(`TX reverted on-chain: ${txHash}`);
    await (sdkInstance as any).sendTxResult(taskId, "failed", formattedHash, "Transaction reverted on-chain", room, tx.chainId);
    (sdkInstance as any).emit("wallet:tx_completed", {
      taskId,
      status: "failed",
      txHash: formattedHash,
      error: "Transaction reverted on-chain",
      room,
      chainId: tx.chainId,
    });
    return { txHash, status: "failed", error: "Transaction reverted on-chain" };
  }

  log(`TX confirmed: ${txHash}`);
  await (sdkInstance as any).sendTxResult(taskId, "confirmed", formattedHash, undefined, room, tx.chainId);
  (sdkInstance as any).emit("wallet:tx_completed", {
    taskId,
    status: "confirmed",
    txHash: formattedHash,
    room,
    chainId: tx.chainId,
  });
  return { txHash, status: "confirmed" };
}

async function runMultiStepTxFlow(
  s: TeneoSDK,
  {
    agent,
    commandLabel,
    effectiveTimeout,
    initialTaskId,
    start,
  }: {
    agent: string;
    commandLabel: string;
    effectiveTimeout: number;
    initialTaskId?: string | null;
    start: () => Promise<void>;
  },
): Promise<any> {
  log(`Tracking command flow for "${commandLabel}"`);

  const agentLower = agent.toLowerCase();
  const messages: any[] = [];
  let txCount = 0;
  let activeTaskId = initialTaskId || null;
  let taskConfirmedSeen = !!initialTaskId;

  return await new Promise<any>((resolve, reject) => {
    let idleTimer: ReturnType<typeof setTimeout>;
    let finalizeTimer: ReturnType<typeof setTimeout> | null = null;

    const settle = (fn: (value: any) => void, value: any) => {
      clearTimeout(flowTimeout);
      if (finalizeTimer) clearTimeout(finalizeTimer);
      cleanup();
      fn(value);
    };

    const recordTaskId = (taskId?: string) => {
      if (!taskId || taskId.startsWith("msg-") || activeTaskId) return;
      activeTaskId = taskId;
      taskConfirmedSeen = true;
      log(`Tracking multi-step task ${taskId} for ${agent}`);
    };

    const matchesAgent = (value?: string) => !!value && value.toLowerCase() === agentLower;
    const matchesTask = (taskId?: string) => !!activeTaskId && !!taskId && taskId === activeTaskId;
    const matchesInitialTask = (taskId?: string) => !!initialTaskId && !!taskId && taskId === initialTaskId;
    const isSyntheticTaskId = (taskId?: string) => !!taskId && taskId.startsWith("msg-");

    const shouldTrackTxEvent = (data: any) => {
      if (matchesTask(data.taskId) || matchesInitialTask(data.taskId)) return true;
      if (initialTaskId && data.taskId && data.taskId !== initialTaskId) return false;
      return !activeTaskId && matchesAgent(data.agentName);
    };

    const shouldTrackAgentResponse = (response: any) => {
      if (matchesTask(response.taskId) || matchesInitialTask(response.taskId)) return true;
      if (isSyntheticTaskId(response.taskId)) {
        return matchesAgent(response.agentId) || matchesAgent(response.agentName);
      }
      if (activeTaskId) return false;
      return matchesAgent(response.agentId) || matchesAgent(response.agentName);
    };

    const clearFinalizeTimer = () => {
      if (finalizeTimer) {
        clearTimeout(finalizeTimer);
        finalizeTimer = null;
      }
    };

    const buildTaskFlowResult = (status: "completed" | "error" | "timeout", taskId?: string) => ({
      steps: messages,
      txCount,
      taskId: activeTaskId || initialTaskId || taskId || undefined,
      status,
    });

    const scheduleTaskFlowResolve = (status: "completed" | "error", taskId?: string, delayMs: number = 5000) => {
      clearFinalizeTimer();
      finalizeTimer = setTimeout(() => {
        settle(resolve, buildTaskFlowResult(status, taskId));
      }, delayMs);
    };

    const scheduleSimpleResponseResolve = (response: any, delayMs: number = 1000) => {
      clearFinalizeTimer();
      finalizeTimer = setTimeout(() => {
        settle(resolve, {
          humanized: response.humanized,
          raw: response.raw,
          content: response.content,
          metadata: response.metadata,
        });
      }, delayMs);
    };

    const resetIdleTimer = (label: string) => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        log(`Idle timeout reached after last activity: ${label}`);
        if (messages.length > 0) {
          settle(resolve, {
            ...buildTaskFlowResult("timeout"),
            note: "Flow idle-timed out but some steps completed",
          });
          return;
        }
        settle(reject, new Error("Multi-step TX flow timed out with no responses"));
      }, TX_FOLLOWUP_TIMEOUT_MS);
    };

    const flowTimeout = setTimeout(() => {
      clearFinalizeTimer();
      clearTimeout(idleTimer);
      if (messages.length > 0) {
        settle(resolve, {
          ...buildTaskFlowResult("timeout"),
          note: "Flow timed out but some steps completed",
        });
        return;
      }
      settle(reject, new Error("Multi-step TX flow timed out with no responses"));
    }, effectiveTimeout);

    const sdkErrorHandler = (err: Error) => {
      if (isRelevantAgentError(err.message)) {
        settle(reject, new Error(`Agent error: ${err.message}`));
      }
    };

    const agentSelectedHandler = (data: any) => {
      const selectedId = data.agentId || data.agentName || "";
      if (selectedId && selectedId.toLowerCase() !== agentLower) {
        settle(reject, new Error(`Direct-agent mismatch: expected "${agent}", coordinator selected "${selectedId}"`));
      }
    };

    const taskConfirmedHandler = (data: any) => {
      if (!matchesInitialTask(data.taskId) && !matchesAgent(data.agentId) && !matchesAgent(data.agentName)) {
        return;
      }
      clearFinalizeTimer();
      taskConfirmedSeen = true;
      recordTaskId(data.taskId);
      messages.push({
        type: "task_confirmed",
        taskId: data.taskId,
        agentId: data.agentId,
        agentName: data.agentName,
        timestamp: new Date().toISOString(),
      });
      resetIdleTimer("task confirmed");
    };

    const txHandler = (data: any) => {
      if (!shouldTrackTxEvent(data)) return;
      clearFinalizeTimer();
      recordTaskId(data.taskId);
      txCount++;
      log(`Multi-step TX #${txCount} requested by ${data.agentName || agent}`);
      messages.push({
        type: "tx_requested",
        taskId: data.taskId,
        txCount,
        description: data.description,
        timestamp: new Date().toISOString(),
      });
      resetIdleTimer(`TX #${txCount} requested`);
    };

    const txResultHandler = (data: any) => {
      if (!matchesTask(data.taskId) && !matchesInitialTask(data.taskId)) return;
      clearFinalizeTimer();
      recordTaskId(data.taskId);
      log(`TX result: ${data.status} ${data.txHash || ""}`);
      messages.push({
        type: "tx_result",
        taskId: data.taskId,
        status: data.status,
        txHash: data.txHash,
        error: data.error,
        timestamp: new Date().toISOString(),
      });
      resetIdleTimer(`TX result: ${data.status}`);
    };

    const agentResponseHandler = (response: any) => {
      if (!shouldTrackAgentResponse(response)) return;
      clearFinalizeTimer();
      recordTaskId(response.taskId);

      const content = response.content || response.humanized || "";
      log(`Multi-step msg from ${agent}: ${content.substring(0, 100)}...`);
      messages.push({
        type: "agent_message",
        taskId: response.taskId,
        humanized: response.humanized || content,
        raw: response.raw,
        content,
        timestamp: new Date().toISOString(),
      });

      if (isFlowComplete(content)) {
        clearTimeout(idleTimer);
        scheduleTaskFlowResolve("completed", response.taskId, 5000);
        return;
      }

      if (response.error || content.toLowerCase().includes("error")) {
        clearTimeout(idleTimer);
        scheduleTaskFlowResolve("error", response.taskId, 5000);
        return;
      }

      if (isIntermediateMessage(content)) {
        resetIdleTimer(`intermediate: ${content.substring(0, 40)}`);
        return;
      }

      const isSimpleResponse = txCount === 0 &&
        !taskConfirmedSeen &&
        !initialTaskId &&
        isSyntheticTaskId(response.taskId);

      if (isSimpleResponse) {
        scheduleSimpleResponseResolve(response, 1000);
        return;
      }

      scheduleTaskFlowResolve("completed", response.taskId, 5000);
      resetIdleTimer("agent message");
    };

    const agentErrorHandler = (data: any) => {
      if (!matchesTask(data.taskId) &&
        !matchesInitialTask(data.taskId) &&
        !(matchesAgent(data.agentName) && (!activeTaskId || !data.taskId))) {
        return;
      }

      const errMsg = data.content || "";
      if (errMsg) {
        settle(reject, new Error(`Agent error: ${errMsg}`));
      }
    };

    const cleanup = () => {
      clearFinalizeTimer();
      clearTimeout(idleTimer);
      s.off("error", sdkErrorHandler);
      s.off("agent:selected", agentSelectedHandler);
      s.off("task:confirmed", taskConfirmedHandler);
      s.off("wallet:tx_requested", txHandler);
      s.off("wallet:tx_completed", txResultHandler);
      s.off("agent:response", agentResponseHandler);
      s.off("agent:error", agentErrorHandler);
    };

    s.on("error", sdkErrorHandler);
    s.on("agent:selected", agentSelectedHandler);
    s.on("task:confirmed", taskConfirmedHandler);
    s.on("wallet:tx_requested", txHandler);
    s.on("wallet:tx_completed", txResultHandler);
    s.on("agent:response", agentResponseHandler);
    s.on("agent:error", agentErrorHandler);

    resetIdleTimer("flow start");

    start().catch((err: any) => settle(reject, err));
  });
}

function registerTxSigner(sdkInstance: TeneoSDK) {
  const key = requireKey();
  const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`);

  sdkInstance.on("wallet:tx_requested", async (data: any) => {
    const { taskId, tx, agentName, description, room } = data;
    const isOptional = data.optional === true;
    log(`TX requested by ${agentName || "agent"}: ${description || "on-chain transaction"}`);

    // Auto-sign — sign, broadcast, wait for receipt, confirm
    try {
      await signBroadcastAndConfirm(sdkInstance, account, taskId, tx, room);
    } catch (err: any) {
      log(`TX failed: ${err.message}`);
      await (sdkInstance as any).sendTxResult(taskId, "failed", undefined, err.message, room, tx.chainId);
      (sdkInstance as any).emit("wallet:tx_completed", {
        taskId,
        status: "failed",
        error: err.message,
        room,
        chainId: tx.chainId,
      });
    }
  });
}

async function ensureConnected(): Promise<TeneoSDK> {
  if (connectingPromise) {
    try { await connectingPromise; } catch { /* pre-warm failed; continue reconnect flow */ }
  }

  if (sdk) {
    try {
      const h = (sdk as any).getHealth();
      if (h && h.status !== "disconnected") return sdk;
    } catch { /* reconnect */ }
    try { sdk.disconnect(); } catch {}
    sdk = null;
  }

  let key: string;
  try {
    key = requireKey();
  } catch (err) {
    recordConnectionError(err);
    throw err;
  }

  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      sdk = buildSDK(key);
      await sdk.connect();
      registerTxSigner(sdk);
      clearConnectionError();
      log("SDK connected");
      return sdk;
    } catch (err: any) {
      sdk = null;
      recordConnectionError(err);
      if (attempt < maxRetries) {
        const delay = Math.min(attempt * 2000, 10000);
        log(`Connection failed (attempt ${attempt}/${maxRetries}): ${err.message}. Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        throw new Error(`Failed to connect to Teneo network after ${maxRetries} attempts: ${err.message}`);
      }
    }
  }
  throw new Error("Failed to connect to Teneo network");
}

// Room fetch — sync from auth state (populated on connect), like the orchestrator
function liveRooms(s: TeneoSDK): any[] {
  return [...s.getRooms()];
}

// Async room refresh — use after mutations (create/update/delete) to update cache
async function refreshRooms(s: TeneoSDK): Promise<any[]> {
  return (s as any).listRooms();
}

// ─── Agent Fetching (via SDK WebSocket) ──────────────────────────────────────

const LEGACY_DEFAULT_CATALOG_PRICE_USDC = 0.001;

function parseCommands(agent: any): any[] {
  if (!agent.commands) return [];
  if (Array.isArray(agent.commands)) return agent.commands;
  try { return JSON.parse(agent.commands); } catch { return []; }
}

function parseCatalogPricePerUnit(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function hasExplicitCatalogPrice(pricePerUnit: number | undefined): boolean {
  return typeof pricePerUnit === "number" && Number.isFinite(pricePerUnit);
}

function getCatalogBasePrice(pricePerUnit: number | undefined): number {
  return hasExplicitCatalogPrice(pricePerUnit) ? pricePerUnit! : LEGACY_DEFAULT_CATALOG_PRICE_USDC;
}

function normalizeAgent(a: any) {
  const id = a.id || a.agent_id;
  const name = a.name || a.agent_name;
  const cmds = parseCommands(a);
  return {
    agent_id: id, agent_name: name, description: a.description || "",
    status: a.status, is_online: a.status === "online" || a.is_online,
    type: a.type || a.agent_type || "command",
    commands: cmds.map((c: any) => {
      const parsed = parseCatalogPricePerUnit(c.pricePerUnit ?? c.price_per_unit);
      const basePrice = getCatalogBasePrice(parsed);
      const isExplicitlyFree = hasExplicitCatalogPrice(parsed) && parsed === 0;
      const paramUsage = c.parameters?.length > 0 && !c.argument
        ? " " + c.parameters.map((p: any) => p.required !== false ? `<${p.name}>` : `[${p.name}]`).join(" ")
        : c.argument ? " " + c.argument : "";
      return {
        trigger: c.trigger, description: c.description,
        usage: `@${id} ${c.trigger}${paramUsage}`,
        price: basePrice,
        price_scope: !hasExplicitCatalogPrice(parsed)
          ? "legacy-default-base-price"
          : parsed! > 0 ? "base-command-price-only" : "free",
        task_unit: c.taskUnit || "per-query",
        is_free: isExplicitlyFree,
        pricing_note: !hasExplicitCatalogPrice(parsed)
          ? `Catalog price missing. Legacy default ${LEGACY_DEFAULT_CATALOG_PRICE_USDC} USDC applied. Exact total comes from the live task_quote.`
          : parsed! > 0
            ? "Base catalog price only. Exact signed total comes from the live task_quote."
            : "FREE",
        parameters: c.parameters || [], argument: c.argument,
        pricePerUnit: parsed, taskUnit: c.taskUnit,
      };
    }),
  };
}

async function fetchAgentsViaSDK(s: TeneoSDK): Promise<any[]> {
  const rooms = await liveRooms(s);
  if (rooms.length === 0) return [];
  const room = rooms[0];

  // Get agents in room + available to add
  const roomAgents = await s.listRoomAgents(room.id);
  const available: any[] = [];
  let offset = 0;
  const limit = 50;
  let result;
  do {
    result = await s.listAvailableAgents(room.id, { limit, offset });
    available.push(...result.agents);
    offset += limit;
  } while (result.hasMore);

  return [...roomAgents, ...available];
}

// ─── Live Agent Details (workaround SDK bug: agent_id must be in data wrapper) ─

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function getAgentDetailsLive(s: TeneoSDK, agentId: string, timeoutMs = 10000): Promise<any | null> {
  try {
    const wsClient = (s as any).wsClient;
    if (!wsClient?.isConnected) return null;

    return await new Promise<any>((resolve) => {
      const timeout = setTimeout(() => {
        wsClient.off("message:received", handler);
        resolve(null);
      }, timeoutMs);
      const handler = (msg: any) => {
        if (msg.type === "agent_details_response" && msg.data?.agent) {
          const agent = msg.data.agent;
          if (agent.agent_id === agentId) {
            clearTimeout(timeout);
            wsClient.off("message:received", handler);
            resolve(agent);
          }
        }
      };
      wsClient.on("message:received", handler);
      wsClient.sendMessage({ type: "get_agent_details" as any, data: { agent_id: agentId } });
    });
  } catch {
    return null;
  }
}

// Bulk enrichment: fire all requests at once, collect responses with a shared listener
async function enrichAgentsWithDetails(s: TeneoSDK, agents: any[]): Promise<any[]> {
  const wsClient = (s as any).wsClient;
  if (!wsClient?.isConnected || agents.length === 0) return agents;

  const pending = new Map<string, any>(); // agentId -> original agent
  const results = new Map<string, any>(); // agentId -> enriched agent
  for (const agent of agents) {
    pending.set(agent.agent_id, agent);
  }

  return new Promise<any[]>((resolve) => {
    // Global timeout: stagger (200ms * count) + 10s for responses, max 60s
    const totalTimeout = Math.min(agents.length * 200 + 10000, 60000);
    const timer = setTimeout(() => {
      wsClient.off("message:received", handler);
      finalize();
    }, totalTimeout);

    const handler = (msg: any) => {
      if (msg.type === "agent_details_response" && msg.data?.agent) {
        const agent = msg.data.agent;
        if (pending.has(agent.agent_id)) {
          results.set(agent.agent_id, { ...normalizeAgent(agent), _source: "live" });
          pending.delete(agent.agent_id);
          if (pending.size === 0) {
            clearTimeout(timer);
            wsClient.off("message:received", handler);
            finalize();
          }
        }
      }
    };

    function finalize() {
      // Merge: live results + fallback to original for any that didn't respond
      const merged = agents.map(a =>
        results.get(a.agent_id) || { ...a, _source: "cached" }
      );
      resolve(merged);
    }

    wsClient.on("message:received", handler);

    // Fire requests with 200ms stagger to stay within rate limit (10/sec, burst 20)
    (async () => {
      for (const agent of agents) {
        wsClient.sendMessage({ type: "get_agent_details" as any, data: { agent_id: agent.agent_id } })
          .catch(() => {});
        await sleep(200);
      }
    })();
  });
}

// ─── Command Handlers ────────────────────────────────────────────────────────

const handlers: Record<string, (s: TeneoSDK, args: any) => Promise<any>> = {
  // Discovery (via SDK WebSocket — no REST)
  "discover": async (s) => {
    const rawAgents = await fetchAgentsViaSDK(s);
    const normalized = rawAgents.map(normalizeAgent);
    const enriched = await enrichAgentsWithDetails(s, normalized);
    const onlineAgents = enriched.filter(a => a.is_online);
    const commandIndex: any[] = [];
    for (const agent of onlineAgents) {
      for (const cmd of agent.commands) {
        commandIndex.push({
          usage: cmd.usage, agent_id: agent.agent_id, agent_name: agent.agent_name,
          trigger: cmd.trigger, description: cmd.description, price: cmd.price,
          is_free: cmd.is_free, task_unit: cmd.task_unit, parameters: cmd.parameters,
        });
      }
    }
    return {
      _meta: { generated_at: new Date().toISOString(), websocket: WS_URL,
        total_agents: enriched.length, online_agents: onlineAgents.length,
        total_commands: commandIndex.length },
      fee_config: {
        model: "percentage", percentage: "1%", percentageRaw: 0.01,
        minimumFeeUSD: "0.001", minimumFeeRaw: 0.001, status: "embedded",
        coordinatorFeeUsdc: 0.0005,
      },
      payment_networks: Object.entries(CHAIN_TO_CAIP2).reduce((acc, [name, caip2]) => {
        if (!acc[name]) acc[name] = { caip2, usdc: CHAIN_TO_USDC[name] || null };
        return acc;
      }, {} as Record<string, any>),
      pricing_semantics: {
        catalogCommandPriceField: "agents[].commands[].price",
        catalogCommandPriceMeaning: "base-command-price-only",
        runtimePriceField: "task_quote.pricing.price_per_unit",
        runtimeFeeField: "task_quote.facilitator_fee",
        runtimeFeeUnit: "micro-usdc",
        note: "Do not estimate the final signed x402 total from fee_config alone; inspect the live task_quote.",
      },
      agents: enriched, online_agents: onlineAgents, command_index: commandIndex,
    };
  },

  "list-agents": async (s, args) => {
    let agents = (await fetchAgentsViaSDK(s)).map(normalizeAgent);

    // Add locally installed skill agents that are missing from the network (offline/disappeared)
    try {
      const networkIds = new Set(agents.map(a => a.agent_id));
      const skillDirs = [
        "teneo-skills-autogenerated/skills/agents",
        ".agents/skills",
        nodePath.join(nodeOs.homedir(), ".agents/skills"),
      ];
      for (const skillDir of skillDirs) {
        let entries: string[];
        try { entries = nodeFs.readdirSync(skillDir); } catch { continue; }
        for (const name of entries) {
          try {
            const skillMd = nodeFs.readFileSync(nodePath.join(skillDir, name, "SKILL.md"), "utf-8");
            const idMatch = skillMd.match(/\*\*ID:\*\*\s*`([^`]+)`/);
            if (!idMatch) continue;
            const agentId = idMatch[1];
            if (networkIds.has(agentId)) continue;
            // Extract name from SKILL.md
            const nameMatch = skillMd.match(/\*\*Name:\*\*\s*(.+)/);
            const agentName = nameMatch ? nameMatch[1].trim() : name;
            agents.push({
              agent_id: agentId, agent_name: agentName, description: "",
              status: "offline", is_online: false, type: "command", commands: [],
              _source: "local-skill",
            } as any);
            networkIds.add(agentId);
          } catch { /* skip */ }
        }
        break; // use first found skills dir
      }
    } catch { /* scanning optional */ }

    if (args?.search) {
      const term = args.search.toLowerCase();
      agents = agents.filter(a =>
        a.agent_id.toLowerCase().includes(term) || a.agent_name.toLowerCase().includes(term) || a.description.toLowerCase().includes(term));
    }
    if (args?.online) agents = agents.filter(a => a.is_online);
    if (args?.free) agents = agents.filter(a => a.commands.some((c: any) => c.is_free));

    // Enrich with live details (commands, pricing)
    const enriched = await enrichAgentsWithDetails(s, agents);
    return { count: enriched.length, agents: enriched };
  },

  "info": async (s, { agentId }) => {
    // Try live WebSocket lookup first
    const details = await getAgentDetailsLive(s, agentId);
    if (details) {
      return { ...normalizeAgent(details), _source: "live" };
    }

    // Fallback to cached list with fuzzy matching
    const rawAgents = await fetchAgentsViaSDK(s);
    const all = rawAgents.map(normalizeAgent);
    const term = agentId.toLowerCase();
    const agent = all.find(a => a.agent_id === agentId)
      || all.find(a => a.agent_id.toLowerCase() === term)
      || all.find(a => a.agent_id.toLowerCase().includes(term) || a.agent_name.toLowerCase().includes(term) || a.description.toLowerCase().includes(term));
    if (!agent) {
      const similar = all.filter(a => a.agent_id.toLowerCase().includes(term) || a.agent_name.toLowerCase().includes(term) || a.description.toLowerCase().includes(term)).slice(0, 5);
      return { error: "not_found", agent_id: agentId, suggestions: similar.map(a => a.agent_id) };
    }

    // Enrich the matched agent with live details (commands, pricing)
    const [enriched] = await enrichAgentsWithDetails(s, [agent]);
    return enriched;
  },

  // Health
  "health": async (s) => (s as any).getHealth(),

  // Room management
  "rooms": async (s) => {
    const rooms = await liveRooms(s);
    return { count: rooms.length, rooms: rooms.map((r: any) => ({ id: r.id, name: r.name, is_public: r.is_public, is_owner: r.is_owner, description: r.description })) };
  },

  "room-agents": async (s, { roomId }) => {
    const agents = await s.listRoomAgents(roomId);
    return { roomId, count: agents.length, agents: agents.map((a: any) => ({ id: a.agent_id, name: a.agent_name, status: a.status })) };
  },

  "create-room": async (s, { name, description, isPublic }) => {
    const r = await s.createRoom({ name, description, isPublic });
    await refreshRooms(s); // refresh cache after mutation
    return { status: "created", room: { id: r.id, name: r.name, is_public: (r as any).is_public } };
  },

  "update-room": async (s, { roomId, name, description }) => {
    const updates: Record<string, string> = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    const result = await (s as any).updateRoom(roomId, updates);
    await refreshRooms(s); // refresh cache after mutation
    return { status: "updated", room: result };
  },

  "delete-room": async (s, { roomId }) => {
    await (s as any).deleteRoom(roomId);
    await refreshRooms(s); // refresh cache after mutation
    return { status: "deleted", roomId };
  },

  "add-agent": async (s, { roomId, agentId }) => {
    await s.addAgentToRoom(roomId, agentId);
    return { status: "added", roomId, agentId };
  },

  "remove-agent": async (s, { roomId, agentId }) => {
    await s.removeAgentFromRoom(roomId, agentId);
    return { status: "removed", roomId, agentId };
  },

  "owned-rooms": async (s) => {
    const rooms = (await liveRooms(s)).filter((r: any) => r.is_owner);
    return { count: rooms.length, rooms: rooms.map((r: any) => ({ id: r.id, name: r.name, is_public: r.is_public })) };
  },

  "shared-rooms": async (s) => {
    const rooms = (await liveRooms(s)).filter((r: any) => !r.is_owner);
    return { count: rooms.length, rooms: rooms.map((r: any) => ({ id: r.id, name: r.name, is_public: r.is_public })) };
  },

  "subscribe": async (s, { roomId }) => {
    await (s as any).subscribeToPublicRoom(roomId);
    return { status: "subscribed", roomId };
  },

  "unsubscribe": async (s, { roomId }) => {
    await (s as any).unsubscribeFromPublicRoom(roomId);
    return { status: "unsubscribed", roomId };
  },

  // Agent commands (with autosummon — uses sendMessage like the orchestrator)
  // Supports multi-step TX flows: agent sends approval TX, we sign it, agent sends swap TX, we sign it, agent sends final result.
  "command": async (s, { agent, cmd, room, chain, timeout }) => {
    // Autosummon: check if agent is in room, try existing rooms first, create new as last resort
    try {
      const roomAgents = await s.listRoomAgents(room);
      const agentInRoom = roomAgents.some((a: any) => a.agent_id === agent);
      if (!agentInRoom) {
        // Agent not in requested room — add it, swap if full
        if (roomAgents.length >= 5) {
          const toRemove = roomAgents.find((a: any) => a.agent_id !== agent) || roomAgents[0];
          log(`Autosummon: room full, removing "${toRemove.agent_id || toRemove.id}" to make space`);
          await s.removeAgentFromRoom(room, toRemove.agent_id || toRemove.id);
          await sleep(1000);
        }
        log(`Autosummon: agent "${agent}" not in room, adding...`);
        await s.addAgentToRoom(room, agent);
        await sleep(1000);
        log(`Autosummon: agent "${agent}" added to room "${room}"`);
      }
    } catch (checkErr: any) {
      log(`Autosummon check failed (non-fatal): ${checkErr.message}`);
    }

    const effectiveTimeout = timeout || 120000;
    const commandText = `@${agent} ${cmd}`;
    const explicitChain = chain || null; // null = auto-select via preflight balance check
    const attemptedNetworks: string[] = [];

    // Preflight: if no explicit chain, check balances upfront and pick the best funded network
    let preflightChain: string | null = null;
    if (!explicitChain) {
      try {
        const key = requireKey();
        const acct = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`);
        const funded = await findFundedNetworks(acct.address);
        if (funded.length > 0) {
          preflightChain = funded[0].chain;
          log(`Preflight: best funded network is ${preflightChain} (${formatMicroUsdc(funded[0].balance)} USDC)`);
        }
      } catch (err: any) {
        log(`Preflight balance check failed (non-fatal): ${err.message}`);
      }
    }

    // Helper: build message options for a given network
    const buildMessageOptions = (networkOverride?: string) => {
      const resolvedChainName = networkOverride
        ? normalizePaymentChainName(networkOverride)
        : explicitChain
          ? normalizePaymentChainName(explicitChain)
          : preflightChain
            ? normalizePaymentChainName(preflightChain)
            : undefined;
      const resolvedNetwork = resolvedChainName
        ? (CHAIN_TO_CAIP2[resolvedChainName] || resolvedChainName)
        : undefined;
      if (resolvedChainName && !attemptedNetworks.includes(resolvedChainName)) attemptedNetworks.push(resolvedChainName);
      return {
        room,
        waitForResponse: true,
        timeout: effectiveTimeout,
        format: "both",
        ...(resolvedNetwork ? { network: resolvedNetwork } : {}),
      } as any;
    };

    const messageOptions = buildMessageOptions();

    try {
      return await runMultiStepTxFlow(s, {
        agent,
        commandLabel: cmd,
        effectiveTimeout,
        start: () => s.sendMessage(commandText, { ...messageOptions, waitForResponse: false }) as Promise<void>,
      });
    } catch (cmdError: any) {
      // Payment handling: retry another funded network when possible, otherwise surface funding guidance
      const is402 = cmdError.message?.includes("402") || cmdError.message?.includes("Payment verification failed") || cmdError.message?.includes("insufficient");
      if (is402) {
        const key = requireKey();
        const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`);
        if (!explicitChain) {
          const funded = await findFundedNetworks(account.address, attemptedNetworks);

          if (funded.length > 0) {
            const nextChain = funded[0].chain;
            log(`Payment failed, retrying on ${nextChain} (balance: ${formatMicroUsdc(funded[0].balance)} USDC)`);
            const retryOptions = buildMessageOptions(nextChain);

            const retryResponse = await runMultiStepTxFlow(s, {
              agent,
              commandLabel: cmd,
              effectiveTimeout,
              start: () => s.sendMessage(commandText, { ...retryOptions, waitForResponse: false }) as Promise<void>,
            });

            if (retryResponse && typeof retryResponse === "object") {
              return {
                ...retryResponse,
                _payment_retry: { original_error: cmdError.message, retried_on: nextChain },
              };
            }

            return retryResponse;
          }
        }

        throw new Error(buildPaymentFundingError(account.address, cmdError.message, explicitChain ? normalizePaymentChainName(explicitChain) : undefined));
      }
      throw cmdError;
    }
  },

  // Internal — not exposed as CLI commands, but available via daemon HTTP API
  "quote": async (s, { message, room, chain }) => {
    const explicitChain = chain || null;
    let preflightChain: string | null = null;

    // Preflight: if no explicit chain, pick the best funded network from wallet USDC balances
    if (!explicitChain) {
      const key = requireKey();
      const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`);
      const funded = await findFundedNetworks(account.address);
      if (funded.length === 0) {
        throw new Error(buildPaymentFundingError(account.address, "No funded payment networks found for quote"));
      }
      preflightChain = funded[0].chain;
      log(`Preflight for quote: best funded network is ${preflightChain} (${formatMicroUsdc(funded[0].balance)} USDC)`);
    }

    const resolvedChain = explicitChain
      ? (CHAIN_TO_CAIP2[explicitChain] || explicitChain)
      : preflightChain
        ? (CHAIN_TO_CAIP2[preflightChain] || preflightChain)
        : undefined;

    if (!resolvedChain) {
      throw new Error(`Unable to resolve quote chain. Set --chain to a valid network (${formatSupportedPaymentChainsForFlag()}).`);
    }
    const q = await s.requestQuote(message, room, resolvedChain);
    return { taskId: q.taskId, agentId: q.agentId, agentName: q.agentName, command: q.command, pricing: q.pricing, expiresAt: q.expiresAt };
  },

  // Payment utilities
  "check-balance": async (s, { chain }) => {
    const key = requireKey();
    const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`);
    const address = account.address;

    if (chain) {
      const result = await fetchUsdcBalance(address, chain);
      return {
        address,
        chain,
        usdc: result.balance !== null ? formatMicroUsdc(result.balance) : null,
        usdc_micro: result.balance?.toString() || null,
        error: result.error,
      };
    }

    // Check all chains
    const funded = await findFundedNetworks(address);
    const allResults = await Promise.all(
      PAYMENT_NETWORK_PRIORITY.map(c => fetchUsdcBalance(address, c))
    );
    return {
      address,
      balances: Object.fromEntries(allResults.map(r => [r.chain, {
        usdc: r.balance !== null ? formatMicroUsdc(r.balance) : null,
        usdc_micro: r.balance?.toString() || null,
        error: r.error,
      }])),
      funded_networks: funded.map(f => f.chain),
      recommended_network: funded.length > 0 ? funded[0].chain : null,
    };
  },

  "room-available-agents": async (s, { roomId }) => {
    const agents = await (s as any).listAvailableAgents(roomId);
    return { roomId, count: agents.length, agents: agents.map((a: any) => ({ id: a.agent_id || a.id, name: a.agent_name || a.name, status: a.is_online ? "online" : "offline" })) };
  },

  // Agent deployment — filter agents by creator wallet
  "my-agents": async (s, { walletAddress }) => {
    const rawAgents = await fetchAgentsViaSDK(s);
    const all = rawAgents.map(normalizeAgent);
    const enriched = await enrichAgentsWithDetails(s, all);
    // Filter by creator wallet if available in agent metadata
    const owned = walletAddress
      ? enriched.filter((a: any) => a.creator_wallet?.toLowerCase() === walletAddress.toLowerCase() || a.owner?.toLowerCase() === walletAddress.toLowerCase())
      : enriched;
    return { count: owned.length, agents: owned, wallet: walletAddress };
  },

  "my-agent-status": async (s, { agentId, walletAddress }) => {
    const details = await getAgentDetailsLive(s, agentId);
    if (details) {
      const normalized = normalizeAgent(details);
      const [enriched] = await enrichAgentsWithDetails(s, [normalized]);
      return { ...enriched, visibility: (details as any).visibility || (details as any).status || "unknown" };
    }
    // Fallback to list search
    const rawAgents = await fetchAgentsViaSDK(s);
    const all = rawAgents.map(normalizeAgent);
    const agent = all.find(a => a.agent_id === agentId);
    if (!agent) return { error: `Agent "${agentId}" not found on network.` };
    const [enriched] = await enrichAgentsWithDetails(s, [agent]);
    return { ...enriched, visibility: (agent as any).visibility || "unknown" };
  },

};

// ─── HTTP Server ─────────────────────────────────────────────────────────────

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: string) => { body += chunk; });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  lastActivity = Date.now();
  res.setHeader("Content-Type", "application/json");

  try {
    if (req.method === "GET" && req.url === "/health") {
      // Wait for startup connection if still in flight (up to 15s)
      if (connectingPromise) {
        await Promise.race([connectingPromise, sleep(15000)]);
      }
      let sdkHealth = null;
      try { sdkHealth = sdk ? (sdk as any).getHealth() : null; } catch {}
      const authenticated = sdkHealth?.connection?.authenticated || false;
      const connected = sdkHealth ? sdkHealth.status !== "disconnected" : false;
      const status = authenticated
        ? "ready"
        : connectingPromise
          ? "starting"
          : lastConnectionError
            ? "degraded"
            : connected
              ? "connected"
              : "starting";
      res.end(JSON.stringify({
        status,
        connected,
        authenticated,
        idle_timeout_ms: IDLE_TIMEOUT_MS,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        pid: process.pid,
        sdk_health: sdkHealth,
        last_connection_error: lastConnectionError,
        last_connection_error_name: lastConnectionErrorName,
      }));
      return;
    }

    if (req.method === "POST" && req.url === "/stop") {
      res.end(JSON.stringify({ status: "stopped" }));
      cleanup();
      setTimeout(() => process.exit(0), 100);
      return;
    }

    if (req.method === "POST" && req.url === "/exec") {
      const body = JSON.parse(await readBody(req));
      const { command, args } = body;
      const handler = handlers[command];
      if (!handler) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: `Unknown command: ${command}` }));
        return;
      }

      try {
        let s = await ensureConnected();
        let result: any;
        try {
          result = await handler(s, args || {});
        } catch (handlerErr: any) {
          const msg = handlerErr?.message || "";
          const code = handlerErr?.code;
          if (msg.includes("Not connected to Teneo network") || code === "NOT_CONNECTED") {
            log(`Connection lost during "${command}", reconnecting...`);
            sdk = null;
            s = await ensureConnected();
            result = await handler(s, args || {});
          } else {
            throw handlerErr;
          }
        }
        res.end(JSON.stringify({ result }));
      } catch (cmdErr: any) {
        log(`Command "${command}" failed: ${cmdErr.message}`);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: cmdErr.message || String(cmdErr) }));
      }
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (err: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message || String(err) }));
  }
});

// ─── Lifecycle ───────────────────────────────────────────────────────────────

function cleanup() {
  try { nodeFs.unlinkSync(PID_FILE); } catch {}
  try { nodeFs.unlinkSync(PORT_FILE); } catch {}
  if (sdk) try { sdk.disconnect(); } catch {}
}

// Idle timeout: shut down after the configured period of no activity
setInterval(() => {
  if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
    log("Idle timeout reached, shutting down");
    cleanup();
    process.exit(0);
  }
}, 60_000);

// Prevent unhandled errors from crashing the daemon
process.on("uncaughtException", (err) => { log(`Uncaught exception: ${err.message}`); });
process.on("unhandledRejection", (err: any) => { log(`Unhandled rejection: ${err?.message || err}`); });

// Clean shutdown on signals
process.on("SIGTERM", () => { cleanup(); process.exit(0); });
process.on("SIGINT", () => { cleanup(); process.exit(0); });

// Start server — SDK connects lazily on first /exec request
server.listen(DAEMON_PORT, "127.0.0.1", () => {
  ensureWalletDir();
  nodeFs.writeFileSync(PID_FILE, String(process.pid), { mode: 0o600 });
  nodeFs.writeFileSync(PORT_FILE, String(DAEMON_PORT), { mode: 0o600 });
  log(`Daemon HTTP server on port ${DAEMON_PORT} (pid ${process.pid})`);

  // Pre-warm SDK in background — don't block server startup
  connectingPromise = ensureConnected()
    .then(() => { connectingPromise = null; log("SDK connected and ready"); })
    .catch((err: any) => { connectingPromise = null; log(`SDK pre-warm failed: ${err.message} (will retry on first request)`); });
});

server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    log(`Port ${DAEMON_PORT} in use. Is another daemon running?`);
    process.exit(1);
  }
  throw err;
});
