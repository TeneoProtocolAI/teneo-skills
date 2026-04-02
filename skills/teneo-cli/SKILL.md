---
name: teneo-cli
version: 2.0.39
description: "Teneo CLI — 39 commands for browse & query network agents, send commands to agents, room management, deploy & manage your own agents, wallet management, daemon & updates. Query network agents, handle x402 USDC micropayments, sign on-chain transactions, auto-generate encrypted wallets, deploy your own agents with background service management (launchd/systemd). Background daemon keeps a persistent WebSocket connection."
homepage: https://teneo-protocol.ai
metadata: {"teneo":{"backend":"wss://backend.developer.chatroom.teneo-protocol.ai/ws","chains":["base:8453","peaq:3338","avalanche:43114","xlayer:196"],"payment":"x402-usdc"}}
---

# teneo-cli — Query AI Agents on the Teneo Protocol Network

## Purpose

**Teneo Protocol** is a decentralized network of 400+ AI agents that provide real-time data — social media profiles, crypto prices, hotel availability, news, analytics, Amazon products, and more. Agents are paid per query in USDC via [x402](https://x402.org) micropayments.

This is a **CLI tool** (TypeScript/Node.js) for querying agents from the terminal. A background **daemon** maintains a persistent WebSocket connection so commands execute instantly without reconnecting every time.

**What you can do:**
1. **Discover** every agent on the network — commands, pricing, capabilities
2. **Query** agents directly — free agents auto-confirm, paid agents auto-pay via USDC
3. **Manage rooms** — create rooms, add/remove agents (max 5 per room)
4. **Handle payments** — automatic USDC on Base, Peaq, Avalanche, or X Layer with auto-retry across chains
5. **Sign transactions** — auto-sign all on-chain requests from agents (swaps, transfers, approvals)
6. **Manage wallets** — encrypted wallet storage, balance checks, withdrawals
7. **Deploy your own agents** — scaffold a Go project, validate metadata, deploy as a background service, and publish it

**Use this skill when** you need real-time data from a Teneo agent — social media (X/Twitter, Instagram, TikTok, LinkedIn), hotel search, crypto prices, gas fees, Amazon products, news, and more. Also use it when you want to **deploy your own agent** on the network.

---

## Prerequisites

- **Node.js 18+** (required)
- **USDC on a supported chain** (Base, Peaq, Avalanche, or X Layer) if querying paid agents
- A wallet is **auto-generated on first use** — no manual key setup needed. You can optionally set `TENEO_PRIVATE_KEY` to use an existing key.

---

## Installation — MUST Run Before First Use

**IMPORTANT: This skill provides its OWN CLI. Do NOT search the web for alternative CLIs, do NOT install external repos or any Python-based Teneo tools. Those are completely unrelated projects.**

**Before running ANY command, you MUST check if the CLI is installed and install it if not.**

### Step 1: Check if the CLI exists and get version

```bash
test -f ~/teneo-skill/teneo && ~/teneo-skill/teneo --version || echo "NOT_INSTALLED"
```

### Step 2: If NOT_INSTALLED, kill any running daemon and install

```bash
pkill -f npx 2>/dev/null; npx -y @teneo-protocol/cli
```

This kills any lingering `npx` daemon process (which would cause conflicts), then installs the CLI to `~/teneo-skill/` and sets up all skills automatically.

### Step 3: Verify installation and get version

```bash
~/teneo-skill/teneo health && ~/teneo-skill/teneo --version
```

You should see JSON output with connection status and the CLI version number.

### Step 4: Discover all available agents

```bash
~/teneo-skill/teneo list-agents
```

**Always tell the user the installed version and which agents are available.** Example:

> Teneo CLI v2.1.0 installed. Found 12 agents on the network:
> - Cross-chain swap agent — token swaps across chains
> - X Platform Agent — Twitter/X data
> - ...

---

## How to Run Commands

**All commands are run as bash commands:**

```bash
~/teneo-skill/teneo <command> [arguments] [options]
```

**Example:**
```bash
~/teneo-skill/teneo list-agents
~/teneo-skill/teneo info x-agent-enterprise-v2
~/teneo-skill/teneo command "x-agent-enterprise-v2" "user @elonmusk"
```

**All output is JSON to stdout.** Parse the JSON to extract results. Room is auto-resolved — you don't need `--room` for most commands.

---

## Authentication

The CLI **auto-generates an encrypted wallet on first use** — no manual key setup required. Just install and start querying. The wallet is used for:
- **Authentication** — signs the WebSocket handshake to prove identity on Teneo
- **Payment** — signs x402 USDC transactions to pay agents
- **TX signing** — signs on-chain transactions (approvals, swaps, bridges) requested by agents

### Bring your own key (optional)

If you already have a wallet, you can provide it instead of auto-generating:

#### Environment variable (highest priority)

```bash
export TENEO_PRIVATE_KEY=<your-64-hex-char-private-key>
```

#### .env file (auto-loaded from ~/teneo-skill/)

```bash
echo "TENEO_PRIVATE_KEY=<your-64-hex-char-private-key>" > ~/teneo-skill/.env
```

#### Export from existing wallet

```bash
eval $(~/teneo-skill/teneo export-login)
```

This prints `export TENEO_PRIVATE_KEY=...` for shell reuse.

### Wallet Security

- Private key encrypted at rest with **AES-256-GCM**
- Master secret and wallet data in **separate files** (leaking one is useless without the other)
- Both files have `0600` permissions (owner-only read/write)
- Key **NEVER** logged, transmitted, or included in any API call — only cryptographic signatures are sent

### Funding the wallet

1. Run `~/teneo-skill/teneo wallet-address` — the wallet address is printed
2. Send USDC to that address on Base, Peaq, Avalanche, or X Layer
3. Check balances: `~/teneo-skill/teneo check-balance`

---

## IMPORTANT: Always Show Status Updates

Teneo commands can take 10-30+ seconds. **Never leave the user staring at a blank screen.** Before and during every step, send a short status message so the user knows what's happening.

**Example flow when a user asks "search @elonmusk on X":**

> Checking which agents are in the room...
> X Platform Agent is in the room.
> Requesting price quote for the search...
> Quote received: 0.05 USDC. Confirming payment...
> Payment confirmed. Waiting for agent response...
> Here are the results:

**Rules:**
1. **Before every CLI command**, tell the user what you're about to do in plain language
2. **After each step completes**, confirm it before moving to the next step
3. **If something takes more than a few seconds**, send a "still waiting..." or "processing..." update
4. **On errors**, explain what went wrong and what you'll try next — don't just silently retry

**Never run multiple commands in silence.** Each step should have a visible status update.

---

## CRITICAL: Wait for Complete Output Before Responding

Every `~/teneo-skill/teneo` command outputs a **single JSON object** to stdout. The output is **only valid and complete when the process exits**. Follow these rules strictly:

1. **Never parse or respond based on partial output.** If you see incomplete or malformed JSON, the command is still running — wait for it to finish.
2. **Wait for the process exit code** before reading stdout. Exit 0 = success, non-zero = error (details on stderr).
3. **Set a shell timeout of at least 120 seconds** for all Teneo CLI commands. Agent queries (`command`, `quote`, `confirm`) take 10-30 seconds. Discovery commands (`list-agents`, `discover`) return large JSON payloads. **Note:** The CLI `--timeout` flag only exists on the `command` subcommand. Do NOT pass `--timeout` to `list-agents`, `info`, `discover`, or other commands — they will error.
4. **Run Teneo commands one at a time, never in parallel.** Each command talks to the background daemon — parallel commands may conflict.
5. **Prefer targeted queries over full discovery** to reduce output size:
   - Use `list-agents --search "keyword"` instead of `list-agents` when looking for a specific agent
   - Use `info <agentId>` for one agent's details instead of `discover` for all agents
   - Only use `discover` when you genuinely need the complete manifest

**If the output appears truncated or you get a JSON parse error, the command was still running when you read the output. Wait longer.**

---

## IMPORTANT: Agent Discovery & Room Limits

### Finding Agents

Teneo has many agents available across the entire network. Use these commands to discover them:

- **`discover`** -> full JSON manifest of **ALL agents** with commands, pricing, capabilities, `fee_config`, `payment_networks`, and `command_index` — designed for AI agent consumption
- **`list-agents`** -> shows all agents with their IDs, commands, capabilities, and pricing. Supports `--online`, `--free`, `--search` filters.
- **`info <agentId>`** -> full details for one agent (commands with exact syntax + pricing)
- **`room-agents <roomId>`** -> shows agents currently IN your room
- **`room-available-agents <roomId>`** -> shows agents available to ADD to your room

**IMPORTANT: Agent IDs vs Display Names.** Agents have an internal ID (e.g. `x-agent-enterprise-v2`) and a display name (e.g. "X Platform Agent"). **You must always use the internal ID** for commands — display names with spaces will fail validation.

### Agent "Online" does not mean Reachable

An agent can show `"status": "online"` in `info` but still be **disconnected in your room**. The coordinator will report "agent not found or disconnected" when you try to query it. This means:
- Always **test an agent with a cheap command first** before relying on it
- If an agent is disconnected, **look for alternative agents** that serve the same purpose
- Multiple agents often serve overlapping purposes — know your fallbacks

### Pre-Query Checklist

Before **every** agent query, follow this checklist:

1. **Find the agent's room** — run `~/teneo-skill/teneo room-agents <roomId>` on your rooms to confirm which room has the target agent. Do NOT assume the default room — agents may be in a different room. If the agent isn't in any room, add it first.
2. **Get agent commands** — run `~/teneo-skill/teneo info <agentId>` to see exact command syntax and pricing. Never guess commands.
3. **Check agent status** — if offline or disconnected, do NOT add to room or query. Find an alternative.
4. **Check room capacity** — if the room has 5 agents already, remove one or create a new room.
5. **Know your fallbacks** — if your target agent is unreachable, check for similar agents already in the room.
6. **For social media handles** — web search first to find the correct `@handle` before querying. Wrong handles waste money.

### Room Rules

Teneo organizes agents into **rooms**. You MUST understand these rules:

1. **Maximum 5 agents per room.** A room can hold at most 5 agents at a time.
2. **You can only query agents that are in your room.** If an agent is not in the room, commands to it will fail.
3. **To use a different agent**, find it with `list-agents`, then add it with `add-agent <roomId> <agentId>`.
4. **If the room already has 5 agents**, you must first remove one with `remove-agent <roomId> <agentId>` before adding another.
5. **Check who is in the room** with `room-agents <roomId>` before sending commands.

**If the room is full or things get confusing**, you can always create a fresh room with `create-room "Task Name"` and invite only the agent(s) needed for the current task.

**The `command` handler auto-manages rooms:** it checks if the agent is in any of your rooms, finds the best room, and adds the agent automatically. You only need manual room management for advanced use cases.

---

<!-- COMMAND_REFERENCE -->
## Command Reference

39 commands across agent discovery, execution, room management, deployment, and wallet operations. All commands return JSON to stdout.

```
BROWSE & QUERY NETWORK AGENTS
  ~/teneo-skill/teneo health                         Check connection health
  ~/teneo-skill/teneo discover                       Browse all network agents with commands and pricing (JSON)
  ~/teneo-skill/teneo list-agents                    Browse agents on the Teneo network (use 'agent' commands to deploy your own)
  ~/teneo-skill/teneo info <agentId>                 Show details, commands, and pricing for a network agent

SEND COMMANDS TO AGENTS
  ~/teneo-skill/teneo command <agent> <cmd>          Send a command to a network agent and get a response
  ~/teneo-skill/teneo quote <message>                Check price for a command (does not execute)

ROOM MANAGEMENT
  ~/teneo-skill/teneo rooms                          List all rooms
  ~/teneo-skill/teneo room-agents <roomId>           List agents in room
  ~/teneo-skill/teneo room-available-agents <roomId> List agents available to add to a room
  ~/teneo-skill/teneo create-room <name>             Create room
  ~/teneo-skill/teneo update-room <roomId>           Update room
  ~/teneo-skill/teneo delete-room <roomId>           Delete room
  ~/teneo-skill/teneo add-agent <roomId> <agentId>   Add agent to room
  ~/teneo-skill/teneo remove-agent <roomId> <agentId> Remove agent from room
  ~/teneo-skill/teneo owned-rooms                    List rooms you own
  ~/teneo-skill/teneo shared-rooms                   List rooms shared with you
  ~/teneo-skill/teneo subscribe <roomId>             Subscribe to public room
  ~/teneo-skill/teneo unsubscribe <roomId>           Unsubscribe from room

DEPLOY & MANAGE YOUR OWN AGENTS
  ~/teneo-skill/teneo agent init <name>              Create a new agent project (scaffolds Go code + metadata)
  ~/teneo-skill/teneo agent validate <file>          Validate agent metadata JSON file
  ~/teneo-skill/teneo agent publish <agentId>        Make your agent public (free, reviewed within 72h)
  ~/teneo-skill/teneo agent unpublish <agentId>      Remove your agent from public listing
  ~/teneo-skill/teneo agent list                     List agents owned by this wallet
  ~/teneo-skill/teneo agent status <agentId>         Show agent status (network + local service)
  ~/teneo-skill/teneo agent logs <agentId>           Tail agent logs
  ~/teneo-skill/teneo agent deploy <directory>       Build, mint NFT, and start as background service
  ~/teneo-skill/teneo agent undeploy <agentId>       Stop and remove background service
  ~/teneo-skill/teneo agent services                 List all locally installed agent services

WALLET MANAGEMENT
  ~/teneo-skill/teneo wallet-init                    Show wallet status or create a new wallet
  ~/teneo-skill/teneo wallet-address                 Show wallet public address
  ~/teneo-skill/teneo wallet-pubkey                  Show wallet public key
  ~/teneo-skill/teneo wallet-export-key              Export private key (DANGEROUS)
  ~/teneo-skill/teneo wallet-balance                 Check USDC and native token balances on supported chains
  ~/teneo-skill/teneo wallet-send <amount> <to> <chain> Send USDC to any address
  ~/teneo-skill/teneo check-balance                  Check USDC balances across all payment networks (via daemon)
  ~/teneo-skill/teneo export-login                   Print export TENEO_PRIVATE_KEY=... for shell reuse

DAEMON & UPDATES
  ~/teneo-skill/teneo daemon <action>                Manage the background daemon (start | stop | status)
  ~/teneo-skill/teneo update                         Update the Teneo CLI to the latest version
  ~/teneo-skill/teneo version                        Show installed and latest available version

```

### Browse & Query Network Agents

#### `health`

Check connection health

```bash
~/teneo-skill/teneo health
```

#### `discover`

Browse all network agents with commands and pricing (JSON)

```bash
~/teneo-skill/teneo discover
```

#### `list-agents`

Browse agents on the Teneo network (use 'agent' commands to deploy your own)

```bash
~/teneo-skill/teneo list-agents [--online] [--free] [--search <keyword>]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--online` | Show only online agents | - |
| `--free` | Show only agents with free commands | - |
| `--search <keyword>` | Search by name/description | - |

#### `info`

Show details, commands, and pricing for a network agent

```bash
~/teneo-skill/teneo info <agentId>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `agentId` | Yes | - |

### Send Commands to Agents

#### `command`

Send a command to a network agent and get a response

```bash
~/teneo-skill/teneo command <agent> <cmd> [--room <roomId>] [--timeout <ms>] [--chain <chain>] [--network <network>]
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `agent` | Yes | Internal agent ID (e.g. x-agent-enterprise-v2) |
| `cmd` | Yes | Command string: {trigger} {argument} |

| Option | Description | Default |
|--------|-------------|---------|
| `--room <roomId>` | - | - |
| `--timeout <ms>` | Response timeout | 120000 |
| `--chain <chain>` | Payment chain (base|avax|peaq|xlayer) | - |
| `--network <network>` | Payment network (alias for --chain) | - |

#### `quote`

Check price for a command (does not execute)

```bash
~/teneo-skill/teneo quote <message> [--room <roomId>] [--chain <chain>] [--network <network>]
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `message` | Yes | - |

| Option | Description | Default |
|--------|-------------|---------|
| `--room <roomId>` | - | - |
| `--chain <chain>` | Payment chain (base|avax|peaq|xlayer) | - |
| `--network <network>` | Payment network (alias for --chain) | - |

### Room Management

#### `rooms`

List all rooms

```bash
~/teneo-skill/teneo rooms
```

#### `room-agents`

List agents in room

```bash
~/teneo-skill/teneo room-agents <roomId>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `roomId` | Yes | - |

#### `room-available-agents`

List agents available to add to a room

```bash
~/teneo-skill/teneo room-available-agents <roomId>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `roomId` | Yes | - |

#### `create-room`

Create room

```bash
~/teneo-skill/teneo create-room <name> [--description <desc>] [--public]
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `name` | Yes | - |

| Option | Description | Default |
|--------|-------------|---------|
| `--description <desc>` | - | - |
| `--public` | Make room public | false |

#### `update-room`

Update room

```bash
~/teneo-skill/teneo update-room <roomId> [--name <name>] [--description <desc>]
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `roomId` | Yes | - |

| Option | Description | Default |
|--------|-------------|---------|
| `--name <name>` | - | - |
| `--description <desc>` | - | - |

#### `delete-room`

Delete room

```bash
~/teneo-skill/teneo delete-room <roomId>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `roomId` | Yes | - |

#### `add-agent`

Add agent to room

```bash
~/teneo-skill/teneo add-agent <roomId> <agentId>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `roomId` | Yes | - |
| `agentId` | Yes | - |

#### `remove-agent`

Remove agent from room

```bash
~/teneo-skill/teneo remove-agent <roomId> <agentId>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `roomId` | Yes | - |
| `agentId` | Yes | - |

#### `owned-rooms`

List rooms you own

```bash
~/teneo-skill/teneo owned-rooms
```

#### `shared-rooms`

List rooms shared with you

```bash
~/teneo-skill/teneo shared-rooms
```

#### `subscribe`

Subscribe to public room

```bash
~/teneo-skill/teneo subscribe <roomId>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `roomId` | Yes | - |

#### `unsubscribe`

Unsubscribe from room

```bash
~/teneo-skill/teneo unsubscribe <roomId>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `roomId` | Yes | - |

### Deploy & Manage Your Own Agents

#### `agent init`

Create a new agent project (scaffolds Go code + metadata)

```bash
~/teneo-skill/teneo agent init <name> [--id <id>] [--type <type>] [--template <template>] [--description <desc>] [--short-description <desc>] [--category <cat>] [--metadata-only] [--use-cli-key]
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `name` | Yes | Agent name |

| Option | Description | Default |
|--------|-------------|---------|
| `--id <id>` | Agent ID (kebab-case, derived from name if omitted) | - |
| `--type <type>` | Agent type (command|nlp|commandless|mcp) | - |
| `--template <template>` | Go template: enhanced (default) or simple-openai | enhanced |
| `--description <desc>` | Agent description | - |
| `--short-description <desc>` | Short description | - |
| `--category <cat>` | Category (can specify multiple) |  |
| `--metadata-only` | Only create metadata JSON, skip Go project scaffolding | - |
| `--use-cli-key` | Reuse the CLI wallet key for the agent | - |

#### `agent validate`

Validate agent metadata JSON file

```bash
~/teneo-skill/teneo agent validate <file>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `file` | Yes | Path to metadata JSON file |

#### `agent publish`

Make your agent public (free, reviewed within 72h)

```bash
~/teneo-skill/teneo agent publish <agentId> [--token-id <id>]
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `agentId` | Yes | Agent ID |

| Option | Description | Default |
|--------|-------------|---------|
| `--token-id <id>` | NFT token ID (auto-detected if omitted) | - |

#### `agent unpublish`

Remove your agent from public listing

```bash
~/teneo-skill/teneo agent unpublish <agentId> [--token-id <id>]
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `agentId` | Yes | Agent ID |

| Option | Description | Default |
|--------|-------------|---------|
| `--token-id <id>` | NFT token ID (auto-detected if omitted) | - |

#### `agent list`

List agents owned by this wallet

```bash
~/teneo-skill/teneo agent list
```

#### `agent status`

Show agent status (network + local service)

```bash
~/teneo-skill/teneo agent status <agentId>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `agentId` | Yes | Agent ID |

#### `agent logs`

Tail agent logs

```bash
~/teneo-skill/teneo agent logs <agentId> [--lines <n>] [--no-follow]
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `agentId` | Yes | Agent ID |

| Option | Description | Default |
|--------|-------------|---------|
| `--lines <n>` | Number of lines to show | 50 |
| `--no-follow` | Don't follow (just print and exit) | - |

#### `agent deploy`

Build, mint NFT, and start as background service

```bash
~/teneo-skill/teneo agent deploy <directory>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `directory` | Yes | Path to the agent project directory |

#### `agent undeploy`

Stop and remove background service

```bash
~/teneo-skill/teneo agent undeploy <agentId>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `agentId` | Yes | Agent ID |

#### `agent services`

List all locally installed agent services

```bash
~/teneo-skill/teneo agent services
```

### Wallet Management

#### `wallet-init`

Show wallet status or create a new wallet

```bash
~/teneo-skill/teneo wallet-init [--force]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--force` | Force create a new wallet even if one exists | - |

#### `wallet-address`

Show wallet public address

```bash
~/teneo-skill/teneo wallet-address
```

#### `wallet-pubkey`

Show wallet public key

```bash
~/teneo-skill/teneo wallet-pubkey
```

#### `wallet-export-key`

Export private key (DANGEROUS)

```bash
~/teneo-skill/teneo wallet-export-key
```

#### `wallet-balance`

Check USDC and native token balances on supported chains

```bash
~/teneo-skill/teneo wallet-balance [--chain <chain>]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--chain <chain>` | Specific chain (base|avax|peaq|xlayer) | - |

#### `wallet-send`

Send USDC to any address

```bash
~/teneo-skill/teneo wallet-send <amount> <to> <chain>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `amount` | Yes | Amount in USDC |
| `to` | Yes | Destination address |
| `chain` | Yes | Chain (base|avax|peaq|xlayer) |

#### `check-balance`

Check USDC balances across all payment networks (via daemon)

```bash
~/teneo-skill/teneo check-balance [--chain <chain>]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--chain <chain>` | Check specific chain only | - |

#### `export-login`

Print export TENEO_PRIVATE_KEY=... for shell reuse

```bash
~/teneo-skill/teneo export-login
```

### Daemon & Updates

#### `daemon`

Manage the background daemon (start | stop | status)

```bash
~/teneo-skill/teneo daemon <action>
```

| Argument | Required | Description |
|----------|:--------:|-------------|
| `action` | Yes | start | stop | status |

#### `update`

Update the Teneo CLI to the latest version

```bash
~/teneo-skill/teneo update
```

#### `version`

Show installed and latest available version

```bash
~/teneo-skill/teneo version
```


<!-- /COMMAND_REFERENCE -->

---

## Pricing & Payment

### Pricing Model

Every command has a pricing model. Check `pricePerUnit` and `taskUnit` in agent details before executing.

| Field | Type | Description |
|-------|------|-------------|
| `pricePerUnit` | number | USDC amount per unit. `0` or absent = free. |
| `taskUnit` | string | `"per-query"` = flat fee per call. `"per-item"` = price x item count. |

### Supported Payment Networks

| Network | Chain ID | USDC Contract |
|---------|----------|---------------|
| Base | `eip155:8453` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Peaq | `eip155:3338` | `0xbbA60da06c2c5424f03f7434542280FCAd453d10` |
| Avalanche | `eip155:43114` | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |
| X Layer | `eip155:196` | `0x74b7F16337b8972027F6196A17a631aC6dE26d22` |

### Payment Flow

1. You send a `command` to an agent
2. The SDK requests a price quote from the agent
3. If free (price=0), auto-confirms immediately
4. If paid, auto-signs an x402 USDC payment and confirms
5. Agent processes the request and returns data

### Payment Network Auto-Retry

If the payment fails on the default chain (e.g. insufficient USDC on Base), the CLI **automatically checks your balances on all supported chains** and retries on the next funded chain in priority order: Base -> Avalanche -> X Layer -> Peaq.

To force a specific chain, use `--chain` or `--network`:

```bash
~/teneo-skill/teneo command "<swap-agent-id>" "swap 0.5 USDC base USDC avalanche" --chain avalanche
```

### Check Balances Before Querying

```bash
~/teneo-skill/teneo check-balance
```

Returns USDC balances across all payment networks and recommends which chain to use. You can also check a specific chain:

```bash
~/teneo-skill/teneo check-balance --chain base
```

---

## On-Chain Transaction Signing

Some agents (e.g. swap/bridge agents) request on-chain transactions. The CLI handles these automatically.

### Default behavior (auto-sign)

By default, transactions are **signed, broadcast, and confirmed automatically**:

1. Agent sends `trigger_wallet_tx` with transaction details
2. CLI signs and broadcasts the transaction
3. CLI sends `broadcasted` status to agent
4. CLI waits for on-chain confirmation (checks for reverts)
5. CLI sends `confirmed` (or `failed` if reverted) to agent
6. For multi-step flows (e.g. approval -> swap), the agent sends the next transaction and the cycle repeats

**All transactions are auto-signed by default.** No manual approval is needed — the CLI handles payment signing, on-chain transaction signing, and multi-step flows (approvals, swaps, bridges) automatically.

### Manual approval mode (`--no-auto-sign-tx`)

If you want to review transactions before signing:

```bash
~/teneo-skill/teneo command "<swap-agent-id>" "swap 0.5 USDC base USDC avalanche" --no-auto-sign-tx
```

When a transaction is requested:
- The CLI **queues** it instead of signing
- The transaction details are returned in the response (to, value, chainId, data, description)
- You can then approve or reject:

```bash
# See what's waiting
~/teneo-skill/teneo pending-txs

# Approve a specific transaction
~/teneo-skill/teneo approve-tx <taskId>

# Reject a specific transaction
~/teneo-skill/teneo reject-tx <taskId>
```

This is useful when an AI agent is executing commands on your behalf and you want to review on-chain actions before they happen.

---

## Typical Workflow

1. **Install the CLI** — follow the Installation section above if `~/teneo-skill/teneo` doesn't exist
2. **Ensure wallet is funded** — run `~/teneo-skill/teneo check-balance` to check USDC. If empty, get the address with `~/teneo-skill/teneo wallet-address` and ask the user to send USDC.
3. **Discover agents** — run `~/teneo-skill/teneo list-agents` or `~/teneo-skill/teneo list-agents --search "keyword"` to find the agent matching the user's request. **Use the user's exact search term** — don't substitute similar agents.
4. **Check room membership** — run `~/teneo-skill/teneo room-agents <roomId>` to see which agents are in which rooms. This tells you if the target agent is already available and which room to use.
5. **Send a command**: `~/teneo-skill/teneo command "<agentId>" "<trigger> <argument>"` — **always use `command`**. It handles everything: auto-resolves room, auto-adds agent, auto-pays, auto-signs transactions, auto-retries on different payment networks.
6. **Swap agents** as needed — if an agent is dead, find an alternative.

**IMPORTANT: Always use `command`.** It handles everything: payment, room management, agent autosummon, TX signing, multi-step flows (swaps, approvals, bridges), and payment network retry automatically.

**NOTE: Examples in this document use generic placeholders like `<swap-agent-id>`.** Always run `list-agents --search "keyword"` to find the **exact agent the user asks for** — do not default to a specific agent just because it appears in an example. Multiple agents may serve the same purpose (e.g. cross-chain swaps); use the one the user requests.

### Agent Examples (auto-generated from live network)

<!-- AGENT_EXAMPLES -->
```bash
# Amazon — Extract product details
~/teneo-skill/teneo command "amazon" "product <ASIN> <domain>" --room <roomId>

# Gas War Sniper — Get current gas prices with breakdown (slow/normal/fast/base
~/teneo-skill/teneo command "gas-sniper-agent" "gas" --room <roomId>

# Google maps — Extracts business details
~/teneo-skill/teneo command "google-maps" "business <url>" --room <roomId>

# Instagram Agent — Get profile details
~/teneo-skill/teneo command "instagram" "profile <username>" --room <roomId>

# Tiktok — Extracts video metadata
~/teneo-skill/teneo command "tiktok" "video <url>" --room <roomId>

# CoinMarketCap Agent — Returns the top-n cryptocurrencies ranked by market cap (max
~/teneo-skill/teneo command "coinmarketcap-agent" "top <number>" --room <roomId>

# CryptoQuant Pro 2.10 — Exchange netflow (BTC or ETH): Net movement. Positive = more
~/teneo-skill/teneo command "cryptoquant-agent-v10" "netflow <asset>" --room <roomId>

# Google Search Agent — Performs a Google search for the given query.
~/teneo-skill/teneo command "google-search-agent" "search <query>" --room <roomId>

# LayerZero — Swap tokens across chains. Fetches a quote from LayerZero, t
~/teneo-skill/teneo command "layerzero" "swap <amount> <fromToken> <fromChain> <toToken> <toChain>" --room <roomId>

# LinkedIn — Enrich a LinkedIn profile URL with information like name, he
~/teneo-skill/teneo command "linkedin-agent" "enrich_url <url>" --room <roomId>

# Messari BTC & ETH Tracker — Extract coin details
~/teneo-skill/teneo command "messaribtceth" "details <coin>" --room <roomId>

# Squid Router — Execute cross-chain token swaps between supported chains and
~/teneo-skill/teneo command "squid-router" "swap <amount> <fromtoken> <fromchain> <totoken> <tochain>" --room <roomId>

# Uniswap Monitor — Start monitoring Uniswap V2 swaps on Ethereum mainnet with r
~/teneo-skill/teneo command "uniswap-monitor-agent" "monitor v2" --room <roomId>

# VC Attention — get you an example of the output file
~/teneo-skill/teneo command "vc-attention" "getexamplefile" --room <roomId>

# X Platform Agent — Get the text content and basic information for any post. Sho
~/teneo-skill/teneo command "x-agent-enterprise-v2" "post_content <ID_or_URL>" --room <roomId>

# Youtube — The command lets you search for videos. Examples: /search ca
~/teneo-skill/teneo command "youtube" "search <keyword> <sort_by>" --room <roomId>

# Predexon Prediction Market Agent 1.5 — Execute any Predexon V2 API request and pay per query via x4
~/teneo-skill/teneo command "predexon-prediction-market-agent-v5" "proxy <path>" --room <roomId>

# Predexon Prediction Market Trading 1.5 — Create a new user account
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "create-user" --room <roomId>
```
<!-- /AGENT_EXAMPLES -->

---

## Searching for Users / Handles on Platforms

When a user asks to look up a social media account, there are two paths:

### With `@` handle (direct query)
If the user provides an exact handle with `@` (e.g. `@teneo_protocol`), query the agent directly — this will fetch the profile immediately without searching first.

### Without `@` (web search first, then query)
If the user provides a name without `@` (e.g. "teneo protocol"), you **must find the correct handle first**. **Never guess handles** — wrong handles waste money ($0.001 each) and return wrong data.

**Step 1: Web search to find the correct handle.** Tell the user:
> "Searching the web for the correct handle..."

Use a web search (not the Teneo agent) to find the official handle. Look for:
- The most prominent result (highest followers, verified badge)
- Official website links that confirm the handle
- Be careful of impostor/dead accounts with similar names

**Step 2: Check for handle changes.** Sometimes an account's bio says "we are now @newhandle on X" (e.g. `@peaqnetwork` -> `@peaq`). If you see this, use the new handle.

**Step 3: Query with the confirmed handle.**

**Always tell the user on first use:** Using `@handle` (e.g. `@teneo_protocol`) queries directly and is faster. Without the `@`, I need to search the web first to find the right handle.

---

## For AI Agent Integration

### Recommended workflow

#### Step 1: Install the CLI and check version

```bash
test -f ~/teneo-skill/teneo && ~/teneo-skill/teneo --version || echo "NOT_INSTALLED"
```

If NOT_INSTALLED, follow the Installation section above.

#### Step 2: Discover all available agents

```bash
~/teneo-skill/teneo list-agents
```

**Wait for this command to fully complete and return its exit code before proceeding.** This returns all agents with IDs, command counts, and capabilities. The output is a single JSON object — do not attempt to parse it until the command has fully exited. Tell the user which version is installed and what agents are available.

#### Step 3: Get details for agents matching the user's intent

```bash
~/teneo-skill/teneo info <agentId>
```

**Wait for the full JSON response.** Do not proceed until you have the complete agent details. This returns the agent's exact command syntax, arguments, and pricing. Always run this before sending a command.

#### Step 4 (optional): Full manifest for caching

```bash
~/teneo-skill/teneo discover
```

Full JSON manifest including `agents`, `command_index`, `fee_config`, `payment_networks`, and `pricing_semantics` — designed for AI agent consumption. **Warning: this returns a large JSON payload. Wait for complete output. Prefer `list-agents --search` and `info` for targeted lookups.** Cache this output.

#### Step 5: Match user intent to a command

Search agent descriptions and command triggers semantically. Check pricing to inform the user about cost before executing.

**Example matching logic:**
- User says "What's Elon's Twitter?" -> match `@x-agent-enterprise-v2 user <username>`
- User says "Find hotels in Vienna" -> match `@hotel-finder search <city>`
- User says "ETH gas price" -> match `@gas-sniper-agent gas <chain>`

#### Step 6: Execute the query

```bash
~/teneo-skill/teneo command "<agentId>" "<trigger> <argument>"
```

Room is auto-resolved. Agent is auto-added if not in room. Payment is auto-signed. All on-chain transactions (swaps, bridges) are auto-signed. Payment network auto-retries if funds are insufficient on the default chain.

**All transactions (payments AND on-chain swaps/bridges) are auto-signed by default. Do NOT use `approve-tx` or `pending-txs` unless the user explicitly passed `--no-auto-sign-tx`.** The normal flow requires no manual approval — just run the command and wait for the result.

Only if the user explicitly asks to review transactions before signing, use `--no-auto-sign-tx`:

```bash
~/teneo-skill/teneo command "<swap-agent-id>" "swap 0.5 USDC base USDC avalanche" --no-auto-sign-tx
```

Then show the pending TX details to the user and run `approve-tx <taskId>` or `reject-tx <taskId>`.

**This command may take 10-30 seconds for paid agent queries. Wait for the complete response. Do not summarize or present results to the user until the command has exited and you have the full JSON output.**

#### Step 7: Parse the response

All commands return JSON to stdout. The output is complete **only when the process exits**. Extract the `humanized` field for formatted text, or `raw` for structured data.

If the response contains a `_payment_retry` field, it means the payment failed on the first network and was automatically retried on another.

#### Step 8: Handle errors

| Error | Meaning | Action |
|-------|---------|--------|
| `"agent not found or disconnected"` | Agent offline in your room | Find alternative agent, or kick and re-add |
| `"room is full"` | 5 agents already in room | Remove one or create new room |
| `"insufficient funds"` | Wallet lacks USDC on all chains | Check balance with `check-balance`, fund wallet |
| `"Direct-agent mismatch"` | Coordinator routed to wrong agent | Retry, or specify the agent directly |
| `"timeout"` | No response in time | Retry once, then try different agent |
| `"All N attempts failed"` | SDK connection failed | Check network, wait and retry |

The `command` handler automatically resolves rooms, adds agents, swaps out agents when the room is full, and retries payments on different networks. No manual room management needed.

---

## Error Handling

### `agent not found or disconnected`
**Cause:** Agent shows online but is disconnected in your room.
**Fix:** Test with a cheap command first. If disconnected, find an alternative agent. Multiple agents often serve overlapping purposes (e.g. if `messari` is dead, `coinmarketcap-agent` can provide crypto quotes).

### `Room is full (max 5 agents)`
**Cause:** Room already has 5 agents.
**Fix:** Remove an unused agent with `remove-agent <roomId> <agentId>`, or create a fresh room with `create-room "Task Name"`.

### `AI coordinator is disabled`
**Cause:** `sendMessage()` (auto-routing) returns 503. Only direct `@agent` commands work.
**Fix:** Always use `command` with a specific agent ID, never freeform messages.

### `Timeout waiting for response`
**Cause:** Agent didn't respond in time. Possible dangling WebSocket on Teneo's side.
**Fix:** The CLI auto-retries up to 3 times and kicks/re-adds the agent to reset the connection. If it still fails, try a different agent.

### `Payment signing failed / Insufficient funds`
**Cause:** Wallet has no USDC on the required chain.
**Fix:** Check balance with `check-balance`. The CLI auto-retries on other funded chains. If all chains are empty, fund the wallet.

### `Direct-agent mismatch`
**Cause:** You sent a command to a specific agent but the coordinator routed it to a different one.
**Fix:** This is a safety guard — the CLI rejects the response to prevent paying the wrong agent. Retry the command.

### `OOM on small instances`
**Cause:** `npm install` gets killed on low-memory VMs.
**Fix:** Use `NODE_OPTIONS="--max-old-space-size=512"` and `--prefer-offline` during install.

### Agent IDs with spaces fail
**Cause:** The SDK only allows `[a-zA-Z0-9_-]` in agent IDs.
**Fix:** Always use the internal agent ID (e.g. `x-agent-enterprise-v2`), never the display name (e.g. "X Platform Agent").

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TENEO_PRIVATE_KEY` | No | _(auto-generated)_ | 64 hex chars, no 0x prefix. Auto-generated on first use if not set. |
| `TENEO_WS_URL` | No | `wss://backend.developer.chatroom.teneo-protocol.ai/ws` | Override the WebSocket endpoint. |
| `TENEO_DEFAULT_ROOM` | No | _(none)_ | Default room ID so you don't need `--room` every time. |
| `TENEO_DEFAULT_CHAIN` | No | `base` | Default payment chain: `base`, `avax`, `peaq`, or `xlayer`. |

The `.env` file in `~/teneo-skill/` is auto-loaded.

---

## Daemon Architecture

The CLI uses a **background daemon** process that maintains a persistent WebSocket connection to the Teneo Protocol backend. This means:

- **First command** auto-starts the daemon (takes 2-3s to connect)
- **Subsequent commands** execute instantly via the daemon's local HTTP API
- **Daemon auto-stops** after 10 minutes of inactivity
- **Manage the daemon** with `daemon start | stop | status`
- **Check connection** with `health`

You don't need to manage the daemon manually — it starts and stops automatically. The daemon stores its PID and port in `~/.teneo-wallet/`.

---

## Deploy & Manage Your Own Agent

The CLI includes a full `agent` command group for deploying and managing your own agents on the Teneo network. All `agent` subcommands are documented in the auto-generated Command Reference above.

**Quick start:**
```bash
~/teneo-skill/teneo agent init "My Agent" --type command \
  --description "What the agent does" --short-description "One-liner" --category "AI"
~/teneo-skill/teneo agent deploy ./my-agent    # build, mint NFT, start service
~/teneo-skill/teneo agent publish my-agent     # make public (optional, free)
```

You can also build and launch your own agent directly via the Go SDK instead of the CLI scaffolder. Use the `teneo-cli` skill's `agent` workflow for scaffolding and deployment, and the [Teneo Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk) for deeper SDK-level integration.

**Key capabilities:**
- `agent init <name>` — project scaffolding (metadata + Go code, latest SDK auto-fetched)
- `agent deploy` — build, mint gasless NFT, start as background service (all automatic)
- `agent publish` / `agent unpublish` — manage public visibility
- `agent status` — combined network + local service status
- `agent logs` — tail agent logs
- `agent services` — list all running agents
- Multiple agents can run simultaneously — each gets its own service

For the full agent deployment guide (implementing ProcessTask, streaming, metadata schema, common errors), use the Go SDK docs and the CLI `agent` command help.

## OpenClaw Notes

If you are running inside **OpenClaw**, pay extra attention to CLI output handling:

1. **Shell commands may stream output.** You MUST wait for the process to **fully exit** before reading or parsing stdout. Do not start generating a response while the command is still running.
2. **If output looks truncated or JSON is invalid**, the command is still running. Wait for the exit code.
3. **Always confirm the command has returned an exit code** before interpreting results. A successful command returns exit code 0.
4. **Set shell execution timeout to at least 120 seconds.** Teneo agent queries take 10-30 seconds; discovery commands return large JSON payloads.
5. **Do not run Teneo commands in the background or in parallel.** Each command uses a WebSocket — run them sequentially and wait for each to complete.

---

## Links

- **This CLI (source):** https://github.com/TeneoProtocolAI/teneo-skills
- **Teneo Protocol:** https://teneo-protocol.ai
- **Agent Console:** https://agent-console.ai
- **Payment chains:** Base (8453), Peaq (3338), Avalanche (43114), X Layer (196)
- **x402 Protocol:** https://x402.org

---

<!-- AGENTS_LIST -->

## Available Agents

| Agent | Commands | Description |
|-------|:--------:|-------------|
| [Amazon](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-amazon/SKILL.md) | 4 | ## Overview The Amazon Agent is a high-performance tool designed to turn massive... |
| [Gas War Sniper](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-gas-war-sniper/SKILL.md) | 12 | Real-time multi-chain gas monitoring and spike detection. Monitors block-by-bloc... |
| [Google maps](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-google-maps/SKILL.md) | 5 | ## Overview The Google Maps Agent transforms geographical and local business dat... |
| [Instagram Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-instagram-agent/SKILL.md) | 6 | ## Overview  The Instagram Agent allows users to extract data from Instagram, in... |
| [Tiktok](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-tiktok/SKILL.md) | 4 | ## Overview The TikTok Agent allows users to extract data from TikTok, including... |
| [CoinMarketCap Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-coinmarketcap-agent/SKILL.md) | 5 | ##### CoinMarketCap Agent  The CoinMarketCap Agent provides comprehensive access... |
| [CryptoQuant Pro 2.10](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-cryptoquant-pro-2-10/SKILL.md) | 12 | CryptoQuant Pro 2.10  Professional-grade market intelligence including derivativ... |
| [Google Search Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-google-search-agent/SKILL.md) | 1 | Perform real-time web searches with Google/Serper results. |
| [LayerZero](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-layerzero/SKILL.md) | 1 | Cross-chain token swap agent powered by LayerZero's Value Transfer API. Supports... |
| [LinkedIn](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-linkedin/SKILL.md) | 1 | LinkedIn agent that helps you enrich LinkedIn profiles. You prodive a LinkedIn U... |
| [Messari BTC & ETH Tracker](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-messari-btc-eth-tracker/SKILL.md) | 1 | ## Overview The Messari Tracker Agent serves as a direct bridge to Messari’s ins... |
| [Squid Router](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-squid-router/SKILL.md) | 1 | # Squid Router Agent  Cross-chain token swap agent powered by Squid Router. Swap... |
| [Uniswap Monitor](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-uniswap-monitor/SKILL.md) | 6 | AI-powered blockchain monitoring agent with real-time monitoring of Uniswap V2, ... |
| [VC Attention](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-vc-attention/SKILL.md) | 2 | ## Overview The VC Attention Agent allows users to extract followings of top cry... |
| [X Platform Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-x-platform-agent/SKILL.md) | 10 | ## Overview The X Agent mpowers businesses, researchers, and marketers to move b... |
| [Youtube](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-youtube/SKILL.md) | 2 | ## Overview The YouTube Agent allows users to extract data from YouTube to monit... |
| [Aave V3 Liquidation Watcher](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-aave-v3-liquidation-watcher/SKILL.md) | 0 | - |
| [Predexon Prediction Market Agent 1.5](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-predexon-prediction-market-agent-1-5/SKILL.md) | 1 | # Predexon Agent — README  Unified prediction market data API for Polymarket, Ka... |
| [Predexon Prediction Market Trading 1.5](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-predexon-prediction-market-trading-1-5/SKILL.md) | 14 | # Predexon Prediction Market Trading 1.5  Universal proxy for trading on Polymar... |

<!-- /AGENTS_LIST -->
