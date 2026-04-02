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

You should see the skill directories: `teneo-cli` and `agents/`.

Codex uses each skill's `SKILL.md` `description` to decide when to invoke it implicitly, and it can read optional UI metadata from `agents/openai.yaml` when present.

## Available Skills

| Skill | When to Use |
|-------|-------------|
| `teneo-cli` | Discover agents, query live data, handle payments, and deploy your own agents |
| Agent catalog (`agents/`) | Discover which Teneo agent matches the task before running it |
| Individual agent skills (`agents/teneo-agent-*`) | Specific live agents for scraping, crypto data, analytics, social media, product search, and onchain actions |

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
