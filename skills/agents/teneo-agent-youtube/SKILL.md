---
name: youtube-teneo
version: 2.0.35
description: "Overview The YouTube Agent allows users to extract data from YouTube to monitor content trends, audit competitor channels, and analyze viewer engagement at scale.  By using the YouTube Agent, business"
---

# Youtube - powered by Teneo Protocol

## Purpose

**This is a data-gathering agent.** Use it to query real-time data via the Teneo CLI (TypeScript/Node.js). The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

See the `teneo-agent-deployment` skill to build and launch a Go agent on Teneo Protocol via the CLI or directly via the Go SDK, then earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

## Overview
The YouTube Agent allows users to extract data from YouTube to monitor content trends, audit competitor channels, and analyze viewer engagement at scale.

By using the YouTube Agent, businesses and market researchers move beyond manual browsing to gain:

- **Real-Time Trend Analysis:** A data-driven view of trending topics, keyword velocity, and search popularity.
- **Competitor Channel Audits:** Deep-dives into video performance, engagement rates (likes/comments), and publication schedules.
- **Viewer Sentiment Intelligence:** High-fidelity extraction of video metadata to analyze content sentiment and audience reception.

Whether you are auditing a single video's performance or monitoring an entire channel's strategy, the YouTube Agent delivers clean, structured datasets ready for immediate strategic analysis.

## Core Functions
The Agent supports two primary retrieval and discovery modes:

- **Advanced Video Search:** Query YouTube with granular control. Search by keywords and optionally sort results by Relevance, Upload Date, View Count, or Rating.
- **Video Metadata Extraction:** Retrieve deep-tier metadata from specific video URLs, including channel names, descriptions, timestamps, view counts, and engagement metrics.

## Commands

Use these commands via the Teneo CLI from [TeneoProtocolAI/teneo-skills](https://github.com/TeneoProtocolAI/teneo-skills). **This is a bash tool** — run commands in your terminal.

First, ensure the CLI is installed (see the teneo-cli skill for setup — the full source code is embedded there. Do NOT search for or install external CLIs).

| Command | Arguments | Price | Description |
|---------|-----------|-------|-------------|
| `search` | <keyword> <sort_by> | $0.0025/per-query | The command lets you search for videos. Examples: /search cat videos or /search python tutorials upload_date (search for videos, optionally sorted by upload date, relevance, view_count or rating). |
| `video` | <link> | $0.0025/per-query | The command lets you extract YouTube video metadata. Examples: /video https://www.youtube.com/watch?v=ZBrb6UdhVSI (get detailed metadata for a specific video). |

### Quick Reference

```bash
# Agent ID: youtube
~/teneo-skill/teneo command "youtube" "search <keyword> <sort_by>" --room <roomId>
~/teneo-skill/teneo command "youtube" "video <link>" --room <roomId>
```

## Setup

**This agent is accessed via the Teneo CLI — a bash tool.** You do not need an SDK import to query this agent. If you want to build and launch your own agent, use the Go SDK via the `teneo-agent-deployment` skill.

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

### `search`

The command lets you search for videos. Examples: /search cat videos or /search python tutorials upload_date (search for videos, optionally sorted by upload date, relevance, view_count or rating).

```bash
~/teneo-skill/teneo command "youtube" "search <keyword> <sort_by>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `video`

The command lets you extract YouTube video metadata. Examples: /video https://www.youtube.com/watch?v=ZBrb6UdhVSI (get detailed metadata for a specific video).

```bash
~/teneo-skill/teneo command "youtube" "video <link>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

## Agent Info

- **ID:** `youtube`
- **Name:** Youtube

