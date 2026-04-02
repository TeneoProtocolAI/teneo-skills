---
name: predexon-prediction-market-agent-1-5-teneo
version: 2.0.42
description: "Predexon Agent — README Unified prediction market data API for Polymarket, Kalshi, Dflow, Binance, and cross-platform matching. Use this skill when the user needs Predexon Prediction Market Agent 1.5 via the bundled Teneo CLI and you need the live commands, arguments, or pricing before execution."
---

# Predexon Prediction Market Agent 1.5 - powered by Teneo Protocol

## Use This Skill When

- The user specifically asks for Predexon Prediction Market Agent 1.5.
- The task matches this agent's live capabilities and should run through the bundled Teneo CLI.
- You need exact command syntax, arguments, or pricing before executing the agent.

## Purpose

**This is a Teneo network agent skill.** Use it to inspect the live commands, arguments, and pricing for Predexon Prediction Market Agent 1.5, then execute the agent via the bundled Teneo CLI. The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

Use the `teneo-cli` skill to build and launch your own agent on Teneo Protocol via the CLI `agent` workflow, then earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

# Predexon Agent — README

Unified prediction market data API for Polymarket, Kalshi, Dflow, Binance, and cross-platform matching.

Price: 0.001 USDC per call — flat rate for all endpoints.

This agent is a pass-through proxy. You call the endpoint URL and optionally append query parameters. The agent forwards the request and returns raw JSON.

Base: https://api.predexon.com
Auth: handled by the agent — do not send an API key.

---

## ENDPOINT REFERENCE

---

### /v2/polymarket/markets
Returns a list of Polymarket prediction markets.

PARAMS:
- status = open | closed
- search = <string, min 3 chars>
- sort = volume | volume_1d | volume_7d | volume_30d | open_interest | expiration | expiration_asc | created | created_asc | trades_1d | trades_7d | trades_30d | oi_change_1d | oi_change_7d | oi_change_30d | price_desc | price_asc | relevance
- limit = <integer 1–100> — default 20
- offset = <integer> — default 0
- condition_id = <string>
- market_slug = <string>
- token_id = <string>
- tags = <string>
- min_volume = <number> USD
- min_open_interest = <number> USD
- min_price = <0–1>
- max_price = <0–1>
- min_volume_1d / min_volume_7d / min_volume_30d = <number> USD
- min_trades_1d / min_trades_7d / min_trades_30d = <integer>

RESPONSE FIELDS TO EXTRACT:
- condition_id → use in: candlesticks, open_interest, orderbooks, leaderboard/{id}, top-holders, smart-money, positions, volume-chart
- token_id → use in: market-price, volume, candlesticks
- outcomes[].token_id → use in: market-price, orderbooks

EXAMPLES:
/v2/polymarket/markets?status=open&sort=volume_1d&limit=10
/v2/polymarket/markets?search=bitcoin&sort=open_interest&limit=5
/v2/polymarket/markets?market_slug=us-forces-enter-iran-by
/v2/polymarket/markets?status=open&min_open_interest=100000&sort=volume&limit=20

---

### /v2/polymarket/events
Returns Polymarket events. An event groups related markets.

PARAMS:
- status = open | closed
- search = <string, min 3 chars>
- category = <string> e.g. Sports, Crypto, Politics, Finance
- sort = created | created_asc | start_date | start_date_asc | end_date | end_date_desc | title | relevance
- limit = <integer 1–100> — default 20
- offset = <integer>
- slug = <string>
- tag = <string>

EXAMPLES:
/v2/polymarket/events?status=open&search=election&limit=10
/v2/polymarket/events?category=Crypto&sort=created&limit=20

---

### /v2/polymarket/crypto-updown
Returns all active crypto price prediction markets.

PARAMS:
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/polymarket/crypto-updown?limit=20

---

### /v2/polymarket/market-price/{token_id}
Returns current YES/NO price for a market outcome. Price is 0–1 (0.72 = 72% probability YES).
REQUIRED: token_id in path — get from /v2/polymarket/markets → outcomes[].token_id

EXAMPLES:
/v2/polymarket/market-price/71321045457746995041769007842254901852505051308490869552069

---

### /v2/polymarket/candlesticks/{condition_id}
Returns OHLCV candlestick price data for a market.
REQUIRED: condition_id in path

PARAMS:
- interval = 1 (1 min) | 60 (1 hour) | 1440 (1 day) — default 1440
- start_time = <unix seconds>
- end_time = <unix seconds>

MAX RANGES: interval=1 → 7 days | interval=60 → 30 days | interval=1440 → 365 days

EXAMPLES:
/v2/polymarket/candlesticks/0x1234...?interval=1440
/v2/polymarket/candlesticks/0x1234...?interval=60&start_time=1700000000&end_time=1700600000

---

### /v2/polymarket/volume-chart/{condition_id}
Returns volume chart with YES/NO breakdown over time.
REQUIRED: condition_id in path

PARAMS:
- start_time = <unix seconds>
- end_time = <unix seconds>

EXAMPLES:
/v2/polymarket/volume-chart/0x1234...
/v2/polymarket/volume-chart/0x1234...?start_time=1700000000&end_time=1700600000

---

### /v2/polymarket/markets/{token_id}/volume
Returns historical cumulative volume time series for a market outcome.
REQUIRED: token_id in path

PARAMS:
- start_time = <unix seconds>
- end_time = <unix seconds>

EXAMPLES:
/v2/polymarket/markets/71321.../volume
/v2/polymarket/markets/71321.../volume?start_time=1700000000&end_time=1700600000

---

### /v2/polymarket/markets/{condition_id}/open_interest
Returns historical open interest time series for a market.
REQUIRED: condition_id in path

PARAMS:
- start_time = <unix seconds>
- end_time = <unix seconds>

EXAMPLES:
/v2/polymarket/markets/0x1234.../open_interest
/v2/polymarket/markets/0x1234.../open_interest?start_time=1700000000&end_time=1700600000

---

### /v2/polymarket/orderbooks
Returns historical orderbook snapshots.
REQUIRED: condition_id OR token_id

PARAMS:
- condition_id = <string> — REQUIRED if no token_id
- token_id = <string> — REQUIRED if no condition_id
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/polymarket/orderbooks?condition_id=0x1234...&limit=20
/v2/polymarket/orderbooks?token_id=71321...&limit=10

---

### /v2/polymarket/trades
Returns historical trade data. All params optional — omit all for global trade feed.
NOTE: order=asc requires condition_id or wallet.

PARAMS:
- condition_id = <string>
- token_id = <string>
- market_slug = <string>
- wallet = <string>
- start_time = <unix seconds>
- end_time = <unix seconds>
- min_total = <number> USD
- order = asc | desc — default desc
- limit = <integer 1–500> — default 100
- pagination_key = <string> — from previous response

EXAMPLES:
/v2/polymarket/trades?condition_id=0x1234...&limit=50
/v2/polymarket/trades?wallet=0xabc...&order=desc&limit=100
/v2/polymarket/trades?min_total=5000&limit=20

---

### /v2/polymarket/activity
Returns trading activity (merges, splits, redeems) for a wallet.
REQUIRED: wallet

PARAMS:
- wallet = <string> — REQUIRED
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/polymarket/activity?wallet=0xabc...&limit=20

---

### /v2/polymarket/positions
Returns all open positions in a market.
REQUIRED: condition_id OR market_slug

PARAMS:
- condition_id = <string> — REQUIRED if no market_slug
- market_slug = <string> — REQUIRED if no condition_id
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/polymarket/positions?condition_id=0x1234...&limit=20
/v2/polymarket/positions?market_slug=us-forces-enter-iran-by

---

### /v2/polymarket/leaderboard
Returns global leaderboard of top performing wallets.

PARAMS:
- window = 1d | 7d | 30d | all_time — default all_time
- sort_by = total_pnl | realized_pnl | volume | roi | profit_factor | win_rate | trades — default total_pnl
- order = asc | desc — default desc
- style = WHALE | MARKET_MAKER | ACTIVE_TRADER | BUY_AND_HOLD | DEGEN | HIGH_CONVICTION | CONTRARIAN | VALUE_HUNTER
- exclude_style = <same options as style>
- limit = <integer 1–100> — default 100
- pagination_key = <string>
- min_realized_pnl / max_realized_pnl = <number> USD
- min_total_pnl / max_total_pnl = <number> USD
- min_volume / max_volume = <number> USD
- min_trades / max_trades = <integer>
- min_roi / max_roi = <decimal>
- min_profit_factor / max_profit_factor = <decimal>
- min_win_rate / max_win_rate = <0–1>
- min_avg_trade_usd / max_avg_trade_usd = <number> USD
- min_wallet_age_days = <integer>
- min_entry_edge / max_entry_edge = <-1 to 1>

EXAMPLES:
/v2/polymarket/leaderboard?window=7d&sort_by=roi&limit=20
/v2/polymarket/leaderboard?window=30d&style=WHALE&min_win_rate=0.6&limit=50
/v2/polymarket/leaderboard?style=CONTRARIAN&window=7d&sort_by=realized_pnl&limit=20

---

### /v2/polymarket/leaderboard/{condition_id}
Returns top performing wallets in one specific market.
REQUIRED: condition_id in path

PARAMS:
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/polymarket/leaderboard/0x1234...?limit=20

---

### /v2/polymarket/cohorts/stats
Returns performance statistics across all trading style cohorts. No required params.

EXAMPLES:
/v2/polymarket/cohorts/stats

---

### /v2/polymarket/market/{condition_id}/top-holders
Returns largest position holders in a market.
REQUIRED: condition_id in path

PARAMS:
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/polymarket/market/0x1234.../top-holders?limit=20

---

### /v2/polymarket/markets/smart-activity
Returns markets where smart money wallets are currently most active.

PARAMS:
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/polymarket/markets/smart-activity?limit=10

---

### /v2/polymarket/wallet/{wallet}
Returns complete trader profile including PnL, ROI, win rate, trade count, and trading style across 1d / 7d / 30d / all_time.
Trading styles: WHALE | MARKET_MAKER | ACTIVE_TRADER | BUY_AND_HOLD | DEGEN | HIGH_CONVICTION | CONTRARIAN | VALUE_HUNTER
REQUIRED: wallet in path — Ethereum hex address

EXAMPLES:
/v2/polymarket/wallet/0xabc123...

---

### /v2/polymarket/wallet/{wallet}/markets
Returns all markets a wallet has traded in with per-market performance breakdown.
REQUIRED: wallet in path

PARAMS:
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/polymarket/wallet/0xabc123.../markets?limit=20

---

### /v2/polymarket/wallet/{wallet}/similar
Returns wallets with similar trading patterns.
REQUIRED: wallet in path

PARAMS:
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/polymarket/wallet/0xabc123.../similar?limit=10

---

### /v2/polymarket/wallet/{wallet}/pnl
Returns realized P&L history and summary for a wallet.
REQUIRED: wallet in path

PARAMS:
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/polymarket/wallet/0xabc123.../pnl?limit=50

---

### /v2/polymarket/wallet/{wallet}/positions
Returns all open and historical positions for a wallet.
REQUIRED: wallet in path

PARAMS:
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/polymarket/wallet/0xabc123.../positions?limit=20

---

### /v2/polymarket/wallet/{wallet}/volume-chart
Returns volume chart broken down by BUY/SELL for a wallet.
REQUIRED: wallet in path

EXAMPLES:
/v2/polymarket/wallet/0xabc123.../volume-chart

---

### /v2/polymarket/wallets/profiles
Batch retrieve profiles for multiple wallets in one request.
REQUIRED: wallets

PARAMS:
- wallets = <comma-separated Ethereum addresses> — REQUIRED

EXAMPLES:
/v2/polymarket/wallets/profiles?wallets=0xabc...,0xdef...,0x123...

---

### /v2/polymarket/wallets/filter
Filter wallets by markets they have traded in.
REQUIRED: condition_ids

PARAMS:
- condition_ids = <comma-separated condition IDs> — REQUIRED
- logic = AND | OR — default OR
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/polymarket/wallets/filter?condition_ids=0x1234...,0x5678...&logic=AND&limit=20

---

### /v2/polymarket/market/{condition_id}/smart-money
Returns how smart money wallets are positioned in a specific market.
REQUIRED: condition_id in path

EXAMPLES:
/v2/polymarket/market/0x1234.../smart-money

---

### /v2/kalshi/markets
Returns Kalshi prediction markets. Regulated US exchange focused on macro, finance, politics.

PARAMS:
- search = <string>
- limit = <integer 1–100> — default 20

RESPONSE FIELDS TO EXTRACT:
- market_ticker → use in: kalshi/trades, kalshi/orderbooks

EXAMPLES:
/v2/kalshi/markets?search=inflation&limit=10
/v2/kalshi/markets?search=fed&limit=20

---

### /v2/kalshi/trades
Returns trade history for a Kalshi market.
REQUIRED: market_ticker — get from /v2/kalshi/markets

PARAMS:
- market_ticker = <string> — REQUIRED e.g. INFL-25
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/kalshi/trades?market_ticker=INFL-25&limit=50

---

### /v2/kalshi/orderbooks
Returns historical orderbook snapshots for a Kalshi market.
REQUIRED: market_ticker

PARAMS:
- market_ticker = <string> — REQUIRED
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/kalshi/orderbooks?market_ticker=INFL-25&limit=20

---

### /v2/dflow/trades
Returns trade history for a Dflow wallet on Solana.
REQUIRED: wallet — Solana base58 address

PARAMS:
- wallet = <string> — REQUIRED
- limit = <integer 1–100> — default 20

EXAMPLES:
/v2/dflow/trades?wallet=7xKXtg2CW...&limit=50

---

### /v2/dflow/positions
Returns open positions for a Dflow wallet.
REQUIRED: wallet

PARAMS:
- wallet = <string> — REQUIRED

EXAMPLES:
/v2/dflow/positions?wallet=7xKXtg2CW...

---

### /v2/dflow/pnl
Returns P&L summary for a Dflow wallet.
REQUIRED: wallet

PARAMS:
- wallet = <string> — REQUIRED

EXAMPLES:
/v2/dflow/pnl?wallet=7xKXtg2CW...

---

### /v2/binance/candles/{symbol}
Returns OHLCV candlestick data from Binance.
REQUIRED: symbol in path
SYMBOL OPTIONS: BTCUSDT | ETHUSDT | SOLUSDT | XRPUSDT

PARAMS:
- interval = 1s | 1m | 5m | 15m | 1h | 4h | 1d — default 1m
- limit = <integer 1–1500> — default 500
- start_time = <unix seconds>
- end_time = <unix seconds>

MAX RANGES:
- 1s → 1 hour | 1m → 7 days | 5m → 30 days | 15m → 90 days
- 1h → 180 days | 4h → 365 days | 1d → 730 days

EXAMPLES:
/v2/binance/candles/BTCUSDT?interval=1h&limit=24
/v2/binance/candles/ETHUSDT?interval=1d&limit=30
/v2/binance/candles/SOLUSDT?interval=15m&limit=96

---

### /v2/matching-markets
Find equivalent markets across Polymarket and Kalshi simultaneously.
REQUIRED: query

PARAMS:
- query = <string> — REQUIRED — natural language keyword or phrase

EXAMPLES:
/v2/matching-markets?query=bitcoin price end of year
/v2/matching-markets?query=fed rate cut 2025
/v2/matching-markets?query=us recession

---

## AGENT WORKFLOW GUIDE

GETTING STARTED:
1. Call /v2/polymarket/markets to discover markets
2. Extract condition_id and token_id from response
3. Use those IDs in all subsequent calls

WHERE TO GET IDs:
- condition_id → from /v2/polymarket/markets or /v2/polymarket/events
- token_id → from /v2/polymarket/markets → outcomes[].token_id
- market_ticker (Kalshi) → from /v2/kalshi/markets
- wallet addresses → from /v2/polymarket/leaderboard → entries[].user

COMMON WORKFLOWS:

Find top crypto markets and check prices:
1. /v2/polymarket/crypto-updown?limit=20
2. Extract token_id from outcomes
3. /v2/polymarket/market-price/{token_id}

Find smart money wallets and analyze them:
1. /v2/polymarket/leaderboard?window=7d&sort_by=roi&style=WHALE&limit=20
2. Extract wallet from entries[].user
3. /v2/polymarket/wallet/{wallet}
4. /v2/polymarket/wallet/{wallet}/positions

Find where smart money is active right now:
1. /v2/polymarket/markets/smart-activity?limit=10
2. Extract condition_id
3. /v2/polymarket/market/{condition_id}/smart-money
4. /v2/polymarket/market/{condition_id}/top-holders

Analyze a specific Polymarket page by URL:
1. Extract slug from URL e.g. us-forces-enter-iran-by
2. /v2/polymarket/markets?market_slug=us-forces-enter-iran-by
3. Extract condition_id and token_id
4. Use in any subsequent call

Find equivalent markets on Polymarket and Kalshi:
1. /v2/matching-markets?query=<topic>
2. Compare prices across platforms

PAGINATION:
- Markets and events → use &offset=20, &offset=40 etc.
- Trades and leaderboard → copy pagination_key from response → &pagination_key=...
- Each paginated call = 0.001 USDC

TIME PARAMETERS:
- All start_time and end_time are Unix timestamps in seconds
- Check max range per endpoint before setting time range

WALLET ADDRESS FORMATS:
- Polymarket: Ethereum hex — 0x + 40 hex characters
- Dflow: Solana base58 — 32–44 alphanumeric characters

PRICING:
- 0.001 USDC per call — flat rate for all endpoints
- Charged only on HTTP 200 success
- No charge on errors or invalid requests
- Large datasets require multiple paginated calls — each call is 0.001 USDC

## Commands

Use these commands via the Teneo CLI from [TeneoProtocolAI/teneo-skills](https://github.com/TeneoProtocolAI/teneo-skills). **This is a bash tool** — run commands in your terminal.

First, ensure the CLI is installed (see the teneo-cli skill for setup — the full source code is embedded there. Do NOT search for or install external CLIs).

| Command | Arguments | Price | Description |
|---------|-----------|-------|-------------|
| `proxy` | <path> | $0.001/per-query | Execute any Predexon V2 API request and pay per query via x402 on Teneo. |

### Quick Reference

```bash
# Agent ID: predexon-prediction-market-agent-v5
~/teneo-skill/teneo command "predexon-prediction-market-agent-v5" "proxy <path>" --room <roomId>
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

### `proxy`

Execute any Predexon V2 API request and pay per query via x402 on Teneo.

```bash
~/teneo-skill/teneo command "predexon-prediction-market-agent-v5" "proxy <path>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

## Agent Info

- **ID:** `predexon-prediction-market-agent-v5`
- **Name:** Predexon Prediction Market Agent 1.5

