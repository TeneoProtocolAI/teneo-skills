---
name: teneo-cli
version: 2.0.65
description: "Teneo CLI — 39 commands for browse & query network agents, send commands to agents, room management, deploy & manage your own agents, wallet management, daemon & updates. Query network agents, handle x402 USDC micropayments, sign on-chain transactions, auto-generate encrypted wallets, deploy your own agents with background service management (launchd/systemd). Background daemon keeps a persistent WebSocket connection. Use this skill whenever the user needs real-time Teneo data, Teneo agent payments, or Teneo agent deployment."
homepage: https://teneo-protocol.ai
metadata: {"teneo":{"backend":"wss://backend.developer.chatroom.teneo-protocol.ai/ws","chains":["base:8453","peaq:3338","avalanche:43114","xlayer:196"],"payment":"x402-usdc"}}
---

# teneo-cli

<!-- GREETING_INSTALL -->
## Teneo Is Ready

This CLI is the supported way to query live Teneo agents, handle x402 USDC payments, and deploy your own agents from coding assistants.

### What You Can Do

- Gather live agent data for crypto, social, analytics, news, e-commerce, and more.
- Inspect agents, commands, and pricing before execution.
- Invite agents into rooms, send them commands, let the CLI handle payment, and receive the data back in one workflow.
- Deploy, publish, and manage your own agents from the same CLI.

### Wallet And Funding

- Fastest setup: use the auto-generated CLI wallet created on first use.
- Existing wallet: set `TENEO_PRIVATE_KEY` to a dedicated EVM wallet private key.
- Best practice: use a dedicated agent/payment wallet instead of a primary personal wallet.
- Some commands are free. Some commands need USDC in the active wallet before the CLI can pay the network fee.
- If a command may cost something, inspect `info` or run `quote`, then tell the user to top up that exact wallet before execution.
- x402 payments are gas-free for query fees, but swaps, bridges, and other on-chain actions still require native gas on the source chain.
- Example: swapping Base USDC to Ethereum USDC still needs Base ETH.

### Supported Networks

- Base
- Avalanche
- Peaq
- X Layer
<!-- /GREETING_INSTALL -->

## Quick Mental Model

- Teneo gives the user access to live network agents through the CLI.
- The CLI can discover agents, add them to rooms, send them commands, handle payment, and return the resulting data.
- Always gather agent information first before executing unfamiliar or paid commands.
- Some commands are free, some require USDC in the active wallet, and fund-moving actions can also require native gas.
- Use the CLI as the source of truth for agent IDs, commands, arguments, pricing, and status.

## First-Run Onboarding

When wallet context is first established, keep the user update short and practical:

1. Tell them Teneo is ready and that the CLI can inspect agents, invite them, send commands, handle payment, and return the data.
2. Share the active wallet address only after `wallet-address --json` returns it.
3. Tell them some commands are free and some need prior USDC in that exact wallet before execution.
4. If the selected command may cost something, inspect `info` or run `quote`, then tell them to top up that exact wallet before execution.
5. Mention that x402 query payments are gas-free, but swaps, bridges, and other on-chain actions still need native gas on the source chain.
6. If they do not know where to start, suggest checking available agents or searching by task.

## Use This Skill When

- The user needs live data from a Teneo network agent, including social media, crypto, analytics, news, or e-commerce data.
- The user needs to inspect agents, commands, or pricing before querying.
- The user needs room or wallet operations tied to Teneo.
- The user wants to create, deploy, debug, or publish their own Teneo agent.

## Non-Negotiables

1. Use only the bundled CLI at `~/teneo-skill/teneo`.
2. If the CLI is missing, install only via `npx -y @teneo-protocol/cli`.
3. Run Teneo commands one at a time. Do not run them in parallel.
4. Wait for process exit before parsing stdout.
5. Prefer `--json` on commands you need to parse or depend on for machine-readable errors.
6. Gather agent information before execution. Use `list-agents`, `info`, and `quote` instead of guessing.
7. Do not invent agent IDs, command syntax, room IDs, or paths. Discover them from the CLI.
8. Do not claim a deploy worked from partial output. Confirm with `agent status`, `agent logs`, and `agent services`.
9. The current CLI does not expose the old manual transaction approval workflow. Do not mention or use it.
10. This repo no longer ships a separate deployment skill. Use the `agent` workflow in this skill.
11. For swaps, bridges, trades, sends, or any action that can move user funds, confirm intent explicitly before execution.
12. Treat `wallet-export-key` as dangerous. Only run it on explicit user request.
13. If a confirmed swap, bridge, trade, or send fails once, do not stop at a generic question. Diagnose it and retry once when safe.

## Install And Verify

Check whether the CLI exists:

```bash
test -f ~/teneo-skill/teneo && ~/teneo-skill/teneo version || echo "NOT_INSTALLED"
```

If missing, install it:

```bash
pkill -f '/teneo-skill/daemon' 2>/dev/null || true
npx -y @teneo-protocol/cli
```

Verify install and connectivity:

```bash
~/teneo-skill/teneo health --json
~/teneo-skill/teneo version
```

## How To Inspect Everything The CLI Can Do

Use these commands when the user wants the full CLI surface area instead of a single workflow:

```bash
~/teneo-skill/teneo --help
~/teneo-skill/teneo agent --help
~/teneo-skill/teneo --dump-commands
```

Guidance:

- `--help` shows the top-level command groups and common usage.
- `agent --help` shows the deployment and management subcommands.
- `--dump-commands` returns the complete machine-readable command manifest.
- The `COMMAND_REFERENCE` section later in this skill is generated from that manifest.
- The embedded CLI source in this skill is the ground truth if behavior is unclear.

## Output Rules

- Most operational commands return JSON on stdout.
- Use `--json` when you need structured errors as well as structured success output.
- `version` is plain text.
- `export-login` is plain text shell output.
- `agent logs` is plain text.
- `wallet-export-key` prints a warning on stderr and JSON on stdout.
- Only the `command` subcommand has a CLI `--timeout` flag. Use shell timeouts for other long-running commands.
- Use at least a 120 second shell timeout for `discover`, `list-agents`, `info`, `command`, `quote`, and agent deployment operations.

## Gathering Data And Running Workflows

Use this order for normal data requests and agent workflows:

1. Verify install and health.
2. Find the right agent with `list-agents --search`.
3. Gather the agent details with `info <agentId> --json`.
4. If the command is paid or pricing is unclear, run `quote` before execution.
5. If the command costs something, tell the user to top up the active wallet before execution when needed.
6. Run the exact command with `command` only after syntax, pricing, and wallet context are clear.

Operational rules:

- Gather agent info first. Do not jump straight to `command`.
- The CLI can invite agents to rooms, send them commands, pay them automatically, and receive the resulting data.
- Some commands are free. Some commands require prior USDC in the active wallet so the CLI can pay the network fee.
- Swaps, bridges, and other fund-moving actions may also require native gas on the source chain.
- Example: Base USDC to Ethereum USDC still needs Base ETH on Base.

## Default Query Workflow

Use this exact sequence unless the user explicitly asks for something else.

1. Verify install and health.
2. Find the agent with `list-agents --search`.
3. Inspect the chosen agent with `info`.
4. If the command is paid or pricing is unclear, run `quote`.
5. Tell the user to top up the active wallet before execution when the command needs USDC and funds are missing.
6. Run the exact command with `command`.

Typical flow:

```bash
~/teneo-skill/teneo list-agents --search "keyword" --json
~/teneo-skill/teneo info <agentId> --json
~/teneo-skill/teneo command "<agentId>" "<exact trigger and args>" --json
```

Notes:

- `command` auto-resolves a room if `--room` is omitted.
- `command` auto-adds the target agent when needed.
- `command` handles payment automatically.
- `quote` can tell you whether a request is free or paid before execution.
- Use `--chain` or `--network` only when the user wants a specific payment chain.
- Do not guess command syntax. Always inspect `info <agentId>` first.

Optional price check:

```bash
~/teneo-skill/teneo quote "@<agentId> <request>" --json
```

## Discovery Rules

- Prefer `list-agents --search "<keyword>" --json` for targeted lookup.
- Gather `info <agentId> --json` before every unfamiliar, paid, or fund-moving workflow.
- Use `info <agentId> --json` before executing any unfamiliar agent command.
- Use `discover --json` only when you genuinely need the full manifest.
- Use internal agent IDs, never display names.

If the user gives a social profile name without an `@handle`, find the correct handle first. Do not guess paid queries against an uncertain handle.

## Rooms

Manual room management is optional for normal querying because `command` auto-resolves rooms and auto-adds agents.

Use room commands only when the user explicitly wants room control or when you need to debug room state:

```bash
~/teneo-skill/teneo rooms --json
~/teneo-skill/teneo room-agents <roomId> --json
~/teneo-skill/teneo room-available-agents <roomId> --json
~/teneo-skill/teneo create-room "Task Room" --json
~/teneo-skill/teneo add-agent <roomId> <agentId> --json
~/teneo-skill/teneo remove-agent <roomId> <agentId> --json
~/teneo-skill/teneo delete-room <roomId> --json
```

Guidance:

- Rooms are capped at 5 agents.
- `subscribe` and `unsubscribe` are niche public-room commands. Do not use them in normal workflows.
- `update-room` exists, but do not depend on it in the standard workflow. The live backend may return a timeout.

## Wallets And Payments

The CLI auto-generates a wallet on first use unless `TENEO_PRIVATE_KEY` is set.

Practical guidance:

- There are free commands and paid commands on the network.
- Paid queries can start with a very small USDC balance, so tell the user a small amount is enough to begin.
- If `info` or `quote` shows a paid command, tell the user to top up the exact active wallet before execution when required.
- x402 payments are gas-free on supported payment chains.
- On-chain actions such as swaps, bridges, and sends still require native gas on the relevant source chain.
- Example: Base USDC to Ethereum USDC still needs Base ETH on Base.

Wallet disclosure rules:

- After any wallet setup or wallet detection step, always tell the user which wallet is active before continuing.
- This applies when a wallet is auto-generated, when an existing local wallet is detected, and when `TENEO_PRIVATE_KEY` provides the wallet.
- Use this exact wording when wallet context is established: `Active wallet: 0x...`
- Immediately follow it with: `Use this address for funding/ownership checks.`
- If `check-balance --json` shows no funds on the relevant chain, add a short reminder to fund that exact wallet on the required chain before paid queries or deployment continue.

Useful commands:

```bash
~/teneo-skill/teneo wallet-init --json
~/teneo-skill/teneo wallet-address --json
~/teneo-skill/teneo wallet-pubkey --json
~/teneo-skill/teneo wallet-balance --json
~/teneo-skill/teneo check-balance --json
~/teneo-skill/teneo export-login
```

Supported payment chains:

- `base`
- `avax`
- `peaq`
- `xlayer`

Recommended wallet check flow:

1. Run `wallet-init --json` when wallet context may not exist yet.
2. Run `wallet-address --json` and share the returned address with the user immediately.
3. Run `check-balance --json` before paid queries, deployment, or publish flows that may require funds.

Before paid or fund-moving commands:

1. Establish wallet context and share the active wallet address.
2. Use `info` or `quote` when the cost is unclear.
3. If there is any doubt that funds exist, run `check-balance --json`.
4. If balances are empty, stop and ask the user to fund that exact wallet.
5. Confirm intent before swaps, bridges, trades, sends, or any command that can move funds.

If payment or on-chain execution fails:

1. Run `check-balance --json` immediately.
2. Check the source-chain token balance and the source-chain native gas balance before guessing about slippage, liquidity, or routing.
3. If all balances are empty, stop and ask the user to fund the wallet.
4. If only one payment chain is funded, retry with `--chain <chain>`.
5. If the user already confirmed the action and the failure looks transient or generic, retry the exact same command once after diagnostics. Do not stop with a vague "would you like me to..." before that first retry.
6. If the wallet is missing funds, native gas is clearly too low, or the retry would require changing amount, chain, token pair, or route assumptions, stop and tell the user the concrete blocker instead of guessing.

### Swap And Bridge Retry Policy

- For a confirmed swap or bridge, the first failure is not the end of the workflow.
- Diagnose first, then make one concrete retry when balances look sufficient and the retry does not change user intent.
- Do not silently loop retries.
- After one retry, report the exact blocker and the next concrete action.

## Agent Deployment

Use a deterministic, non-interactive flow. Do not let the LLM improvise an interactive conversation around `agent create`.

Deployment order:

1. Initialize the scaffold with `agent create`.
2. Edit the generated code and metadata at the exact path reported by the CLI.
3. Validate the metadata.
4. Deploy the agent, which installs it as a local service.
5. Publish it when you want to make it public.

### One-Shot Init

Run init from a known parent directory so the resulting path is predictable:

```bash
cd ~/teneo-skill
~/teneo-skill/teneo agent create "My Agent" \
  --id my-agent \
  --type command \
  --description "Full description of what the agent does." \
  --short-description "One-line summary." \
  --category "Developer Tools" \
  --json
```

Rules:

- Always pass `--id`, `--description`, `--short-description`, and `--category`.
- Prefer running init from `~/teneo-skill` so the project path is `~/teneo-skill/<agent-id>`.
- If init runs elsewhere, use the exact created path from the command output. Never guess the directory later.
- `agent create` is the scaffold step. The CLI tells you exactly where the code and metadata were created.
- After init, put your code into that generated scaffold instead of creating a separate project structure by hand.
- By default, `agent create` reuses the active CLI wallet so the same CLI can immediately see and try the private deployment.
- Use `--new-key` only when you intentionally want a separate owner wallet for that agent.
- Before `agent deploy` or `agent publish`, establish wallet context and share the active wallet address with the user using the wallet disclosure rules above.

### Code, Validate, Deploy, Publish

```bash
~/teneo-skill/teneo agent validate ~/teneo-skill/my-agent/my-agent-metadata.json --json
~/teneo-skill/teneo agent deploy ~/teneo-skill/my-agent --json
~/teneo-skill/teneo agent status my-agent --json
~/teneo-skill/teneo agent logs my-agent --no-follow
~/teneo-skill/teneo agent services --json
~/teneo-skill/teneo agent publish my-agent --json
```

Rules:

- Use the exact scaffold path printed by `agent create` when editing code, metadata, and `.env`.
- The CLI-generated scaffold is where the implementation belongs. Do not guess another location.
- `agent deploy` builds the Go binary, mints the NFT identity for free, and installs the service.
- Treat `agent deploy` as the install step for the local service.
- Do not present minting itself as a paid step.
- Only say the agent is deployed after checking `agent status` and `agent services`.
- If status is `stopped` or `offline`, do not claim success. Read logs first.
- Publish only after deploy has succeeded and the service is healthy. `agent publish` is the step that makes the agent public.
- If deployment or publish requires funding, remind the user to fund the exact active wallet address on the required chain.

### When Deploy Fails

If `agent status` shows `stopped` or `offline`, do this immediately:

```bash
~/teneo-skill/teneo agent status <agentId> --json
~/teneo-skill/teneo agent logs <agentId> --no-follow
~/teneo-skill/teneo agent services --json
```

Then check the underlying service manager if needed:

```bash
# Linux
systemctl --user status <agentId> --no-pager
journalctl --user -u <agentId> -n 200 --no-pager

# macOS
launchctl list | grep ai.teneo.agent
cat ~/.teneo-wallet/logs/<agentId>.err.log
```

Common causes:

- Invalid or incomplete metadata.
- Agent directory/path guessed incorrectly after init.
- Service started but the binary exited during startup.
- Agent ID already taken or publish/deploy state inconsistent.
- Agent `.env` missing expected values or manually edited incorrectly.

## Remote Server Notes

On remote hosts, keep the flow explicit:

```bash
~/teneo-skill/teneo daemon stop || true
export TENEO_DAEMON_PORT=19888
~/teneo-skill/teneo daemon start --json
```

Use a non-default daemon port when the normal port is busy or startup is unreliable.

If daemon startup still fails, do not continue guessing. Inspect the actual error first.

## Error Handling

- `agent not found or disconnected`: find an alternative agent or retry after checking `info`.
- `room is full`: remove an agent or create a fresh room.
- `insufficient funds`: run `check-balance --json` and fund the wallet.
- `status: timeout`: do not assume failure immediately. Check follow-up state, balances, logs, or the transaction outcome before concluding it failed.
- `execution revert` or a vague on-chain error during a swap, bridge, or send: immediately run `check-balance --json`, verify source-chain native gas and token balances, and retry once if funds look sufficient. If native gas is missing or only dust remains, say that explicitly instead of defaulting to a vague slippage explanation.
- silent failure or no response: check `daemon status` before guessing.
- `Daemon failed to start`: stop the daemon, change `TENEO_DAEMON_PORT`, retry, then inspect logs.
- `Room update timeout`: avoid `update-room` unless the user explicitly needs it.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `TENEO_PRIVATE_KEY` | Use an existing wallet instead of auto-generated storage |
| `TENEO_DEFAULT_ROOM` | Default room ID |
| `TENEO_DEFAULT_CHAIN` | Default payment chain |
| `TENEO_WS_URL` | Override backend WebSocket endpoint |
| `TENEO_DAEMON_PORT` | Override daemon port |
| `TENEO_DAEMON_IDLE_TIMEOUT_MS` | Override daemon idle shutdown timeout in milliseconds |

The CLI auto-loads `~/teneo-skill/.env`.

## Command Reference

<!-- COMMAND_REFERENCE -->
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
  ~/teneo-skill/teneo agent create <name>            Create a new agent project (scaffolds Go code + metadata)
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
~/teneo-skill/teneo command <agent> <cmd> [--room <roomId>] [--timeout <ms>] [--chain <chain>] [--network <network>] [--ignore-price]
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
| `--ignore-price` | Execute without the pre-execution price confirmation gate | - |

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

#### `agent create`

Create a new agent project (scaffolds Go code + metadata)

```bash
~/teneo-skill/teneo agent create <name> [--id <id>] [--type <type>] [--template <template>] [--description <desc>] [--short-description <desc>] [--category <cat>] [--metadata-only] [--new-key]
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
| `--new-key` | Generate a separate private key for the agent instead of reusing the CLI wallet | - |

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
~/teneo-skill/teneo agent services [--paths]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--paths` | Show installed agent working directories | - |

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

## Live Agent Examples

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

# LayerZero — Bridge tokens across chains. Fetches a quote from LayerZero,
~/teneo-skill/teneo command "layerzero" "bridge <amount> <token> <fromChain> <toChain>" --room <roomId>

# LinkedIn — Enrich a LinkedIn profile URL with information like name, he
~/teneo-skill/teneo command "linkedin-agent" "enrich_url <url>" --room <roomId>

# Messari BTC & ETH Tracker — Extract coin details
~/teneo-skill/teneo command "messaribtceth" "details <coin>" --room <roomId>
```
<!-- /AGENT_EXAMPLES -->

## Available Agents

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
| [LayerZero](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-layerzero/SKILL.md) | 1 | ## Overview Cross-chain token bridge agent powered by LayerZero's Value Transfer... |
| [LinkedIn](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-linkedin/SKILL.md) | 1 | LinkedIn agent that helps you enrich LinkedIn profiles. You prodive a LinkedIn U... |
| [Messari BTC & ETH Tracker](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-messari-btc-eth-tracker/SKILL.md) | 1 | ## Overview The Messari Tracker Agent serves as a direct bridge to Messari’s ins... |
| [X Platform Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-x-platform-agent/SKILL.md) | 0 | - |
| [CryptoQuant Pro 2.10](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-cryptoquant-pro-2-10/SKILL.md) | 0 | - |
| [Google Search Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-google-search-agent/SKILL.md) | 0 | - |
| [Uniswap Monitor](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-uniswap-monitor/SKILL.md) | 0 | - |
| [VC Attention](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-vc-attention/SKILL.md) | 0 | - |
| [Youtube](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-youtube/SKILL.md) | 0 | - |
| [Squid Router](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-squid-router/SKILL.md) | 0 | - |
| [Aave V3 Liquidation Watcher](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-aave-v3-liquidation-watcher/SKILL.md) | 0 | - |
| [Predexon Prediction Market Agent 1.5](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-predexon-prediction-market-agent-1-5/SKILL.md) | 0 | - |
| [Predexon Prediction Market Trading 1.5](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-predexon-prediction-market-trading-1-5/SKILL.md) | 0 | - |

<!-- /AGENTS_LIST -->
