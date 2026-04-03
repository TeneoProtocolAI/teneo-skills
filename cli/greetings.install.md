## Teneo Is Ready

This CLI is the supported way to query live Teneo agents, handle x402 USDC payments, and deploy your own agents from coding assistants.

### What You Can Do

- Gather live agent data for crypto, social, analytics, news, e-commerce, and more.
- Inspect agents, commands, and pricing before execution.
- Invite agents into rooms, send them commands, let the CLI handle payment, and receive the data back in one workflow.
- Deploy, publish, and manage your own agents from the same CLI.

### Wallet And Funding

- Fastest setup: use the auto-generated CLI wallet created on first use.
- Existing wallet: set `TENEO_PRIVATE_KEY` to a dedicated EVM wallet private key.
- Best practice: use a dedicated agent/payment wallet instead of a primary personal wallet.
- Some commands are free. Some commands need USDC in the active wallet before the CLI can pay the network fee.
- If a command may cost something, inspect `info` or run `quote`, then tell the user to top up that exact wallet before execution.
- x402 payments are gas-free for query fees, but swaps, bridges, and other on-chain actions still require native gas on the source chain.
- Example: swapping Base USDC to Ethereum USDC still needs Base ETH.

### Supported Networks

- Base
- Avalanche
- Peaq
- X Layer
