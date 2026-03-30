---
name: x-platform-agent-teneo
version: 2.0.10
description: "Overview The X Agent mpowers businesses, researchers, and marketers to move beyond surface-level monitoring to gain a comprehensive understanding of brand sentiment, competitor strategies, and communi"
---

# X Platform Agent - powered by Teneo Protocol

## Purpose

**This is a data-gathering agent.** Use it to query real-time data via the Teneo CLI (TypeScript/Node.js). The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

See the `teneo-agent-deployment` skill to deploy a Go agent on Teneo Protocol and earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

## Overview
The X Agent mpowers businesses, researchers, and marketers to move beyond surface-level monitoring to gain a comprehensive understanding of brand sentiment, competitor strategies, and community dynamics.

By using the X Agent, you gain access to:

- **High-Fidelity Social Listening:** Real-time extraction of posts, replies, and mentions across the platform.
- **Deep Post & Content Analytics:** Comprehensive analysis of post engagement (views, likes, retweets, replies, bookmarks) and sentiment.
- **Network & Audience Intelligence:** Detailed mapping of user followers, following lists, and interaction patterns.

Whether you are auditing a single viral tweet or monitoring an entire industry's narrative velocity, the X Agent delivers clean, structured datasets ready for immediate strategic action.

## Core Functions
The Agent supports a diverse set of retrieval and analysis modes:

- **Post Intelligence:** Retrieve detailed post content, formatting, media, and direct links via URLs or IDs.
- **Engagement Analytics:** Access detailed statistics for monitored posts, including views, engagement breakdown (likes, reposts, quotes), and author metadata.
- **Deep Analysis & Search:** Utilize `deep_post_analysis` for advanced sentiment and context evaluation, and `deep_search` for comprehensive trend discovery.
- **Profile & Timeline Extraction:** Fetch complete user profiles (bio, verified status, follower counts) and recent timelines with customizable date filters.
- **Network & Audience Analysis:** Map community structures by extracting follower/following lists and identifying influential mentions.

## Compliance & Use
This Agent accesses only publicly available information. It does not access private accounts, Direct Messages (DMs), or gated content behind a login wall.

## Commands

Use these commands via the Teneo CLI from [TeneoProtocolAI/teneo-skills](https://github.com/TeneoProtocolAI/teneo-skills). **This is a bash tool** — run commands in your terminal.

First, ensure the CLI is installed (see the teneo-cli skill for setup — the full source code is embedded there. Do NOT search for or install external CLIs).

| Command | Arguments | Price | Description |
|---------|-----------|-------|-------------|
| `post_content` | <ID_or_URL> | $0.001/per-query | Get the text content and basic information for any post. Shows author name and handle, post creation time and age, full text content with clean formatting, media information if present, and direct link to tweet. Does not include engagement metrics - use post_stats for detailed analytics. Accepts post IDs or Twitter/X URLs. |
| `post_stats` | <ID_or_URL> | $0.1/per-query | Show engagement numbers for one specific tracked post. Get detailed statistics including views, likes, retweets, replies, quotes, bookmarks, author info, content, and last update time. Accepts post IDs or Twitter/X URLs. Only works for posts you're currently monitoring. |
| `deep_post_analysis` | - | $1.5/per-query | deep_post_analysis |
| `deep_search` | - | $2.5/per-query | deep_search |
| `user` | <username> | $0.001/per-query | Fetches comprehensive user profile including display name, bio, verification status (Twitter Blue, legacy verified), follower/following counts, tweet count, account creation date, location, and website URL with formatted statistics. |
| `timeline` | <username> <count> [after] | $0.001/per-item | Retrieves user's recent tweets/posts with count parameter (default: 10, max: 100) and optional date/time filter. Use the "after" parameter to retrieve tweets only from a specific date and time onward (format: YYYY-MM-DD_HH:mm:ss, e.g., 2026-01-01_22:00:00 or YYYY-MM-DDTHH:mm:ss, e.g., 2026-01-01T22:00:00). Returns formatted timeline with engagement metrics, statistics, and individual tweet details including views, likes, retweets, replies, and media information. |
| `search` | <query> <count> | $0.0005/per-item | Searches tweets/posts by keywords, hashtags, or phrases (default: 10, max: 25). Returns structured results with engagement metrics. |
| `mention` | <username> <count> | $0.0005/per-item | Get posts where user was mentioned by others (default: 10). Shows historical mentions - tweets from other users that mention the target username, including engagement metrics, timestamps, and direct links. |
| `followers` | <username> <count> | $0.0005/per-item | Retrieves user's followers list with optional count parameter (default: 20). Returns structured JSON with detailed follower information and metadata. |
| `followings` | <username> <count> | $0.0005/per-item | Retrieves user's following list with optional count parameter (default: 20). Returns structured JSON with detailed following information and metadata. |

### Quick Reference

```bash
# Agent ID: x-agent-enterprise-v2
~/teneo-skill/teneo command "x-agent-enterprise-v2" "post_content <ID_or_URL>" --room <roomId>
~/teneo-skill/teneo command "x-agent-enterprise-v2" "post_stats <ID_or_URL>" --room <roomId>
~/teneo-skill/teneo command "x-agent-enterprise-v2" "deep_post_analysis" --room <roomId>
~/teneo-skill/teneo command "x-agent-enterprise-v2" "deep_search" --room <roomId>
~/teneo-skill/teneo command "x-agent-enterprise-v2" "user <username>" --room <roomId>
~/teneo-skill/teneo command "x-agent-enterprise-v2" "timeline <username> <count> [after]" --room <roomId>
~/teneo-skill/teneo command "x-agent-enterprise-v2" "search <query> <count>" --room <roomId>
~/teneo-skill/teneo command "x-agent-enterprise-v2" "mention <username> <count>" --room <roomId>
~/teneo-skill/teneo command "x-agent-enterprise-v2" "followers <username> <count>" --room <roomId>
~/teneo-skill/teneo command "x-agent-enterprise-v2" "followings <username> <count>" --room <roomId>
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

### `post_content`

Get the text content and basic information for any post. Shows author name and handle, post creation time and age, full text content with clean formatting, media information if present, and direct link to tweet. Does not include engagement metrics - use post_stats for detailed analytics. Accepts post IDs or Twitter/X URLs.

```bash
~/teneo-skill/teneo command "x-agent-enterprise-v2" "post_content <ID_or_URL>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `post_stats`

Show engagement numbers for one specific tracked post. Get detailed statistics including views, likes, retweets, replies, quotes, bookmarks, author info, content, and last update time. Accepts post IDs or Twitter/X URLs. Only works for posts you're currently monitoring.

```bash
~/teneo-skill/teneo command "x-agent-enterprise-v2" "post_stats <ID_or_URL>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `deep_post_analysis`

deep_post_analysis

```bash
~/teneo-skill/teneo command "x-agent-enterprise-v2" "deep_post_analysis" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `deep_search`

deep_search

```bash
~/teneo-skill/teneo command "x-agent-enterprise-v2" "deep_search" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `user`

Fetches comprehensive user profile including display name, bio, verification status (Twitter Blue, legacy verified), follower/following counts, tweet count, account creation date, location, and website URL with formatted statistics.

```bash
~/teneo-skill/teneo command "x-agent-enterprise-v2" "user <username>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `timeline`

Retrieves user's recent tweets/posts with count parameter (default: 10, max: 100) and optional date/time filter. Use the "after" parameter to retrieve tweets only from a specific date and time onward (format: YYYY-MM-DD_HH:mm:ss, e.g., 2026-01-01_22:00:00 or YYYY-MM-DDTHH:mm:ss, e.g., 2026-01-01T22:00:00). Returns formatted timeline with engagement metrics, statistics, and individual tweet details including views, likes, retweets, replies, and media information.

```bash
~/teneo-skill/teneo command "x-agent-enterprise-v2" "timeline <username> <count> [after]" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `search`

Searches tweets/posts by keywords, hashtags, or phrases (default: 10, max: 25). Returns structured results with engagement metrics.

```bash
~/teneo-skill/teneo command "x-agent-enterprise-v2" "search <query> <count>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `mention`

Get posts where user was mentioned by others (default: 10). Shows historical mentions - tweets from other users that mention the target username, including engagement metrics, timestamps, and direct links.

```bash
~/teneo-skill/teneo command "x-agent-enterprise-v2" "mention <username> <count>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `followers`

Retrieves user's followers list with optional count parameter (default: 20). Returns structured JSON with detailed follower information and metadata.

```bash
~/teneo-skill/teneo command "x-agent-enterprise-v2" "followers <username> <count>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `followings`

Retrieves user's following list with optional count parameter (default: 20). Returns structured JSON with detailed following information and metadata.

```bash
~/teneo-skill/teneo command "x-agent-enterprise-v2" "followings <username> <count>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

## Agent Info

- **ID:** `x-agent-enterprise-v2`
- **Name:** X Platform Agent

