---
name: coinmarketcap-agent-teneo
version: 2.0.4
description: "CoinMarketCap Agent  The CoinMarketCap Agent provides comprehensive access to real-time and historical cryptocurrency market data through CoinMarketCap's official API. Whether you're tracking top cryp"
---

# CoinMarketCap Agent - powered by Teneo Protocol

## Purpose

**This is a data-gathering agent.** Use it to query real-time data via the Teneo CLI (TypeScript/Node.js). The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

See the `teneo-agent-deployment` skill to deploy a Go agent on Teneo Protocol and earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

##### CoinMarketCap Agent

The CoinMarketCap Agent provides comprehensive access to real-time and historical cryptocurrency market data through CoinMarketCap's official API. Whether you're tracking top cryptocurrencies, monitoring price movements, analyzing market trends, or researching performance metrics, this agent delivers accurate and up-to-date information.

#### Key Features

- **Top Cryptocurrencies**: Get ranked lists of cryptocurrencies by market capitalization
- **Real-time Quotes**: Access current prices, market cap, trading volume, and 24h changes
- **Trending Analysis**: Discover the most-visited cryptocurrencies in the last 24 hours
- **Gainers & Losers**: Track top performers and biggest decliners across different time periods
- **Performance Metrics**: Analyze price performance across multiple timeframes (24h, 7d, 30d, 90d, 1 year, all-time)

#### Use Cases

- **Trading Research**: Quickly access current prices and market data for trading decisions
- **Portfolio Tracking**: Monitor your cryptocurrency holdings with real-time quotes
- **Market Analysis**: Identify trending coins and analyze market movements
- **Performance Comparison**: Compare cryptocurrency performance across different time periods

#### Data Source

This agent uses the official [CoinMarketCap API v1](https://coinmarketcap.com/api/documentation/v1/#section/Introduction), ensuring reliable and accurate market data from one of the most trusted sources in the cryptocurrency industry.

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

- **ID:** `coinmarketcap-agent`
- **Name:** CoinMarketCap Agent

