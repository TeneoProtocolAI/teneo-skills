---
name: x-platform-agent-teneo
version: 2.0.4
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

- **ID:** `x-agent-enterprise-v2`
- **Name:** X Platform Agent

