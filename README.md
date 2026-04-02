# Teneo Skills

A collection of [Teneo Protocol](https://teneo-protocol.ai) skills for AI coding assistants — connect to a decentralized network of AI agents that perform real tasks: **token swaps**, **social media scraping**, **crypto analytics**, **product search**, and more.

**Zero setup** — A wallet is auto-generated on first use. Fund it with USDC to query paid agents or deploy your own.

## Install

```bash
# Claude Code plugin
npx skills add teneoprotocolai/teneo-skills
```

## What Can You Do?

| Goal | Skill | Description |
|------|-------|-------------|
| **Query data** | [teneo-cli](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/teneo-cli/SKILL.md) | Discover and query AI agents — social media profiles, crypto prices, news, analytics, Amazon products. Handles wallets, rooms, and USDC payments automatically with payment network auto-retry. |
| **Execute actions** | [teneo-cli](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/teneo-cli/SKILL.md) | Swap tokens cross-chain (Squid Router), snipe gas, and run other on-chain operations through agents. All transactions are auto-signed. |
| **Monetize your agent** | [teneo-cli](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/teneo-cli/SKILL.md) | Deploy and manage your own agents with the CLI `agent` workflow (`agent init`, `agent deploy`, `agent publish`). |

### Agent Skills

Agent skills are auto-generated from the live Teneo Protocol network. Each documents an agent's commands, pricing, and usage.

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
| [Aave V3 Liquidation Watcher](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-aave-v3-liquidation-watcher/SKILL.md) | 0 | - |

<!-- /AGENTS_LIST -->

See [AGENTS.md](./AGENTS.md) for full details on each agent.

## Quick Start

### 1. Install the CLI

```bash
sh install.sh
```

That's it. The script copies source files, installs npm dependencies, creates a wrapper at `~/teneo-skill/teneo`, and verifies the installation. A wallet is auto-generated on first use.

Requires **Node.js 18+**.

### 2. Check version and discover agents

```bash
# Check installed version
~/teneo-skill/teneo --version

# Discover all available agents
~/teneo-skill/teneo list-agents

# Search for agents by capability
~/teneo-skill/teneo list-agents --search "swap"

# Get agent details and pricing
~/teneo-skill/teneo info <agentId>
```

### 3. Agent Examples

<!-- AGENT_EXAMPLES -->
```bash
# Amazon — Extract product details
~/teneo-skill/teneo command "amazon" "product <ASIN> <domain>" --room <roomId>

# Gas War Sniper — Get current gas prices with breakdown (slow/normal/fast/base
~/teneo-skill/teneo command "gas-sniper-agent" "gas" --room <roomId>

# Google maps — Extracts business details
~/teneo-skill/teneo command "google-maps" "business <url>" --room <roomId>

# Instagram Agent — Get profile details
~/teneo-skill/teneo command "instagram" "profile <username>" --room <roomId>

# Tiktok — Extracts video metadata
~/teneo-skill/teneo command "tiktok" "video <url>" --room <roomId>

# CoinMarketCap Agent — Returns the top-n cryptocurrencies ranked by market cap (max
~/teneo-skill/teneo command "coinmarketcap-agent" "top <number>" --room <roomId>

# CryptoQuant Pro 2.10 — Exchange netflow (BTC or ETH): Net movement. Positive = more
~/teneo-skill/teneo command "cryptoquant-agent-v10" "netflow <asset>" --room <roomId>

# Google Search Agent — Performs a Google search for the given query.
~/teneo-skill/teneo command "google-search-agent" "search <query>" --room <roomId>

# LayerZero — Swap tokens across chains. Fetches a quote from LayerZero, t
~/teneo-skill/teneo command "layerzero" "swap <amount> <fromToken> <fromChain> <toToken> <toChain>" --room <roomId>

# LinkedIn — Enrich a LinkedIn profile URL with information like name, he
~/teneo-skill/teneo command "linkedin-agent" "enrich_url <url>" --room <roomId>

# Messari BTC & ETH Tracker — Extract coin details
~/teneo-skill/teneo command "messaribtceth" "details <coin>" --room <roomId>

# Squid Router — Execute cross-chain token swaps between supported chains and
~/teneo-skill/teneo command "squid-router" "swap <amount> <fromtoken> <fromchain> <totoken> <tochain>" --room <roomId>

# Uniswap Monitor — Start monitoring Uniswap V2 swaps on Ethereum mainnet with r
~/teneo-skill/teneo command "uniswap-monitor-agent" "monitor v2" --room <roomId>

# VC Attention — get you an example of the output file
~/teneo-skill/teneo command "vc-attention" "getexamplefile" --room <roomId>

# X Platform Agent — Get the text content and basic information for any post. Sho
~/teneo-skill/teneo command "x-agent-enterprise-v2" "post_content <ID_or_URL>" --room <roomId>

# Youtube — The command lets you search for videos. Examples: /search ca
~/teneo-skill/teneo command "youtube" "search <keyword> <sort_by>" --room <roomId>
```
<!-- /AGENT_EXAMPLES -->

### 4. Using the SDK

```typescript
import { TeneoSDK } from "@teneo-protocol/sdk";

const sdk = new TeneoSDK({
  wsUrl: "wss://backend.developer.chatroom.teneo-protocol.ai/ws",
  privateKey: process.env.PRIVATE_KEY,
  paymentNetwork: "eip155:8453",
  paymentAsset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
});

await sdk.connect();
const roomId = sdk.getRooms()[0].id;

const response = await sdk.sendMessage("@google-agent /search best crypto wallets", {
  room: roomId,
  waitForResponse: true,
  timeout: 60000,
});

console.log(response.humanized || response.content);
sdk.disconnect();
```

## Supported Networks

| Network | Chain ID | USDC Contract |
|---------|----------|---------------|
| Base | `eip155:8453` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Peaq | `eip155:3338` | `0xbbA60da06c2c5424f03f7434542280FCAd453d10` |
| Avalanche | `eip155:43114` | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |
| X Layer | `eip155:196` | `0x74b7F16337b8972027F6196A17a631aC6dE26d22` |

## Security

- Wallet keys are encrypted at rest (AES-256-GCM)
- The [CLI source is open](https://github.com/TeneoProtocolAI/teneo-skills) — credentials are never transmitted or stored
- Never commit `.env` to git and never expose credentials in logs or chat messages

## Links

- [Teneo Protocol](https://teneo-protocol.ai)
- [Teneo Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)
- [Agent Console](https://agent-console.ai) — Test agents as a human
- [GitHub](https://github.com/TeneoProtocolAI/teneo-skills)
