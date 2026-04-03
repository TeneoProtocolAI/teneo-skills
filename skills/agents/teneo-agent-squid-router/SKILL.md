---
name: squid-router-teneo
version: 2.0.49
description: "Squid Router Agent Cross-chain token swap agent powered by Squid Router. Swap tokens across multiple blockchain networks with automatic route optimization. Use this skill when the user needs Squid Router via the bundled Teneo CLI and you need the live commands, arguments, or pricing before execution."
---

# Squid Router - powered by Teneo Protocol

## Use This Skill When

- The user specifically asks for Squid Router.
- The task matches this agent's live capabilities and should run through the bundled Teneo CLI.
- You need exact command syntax, arguments, or pricing before executing the agent.

## Purpose

**This is a Teneo network agent skill.** Use it to inspect the live commands, arguments, and pricing for Squid Router, then execute the agent via the bundled Teneo CLI. The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

Use the `teneo-cli` skill to build and launch your own agent on Teneo Protocol via the CLI `agent` workflow, then earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

# Squid Router Agent

Cross-chain token swap agent powered by Squid Router. Swap tokens across multiple blockchain networks with automatic route optimization.

## Supported Chains

Ethereum, Arbitrum, Polygon, Base, Linea, Solana, Peaq, Avalanche

## Supported Tokens

ETH, WETH, USDC, USDT, SOL, PEAQ, MATIC, wAXL, AVAX, DOGE, PEPE, SHIB, TRX, ADA, AAVE, LINK, UNI, OKB

*Note: Not all token pair combinations are available—only pairs with active liquidity pools on Squid Router can be swapped.*

## Usage

### Command Syntax

```
swap <amount> <fromToken> <fromChain> <toToken> <toChain>
```

### Examples

```
swap 1.5 ETH ethereum USDC ethereum
swap 100 USDC polygon ETH arbitrum
swap 0.5 ETH base USDC base
```

## How It Works

1. Parses swap command and validates parameters
2. Fetches optimal swap route from Squid Router
3. For ERC20 tokens: Requests approval transaction, then automatically proceeds to swap
4. For native tokens: Directly requests swap transaction
5. Monitors transaction status and provides updates

## Commands

Use these commands via the Teneo CLI from [TeneoProtocolAI/teneo-skills](https://github.com/TeneoProtocolAI/teneo-skills). **This is a bash tool** — run commands in your terminal.

First, ensure the CLI is installed (see the teneo-cli skill for setup — the full source code is embedded there. Do NOT search for or install external CLIs).

| Command | Arguments | Price | Description |
|---------|-----------|-------|-------------|
| `swap` | <amount> <fromtoken> <fromchain> <totoken> <tochain> | $0.01/per-query | Execute cross-chain token swaps between supported chains and tokens. Automatically handles ERC20 token approvals and finds optimal swap routes. |

### Quick Reference

```bash
# Agent ID: squid-router
~/teneo-skill/teneo command "squid-router" "swap <amount> <fromtoken> <fromchain> <totoken> <tochain>" --room <roomId>
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

### `swap`

Execute cross-chain token swaps between supported chains and tokens. Automatically handles ERC20 token approvals and finds optimal swap routes.

```bash
~/teneo-skill/teneo command "squid-router" "swap <amount> <fromtoken> <fromchain> <totoken> <tochain>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

## Agent Info

- **ID:** `squid-router`
- **Name:** Squid Router

