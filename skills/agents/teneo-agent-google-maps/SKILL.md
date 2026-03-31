---
name: google-maps-teneo
version: 2.0.18
description: "Overview The Google Maps Agent transforms geographical and local business data into structured, actionable intelligence. It allows users to extract data from Google Maps to audit local markets, monito"
---

# Google maps - powered by Teneo Protocol

## Purpose

**This is a data-gathering agent.** Use it to query real-time data via the Teneo CLI (TypeScript/Node.js). The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

See the `teneo-agent-deployment` skill to deploy a Go agent on Teneo Protocol and earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

## Overview
The Google Maps Agent transforms geographical and local business data into structured, actionable intelligence. It allows users to extract data from Google Maps to audit local markets, monitor service reputations, and analyze physical world trends.

By using the Google Maps Agent, businesses, urban researchers, and logistics providers move beyond manual searching to gain:

- **Localized Market Intelligence:** A comprehensive view of business densities, categories, and service offerings in any specific region.
- **Physical-World Insights:** Data-driven occupancy mapping to understand when specific locations or categories are most active.
- **Reputation & Sentiment Audits:** High-fidelity extraction of the most relevant customer reviews and visual assets to monitor brand health.

Whether you are conducting a site selection audit or monitoring competitor performance across a city, the Google Maps Agent delivers clean, structured datasets ready for immediate strategic analysis.

## Core Functions
The Agent supports four primary retrieval and discovery modes:

- **Business Detail Extraction:** Retrieve comprehensive metadata from specific business listings (Category, address, contact info, website, and coordinates).
- **Relevant Review Retrieval:** Extract the most impactful customer reviews to gauge public sentiment and service quality.
- **Occupancy & Busy Hour Analysis:** Extract real-time and historical "busy hours" based on defined percentage thresholds to map foot-traffic patterns.
- **Visual Intelligence:** Retrieve high-resolution business images for brand auditing or geographic verification.

## Operating Parameters
- **Threshold Filtering:** Define specific occupancy percentages for busy-hour extraction to filter for "peak" or "off-peak" data.
- **Regional Scope:** Target data via specific business names, categories, or Google Maps URLs.

## Commands

Use these commands via the Teneo CLI from [TeneoProtocolAI/teneo-skills](https://github.com/TeneoProtocolAI/teneo-skills). **This is a bash tool** — run commands in your terminal.

First, ensure the CLI is installed (see the teneo-cli skill for setup — the full source code is embedded there. Do NOT search for or install external CLIs).

| Command | Arguments | Price | Description |
|---------|-----------|-------|-------------|
| `business` | <url> | $0.02/per-query | Extracts business details |
| `reviews` | <url> [count] | $0.0025/per-item | Extracts business most relevant reviews |
| `busy_hours` | <url> [threshold] | $0.02/per-query | Extracts busy hours based on a percent threshold |
| `images` | <url> [count] | $0.02/per-item | Extracts business images |
| `help` | - | Free | Displays all available commands with a short description of their purpose, required inputs, and expected outputs. |

### Quick Reference

```bash
# Agent ID: google-maps
~/teneo-skill/teneo command "google-maps" "business <url>" --room <roomId>
~/teneo-skill/teneo command "google-maps" "reviews <url> [count]" --room <roomId>
~/teneo-skill/teneo command "google-maps" "busy_hours <url> [threshold]" --room <roomId>
~/teneo-skill/teneo command "google-maps" "images <url> [count]" --room <roomId>
~/teneo-skill/teneo command "google-maps" "help" --room <roomId>
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

### `business`

Extracts business details

```bash
~/teneo-skill/teneo command "google-maps" "business <url>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `reviews`

Extracts business most relevant reviews

```bash
~/teneo-skill/teneo command "google-maps" "reviews <url> [count]" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `busy_hours`

Extracts busy hours based on a percent threshold

```bash
~/teneo-skill/teneo command "google-maps" "busy_hours <url> [threshold]" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `images`

Extracts business images

```bash
~/teneo-skill/teneo command "google-maps" "images <url> [count]" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `help`

Displays all available commands with a short description of their purpose, required inputs, and expected outputs.

```bash
~/teneo-skill/teneo command "google-maps" "help" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

## Agent Info

- **ID:** `google-maps`
- **Name:** Google maps

