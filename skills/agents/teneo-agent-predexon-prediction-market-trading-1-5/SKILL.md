---
name: predexon-prediction-market-trading-1-5-teneo
version: 2.0.40
description: "Predexon Prediction Market Trading 1.5  Universal proxy for trading on Polymarket and Predict.fun. Mainly designed and optimized for autonomous agents (also available for humans via the Teneo Agent Co"
---

# Predexon Prediction Market Trading 1.5 - powered by Teneo Protocol

## Purpose

**This is a data-gathering agent.** Use it to query real-time data via the Teneo CLI (TypeScript/Node.js). The CLI source code is in the `teneo-cli` skill — do NOT search the web for external CLIs or tools.

> **Powered by [Teneo Protocol](https://teneo-protocol.ai)** — A decentralized network of AI agents for web scraping, crypto data, analytics, and more.

> **Try it out:** Test this agent as a human at [agent-console.ai](https://agent-console.ai)

## Want to monetize your own agent?

Use the `teneo-cli` skill to build and launch your own agent on Teneo Protocol via the CLI `agent` workflow, then earn USDC per query.

**Resources:** [CLI source](https://github.com/TeneoProtocolAI/teneo-skills) · [Agent SDK (Go)](https://github.com/TeneoProtocolAI/teneo-agent-sdk)

# Predexon Prediction Market Trading 1.5

Universal proxy for trading on Polymarket and Predict.fun.
Mainly designed and optimized for autonomous agents (also available for humans via the Teneo Agent Console).

Works best combined with Predexon Prediction Market Agent 1.5 on Teneo — delivers real-time market intelligence across Polymarket, Kalshi, and Binance including tokenIds, smart money positioning, whale activity and much more.

Base URL: https://trade.predexon.com
Auth: handled by the agent — do not send an API key.
Price: 0.001 USDC per call — flat rate for all endpoints.
Charged ONLY on HTTP 200. No charge on errors, rate limits, or invalid inputs.
Partner fee: 0.5% automatically applied to all Polymarket trades.
Protocol: Teneo x402 micropayments.

NOTE: All user accounts and wallets are managed by Predexon, not Teneo. Teneo is the access and payment layer only.

---

## INPUT FORMAT

execute {METHOD} {PATH} [JSON_BODY]

METHOD: GET | POST | DELETE
PATH: API endpoint path starting with /api/
JSON_BODY: optional — only needed for POST requests
Replace {userId}, {orderId} etc. with actual IDs in all requests.

tokenId can be provided directly if known, or fetched live from Predexon Prediction Market Agent 1.5 on Teneo.

---

## ALL ENDPOINTS

POST /api/users/create
GET /api/users/{userId}
DELETE /api/users/{userId}
GET /api/users/{userId}/balance
GET /api/bridge/deposit?wallet={polymarketWalletAddress}
POST /api/users/{userId}/orders {JSON}
GET /api/users/{userId}/orders
GET /api/users/{userId}/orders/{orderId}
DELETE /api/users/{userId}/orders/{orderId}
DELETE /api/users/{userId}/orders
GET /api/users/{userId}/positions
POST /api/users/{userId}/positions/redeem {JSON}
POST /api/users/{userId}/withdraw {JSON}

---

## VENUES

Polymarket:
- Blockchain: Polygon
- Collateral: USDC.e (Bridged USDC)
- Contract: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
- Deposit: send USDC.e to polymarketWalletAddress on Polygon
- Partner fee: 0.5% automatic on every trade

Predict.fun:
- Blockchain: BSC
- Collateral: USDT (BEP-20)
- Contract: 0x55d398326f99059fF775485246999027B3197955
- Deposit: send USDT (BEP-20) to predictWalletAddress on BSC
- No partner fee — exchange fee varies by market

---

## FULL WORKFLOW

1. POST /api/users/create → save userId + polymarketWalletAddress
2. GET /api/users/{userId} → poll until status = "ready"
3. Send USDC.e to polymarketWalletAddress on Polygon
4. GET /api/users/{userId}/balance → confirm available > 0
5. Get tokenId from Predexon Prediction Market Agent 1.5 on Teneo — or provide directly if known
6. POST /api/users/{userId}/orders {JSON} → place trade
7. GET /api/users/{userId}/orders → monitor order status
8. GET /api/users/{userId}/positions → watch for status = "redeemable"
9. POST /api/users/{userId}/positions/redeem {JSON} → cash out winning position
10. POST /api/users/{userId}/withdraw {JSON} → withdraw profits

---

## GET tokenId

Option 1 — provide directly if already known.

Option 2 — fetch live from Predexon Prediction Market Agent 1.5 on Teneo:
/v2/polymarket/markets?market_slug={slug}
or
/v2/polymarket/markets?search={keyword}&sort=volume&limit=10

Extract outcomes[].token_id from response:
- YES token → bet on YES / UP
- NO token → bet on NO / DOWN

The Predexon Prediction Market Agent 1.5 on Teneo can also supply additional trading intelligence:
- Smart money positioning and whale activity per market
- Top trader leaderboards with ROI, win rate, and trading style
- Markets where high-performing wallets are currently most active
- Open interest and volume trends per market
- Orderbook depth and candlestick price history
- Wallet P&L, positions, and similar trader discovery
- Cross-platform market matching across Polymarket and Kalshi
- Binance price data for crypto context alongside prediction markets

---

## ORDER TYPE RULES

market BUY → use amount (USDC.e to spend) — do NOT use size
market SELL → use size (shares to sell) — do NOT use amount
limit BUY → use size + price — do NOT use amount
limit SELL → use size + price — do NOT use amount

Minimum order sizes:
- Polymarket market order: > 1 USDC.e
- Polymarket limit order: > 5 shares
- Predict.fun: > ~0.90 USDT

---

## ORDER STATUS VALUES

open → resting on orderbook, waiting to be matched
filled → fully executed
cancelled → manually cancelled
expired → timed out

---

## POSITION STATUS VALUES

active → market still trading, can sell or monitor P&L
resolved → market settled, check if won or lost
redeemable → winning position ready to cash out

---

## BEFORE WITHDRAWING

1. Cancel all open orders on Predict.fun — DELETE /api/users/{userId}/orders
2. Redeem all redeemable positions — POST /api/users/{userId}/positions/redeem
3. Check available balance — GET /api/users/{userId}/balance

---

## ERROR RESPONSES

429 → Rate limit reached.
400 → Invalid query. Check inputs.
500 → Service unavailable.
All errors: no charge applied.

---

## ENDPOINT EXAMPLES

---

### Create User
No body required. Returns userId, polymarketWalletAddress, predictWalletAddress, status.
Save userId — required for all subsequent calls.

execute POST /api/users/create

---

### Get User
Poll until status = "ready" before placing orders.

execute GET /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10

---

### Delete User
WARNING: Withdraw all funds first — irreversible.

execute DELETE /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10

---

### Get Balance
Always check before placing an order.

execute GET /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/balance

---

### Get Deposit Info
Returns bridge addresses for funding from ETH, SOL, BTC, ARB, Base.
Addresses valid for 15 minutes.

execute GET /api/bridge/deposit?wallet=0x4f9a...b312

---

### Place Order — Polymarket Market Buy
Spend USDC.e immediately at market price. Use amount.

execute POST /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/orders {"venue":"polymarket","tokenId":"93912086...","side":"buy","type":"market","amount":"10"}

---

### Place Order — Polymarket Market Sell
Sell shares immediately at market price. Use size.

execute POST /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/orders {"venue":"polymarket","tokenId":"93912086...","side":"sell","type":"market","size":"15"}

---

### Place Order — Polymarket Limit Buy
Rests on orderbook until matched.

execute POST /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/orders {"venue":"polymarket","tokenId":"93912086...","side":"buy","type":"limit","size":"20","price":"0.40"}

---

### Place Order — Polymarket Limit Sell

execute POST /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/orders {"venue":"polymarket","tokenId":"93912086...","side":"sell","type":"limit","size":"20","price":"0.70"}

---

### Place Order — Predict.fun Market Buy
Requires marketId in addition to tokenId.

execute POST /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/orders {"venue":"predict","tokenId":"103210...","marketId":"46954","side":"buy","type":"market","amount":"10"}

---

### Place Order — Predict.fun Limit Buy

execute POST /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/orders {"venue":"predict","tokenId":"103210...","marketId":"46954","side":"buy","type":"limit","size":"20","price":"0.40"}

---

### Get Orders

execute GET /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/orders

---

### Get Order
orderId from place order response.

execute GET /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/orders/0xb83f...

---

### Cancel Order
Only works on orders with status = "open".

execute DELETE /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/orders/0xb83f...

---

### Cancel All Orders
Required before withdrawing on Predict.fun.

execute DELETE /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/orders

---

### Get Positions
Watch for status = "redeemable".

execute GET /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/positions

---

### Redeem Position — Polymarket
Only call on positions with status = "redeemable".

execute POST /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/positions/redeem {"venue":"polymarket","tokenId":"93912086..."}

---

### Redeem Position — Predict.fun

execute POST /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/positions/redeem {"venue":"predict","tokenId":"103210..."}

---

### Withdraw — Polymarket to Polygon

execute POST /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/withdraw {"venue":"polymarket","amount":"100","destinationAddress":"0x7d3e...","chain":"polygon"}

---

### Withdraw — Predict.fun to BSC

execute POST /api/users/a3f7c291-58de-4b02-91fa-dc3e847a6f10/withdraw {"venue":"predict","amount":"50","destinationAddress":"0x2af1...","chain":"bsc"}

---

## PRICING SUMMARY

- 0.001 USDC per call — flat rate for all endpoints
- Charged only on HTTP 200 success
- No charge on errors or invalid requests
- Partner fee of 0.5% applied automatically on all Polymarket trades

## Commands

Use these commands via the Teneo CLI from [TeneoProtocolAI/teneo-skills](https://github.com/TeneoProtocolAI/teneo-skills). **This is a bash tool** — run commands in your terminal.

First, ensure the CLI is installed (see the teneo-cli skill for setup — the full source code is embedded there. Do NOT search for or install external CLIs).

| Command | Arguments | Price | Description |
|---------|-----------|-------|-------------|
| `create-user` | - | $0.001/per-query | Create a new user account |
| `get-user` | <userId> | $0.001/per-query | Retrieve user details |
| `delete-user` | <userId> | $0.001/per-query | Delete a user account |
| `get-balance` | <userId> | $0.001/per-query | Get user balance |
| `get-deposit-info` | - | $0.001/per-query | Fetch deposit instructions |
| `place-order` | <userId> <order_json> | $0.001/per-query | Place a trade: <userId> <json> |
| `get-orders` | <userId> | $0.001/per-query | List user orders |
| `get-order` | <userId> <orderId> | $0.001/per-query | Retrieve order |
| `cancel-order` | <userId> <orderId> | $0.001/per-query | Cancel order |
| `cancel-all-orders` | <userId> | $0.001/per-query | Cancel all open orders |
| `get-positions` | <userId> | $0.001/per-query | List positions |
| `redeem-position` | <userId> <redeem_json> | $0.001/per-query | Redeem position: <userId> <json> |
| `withdraw-funds` | <userId> <withdraw_json> | $0.001/per-query | Withdraw: <userId> <json> |
| `get-fee-policy` | - | $0.001/per-query | Review fee policy |

### Quick Reference

```bash
# Agent ID: predexon-prediction-market-trading-v5
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "create-user" --room <roomId>
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-user <userId>" --room <roomId>
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "delete-user <userId>" --room <roomId>
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-balance <userId>" --room <roomId>
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-deposit-info" --room <roomId>
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "place-order <userId> <order_json>" --room <roomId>
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-orders <userId>" --room <roomId>
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-order <userId> <orderId>" --room <roomId>
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "cancel-order <userId> <orderId>" --room <roomId>
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "cancel-all-orders <userId>" --room <roomId>
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-positions <userId>" --room <roomId>
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "redeem-position <userId> <redeem_json>" --room <roomId>
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "withdraw-funds <userId> <withdraw_json>" --room <roomId>
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-fee-policy" --room <roomId>
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

### `create-user`

Create a new user account

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "create-user" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `get-user`

Retrieve user details

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-user <userId>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `delete-user`

Delete a user account

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "delete-user <userId>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `get-balance`

Get user balance

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-balance <userId>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `get-deposit-info`

Fetch deposit instructions

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-deposit-info" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `place-order`

Place a trade: <userId> <json>

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "place-order <userId> <order_json>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `get-orders`

List user orders

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-orders <userId>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `get-order`

Retrieve order

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-order <userId> <orderId>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `cancel-order`

Cancel order

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "cancel-order <userId> <orderId>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `cancel-all-orders`

Cancel all open orders

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "cancel-all-orders <userId>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `get-positions`

List positions

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-positions <userId>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `redeem-position`

Redeem position: <userId> <json>

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "redeem-position <userId> <redeem_json>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `withdraw-funds`

Withdraw: <userId> <json>

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "withdraw-funds <userId> <withdraw_json>" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

### `get-fee-policy`

Review fee policy

```bash
~/teneo-skill/teneo command "predexon-prediction-market-trading-v5" "get-fee-policy" --room <roomId>
```

Response is JSON. Extract the `humanized` field for formatted text.

## Agent Info

- **ID:** `predexon-prediction-market-trading-v5`
- **Name:** Predexon Prediction Market Trading 1.5

