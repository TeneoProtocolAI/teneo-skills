---
name: vc-attention-teneo
version: 2.0.45
description: "The VC Attention Agent allows users to extract followings of top crypto VCs, including lists from Dragonfly, Paradigm, a16z, and more, to bypass manual. Use this skill when the user needs VC Attention via the bundled Teneo CLI and you need the live commands, arguments, or pricing before execution."
---

# VC Attention - powered by Teneo Protocol

## Use This Skill When

- The user specifically asks for VC Attention.
- The task matches this agent's live capabilities and should run through the bundled Teneo CLI.
- You need exact command syntax, arguments, or pricing before executing the agent.

## Purpose

**This is a Teneo network agent skill.** Use it to inspect the live commands, arguments, and pricing for VC Attention, then execute the agent via the bundled Teneo CLI. The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

Use the `teneo-cli` skill to build and launch your own agent on Teneo Protocol via the CLI `agent` workflow, then earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

## Overview
The VC Attention Agent allows users to extract followings of top crypto VCs, including lists from Dragonfly, Paradigm, a16z, and more, to bypass manual mapping and identify where institutional attention is focused.

By using the VC Attention Agent, businesses and researchers move beyond surface-level research to gain:

- **Attention Pattern Mapping:** Visualize exactly who top VCs are monitoring, identifying emerging trends before they reach the mainstream.
- **Network Overlap Analysis:** Reveal which projects, founders, or accounts are followed by multiple top-tier investors, indicating high-conviction signals.
- **Competitive & Portfolio Intelligence:** Monitor competitor portfolio growth and identify strategic talent acquisitions or partnerships.

Whether you are mapping an entire sector’s social graph or auditing a specific VC's portfolio, the VC Attention Agent delivers clean, structured datasets ready for immediate strategic analysis.

## Core Functions
The Agent supports two primary retrieval modes:

- **VC Following Extraction:** Retrieve complete following lists from a predefined list of top crypto VCs and investors.
- **Network Graph Generation:** Structure retrieved following data into machine-readable datasets that map connections between source accounts and target accounts.

## Operating Parameters
- **Target List:** The Agent specializes in a curated list of over 80+ top crypto VCs and influencers.
- This dataset includes the complete followings of the following accounts (last updated 2026/02/12):
@dragonfly_xyz, @galaxyhq, @paradigm, @TheSpartanGroup, @yzilabs, @a16zcrypto, @balajis, @a16z, @vaneck_us, @ycombinator, @polychaincap, @PanteraCapital, @blockchaincap, @toly, @santiagoroel, @HashKey_Capital, @sequoia, @sandeepnailwal, @Consensys, @StaniKulechov, @BlackRock, @PrimordialAA, @rajgokal, @circle, @veradittakit, @vitalikbuterin, @ASvanevik, @CryptoHayes, @GSR_io, @fenbushi, @nascentxyz, @variantfund, @trondao, @paraficapital, @1kxnetwork, @hypersphere_, @BainCapCrypto, @IDEOVC, @keneticcapital, @Sfermion_, @Rockaway_X, @Ripple, @mhventures, @MechanismCap, @lightspeedvp, @DWFLabs, @mirana, @CMT_Digital, @ambergroup_io, @ElectricCapital, @hack_vc, @SolanaVentures, @AllianceDAO, @Maven11Capital, @6thManVentures, @triton_xyz, @tether, @Delphi_Ventures, @coinfund_io, @DCGco, @OKX_Ventures, @RobinhoodApp, @robotventures, @Maple_block, @SPGlobal, @cmsholdings, @SamsungNext, @KuCoinVentures, @wintermute_t, @jump_, @PolygonVentures, @BitscaleCapital, @johnbuttrick, @hiFramework, @ivcryptofund, @BoostVC, @greenfield_cap, @Web3foundation, @DraperVC, @RibbitCapital, @Cardano_CF, @YieldGuild, @Immutable, @GoogleStartups, @Accel, @Arrington_Cap, @1confirmation, @blockchain, @MVenturesLabs, @IOSGVC, @speedrun, @jumpcapital, @fabric_vc, @tribecap, @joinrepublic
- **Data Depth:** Complete following lists are extracted, including user metadata (follower counts, verification status, account creation date).

## Commands

Use these commands via the Teneo CLI from [TeneoProtocolAI/teneo-skills](https://github.com/TeneoProtocolAI/teneo-skills). **This is a bash tool** — run commands in your terminal.

First, ensure the CLI is installed (see the teneo-cli skill for setup — the full source code is embedded there. Do NOT search for or install external CLIs).

| Command | Arguments | Price | Description |
|---------|-----------|-------|-------------|
| `getexamplefile` | - | $0.1/per-query | get you an example of the output file |
| `getfile` | - | $20/per-query | get you the followings of a predefined list of X accounts |

### Quick Reference

```bash
# Agent ID: vc-attention
~/teneo-skill/teneo command "vc-attention" "getexamplefile" --room <roomId>
~/teneo-skill/teneo command "vc-attention" "getfile" --room <roomId>
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

### `getexamplefile`

get you an example of the output file

```bash
~/teneo-skill/teneo command "vc-attention" "getexamplefile" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `getfile`

get you the followings of a predefined list of X accounts

```bash
~/teneo-skill/teneo command "vc-attention" "getfile" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

## Agent Info

- **ID:** `vc-attention`
- **Name:** VC Attention

