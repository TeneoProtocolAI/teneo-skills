---
name: uniswap-monitor-teneo
version: 2.0.55
description: "AI-powered blockchain monitoring agent with real-time monitoring of Uniswap V2, V3, and V4 most known pools. Use this skill when the user needs Uniswap Monitor via the bundled Teneo CLI and you need the live commands, arguments, or pricing before execution."
---

# Uniswap Monitor - powered by Teneo Protocol

## Use This Skill When

- The user specifically asks for Uniswap Monitor.
- The task matches this agent's live capabilities and should run through the bundled Teneo CLI.
- You need exact command syntax, arguments, or pricing before executing the agent.

## Purpose

**This is a Teneo network agent skill.** Use it to inspect the live commands, arguments, and pricing for Uniswap Monitor, then execute the agent via the bundled Teneo CLI. The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

Use the `teneo-cli` skill to build and launch your own agent on Teneo Protocol via the CLI `agent` workflow, then earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

AI-powered blockchain monitoring agent with real-time monitoring of Uniswap V2, V3, and V4 most known pools. Track swaps, monitor specific liquidity pools by address, and receive intelligent insights on trading activity across Ethereum mainnet.

## Commands

Use these commands via the Teneo CLI from [TeneoProtocolAI/teneo-skills](https://github.com/TeneoProtocolAI/teneo-skills). **This is a bash tool** — run commands in your terminal.

First, ensure the CLI is installed (see the teneo-cli skill for setup — the full source code is embedded there. Do NOT search for or install external CLIs).

| Command | Arguments | Price | Description |
|---------|-----------|-------|-------------|
| `monitor v2` | - | Free | Start monitoring Uniswap V2 swaps on Ethereum mainnet with real-time notifications |
| `monitor v3` | - | Free | Start monitoring Uniswap V3 swaps on Ethereum mainnet with real-time notifications |
| `monitor v4` | - | Free | Start monitoring Uniswap V4 swaps (currently under development) |
| `monitor-pool` | [pool_address] | Free | Monitor a specific liquidity pool by contract address (example: 0x641c00a822e8b671738d32a431a4fb6074e5c79d for WETH/USDT) |
| `status` | - | Free | Check the current monitoring status and see what version or pool is being tracked |
| `stop` | - | Free | Stop the current monitoring session and cancel background swap tracking |

### Quick Reference

```bash
# Agent ID: uniswap-monitor-agent
~/teneo-skill/teneo command "uniswap-monitor-agent" "monitor v2" --room <roomId>
~/teneo-skill/teneo command "uniswap-monitor-agent" "monitor v3" --room <roomId>
~/teneo-skill/teneo command "uniswap-monitor-agent" "monitor v4" --room <roomId>
~/teneo-skill/teneo command "uniswap-monitor-agent" "monitor-pool [pool_address]" --room <roomId>
~/teneo-skill/teneo command "uniswap-monitor-agent" "status" --room <roomId>
~/teneo-skill/teneo command "uniswap-monitor-agent" "stop" --room <roomId>
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

### `monitor v2`

Start monitoring Uniswap V2 swaps on Ethereum mainnet with real-time notifications

```bash
~/teneo-skill/teneo command "uniswap-monitor-agent" "monitor v2" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `monitor v3`

Start monitoring Uniswap V3 swaps on Ethereum mainnet with real-time notifications

```bash
~/teneo-skill/teneo command "uniswap-monitor-agent" "monitor v3" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `monitor v4`

Start monitoring Uniswap V4 swaps (currently under development)

```bash
~/teneo-skill/teneo command "uniswap-monitor-agent" "monitor v4" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `monitor-pool`

Monitor a specific liquidity pool by contract address (example: 0x641c00a822e8b671738d32a431a4fb6074e5c79d for WETH/USDT)

```bash
~/teneo-skill/teneo command "uniswap-monitor-agent" "monitor-pool [pool_address]" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `status`

Check the current monitoring status and see what version or pool is being tracked

```bash
~/teneo-skill/teneo command "uniswap-monitor-agent" "status" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `stop`

Stop the current monitoring session and cancel background swap tracking

```bash
~/teneo-skill/teneo command "uniswap-monitor-agent" "stop" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

## Agent Info

- **ID:** `uniswap-monitor-agent`
- **Name:** Uniswap Monitor

