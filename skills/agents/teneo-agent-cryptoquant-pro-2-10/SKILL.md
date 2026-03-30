---
name: cryptoquant-pro-2-10-teneo
version: 2.0.10
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

## Commands

Use these commands via the Teneo CLI from [TeneoProtocolAI/teneo-skills](https://github.com/TeneoProtocolAI/teneo-skills). **This is a bash tool** — run commands in your terminal.

First, ensure the CLI is installed (see the teneo-cli skill for setup — the full source code is embedded there. Do NOT search for or install external CLIs).

| Command | Arguments | Price | Description |
|---------|-----------|-------|-------------|
| `netflow` | <asset> | $0.01/per-query | Exchange netflow (BTC or ETH): Net movement. Positive = more BTC/ETH flowing into exchanges (sell pressure). Negative = flowing out (accumulation) |
| `reserve` | <asset> | $0.01/per-query | Exchange reserve (BTC or ETH): The amount of BTC/ETH held on all exchanges. A decreasing reserve is often seen as a bullish signal. |
| `whale-ratio` | <asset> | $0.01/per-query | Whale ratio (BTC only): Whale influence. Shows the buying/selling share of the largest 10 transactions. High values often signal whale sell pressure. |
| `funding` | <asset> | $0.01/per-query | Funding rates (BTC or ETH): Trader positioning. Tells you whether futures traders are long or short. Positive = Longs are paying shorts (bullish stance) |
| `oi` | <asset> | $0.01/per-query | Open interest (BTC or ETH): Rising OI indicates new capital/leverage entering the market. |
| `leverage` | <asset> | $0.01/per-query | Leverage ratio (BTC or ETH): Risk assessment. Measures the average leverage used by traders. High leverage significantly increases the risk of market liquidations. |
| `mvrv` | <asset> | $0.01/per-query | MVRV ratio (BTC or ETH): Market health. Compares current market value to realized value. Used to identify potential cycle tops (overvalued) or bottoms (undervalued). |
| `nupl` | <asset> | $0.01/per-query | NUPL (BTC only): Macro sentiment. Shows the ratio of unrealized profit vs. loss across the network. Signals macro market cycle stages (e.g., capitulation vs. euphoria). |
| `sopr` | <asset> | $0.01/per-query | SOPR (BTC only): Panic/Profitability. Measures if holders are selling at a profit or a loss. Values below 1 signal capitulation (market bottoming). |
| `mpi` | <asset> | $0.01/per-query | Miner position index (BTC only): Miner behavior. Compares miner outflows to historical averages. High values indicate miners are selling their reserves to the market. |
| `stable-reserve` | - | $0.01/per-query | Stablecoin Reserve. Stablecoin buying power on exchanges. High = bullish potential. Incl. usdc, usdt_eth, usdt_trx, dai, tusd, busd, etc. |
| `stable-netflow` | - | $0.01/per-query | Stablecoin Netflow: Stablecoins flowing in (bullish) or out (bearish) of exchanges. incl. usdc, usdt_eth, usdt_trx, dai, tusd, busd, etc. |

### Quick Reference

```bash
# Agent ID: cryptoquant-agent-v10
~/teneo-skill/teneo command "cryptoquant-agent-v10" "netflow <asset>" --room <roomId>
~/teneo-skill/teneo command "cryptoquant-agent-v10" "reserve <asset>" --room <roomId>
~/teneo-skill/teneo command "cryptoquant-agent-v10" "whale-ratio <asset>" --room <roomId>
~/teneo-skill/teneo command "cryptoquant-agent-v10" "funding <asset>" --room <roomId>
~/teneo-skill/teneo command "cryptoquant-agent-v10" "oi <asset>" --room <roomId>
~/teneo-skill/teneo command "cryptoquant-agent-v10" "leverage <asset>" --room <roomId>
~/teneo-skill/teneo command "cryptoquant-agent-v10" "mvrv <asset>" --room <roomId>
~/teneo-skill/teneo command "cryptoquant-agent-v10" "nupl <asset>" --room <roomId>
~/teneo-skill/teneo command "cryptoquant-agent-v10" "sopr <asset>" --room <roomId>
~/teneo-skill/teneo command "cryptoquant-agent-v10" "mpi <asset>" --room <roomId>
~/teneo-skill/teneo command "cryptoquant-agent-v10" "stable-reserve" --room <roomId>
~/teneo-skill/teneo command "cryptoquant-agent-v10" "stable-netflow" --room <roomId>
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

### `netflow`

Exchange netflow (BTC or ETH): Net movement. Positive = more BTC/ETH flowing into exchanges (sell pressure). Negative = flowing out (accumulation)

```bash
~/teneo-skill/teneo command "cryptoquant-agent-v10" "netflow <asset>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `reserve`

Exchange reserve (BTC or ETH): The amount of BTC/ETH held on all exchanges. A decreasing reserve is often seen as a bullish signal.

```bash
~/teneo-skill/teneo command "cryptoquant-agent-v10" "reserve <asset>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `whale-ratio`

Whale ratio (BTC only): Whale influence. Shows the buying/selling share of the largest 10 transactions. High values often signal whale sell pressure.

```bash
~/teneo-skill/teneo command "cryptoquant-agent-v10" "whale-ratio <asset>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `funding`

Funding rates (BTC or ETH): Trader positioning. Tells you whether futures traders are long or short. Positive = Longs are paying shorts (bullish stance)

```bash
~/teneo-skill/teneo command "cryptoquant-agent-v10" "funding <asset>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `oi`

Open interest (BTC or ETH): Rising OI indicates new capital/leverage entering the market.

```bash
~/teneo-skill/teneo command "cryptoquant-agent-v10" "oi <asset>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `leverage`

Leverage ratio (BTC or ETH): Risk assessment. Measures the average leverage used by traders. High leverage significantly increases the risk of market liquidations.

```bash
~/teneo-skill/teneo command "cryptoquant-agent-v10" "leverage <asset>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `mvrv`

MVRV ratio (BTC or ETH): Market health. Compares current market value to realized value. Used to identify potential cycle tops (overvalued) or bottoms (undervalued).

```bash
~/teneo-skill/teneo command "cryptoquant-agent-v10" "mvrv <asset>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `nupl`

NUPL (BTC only): Macro sentiment. Shows the ratio of unrealized profit vs. loss across the network. Signals macro market cycle stages (e.g., capitulation vs. euphoria).

```bash
~/teneo-skill/teneo command "cryptoquant-agent-v10" "nupl <asset>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `sopr`

SOPR (BTC only): Panic/Profitability. Measures if holders are selling at a profit or a loss. Values below 1 signal capitulation (market bottoming).

```bash
~/teneo-skill/teneo command "cryptoquant-agent-v10" "sopr <asset>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `mpi`

Miner position index (BTC only): Miner behavior. Compares miner outflows to historical averages. High values indicate miners are selling their reserves to the market.

```bash
~/teneo-skill/teneo command "cryptoquant-agent-v10" "mpi <asset>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `stable-reserve`

Stablecoin Reserve. Stablecoin buying power on exchanges. High = bullish potential. Incl. usdc, usdt_eth, usdt_trx, dai, tusd, busd, etc.

```bash
~/teneo-skill/teneo command "cryptoquant-agent-v10" "stable-reserve" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `stable-netflow`

Stablecoin Netflow: Stablecoins flowing in (bullish) or out (bearish) of exchanges. incl. usdc, usdt_eth, usdt_trx, dai, tusd, busd, etc.

```bash
~/teneo-skill/teneo command "cryptoquant-agent-v10" "stable-netflow" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

## Agent Info

- **ID:** `cryptoquant-agent-v10`
- **Name:** CryptoQuant Pro 2.10

