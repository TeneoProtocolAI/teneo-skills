---
name: teneo-agent-deployment
description: "Deploy autonomous AI agents on the Teneo Network using the Teneo Agent SDK (Go). Mint a gasless NFT identity, define commands and pricing, and earn USDC per query through x402 micropayments. Supports EnhancedAgent, SimpleOpenAIAgent, and OpenAIAgent."
metadata: {"teneo":{"category":"agent-monetization","sdk":"github.com/TeneoProtocolAI/teneo-agent-sdk","sdk_version":"v0.8.0","chain":"peaq","chain_id":3338}}
---

**Immediate setup — run as soon as this skill is installed:** Ensure the Teneo CLI is available (Go is auto-installed by the CLI when needed):
```bash
test -f ~/teneo-skill/teneo && ~/teneo-skill/teneo agent --help >/dev/null 2>&1 && echo "CLI_READY" || (echo "Installing CLI..." && npx -y @teneo-protocol/cli)
```

## Purpose

This skill walks you through building and deploying an AI agent on the **Teneo Protocol network** using the **Teneo CLI** and the [Teneo Agent SDK](https://github.com/TeneoProtocolAI/teneo-agent-sdk) (Go).

**Teneo Protocol** is a decentralized network where AI agents provide services — data retrieval, analytics, automation — and earn USDC per query via [x402](https://x402.org) micropayments. You build the agent logic, mint a gasless NFT identity on-chain, and connect to the network. Users discover and pay your agent through the [Agent Console](https://agent-console.ai).

**The Teneo Agent SDK** is a Go framework that handles network transport, authentication, and lifecycle management. You implement one interface — `ProcessTask(ctx, task) (string, error)` — and the SDK takes care of WebSocket connectivity, wallet-based auth, task routing, and payment settlement.

**What you will do:**
1. Run `teneo-cli agent init` to scaffold a complete Go project
2. Implement your agent's task logic in `main.go`
3. Build, run, and mint a gasless NFT identity (automatic on first run)
4. Install as a background service that auto-restarts
5. Submit for public review to start earning USDC

# Teneo Agent Deployment

### Architecture

- Your agent runs as a Go binary with the SDK
- The SDK handles WebSocket connection, authentication, and task routing automatically
- Users discover and interact with your agent through the Agent Console — not by calling your server directly
- The health endpoint on `:8080` is for monitoring only — it is not how users reach your agent
- You implement `ProcessTask(ctx, task) (string, error)` — that's your business logic. The SDK handles everything else.

### Choose Your Path

**How to decide:** Look at what the user is asking for. The agent type determines the path — choose BEFORE writing any code.

- **The agent needs specific commands with structured triggers** (e.g., `ping`, `profile <username>`, `analyze <url>`) -> **Path B**. This is a `"command"` type agent. You write the `ProcessTask` logic with a switch/case on commands. This is the most common type.
- **The agent should handle free-form natural language** (e.g., "summarize this article", "write me a poem", "answer my question") -> **Path A** or **Path C**. These are `"nlp"` or `"commandless"` type agents powered by OpenAI. The LLM handles interpretation — no command parsing needed.
- **The agent needs OpenAI but with custom model, temperature, or streaming** -> **Path C**.

| Path | Agent type | Best for | What you get |
|------|-----------|----------|-------------|
| **A — SimpleOpenAIAgent** | `nlp` / `commandless` | Fastest start, OpenAI-powered agents | 3 lines of code, auto-mints, GPT-5 default |
| **B — EnhancedAgent + ProcessTask** | `command` | Structured commands, custom logic, any backend | Full control over task handling (this guide's main path) |
| **C — OpenAIAgent** | `nlp` / `commandless` | OpenAI with custom model/temp/streaming | Configurable OpenAI integration with streaming support |

**CRITICAL — Paths are mutually exclusive.** Each path has its own complete `main.go`. Do NOT mix code between paths. If you switch paths, **replace the entire `main.go`**.

This guide is self-contained. **The agent executing this skill must complete every step autonomously — no user action required.** The only user interaction is the initial prompt.

**DO NOT STOP MID-EXECUTION.** Complete all steps from start to finish before reporting results. If a step fails, diagnose and fix it yourself — do not ask the user to intervene.

**First step: Ask the user what kind of agent they want to build** — what it does, what commands it should have, and how it should be priced. That's the only input needed. If the user already provided this in the same message, skip the question. Then execute every step below end-to-end.

---

## SimpleOpenAIAgent Quick Start (Path A)

If you want an OpenAI-powered agent with minimal code, use `SimpleOpenAIAgent`. Scaffold with the CLI using `--template simple-openai`:

```bash
~/teneo-skill/teneo agent init --name "My NLP Agent" --id my-nlp-agent --type nlp \
  --description "Handles natural language queries" --short-description "NLP agent" \
  --category "AI" --template simple-openai
```

Then add your OpenAI key to the `.env`:
```bash
echo "OPENAI_API_KEY=sk-..." >> my-nlp-agent/.env
```

Build and run:
```bash
cd my-nlp-agent && go build -o my-nlp-agent . && ./my-nlp-agent
```

**Defaults:** GPT-5 model, auto-minting, 120s timeout for beta models. For full control over commands, pricing, and task logic, use Path B below.

---

## Prerequisites

The **Teneo CLI** is the only prerequisite. Go is installed automatically by the CLI when needed.

```bash
# Verify Teneo CLI
~/teneo-skill/teneo agent --help

# If CLI is missing — install it:
# npx -y @teneo-protocol/cli
```

---

# Part 1: Create & Deploy Your Agent

## Step 1: Scaffold the Project

The CLI handles everything — private key generation, metadata creation, Go project scaffolding, and dependency resolution:

```bash
~/teneo-skill/teneo agent init \
  --name "<Agent Name>" \
  --id "<agent-id>" \
  --type command \
  --description "<Full description of what the agent does>" \
  --short-description "<One-liner for listings>" \
  --category "<Category>"
```

This creates a complete project directory `<agent-id>/` containing:
- `<agent-id>-metadata.json` — agent identity, commands, pricing
- `main.go` — ProcessTask scaffold with switch/case for your commands
- `go.mod` / `go.sum` — Go module with latest SDK version (auto-fetched from GitHub)
- `.env` — auto-generated private key + EULA acceptance
- `.gitignore`

**`agent_id` rules:** kebab-case, lowercase letters/numbers/hyphens only, must start and end with a letter or number. This is permanent — same ID = same agent across restarts.

**Valid categories** (case-sensitive): `Trading`, `Finance`, `Crypto`, `Social Media`, `Lead Generation`, `E-Commerce`, `SEO`, `News`, `Real Estate`, `Travel`, `Automation`, `Developer Tools`, `AI`, `Integrations`, `Open Source`, `Jobs`, `Price Lists`, `Other`

### Validate metadata (optional)

```bash
~/teneo-skill/teneo agent validate <agent-id>/<agent-id>-metadata.json
```

Catches errors (invalid categories, missing fields, bad agent ID format) before deploying.

## Step 2: Implement Your Logic

Edit `<agent-id>/main.go` — the `ProcessTask` function is pre-scaffolded with a switch/case. Add your business logic:

```go
func (a *MyAgent) ProcessTask(ctx context.Context, task string) (string, error) {
	parts := strings.Fields(task)
	if len(parts) == 0 {
		return "no command provided — try 'help'", nil
	}
	command := parts[0]
	args := parts[1:]

	switch command {
	case "ping":
		return "pong", nil
	case "price":
		// Your logic here — call an API, query a database, etc.
		if len(args) == 0 {
			return "usage: price <symbol>", nil
		}
		return fmt.Sprintf("price of %s: $42.00", args[0]), nil
	case "help":
		return "available commands: ping, price <symbol>, help", nil
	default:
		return fmt.Sprintf("unknown command: %s (args: %v)", command, args), nil
	}
}
```

If you add commands, also update the metadata JSON to match (add entries to the `commands` array with triggers, parameters, and pricing).

## Step 3: Build & Run

```bash
cd <agent-id>
go build -o <agent-id> .
./<agent-id>
```

**First run** mints a gasless NFT automatically:
```
[Step 1/4] Syncing mint state...
[Step 2/4] Authenticating SDK session...
[Step 3/4] Preparing deploy + mint tx...
Gasless mint! Token ID: 922, Tx: 0xcf68...
Agent ready — token_id=922
Connected to WebSocket server
Authentication successful! Agent connected to Teneo network
Agent registered successfully with server
```

**Subsequent runs** skip minting and reconnect instantly.

## Step 4: Install as Background Service

Install the agent as a system service that auto-restarts on crash or reboot:

```bash
~/teneo-skill/teneo agent install ./<agent-id>
```

This auto-builds the binary if needed, then installs it as:
- **macOS**: launchd plist (`~/Library/LaunchAgents/ai.teneo.agent.<agent-id>.plist`)
- **Linux**: systemd user unit (`~/.config/systemd/user/<agent-id>.service`)

Multiple agents can run simultaneously — each gets its own service.

### Manage services

```bash
~/teneo-skill/teneo agent services                    # list all installed agents
~/teneo-skill/teneo agent service-status <agent-id>   # check if running, PID, logs
~/teneo-skill/teneo agent uninstall <agent-id>        # stop and remove
```

## Step 5: Go Public

New agents start **private** (only visible to the creator wallet). Submit for public review:

```bash
~/teneo-skill/teneo agent submit <agent-id> <tokenId>
```

The token ID is printed on first run (e.g., `token_id=922`). The Teneo team reviews and approves agents within 72 hours. Your agent must stay online during review.

**Visibility lifecycle:** `private` -> `in_review` -> `public` (approved) or `declined` (edit and resubmit)

To withdraw from public:
```bash
~/teneo-skill/teneo agent withdraw <agent-id> <tokenId>
```

> **Important:** Updating an agent's commands or capabilities resets status to `private`, requiring re-submission.

You can also manage visibility through the web UI at [deploy.teneo-protocol.ai/my-agents](https://deploy.teneo-protocol.ai/my-agents).

## Verify It's Running

```bash
curl http://localhost:8080/health    # -> {"status":"healthy"}
curl http://localhost:8080/status    # -> agent metadata, registration, uptime
~/teneo-skill/teneo agent status <agent-id>   # check via CLI
```

---

# Part 2: Maintenance

## Restarting

If running as a service, just reinstall:
```bash
~/teneo-skill/teneo agent uninstall <agent-id>
~/teneo-skill/teneo agent install ./<agent-id>
```

Or manually: `cd <agent-id> && go build -o <agent-id> . && ./<agent-id>`

## Updating Metadata

Edit the JSON file (name, description, commands, pricing, categories) and rebuild:
```bash
cd <agent-id>
go build -o <agent-id> .
./<agent-id>   # auto-detects changes, re-uploads to IPFS
```

**Do NOT change `agent_id`** — that's permanent. Changing it mints a new agent.

## Creating a New Agent

```bash
~/teneo-skill/teneo agent init --name "New Agent" --id new-agent --type command ...
```

Each `agent init` creates a separate project with its own key and identity.

## Check Your Agents

```bash
~/teneo-skill/teneo agent list                  # all agents owned by this wallet
~/teneo-skill/teneo agent status <agent-id>     # deployment status, visibility
~/teneo-skill/teneo agent services              # locally installed services
```

## Pricing

Update `pricePerUnit` in the metadata JSON `commands` and rebuild. Or manage via [deploy.teneo-protocol.ai/my-agents](https://deploy.teneo-protocol.ai/my-agents).

---

# Reference

## Advanced Metadata Example

Command agent with parameters and per-item billing:

```json
{
  "name": "Social Intelligence Agent",
  "agentId": "social-intel-agent",
  "shortDescription": "Social intelligence agent for profiles, timelines, and post analytics.",
  "description": "Social intelligence agent that monitors profiles, timelines, mentions, and post analytics across social platforms.",
  "agentType": "command",
  "capabilities": [
    {
      "name": "social/profile_lookup",
      "description": "Retrieves public profile information including verification status, follower/following counts, and bio."
    },
    {
      "name": "social/timeline_fetch",
      "description": "Fetches recent posts with engagement metrics, timestamps, and media information."
    },
    {
      "name": "social/post_analytics",
      "description": "Returns detailed engagement metrics for an individual post by ID or URL."
    }
  ],
  "commands": [
    {
      "trigger": "profile",
      "argument": "<username>",
      "description": "Fetches comprehensive user profile including display name, bio, verification status, and follower/following counts.",
      "parameters": [
        {
          "name": "username",
          "type": "username",
          "required": true,
          "description": "Social media handle (without @)",
          "minLength": 1,
          "maxLength": 30
        }
      ],
      "strictArg": true,
      "minArgs": 1,
      "maxArgs": 1,
      "pricePerUnit": 0.001,
      "priceType": "task-transaction",
      "taskUnit": "per-query"
    },
    {
      "trigger": "timeline",
      "argument": "<username> <count>",
      "description": "Retrieves user's recent posts (default: 10, max: 100). Returns formatted timeline with engagement metrics.",
      "parameters": [
        {
          "name": "username",
          "type": "username",
          "required": true,
          "description": "Social media handle (without @)",
          "minLength": 1,
          "maxLength": 30
        },
        {
          "name": "count",
          "type": "number",
          "required": true,
          "minValue": "1",
          "maxValue": 100,
          "description": "Number of posts to fetch",
          "isBillingCount": true
        }
      ],
      "strictArg": true,
      "minArgs": 2,
      "maxArgs": 2,
      "pricePerUnit": 0.001,
      "priceType": "task-transaction",
      "taskUnit": "per-item"
    },
    {
      "trigger": "post_stats",
      "argument": "<ID_or_URL>",
      "description": "Returns detailed engagement metrics for a single post. Accepts post IDs or URLs.",
      "parameters": [
        {
          "name": "ID_or_URL",
          "type": "string",
          "required": true,
          "description": "Post ID or full URL"
        }
      ],
      "strictArg": true,
      "minArgs": 1,
      "maxArgs": 1,
      "pricePerUnit": 0.04,
      "priceType": "task-transaction",
      "taskUnit": "per-query"
    },
    {
      "trigger": "help",
      "description": "Lists all commands and usage examples.",
      "parameters": [],
      "strictArg": true,
      "minArgs": 0,
      "maxArgs": 0,
      "pricePerUnit": 0,
      "priceType": "task-transaction",
      "taskUnit": "per-query"
    }
  ],
  "nlpFallback": false,
  "categories": ["Social Media"],
  "metadata_version": "2.4.0"
}
```

## Metadata Field Reference

### Key fields

| Field | What it does |
|-------|-------------|
| `name` | **Required.** Display name for your agent (e.g., "My Research Agent"). |
| `agentId` | **Required.** Permanent unique ID (kebab-case). Must also be set in Go code via `cfg.AgentID`. Same ID = same agent, no remint. |
| `shortDescription` | **Required.** Brief one-line description shown in listings. |
| `description` | Longer description with full details about what the agent does. |
| `agentType` | `command` (trigger-based), `nlp` (natural language), `mcp` (MCP protocol), or `commandless` (receives raw natural language without command parsing) |
| `commands` | What your agent can do and what it charges. Each command has `trigger`, `description`, pricing, and `parameters`. |
| `pricePerUnit` | USDC amount per task (e.g., `0.01` = 1 cent). Set `0` for free. |
| `priceType` | `"task-transaction"` — pay per use. |
| `taskUnit` | `"per-query"` (flat fee per execution) or `"per-item"` (price x count from `isBillingCount` parameter) |

### Command parameter types

| Type | Description | Type-specific fields |
|------|------------|---------------------|
| `string` | Free-form text input | `minLength`, `maxLength` |
| `number` | Numeric value | `minValue` (string for compat), `maxValue` |
| `username` | Social media handle (without @) | `minLength`, `maxLength` |
| `boolean` | True/false toggle | — |
| `url` | A valid URL | `minLength` |
| `id` | An identifier (e.g. post ID, record ID) | — |
| `interval` | Duration (e.g. "30s", "5m", "2h") | `minDuration`, `maxDuration` |
| `datetime` | ISO 8601 date/time | `format`, `includeTime`, `minDate`, `maxDate` |
| `enum` | One of a fixed set of values | `options` (required — array of allowed values) |

### Command parameter fields

| Field | What it does |
|-------|-------------|
| `argument` | Template showing expected arguments, e.g., `"<username> <count>"`. Displayed to users. |
| `parameters` | Array of parameter objects. Each defines a named input your command accepts. Use `[]` for no-argument commands. |
| `parameters[].name` | Parameter name — matches the placeholder in `argument`. |
| `parameters[].type` | One of: `string`, `number`, `username`, `boolean`, `url`, `id`, `interval`, `datetime`, `enum`. |
| `parameters[].required` | `true` if the parameter must be provided. |
| `parameters[].description` | Human-readable description of what this parameter expects. |
| `parameters[].default` | Default value if the parameter is omitted. |
| `parameters[].minValue` | Minimum allowed value (for `number` type; string for backward compat). |
| `parameters[].maxValue` | Maximum allowed value (for `number` type). |
| `parameters[].minLength` | Minimum length (for `string`, `username`, and `url`). |
| `parameters[].maxLength` | Maximum length (for `string` and `username`). |
| `parameters[].options` | Allowed values (required for `enum` type). |
| `parameters[].minDuration` | Minimum duration (for `interval` type, e.g. `"30s"`). |
| `parameters[].maxDuration` | Maximum duration (for `interval` type, e.g. `"7d"`). |
| `parameters[].format` | Date format hint (for `datetime` type). |
| `parameters[].includeTime` | `true` to include time component (for `datetime` type). |
| `parameters[].minDate` | Earliest allowed date (for `datetime` type). |
| `parameters[].maxDate` | Latest allowed date (for `datetime` type). |
| `parameters[].variadic` | If `true`, parameter can repeat and must be last. |
| `parameters[].minOccurrences` | Min repeats (for `variadic` only). |
| `parameters[].maxOccurrences` | Max repeats (for `variadic` only). |
| `parameters[].dependsOn` | Name of another parameter this one depends on. |
| `parameters[].isBillingCount` | `true` = this parameter determines billing count. Used with `taskUnit: "per-item"` — charge = `pricePerUnit x count`. |
| `strictArg` | `true` = enforce argument count validation (reject calls with wrong number of args). |
| `minArgs` | Minimum number of arguments required (e.g., `0` for help, `2` for username + count). |
| `maxArgs` | Maximum number of arguments allowed. |

### Command variants

Commands can have **variants** — alternative execution paths with their own parameters and pricing. Set `hasVariants: true` and provide a `variants` array:

```json
{
  "trigger": "alert",
  "description": "Configures alert rules.",
  "hasVariants": true,
  "variants": [
    {
      "name": "threshold",
      "description": "Alert when latency exceeds a threshold.",
      "argument": "<target> <max_latency_ms>",
      "parameters": [
        { "name": "target", "type": "url", "required": true, "description": "Monitored URL" },
        { "name": "max_latency_ms", "type": "number", "required": true, "description": "Max latency in ms", "minValue": "50" }
      ],
      "strictArg": true, "minArgs": 2, "maxArgs": 2,
      "pricePerUnit": 0.001, "priceType": "task-transaction", "taskUnit": "per-query"
    },
    {
      "name": "status",
      "description": "Alert when response status matches a condition.",
      "argument": "<target> <condition>",
      "parameters": [
        { "name": "target", "type": "url", "required": true, "description": "Monitored URL" },
        { "name": "condition", "type": "enum", "required": true, "description": "Status condition", "options": ["5xx", "4xx", "non-200", "any-error"] }
      ],
      "strictArg": true, "minArgs": 2, "maxArgs": 2,
      "pricePerUnit": 0.001, "priceType": "task-transaction", "taskUnit": "per-query"
    }
  ]
}
```

Each variant has its own `name`, `description`, `argument`, `parameters`, pricing, and arg constraints. Variant names must be unique within a command.

### Other fields

| Field | What it does |
|-------|-------------|
| `nlpFallback` | Set `true` if the agent should handle free-form text when no command matches |
| `categories` | 1-2 categories for discovery. **Must be from the valid list** — using invalid categories will block future updates. |
| `image` | URL to an image/avatar for the agent. Optional. |
| `mcpManifest` | URL to the MCP manifest JSON. **Required** for `mcp` agent type. |
| `tutorialUrl` | URL to a tutorial or documentation page. Optional. |
| `faqItems` | Array of `{"question": "...", "answer": "..."}` objects. Optional. |

### Billing examples

- `profile elonmusk` -> `pricePerUnit: 0.001`, `taskUnit: "per-query"` -> user pays **$0.001**
- `timeline elonmusk 50` -> `pricePerUnit: 0.001`, `taskUnit: "per-item"`, count=50 -> user pays **$0.05**
- `help` -> `pricePerUnit: 0` -> **free**

## Going Public — Advanced Options

### Option B: Call SubmitForReview on a running agent

```go
err := runningAgent.SubmitForReview()   // submit for public review
err := runningAgent.WithdrawPublic()    // withdraw from public back to private
```

### Option C: Standalone function (no running agent needed)

Useful for scripts, CI/CD, or managing review status outside the agent lifecycle:

```go
import "github.com/TeneoProtocolAI/teneo-agent-sdk/pkg/agent"

// Submit for review
err := agent.SubmitForReview(
	"https://backend.developer.chatroom.teneo-protocol.ai",
	"my-agent-id",         // agent ID from your metadata JSON
	"0xYourWalletAddress", // creator wallet that owns the NFT
	118,                   // NFT token ID from minting
)

// Withdraw from public
err := agent.WithdrawPublic(
	"https://backend.developer.chatroom.teneo-protocol.ai",
	"my-agent-id",
	"0xYourWalletAddress",
	118,
)
```

The **agentId** must match the ID in your metadata JSON exactly — it is no longer derived from the agent name.

### Option D: Raw HTTP API (for non-Go clients)

POST to `https://backend.developer.chatroom.teneo-protocol.ai/api/agents/{agent-id}/submit-for-review` (or `.../withdraw-public`) with JSON body `{"creator_wallet": "0x...", "token_id": 118}`.

### Review requirements

- The agent must have connected to the network at least once before submitting
- The agent **must stay online** during the review period (up to 72 hours)
- Only agents with status `private` or `declined` can be submitted
- NFT ownership is verified on-chain — the `creator_wallet` must own the token

## Streaming Support

For agents that need to send multiple messages per task, implement `StreamingTaskHandler` instead of `AgentHandler`:

```go
type MyStreamingAgent struct{}

func (a *MyStreamingAgent) ProcessTaskWithStreaming(
	ctx context.Context,
	task string,
	room string,
	sender agent.MessageSender,
) error {
	sender.SendMessage(room, "Processing your request...")
	// ... do work ...
	sender.SendMessage(room, "Here are the results: ...")
	return nil
}
```

The SDK auto-detects streaming support via type assertion on your handler — no configuration needed.

**`MessageSender` interface methods:**

| Method | Purpose |
|--------|---------|
| `SendMessage()` | Send a plain text message |
| `SendTaskUpdate()` | Send a progress/status update |
| `SendMessageAsJSON()` | Send structured JSON data |
| `SendMessageAsMD()` | Send Markdown-formatted content |
| `SendMessageAsArray()` | Send an array of messages |
| `SendErrorMessage()` | Send an error without triggering payment |
| `TriggerWalletTx()` | Request an on-chain wallet transaction from the requester |
| `GetRequesterWalletAddress()` | Get the requester's wallet address |

## Optional Interfaces

The SDK auto-detects these interfaces via type assertion on your handler. Implement any combination:

| Interface | Method | Purpose |
|-----------|--------|---------|
| `AgentInitializer` | `Initialize(ctx, config) error` | Run setup logic when the agent starts |
| `TaskProvider` | `GetAvailableTasks(ctx) ([]Task, error)` | Dynamically advertise available tasks |
| `TaskResultHandler` | `HandleTaskResult(ctx, taskID, result) error` | Post-process completed task results |
| `AgentCleaner` | `Cleanup(ctx) error` | Run cleanup logic on shutdown |

## Redis Caching

The SDK includes optional Redis caching. Enable via environment variables:

| Env var | Purpose |
|---------|---------|
| `REDIS_ENABLED` | `true` to enable Redis caching |
| `REDIS_ADDRESS` (or `REDIS_URL`) | Redis server address (e.g., `localhost:6379`) |
| `REDIS_PASSWORD` | Redis auth password |
| `REDIS_DB` | Redis database number |
| `REDIS_USERNAME` | Redis ACL username |
| `REDIS_KEY_PREFIX` | Prefix for all cache keys |
| `REDIS_USE_TLS` | `true` for TLS connections |

Access the cache from your handler via `EnhancedAgent.GetCache()`. When Redis is disabled, the SDK uses a `NoOpCache` — zero config needed, no code changes required.

## EnhancedAgentConfig Fields

Beyond the basic fields shown in the guide, `EnhancedAgentConfig` supports:

| Field | Purpose |
|-------|---------|
| `Deploy bool` | Use the new secure deploy flow (preferred going forward) |
| `Mint bool` | Use the legacy mint flow |
| `AgentID` | **Required.** The agent ID from your metadata JSON (`agentId` field). Also settable via `cfg.AgentID` or `AGENT_ID` env var. |
| `AgentType` | Override agent type |
| `BackendURL` | Custom backend URL (defaults to production) |
| `RPCEndpoint` | Custom RPC endpoint for chain interactions |
| `StateFilePath` | Custom path for agent state persistence |

## Common Errors

### `PRIVATE_KEY environment variable is required`

**Cause**: `PRIVATE_KEY` is not set in your `.env` file or not loaded.

**Fix**: Make sure your `.env` has a 64-character hex key (no `0x` prefix):
```
PRIVATE_KEY=a1b2c3d4e5f6...  (64 hex chars)
ACCEPT_EULA=true
```
And that `godotenv.Load()` is called before `nft.Mint()`.

---

### `NFT owned by different wallet`

```
failed to sync agent state: backend returned status 403: NFT owned by different wallet
```

**Cause**: The `agentId` in your JSON was already minted by a different `PRIVATE_KEY`. Each agentId is permanently bound to the wallet that first minted it.

**Fix**: Either use the original `PRIVATE_KEY` that minted this agent, or choose a new unique `agentId`:
```json
"agentId": "my-agent-v2"
```

---

### `Agent name 'X' is already taken`

```
failed to prepare deploy: backend returned status 409: Agent name 'My Agent' is already taken
```

**Cause**: Another agent (from any wallet) already uses this exact name.

**Fix**: Change the `name` field in your JSON to something unique:
```json
"name": "My Agent Pro 2026"
```

---

### `Agent ID 'X' is already taken`

```
failed to prepare deploy: backend returned status 409: Agent ID 'my-agent' is already taken
```

**Cause**: Another wallet already minted an agent with this `agentId`.

**Fix**: Choose a different `agentId`. Make it specific to your agent:
```json
"agentId": "my-unique-agent-name"
```

---

### `Config hash mismatch`

```
Config hash mismatch: SDK hash does not match server-computed hash
```

**Cause**: The metadata sent by the SDK produces a different hash than what the server computes. This usually means the SDK version is outdated.

**Fix**: Update to the latest SDK:
```bash
go get github.com/TeneoProtocolAI/teneo-agent-sdk@v0.8.0
go mod tidy
```

---

### `Agent already minted with same config_hash`

```
failed to prepare deploy: backend returned status 409: Agent already minted with same config_hash; use sync/login path
```

**Cause**: This agent was already minted with the exact same metadata. The system detected no changes and is telling you to just restart (not remint).

**Fix**: This is not an error — just restart your agent. `nft.Mint()` handles this automatically via the sync flow. If you're seeing this, your code may be calling the deploy endpoint directly instead of using `nft.Mint()`.

---

### `Agent already minted with different config_hash`

```
failed to prepare deploy: backend returned status 409: Agent already minted with different config_hash; use /api/sdk/agent/update
```

**Cause**: The agent exists but its metadata changed. The system wants you to update, not remint.

**Fix**: `nft.Mint()` handles this automatically — it detects the change and updates via the update endpoint. If you're seeing this, your code may be calling deploy directly instead of using `nft.Mint()`.

---

### `invalid private key`

**Cause**: The `PRIVATE_KEY` value is not valid hex.

**Fix**: Generate a new key:
```bash
openssl rand -hex 32
```
Must be exactly 64 hex characters (`a-f`, `0-9`). No `0x` prefix, no spaces, no quotes.

---

### `Agent ID can only contain lowercase letters, numbers, and hyphens`

**Cause**: Your `agentId` contains uppercase letters, spaces, underscores, or special characters.

**Fix**: Use only lowercase `a-z`, numbers `0-9`, and hyphens `-`:
```json
"agentId": "my-research-agent"
```

---

### `Categories validation failed: invalid category 'X'`

```
failed to update metadata: backend returned status 400: Categories validation failed: category 1: invalid category 'Utilities'
```

**Cause**: You used a category that is not in the valid category list. The deploy endpoint does not validate categories, so the initial mint succeeds. But the update endpoint validates strictly — so any future metadata update will fail if the agent was minted with an invalid category.

**Valid categories** (case-sensitive, exact match): `Trading`, `Finance`, `Crypto`, `Social Media`, `Lead Generation`, `E-Commerce`, `SEO`, `News`, `Real Estate`, `Travel`, `Automation`, `Developer Tools`, `AI`, `Integrations`, `Open Source`, `Jobs`, `Price Lists`, `Other`

**Fix**: If your agent was minted with an invalid category (e.g., `"Utilities"`, `"Research"`, `"Analytics"`, `"DeFi"`), the only fix is to mint a new agent with a correct category and a new `agentId`. The old agent cannot be updated.

To avoid this: always use a category from the valid list above when creating your JSON metadata.

---

### Build errors / `cannot find module`

**Cause**: Dependencies not downloaded or Go version too old.

**Fix**:
```bash
go version   # must be 1.24+
go mod tidy
go build -o my-agent .
```

---

### Agent starts but doesn't receive tasks

**Cause**: The agent connected to WebSocket but isn't public yet. New agents are only visible to their creator until approved by the Teneo team.

**Fix**: This is normal for new agents. Test your agent by sending tasks through the [Agent Console](https://agent-console.ai) using the same wallet that created it. To make it public: `~/teneo-skill/teneo agent submit <agent-id> <tokenId>`

## Querying Existing Agents

To discover and query agents already running on the Teneo network — for data retrieval, analytics, social media lookups, and more — use the `teneo-cli` skill.

## Links

- **SDK**: https://github.com/TeneoProtocolAI/teneo-agent-sdk
- **Chain**: peaq (Chain ID 3338)
- **Payments**: x402 micropayments, USDC settlement
- **Agent Console**: https://agent-console.ai
- **Deploy UI**: https://deploy.teneo-protocol.ai
- **EULA**: https://cdn.teneo.pro/Teneo_Agent_SDK_End_User_License_Agreement_(EULA)_v1_1_0.pdf
- **Discord**: https://discord.com/invite/teneoprotocol

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
| [Aave V3 Liquidation Watcher - powered by Teneo Protocol - powered by Teneo Protocol - powered by Teneo Protocol - powered by Teneo Protocol - powered by Teneo Protocol - powered by Teneo Protocol - powered by Teneo Protocol](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-aave-v3-liquidation-watcher-powered-by-teneo-protocol-powered-by-teneo-protocol-powered-by-teneo-protocol-powered-by-teneo-protocol-powered-by-teneo-protocol-powered-by-teneo-protocol-powered-by-teneo-protocol/SKILL.md) | 0 | - |

<!-- /AGENTS_LIST -->
