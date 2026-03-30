# Installing Teneo Skills for Codex

Enable Teneo Protocol skills in Codex via native skill discovery. Clone and symlink.

## Prerequisites

- Git
- Node.js >= 18
- A wallet is auto-generated on first use (optional: provide your own via `.env`)

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/TeneoProtocolAI/teneo-skills ~/.codex/teneo-skills
   ```

2. **Create the skills symlink:**

   ```bash
   mkdir -p ~/.agents/skills
   ln -s ~/.codex/teneo-skills/skills ~/.agents/skills/teneo-skills
   ```

   **Windows (PowerShell):**

   ```powershell
   New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
   cmd /c mklink /J "$env:USERPROFILE\.agents\skills\teneo-skills" "$env:USERPROFILE\.codex\teneo-skills\skills"
   ```

3. **Restart Codex** (quit and relaunch the CLI) to discover the skills.

## Verify

```bash
ls -la ~/.agents/skills/teneo-skills
```

You should see the skill directories: `teneo-cli`, `teneo-agent-deployment`, and `agents/`.

## Available Skills

| Skill | When to Use |
|-------|-------------|
| `teneo-cli` | CLI tool: discover agents, query data, manage rooms, handle payments |
| `teneo-agent-deployment` | Deploy your own agent on Teneo Protocol and earn USDC |
| Agent skills (`agents/`) | Individual AI agents — scraping, crypto data, analytics, social media |

## Updating

```bash
cd ~/.codex/teneo-skills && git pull
```

Skills update instantly through the symlink.

## Uninstalling

```bash
rm ~/.agents/skills/teneo-skills
```

Optionally delete the clone: `rm -rf ~/.codex/teneo-skills`.
