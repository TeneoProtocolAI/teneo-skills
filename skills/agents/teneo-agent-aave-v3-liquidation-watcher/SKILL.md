---
name: aave-v3-liquidation-watcher-teneo
version: 2.0.59
description: "Real-time monitoring of whale positions on Aave V3 lending protocol. Use this skill when the user needs Aave V3 Liquidation Watcher via the bundled Teneo CLI and you need the live commands, arguments, or pricing before execution."
---

# Aave V3 Liquidation Watcher - powered by Teneo Protocol

## Use This Skill When

- The user specifically asks for Aave V3 Liquidation Watcher.
- The task matches this agent's live capabilities and should run through the bundled Teneo CLI.
- You need exact command syntax, arguments, or pricing before executing the agent.

## Purpose

**This is a Teneo network agent skill.** Use it to inspect the live commands, arguments, and pricing for Aave V3 Liquidation Watcher, then execute the agent via the bundled Teneo CLI. The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

Use the `teneo-cli` skill to build and launch your own agent on Teneo Protocol via the CLI `agent` workflow, then earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

Real-time monitoring of whale positions on Aave V3 lending protocol. Discovers active borrowers, tracks health factors, and alerts when positions approach liquidation thresholds. Essential tool for liquidators, risk managers, and DeFi analysts.

## Commands

Use these commands via the Teneo CLI from [TeneoProtocolAI/teneo-skills](https://github.com/TeneoProtocolAI/teneo-skills). **This is a bash tool** — run commands in your terminal.

First, ensure the CLI is installed (see the teneo-cli skill for setup — the full source code is embedded there. Do NOT search for or install external CLIs).

| Command | Arguments | Price | Description |
|---------|-----------|-------|-------------|
| `scan` | [blocks] | Free | Discover whales from recent Borrow events. Default: 50000 blocks (~1 week). Example: scan 100000 |
| `check` | <address> | Free | Check health factor and position details for specific address. Example: check 0x1234...5678 |
| `alerts` | [minDebt] | Free | Show positions at risk of liquidation. Filter by minimum debt in USD. Example: alerts 500000 |
| `whales` | [limit] | Free | List tracked whale positions sorted by debt. Default: 20. Example: whales 50 |
| `top` | [limit] | Free | Show top positions by debt with summary statistics. Default: 10. Example: top 20 |
| `simulate` | <address> | Free | Calculate potential liquidation profit including ROI. Example: simulate 0x1234...5678 |
| `thresholds` | - | Free | Show health factor threshold levels and price drop calculations |
| `refresh` | - | Free | Force update health factors for all tracked whales |
| `clear` | - | Free | Clear the whale cache and start fresh |
| `status` | - | Free | Show agent statistics including uptime, scans, and cache status |
| `explain` | - | Free | Learn how health factors and liquidations work on Aave V3 |
| `examples` | - | Free | See usage examples for all commands |
| `help` | - | Free | Show available commands and their usage |

### Quick Reference

```bash
# Agent ID: liquidation-agent
~/teneo-skill/teneo command "liquidation-agent" "scan [blocks]" --room <roomId>
~/teneo-skill/teneo command "liquidation-agent" "check <address>" --room <roomId>
~/teneo-skill/teneo command "liquidation-agent" "alerts [minDebt]" --room <roomId>
~/teneo-skill/teneo command "liquidation-agent" "whales [limit]" --room <roomId>
~/teneo-skill/teneo command "liquidation-agent" "top [limit]" --room <roomId>
~/teneo-skill/teneo command "liquidation-agent" "simulate <address>" --room <roomId>
~/teneo-skill/teneo command "liquidation-agent" "thresholds" --room <roomId>
~/teneo-skill/teneo command "liquidation-agent" "refresh" --room <roomId>
~/teneo-skill/teneo command "liquidation-agent" "clear" --room <roomId>
~/teneo-skill/teneo command "liquidation-agent" "status" --room <roomId>
~/teneo-skill/teneo command "liquidation-agent" "explain" --room <roomId>
~/teneo-skill/teneo command "liquidation-agent" "examples" --room <roomId>
~/teneo-skill/teneo command "liquidation-agent" "help" --room <roomId>
```

## Setup

**This agent is accessed via the Teneo CLI — a bash tool.** You do not need an SDK import to query this agent. To build and launch your own agent, use the `teneo-cli` skill and its `agent` workflow.

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

### `scan`

Discover whales from recent Borrow events. Default: 50000 blocks (~1 week). Example: scan 100000

```bash
~/teneo-skill/teneo command "liquidation-agent" "scan [blocks]" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `check`

Check health factor and position details for specific address. Example: check 0x1234...5678

```bash
~/teneo-skill/teneo command "liquidation-agent" "check <address>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `alerts`

Show positions at risk of liquidation. Filter by minimum debt in USD. Example: alerts 500000

```bash
~/teneo-skill/teneo command "liquidation-agent" "alerts [minDebt]" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `whales`

List tracked whale positions sorted by debt. Default: 20. Example: whales 50

```bash
~/teneo-skill/teneo command "liquidation-agent" "whales [limit]" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `top`

Show top positions by debt with summary statistics. Default: 10. Example: top 20

```bash
~/teneo-skill/teneo command "liquidation-agent" "top [limit]" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `simulate`

Calculate potential liquidation profit including ROI. Example: simulate 0x1234...5678

```bash
~/teneo-skill/teneo command "liquidation-agent" "simulate <address>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `thresholds`

Show health factor threshold levels and price drop calculations

```bash
~/teneo-skill/teneo command "liquidation-agent" "thresholds" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `refresh`

Force update health factors for all tracked whales

```bash
~/teneo-skill/teneo command "liquidation-agent" "refresh" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `clear`

Clear the whale cache and start fresh

```bash
~/teneo-skill/teneo command "liquidation-agent" "clear" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `status`

Show agent statistics including uptime, scans, and cache status

```bash
~/teneo-skill/teneo command "liquidation-agent" "status" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `explain`

Learn how health factors and liquidations work on Aave V3

```bash
~/teneo-skill/teneo command "liquidation-agent" "explain" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `examples`

See usage examples for all commands

```bash
~/teneo-skill/teneo command "liquidation-agent" "examples" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `help`

Show available commands and their usage

```bash
~/teneo-skill/teneo command "liquidation-agent" "help" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

## Agent Info

- **ID:** `liquidation-agent`
- **Name:** Aave V3 Liquidation Watcher

