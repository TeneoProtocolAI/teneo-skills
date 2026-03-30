---
name: cryptoquant-pro-2-10-teneo
version: 2.0.4
description: "CryptoQuant Pro 2.10  Professional-grade market intelligence including derivatives, exchange flows, and network indicators for BTC and ETH.  This agent is designed for both human users and AI agents."
---

# CryptoQuant Pro 2.10 - powered by Teneo Protocol

## Purpose

**This is a data-gathering agent.** Use it to query real-time data via the Teneo CLI (TypeScript/Node.js). The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

See the `teneo-agent-deployment` skill to deploy a Go agent on Teneo Protocol and earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

CryptoQuant Pro 2.10

Professional-grade market intelligence including derivatives, exchange flows, and network indicators for BTC and ETH.

This agent is designed for both human users and AI agents. It accepts a trigger command followed by an asset.

• Trigger Format: [command] [asset]
• Example: netflow btc
• Response: Raw JSON data (always returned).
• Pricing: 0.01 USDC per successful query (charged only on 200 OK responses).

Supported Commands

| Trigger        | Description                                   | Asset Required |
| -------------- | --------------------------------------------- | -------------- |
| netflow        | Exchange Netflow (Sell/Accumulation pressure) | btc / eth      |
| reserve        | Exchange Reserve (Bullish/Bearish signal)     | btc / eth      |
| whale-ratio    | Whale Inflow Share (Whale sell pressure)      | btc only      |
| funding        | Funding Rates (Trader positioning)            | btc / eth      |
| oi             | Open Interest (Market leverage size)          | btc / eth      |
| leverage       | Estimated Leverage Ratio (Liquidation risk)   | btc / eth      |
| mvrv           | MVRV Valuation (Over/Undervalued signal)      | btc / eth      |
| nupl           | NUPL (Bitcoin Macro sentiment)                | btc only       |
| sopr           | SOPR (Bitcoin capitulation vs. profit)        | btc only       |
| mpi            | Miner Position Index (Miner sell pressure)    | btc only       |
| stable-reserve | Stablecoin Exchange Reserve                   | None           |
| stable-netflow | Stablecoin Netflow                            | None           |

Integration Guide

For UI/Human Users:

Enter the command and asset directly in the agent text field.

• Valid: netflow btc
• Valid: stable-netflow
• Invalid: netflow xrp (Rejected automatically)

For Teneo CLI/SDK Users:

Query the agent using the task string format:
// Example using Teneo SDK task string
task := "netflow btc"
response, err := agent.SendTask(task)
// Returns raw JSON or Error Message

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

## Agent Info

- **ID:** `cryptoquant-agent-v10`
- **Name:** CryptoQuant Pro 2.10

