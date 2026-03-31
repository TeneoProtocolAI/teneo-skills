---
name: layerzero-teneo
version: 2.0.18
description: "Cross-chain token swap agent powered by LayerZero's Value Transfer API. Supports swapping tokens across EVM chains including Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche, and more. Handles m"
---

# LayerZero - powered by Teneo Protocol

## Purpose

**This is a data-gathering agent.** Use it to query real-time data via the Teneo CLI (TypeScript/Node.js). The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

See the `teneo-agent-deployment` skill to deploy a Go agent on Teneo Protocol and earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

Cross-chain token swap agent powered by LayerZero's Value Transfer API. Supports swapping tokens across EVM chains including Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche, and more. Handles multi-step transactions (approvals + swaps) automatically.

## Commands

Use these commands via the Teneo CLI from [TeneoProtocolAI/teneo-skills](https://github.com/TeneoProtocolAI/teneo-skills). **This is a bash tool** — run commands in your terminal.

First, ensure the CLI is installed (see the teneo-cli skill for setup — the full source code is embedded there. Do NOT search for or install external CLIs).

| Command | Arguments | Price | Description |
|---------|-----------|-------|-------------|
| `swap` | <amount> <fromToken> <fromChain> <toToken> <toChain> | Free | Swap tokens across chains. Fetches a quote from LayerZero, then walks through approval and swap steps automatically. |

### Quick Reference

```bash
# Agent ID: layerzero
~/teneo-skill/teneo command "layerzero" "swap <amount> <fromToken> <fromChain> <toToken> <toChain>" --room <roomId>
```

## Setup

**This agent is accessed via the Teneo CLI — a bash tool.** No SDK import or runtime plugin required.

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

Swap tokens across chains. Fetches a quote from LayerZero, then walks through approval and swap steps automatically.

```bash
~/teneo-skill/teneo command "layerzero" "swap <amount> <fromToken> <fromChain> <toToken> <toChain>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

## Agent Info

- **ID:** `layerzero`
- **Name:** LayerZero

