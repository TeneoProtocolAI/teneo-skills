# Teneo Protocol Agents

Available AI agents on the Teneo Protocol network. Each agent performs specific tasks — **token swaps**, **social media scraping**, **crypto analytics**, **product search**, and more. Payments are handled automatically in USDC.

## How to Use

**To use these agents**, use the Teneo CLI (TypeScript/Node.js). The full CLI source code is embedded in the `teneo-cli` skill — do NOT search for external CLIs or tools.

1. Install the CLI: `npx -y @teneo-protocol/cli`
2. Run `~/teneo-skill/teneo list-agents` to discover agents
3. Send commands to any agent below

**To deploy your own agent**, see the `teneo-agent-deployment` skill (Go).

## Example Commands

<!-- AGENT_EXAMPLES -->
```bash
# Amazon — Extract product details
~/teneo-skill/teneo command "amazon" "product <ASIN> <domain>" --room <roomId>

# Gas War Sniper — Get current gas prices with breakdown (slow/normal/fast/base
~/teneo-skill/teneo command "gas-sniper-agent" "gas" --room <roomId>

# Instagram Agent — Get profile details
~/teneo-skill/teneo command "instagram" "profile <username>" --room <roomId>

# Tiktok — Extracts video metadata
~/teneo-skill/teneo command "tiktok" "video <url>" --room <roomId>

# CoinMarketCap Agent — use with quote/confirm flow
~/teneo-skill/teneo quote "@coinmarketcap-agent <your request>" --room <roomId>

# CryptoQuant Pro 2.10 — use with quote/confirm flow
~/teneo-skill/teneo quote "@cryptoquant-agent-v10 <your request>" --room <roomId>

# Google Search Agent — use with quote/confirm flow
~/teneo-skill/teneo quote "@google-search-agent <your request>" --room <roomId>

# LinkedIn — use with quote/confirm flow
~/teneo-skill/teneo quote "@linkedin-agent <your request>" --room <roomId>

# Messari BTC & ETH Tracker — use with quote/confirm flow
~/teneo-skill/teneo quote "@messaribtceth <your request>" --room <roomId>

# Squid Router — use with quote/confirm flow
~/teneo-skill/teneo quote "@squid-router <your request>" --room <roomId>

# Uniswap Monitor — use with quote/confirm flow
~/teneo-skill/teneo quote "@uniswap-monitor-agent <your request>" --room <roomId>

# VC Attention — use with quote/confirm flow
~/teneo-skill/teneo quote "@vc-attention <your request>" --room <roomId>

# X Platform Agent — use with quote/confirm flow
~/teneo-skill/teneo quote "@x-agent-enterprise-v2 <your request>" --room <roomId>

# Youtube — use with quote/confirm flow
~/teneo-skill/teneo quote "@youtube <your request>" --room <roomId>

# Aave V3 Liquidation Watcher — use with quote/confirm flow
~/teneo-skill/teneo quote "@liquidation-agent <your request>" --room <roomId>
```
<!-- /AGENT_EXAMPLES -->

<!-- AGENTS_LIST -->

## Agent Skills

| Agent | Commands | Description |
|-------|:--------:|-------------|
| [Teneo CLI](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-teneo-cli/SKILL.md) | 0 | - |
| [Teneo Agent Deployment](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-teneo-agent-deployment/SKILL.md) | 0 | - |
| [Amazon](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-amazon/SKILL.md) | 4 | ## Overview The Amazon Agent is a high-performance tool designed to turn massive... |
| [Gas War Sniper](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-gas-war-sniper/SKILL.md) | 12 | Real-time multi-chain gas monitoring and spike detection. Monitors block-by-bloc... |
| [Instagram Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-instagram-agent/SKILL.md) | 6 | ## Overview  The Instagram Agent allows users to extract data from Instagram, in... |
| [Tiktok](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-tiktok/SKILL.md) | 4 | ## Overview The TikTok Agent allows users to extract data from TikTok, including... |
| [CoinMarketCap Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-coinmarketcap-agent/SKILL.md) | 0 | ##### CoinMarketCap Agent  The CoinMarketCap Agent provides comprehensive access... |
| [CryptoQuant Pro 2.10](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-cryptoquant-pro-2-10/SKILL.md) | 0 | CryptoQuant Pro 2.10  Professional-grade market intelligence including derivativ... |
| [Google Search Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-google-search-agent/SKILL.md) | 0 | Perform real-time web searches with Google/Serper results. |
| [LinkedIn](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-linkedin/SKILL.md) | 0 | LinkedIn agent that helps you enrich LinkedIn profiles. You prodive a LinkedIn U... |
| [Messari BTC & ETH Tracker](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-messari-btc-eth-tracker/SKILL.md) | 0 | ## Overview The Messari Tracker Agent serves as a direct bridge to Messari’s ins... |
| [Squid Router](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-squid-router/SKILL.md) | 0 | # Squid Router Agent  Cross-chain token swap agent powered by Squid Router. Swap... |
| [Uniswap Monitor](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-uniswap-monitor/SKILL.md) | 0 | AI-powered blockchain monitoring agent with real-time monitoring of Uniswap V2, ... |
| [VC Attention](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-vc-attention/SKILL.md) | 0 | ## Overview The VC Attention Agent allows users to extract followings of top cry... |
| [X Platform Agent](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-x-platform-agent/SKILL.md) | 0 | ## Overview The X Agent mpowers businesses, researchers, and marketers to move b... |
| [Youtube](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-youtube/SKILL.md) | 0 | ## Overview The YouTube Agent allows users to extract data from YouTube to monit... |
| [Aave V3 Liquidation Watcher](https://github.com/TeneoProtocolAI/teneo-skills/blob/main/skills/agents/teneo-agent-aave-v3-liquidation-watcher/SKILL.md) | 0 | Real-time monitoring of whale positions on Aave V3 lending protocol. Discovers a... |

<!-- /AGENTS_LIST -->

## Architecture

- **skills/** — Teneo skill definitions (each is a `SKILL.md` with YAML frontmatter + usage reference)
- **cli/** — Teneo CLI source (Node.js, wraps `@teneo-protocol/sdk`)
- **.claude-plugin/** — Plugin config for Claude Code marketplace
- **.cursor-plugin/** — Plugin config for Cursor
- **.codex/** — Installation for Codex CLI
- **.opencode/** — Plugin + installation for OpenCode

## Skill Discovery

Each skill in `skills/` contains a `SKILL.md` with:

- YAML frontmatter (name, description, metadata)
- Agent commands with parameters and pricing
- Usage examples (TypeScript)
- Setup instructions and prerequisites
