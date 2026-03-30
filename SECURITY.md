# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in teneo-skills, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email: **security@teneo-protocol.ai**

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation plan within 7 business days.

## Scope

This policy covers:
- The skill definitions (SKILL.md files)
- The Teneo CLI (`cli/index.ts`)
- The plugin configurations (`.claude-plugin/`, `.cursor-plugin/`, `.codex/`, `.opencode/`)
- The `@teneo-protocol/sdk` integration patterns documented in skills

## Security Practices

- Private keys are used for wallet authentication and x402 payment signing
- Keys are stored encrypted locally
- The SDK uses WebSocket secure connections (`wss://`)
- API credentials are never embedded in skill files
- USDC payment amounts are documented per-command so users can audit costs
- All agent communication goes through the Teneo Protocol network with cryptographic verification
