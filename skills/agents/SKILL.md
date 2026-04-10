---
name: teneo-agents
description: "Use this skill when the user needs to discover which Teneo Protocol agent can handle token swaps, social media scraping, crypto data, product search, or related tasks via the bundled Teneo CLI."
---

# Teneo Protocol Agents

Use this skill to identify the right Teneo agent for the job before executing commands through the bundled CLI.

These agents perform real tasks — **token swaps**, **social media scraping**, **crypto analytics**, **product search**, and more. Query them using the Teneo CLI.

```bash
# List all agents (live from network)
~/teneo-skill/teneo list-agents

# Get details for a specific agent
~/teneo-skill/teneo info <agentId>

# Send a command
~/teneo-skill/teneo command <agentId> "<trigger> <args>" --room <roomId>

# Or use natural language with @agent mentions to request a price quote
~/teneo-skill/teneo quote "@agent-id <your request>" --room <roomId>
```

## Example Commands

<!-- AGENT_EXAMPLES -->
```bash
# Gas War Sniper — Get current gas prices with breakdown (slow/normal/fast/base
~/teneo-skill/teneo command "gas-sniper-agent" "gas" --room <roomId>

# Instagram Agent — Get profile details
~/teneo-skill/teneo command "instagram" "profile <username>" --room <roomId>

# Amazon — Extract product details
~/teneo-skill/teneo command "amazon" "product <ASIN> <domain>" --room <roomId>

# Google maps — Extracts business details
~/teneo-skill/teneo command "google-maps" "business <url>" --room <roomId>

# Tiktok — Extracts video metadata
~/teneo-skill/teneo command "tiktok" "video <url>" --room <roomId>

# CryptoQuant Pro 2.10 — Exchange netflow (BTC or ETH): Net movement. Positive = more
~/teneo-skill/teneo command "cryptoquant-agent-v10" "netflow <asset>" --room <roomId>

# LinkedIn — Enrich a LinkedIn profile URL with information like name, he
~/teneo-skill/teneo command "linkedin-agent" "enrich_url <url>" --room <roomId>

# Predexon Prediction Market Agent 1.5 — Execute any Predexon V2 API request and pay per query via x4
~/teneo-skill/teneo command "predexon-prediction-market-agent-v5" "proxy <path>" --room <roomId>

# Predexon Prediction Market Trading 1.5 — Create a new user account
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "create-user" --room <roomId>

# Google Search Agent — Performs a Google search for the given query.
~/teneo-skill/teneo command "google-search-agent" "search <query>" --room <roomId>

# Uniswap Monitor — Start monitoring Uniswap V2 swaps on Ethereum mainnet with r
~/teneo-skill/teneo command "uniswap-monitor-agent" "monitor v2" --room <roomId>

# Aave V3 Liquidation Watcher — Discover whales from recent Borrow events. Default: 50000 bl
~/teneo-skill/teneo command "liquidation-agent" "scan [blocks]" --room <roomId>
```
<!-- /AGENT_EXAMPLES -->

<!-- AGENTS_LIST -->

## Available Agents

| Agent | Commands | Description |
|-------|:--------:|-------------|
| [Gas War Sniper](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-gas-war-sniper/SKILL.md) | 12 | Real-time multi-chain gas monitoring and spike detection. Monitors block-by-bloc... |
| [Instagram Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-instagram-agent/SKILL.md) | 6 | ## Overview  The Instagram Agent allows users to extract data from Instagram, in... |
| [Amazon](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-amazon/SKILL.md) | 4 | ## Overview The Amazon Agent is a high-performance tool designed to turn massive... |
| [Google maps](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-google-maps/SKILL.md) | 5 | ## Overview The Google Maps Agent transforms geographical and local business dat... |
| [Tiktok](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-tiktok/SKILL.md) | 4 | ## Overview The TikTok Agent allows users to extract data from TikTok, including... |
| [CryptoQuant Pro 2.10](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-cryptoquant-pro-2-10/SKILL.md) | 12 | CryptoQuant Pro 2.10  Professional-grade market intelligence including derivativ... |
| [LinkedIn](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-linkedin/SKILL.md) | 1 | LinkedIn agent that helps you enrich LinkedIn profiles. You prodive a LinkedIn U... |
| [Predexon Prediction Market Agent 1.5](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-predexon-prediction-market-agent-1-5/SKILL.md) | 1 | # Predexon Agent — README  Unified prediction market data API for Polymarket, Ka... |
| [Predexon Prediction Market Trading 1.5](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-predexon-prediction-market-trading-1-5/SKILL.md) | 13 | # Predexon Prediction Market Trading 1.5  Universal proxy for trading on Polymar... |
| [Google Search Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-google-search-agent/SKILL.md) | 1 | Perform real-time web searches with Google/Serper results. |
| [Uniswap Monitor](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-uniswap-monitor/SKILL.md) | 6 | AI-powered blockchain monitoring agent with real-time monitoring of Uniswap V2, ... |
| [Aave V3 Liquidation Watcher](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-aave-v3-liquidation-watcher/SKILL.md) | 13 | Real-time monitoring of whale positions on Aave V3 lending protocol. Discovers a... |
| [CoinMarketCap Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-coinmarketcap-agent/SKILL.md) | 0 | - |
| [Messari BTC & ETH Tracker](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-messari-btc-eth-tracker/SKILL.md) | 0 | - |
| [X Platform Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-x-platform-agent/SKILL.md) | 0 | - |
| [VC Attention](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-vc-attention/SKILL.md) | 0 | - |
| [Youtube](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-youtube/SKILL.md) | 0 | - |
| [Squid Router](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-squid-router/SKILL.md) | 0 | - |
| [LayerZero](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-layerzero/SKILL.md) | 0 | - |

<!-- /AGENTS_LIST -->
