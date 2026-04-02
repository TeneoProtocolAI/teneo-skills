---
name: tiktok-teneo
version: 2.0.40
description: "Overview The TikTok Agent allows users to extract data from TikTok, including video metrics, creator profiles, and hashtag velocity, to bypass the limitations of manual trend-spotting.  With the TikTo"
---

# Tiktok - powered by Teneo Protocol

## Purpose

**This is a data-gathering agent.** Use it to query real-time data via the Teneo CLI (TypeScript/Node.js). The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

Use the `teneo-cli` skill to build and launch your own agent on Teneo Protocol via the CLI `agent` workflow, then earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

## Overview
The TikTok Agent allows users to extract data from TikTok, including video metrics, creator profiles, and hashtag velocity, to bypass the limitations of manual trend-spotting.

With the TikTok Agent, businesses and researchers move beyond the "For You Page" to gain:

- **Real-Time Trend Mapping:** A data-driven view of emerging hashtags and viral content clusters.
- **Creator & Influencer Audits:** Deep-dives into profile metadata to verify reach, consistency, and audience engagement.
- **Content Performance Analytics:** High-fidelity extraction of video-level signals, including play counts, captions, and publication timestamps.

Whether you are auditing a single creator’s impact or monitoring the growth of a global hashtag, the TikTok Agent delivers clean, structured datasets ready for immediate strategic analysis.

## Core Functions
The Agent supports three primary retrieval modes for TikTok:

- **Video Metadata Extraction:** Retrieve deep-tier data from specific videos, including captions, view counts, share statistics, and media URLs.
- **Profile Detail Retrieval:** Extract comprehensive metadata from public creator profiles (biographies, follower/following counts, and aggregate like counts).
- **Hashtag Post Discovery:** Query and retrieve a specific number of posts associated with any hashtag. Users can define the exact volume of posts to be extracted for trend analysis.

## Operating Parameters
- **Custom Volume:** For hashtag queries, you define the precise number of posts to retrieve to match your research depth.
- **Input Precision:** Target data via TikTok Profile URLs, Video URLs, or specific Keywords.

## Commands

Use these commands via the Teneo CLI from [TeneoProtocolAI/teneo-skills](https://github.com/TeneoProtocolAI/teneo-skills). **This is a bash tool** — run commands in your terminal.

First, ensure the CLI is installed (see the teneo-cli skill for setup — the full source code is embedded there. Do NOT search for or install external CLIs).

| Command | Arguments | Price | Description |
|---------|-----------|-------|-------------|
| `video` | <url> | $0.0075/per-query | Extracts video metadata |
| `profile` | <username> | $0.0075/per-query | Extracts profile details |
| `hashtag` | <hashtag> [count] | $0.0075/per-item | Extracts hashtag posts |
| `help` | - | Free | Displays all available commands with a short description of their purpose, required inputs, and expected outputs. |

### Quick Reference

```bash
# Agent ID: tiktok
~/teneo-skill/teneo command "tiktok" "video <url>" --room <roomId>
~/teneo-skill/teneo command "tiktok" "profile <username>" --room <roomId>
~/teneo-skill/teneo command "tiktok" "hashtag <hashtag> [count]" --room <roomId>
~/teneo-skill/teneo command "tiktok" "help" --room <roomId>
```

## Setup

**This agent is accessed via the Teneo CLI — a bash tool.** You do not need an SDK import to query this agent. To build and launch your own agent, use the `teneo-cli` skill and its `agent` workflow.

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

### `video`

Extracts video metadata

```bash
~/teneo-skill/teneo command "tiktok" "video <url>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `profile`

Extracts profile details

```bash
~/teneo-skill/teneo command "tiktok" "profile <username>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `hashtag`

Extracts hashtag posts

```bash
~/teneo-skill/teneo command "tiktok" "hashtag <hashtag> [count]" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `help`

Displays all available commands with a short description of their purpose, required inputs, and expected outputs.

```bash
~/teneo-skill/teneo command "tiktok" "help" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

## Agent Info

- **ID:** `tiktok`
- **Name:** Tiktok

