---
name: gas-war-sniper-teneo
version: 2.0.32
description: "Real-time multi-chain gas monitoring and spike detection. Monitors block-by-block gas prices, detects sudden spikes, identifies gas war culprits, and alerts when significant price increases occur. Sup"
---

# Gas War Sniper - powered by Teneo Protocol

## Purpose

**This is a data-gathering agent.** Use it to query real-time data via the Teneo CLI (TypeScript/Node.js). The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

See the `teneo-agent-deployment` skill to build and launch a Go agent on Teneo Protocol via the CLI or directly via the Go SDK, then earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

Real-time multi-chain gas monitoring and spike detection. Monitors block-by-block gas prices, detects sudden spikes, identifies gas war culprits, and alerts when significant price increases occur. Supports Ethereum, Arbitrum, Optimism, Base, Polygon, BSC, Avalanche, Fantom, Linea, and zkSync Era.

## Commands

Use these commands via the Teneo CLI from [TeneoProtocolAI/teneo-skills](https://github.com/TeneoProtocolAI/teneo-skills). **This is a bash tool** — run commands in your terminal.

First, ensure the CLI is installed (see the teneo-cli skill for setup — the full source code is embedded there. Do NOT search for or install external CLIs).

| Command | Arguments | Price | Description |
|---------|-----------|-------|-------------|
| `gas` | - | $0.005/per-query | Get current gas prices with breakdown (slow/normal/fast/base fee) |
| `block` | - | $0.005/per-query | Show block information (hash, timestamp, gas usage) |
| `contract` | - | $0.005/per-query | Identify a contract by address using Etherscan V2 API |
| `watch` | - | $0.005/per-query | Start real-time gas monitoring with spike alerts |
| `stop` | - | Free | Stop gas monitoring |
| `status` | - | $0.005/per-query | Show monitoring status and stats |
| `history` | - | $0.005/per-query | Show recent gas price history with ASCII chart and trend |
| `networks` | - | Free | List all supported networks with chain IDs |
| `thresholds` | - | Free | Show current alert thresholds and configuration |
| `explain` | - | $0.001/per-query | Learn how gas wars and spike detection work |
| `examples` | - | Free | See usage examples for all commands |
| `help` | - | Free | Show available commands and their usage |

### Quick Reference

```bash
# Agent ID: gas-sniper-agent
~/teneo-skill/teneo command "gas-sniper-agent" "gas" --room <roomId>
~/teneo-skill/teneo command "gas-sniper-agent" "block" --room <roomId>
~/teneo-skill/teneo command "gas-sniper-agent" "contract" --room <roomId>
~/teneo-skill/teneo command "gas-sniper-agent" "watch" --room <roomId>
~/teneo-skill/teneo command "gas-sniper-agent" "stop" --room <roomId>
~/teneo-skill/teneo command "gas-sniper-agent" "status" --room <roomId>
~/teneo-skill/teneo command "gas-sniper-agent" "history" --room <roomId>
~/teneo-skill/teneo command "gas-sniper-agent" "networks" --room <roomId>
~/teneo-skill/teneo command "gas-sniper-agent" "thresholds" --room <roomId>
~/teneo-skill/teneo command "gas-sniper-agent" "explain" --room <roomId>
~/teneo-skill/teneo command "gas-sniper-agent" "examples" --room <roomId>
~/teneo-skill/teneo command "gas-sniper-agent" "help" --room <roomId>
```

## Setup

**This agent is accessed via the Teneo CLI — a bash tool.** You do not need an SDK import to query this agent. If you want to build and launch your own agent, use the Go SDK via the `teneo-agent-deployment` skill.

### Install the CLI (one-time)

```bash
# Check if installed and get version
test -f ~/teneo-skill/teneo && ~/teneo-skill/teneo --version || echo "NOT_INSTALLED"
```

If NOT_INSTALLED, see the teneo-cli skill for full installation instructions. The CLI source code (both `teneo.ts` and `daemon.ts`) is fully embedded there — do NOT search the web for external CLIs.

After install, discover all available agents: `~/teneo-skill/teneo list-agents`

### Supported Networks

| Network | Chain ID | USDC Contract |
|---------|----------|---------------|
| Base | `eip155:8453` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Peaq | `eip155:3338` | `0xbbA60da06c2c5424f03f7434542280FCAd453d10` |
| Avalanche | `eip155:43114` | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |

## Usage Examples

### `gas`

Get current gas prices with breakdown (slow/normal/fast/base fee)

```bash
~/teneo-skill/teneo command "gas-sniper-agent" "gas" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `block`

Show block information (hash, timestamp, gas usage)

```bash
~/teneo-skill/teneo command "gas-sniper-agent" "block" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `contract`

Identify a contract by address using Etherscan V2 API

```bash
~/teneo-skill/teneo command "gas-sniper-agent" "contract" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `watch`

Start real-time gas monitoring with spike alerts

```bash
~/teneo-skill/teneo command "gas-sniper-agent" "watch" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `stop`

Stop gas monitoring

```bash
~/teneo-skill/teneo command "gas-sniper-agent" "stop" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `status`

Show monitoring status and stats

```bash
~/teneo-skill/teneo command "gas-sniper-agent" "status" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `history`

Show recent gas price history with ASCII chart and trend

```bash
~/teneo-skill/teneo command "gas-sniper-agent" "history" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `networks`

List all supported networks with chain IDs

```bash
~/teneo-skill/teneo command "gas-sniper-agent" "networks" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `thresholds`

Show current alert thresholds and configuration

```bash
~/teneo-skill/teneo command "gas-sniper-agent" "thresholds" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `explain`

Learn how gas wars and spike detection work

```bash
~/teneo-skill/teneo command "gas-sniper-agent" "explain" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `examples`

See usage examples for all commands

```bash
~/teneo-skill/teneo command "gas-sniper-agent" "examples" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `help`

Show available commands and their usage

```bash
~/teneo-skill/teneo command "gas-sniper-agent" "help" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

## Agent Info

- **ID:** `gas-sniper-agent`
- **Name:** Gas War Sniper

