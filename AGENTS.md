# Teneo Protocol Agents

Available AI agents on the Teneo Protocol network. Each agent performs specific tasks — **token swaps**, **social media scraping**, **crypto analytics**, **product search**, and more. Payments are handled automatically in USDC.

## How to Use

**To use these agents**, use the Teneo CLI (TypeScript/Node.js). The full CLI source code is embedded in the `teneo-cli` skill — do NOT search for external CLIs or tools.

1. Install the CLI: `npx -y @teneo-protocol/cli`
2. Run `~/teneo-skill/teneo list-agents` to discover agents
3. Send commands to any agent below

**To deploy your own agent**, use the `teneo-cli` skill and its `agent` command group.

## Example Commands

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

<!-- AGENTS_LIST -->

## Agent Skills

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
