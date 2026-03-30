# Installing Teneo Skills for OpenCode

## Prerequisites

- [OpenCode.ai](https://opencode.ai) installed
- Git installed
- A wallet is auto-generated on first use (optional: provide your own via `.env`)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/TeneoProtocolAI/teneo-skills ~/.config/opencode/teneo-skills
```

### 2. Register the Plugin

Create a symlink so OpenCode discovers the plugin:

```bash
mkdir -p ~/.config/opencode/plugins
rm -f ~/.config/opencode/plugins/teneo-skills.js
ln -s ~/.config/opencode/teneo-skills/.opencode/plugins/teneo-skills.js ~/.config/opencode/plugins/teneo-skills.js
```

### 3. Symlink Skills

Create a symlink so OpenCode's native skill tool discovers the Teneo skills:

```bash
mkdir -p ~/.config/opencode/skills
rm -rf ~/.config/opencode/skills/teneo-skills
ln -s ~/.config/opencode/teneo-skills/skills ~/.config/opencode/skills/teneo-skills
```

### 4. Restart OpenCode

Restart OpenCode. The plugin will automatically inject Teneo skill context.

Verify by asking: `"list available Teneo agents"` or `"how do I connect to Teneo Protocol?"`

## Usage

### Available Skills

| Skill | When to Use |
|-------|-------------|
| `teneo-cli` | CLI tool: discover agents, query data, manage rooms, handle payments |
| `teneo-agent-deployment` | Deploy your own agent on Teneo Protocol and earn USDC |
| Agent skills (`agents/`) | Individual AI agents — scraping, crypto data, analytics, social media |

### Loading a Skill Manually

Use OpenCode's native `skill` tool:

```
use skill tool to load teneo-skills/teneo-cli
```

## Updating

```bash
cd ~/.config/opencode/teneo-skills
git pull
```

## Troubleshooting

### Plugin not loading

1. Check plugin symlink: `ls -l ~/.config/opencode/plugins/teneo-skills.js`
2. Check source exists: `ls ~/.config/opencode/teneo-skills/.opencode/plugins/teneo-skills.js`
3. Check OpenCode logs for errors

### Skills not found

1. Check skills symlink: `ls -l ~/.config/opencode/skills/teneo-skills`
2. Verify it points to: `~/.config/opencode/teneo-skills/skills`
3. Use `skill` tool in OpenCode to list discovered skills

## Getting Help

- Report issues: [GitHub Issues](https://github.com/TeneoProtocolAI/teneo-skills/issues)
- Teneo Protocol: [teneo-protocol.ai](https://teneo-protocol.ai)
