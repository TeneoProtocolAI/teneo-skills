/**
 * Teneo Skills plugin for OpenCode.ai
 *
 * Injects Teneo skill context via system prompt transform.
 * Skills are discovered via OpenCode's native skill tool from the symlinked directory.
 *
 * Installation:
 *   git clone https://github.com/TeneoProtocolAI/teneo-skills ~/.config/opencode/teneo-skills
 *   ln -s ~/.config/opencode/teneo-skills/.opencode/plugins/teneo-skills.js ~/.config/opencode/plugins/teneo-skills.js
 *   ln -s ~/.config/opencode/teneo-skills/skills ~/.config/opencode/skills/teneo-skills
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin lives at .opencode/plugins/teneo-skills.js
// Project root is two levels up: .opencode/plugins/ -> .opencode/ -> project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Extract YAML frontmatter and body from a SKILL.md file
const extractAndStripFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content };

  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter = {};

  for (const line of frontmatterStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  }

  return { frontmatter, content: body };
};

export const TeneoSkillsPlugin = async ({ client, directory }) => {
  const skillsDir = path.join(PROJECT_ROOT, 'skills');
  const agentsFile = path.join(PROJECT_ROOT, 'AGENTS.md');

  const BASE_SKILLS = [
    'teneo-cli',
    'teneo-agent-deployment',
  ];

  const getBootstrapContent = () => {
    const parts = [];

    // 1. Load AGENTS.md as the main bootstrap context
    if (fs.existsSync(agentsFile)) {
      const agentsContent = fs.readFileSync(agentsFile, 'utf8');
      parts.push(agentsContent.trim());
    }

    // 2. Append skill trigger conditions extracted from SKILL.md frontmatter
    const triggerLines = [];

    // Check base skills
    for (const skillName of BASE_SKILLS) {
      const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;

      const raw = fs.readFileSync(skillPath, 'utf8');
      const { frontmatter } = extractAndStripFrontmatter(raw);

      if (frontmatter.description) {
        triggerLines.push(`- **${skillName}**: ${frontmatter.description}`);
      }
    }

    // Check agent skills
    const agentsDir = path.join(skillsDir, 'agents');
    if (fs.existsSync(agentsDir)) {
      const agentDirs = fs.readdirSync(agentsDir, { withFileTypes: true })
        .filter(d => d.isDirectory());

      for (const dir of agentDirs) {
        const skillPath = path.join(agentsDir, dir.name, 'SKILL.md');
        if (!fs.existsSync(skillPath)) continue;

        const raw = fs.readFileSync(skillPath, 'utf8');
        const { frontmatter } = extractAndStripFrontmatter(raw);

        if (frontmatter.description) {
          triggerLines.push(`- **${dir.name}**: ${frontmatter.description}`);
        }
      }
    }

    if (triggerLines.length > 0) {
      parts.push(
        `## When to Load Each Skill\n\n${triggerLines.join('\n')}`
      );
    }

    // 3. Tool usage instructions for OpenCode
    parts.push(
      `## Using Skills in OpenCode

Use OpenCode's native \`skill\` tool to load a skill when triggered:
- \`skill: teneo-cli\` — CLI tool: discover agents, query data, manage rooms, handle payments
- \`skill: teneo-agent-deployment\` — deploy Go agents on Teneo Protocol

A wallet is auto-generated on first use. No manual key setup needed.
Get started at: https://teneo-protocol.ai`
    );

    // 4. Command execution rules — critical for OpenClaw output handling
    parts.push(
      `## CRITICAL: Shell Command Rules for Teneo CLI

When running any \`~/teneo-skill/teneo\` command, you MUST follow these rules:

1. **ALWAYS wait for the command to fully complete** (process exits) before reading output. Teneo CLI outputs JSON to stdout. The JSON is only valid and complete when the process exits. Never start parsing or responding while the command is still running.
2. **If you see incomplete or malformed JSON, the command is still running.** Wait for it to finish.
3. **Agent queries take 10-30 seconds.** Discovery commands return large JSON. Set shell timeout to at least 120 seconds.
4. **Run commands one at a time, never in parallel.** Each command uses a WebSocket connection.
5. **Prefer targeted queries** (\`list-agents --search "keyword"\`, \`info <agentId>\`) over \`discover\` to reduce output size.
6. **Check the exit code.** Exit 0 = success. Non-zero = error (details on stderr).`
    );

    return parts.length > 0
      ? `<TENEO_SKILLS>\n${parts.join('\n\n')}\n</TENEO_SKILLS>`
      : null;
  };

  return {
    // Inject Teneo skill context into every conversation's system prompt
    'experimental.chat.system.transform': async (_input, output) => {
      const bootstrap = getBootstrapContent();
      if (bootstrap) {
        (output.system ||= []).push(bootstrap);
      }
    },
  };
};
