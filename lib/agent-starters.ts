import { DEFAULT_HOSTED_MODEL } from "@/lib/hosted-model-catalog";

export const AGENT_RUNTIMES = ["openclaw", "hermes", "ironclaw"] as const;
export type AgentRuntime = (typeof AGENT_RUNTIMES)[number];
export const AGENT_STARTERS = [
  {
    id: "personal",
    name: "Personal agent",
    description: "Research, organize work, and help with everyday tasks.",
    instructions:
      "Help me research and organize my work. Ask for missing context, keep useful notes, and explain what you have completed. Ask before sending messages, publishing, or making purchases.",
  },
  {
    id: "coder",
    name: "Coding agent",
    description: "Work on repositories, investigate bugs, and review changes.",
    instructions:
      "Help me build and maintain software. Inspect the repository and its instructions before editing. Make focused changes and run relevant checks. Report what changed and what was verified. Ask before publishing or deploying changes.",
  },
  {
    id: "research",
    name: "Crypto research agent",
    description: "Research tokens, follow markets, and review portfolio data.",
    instructions:
      "Research crypto markets and connected portfolios using available tools. Distinguish verified data from estimates and include source timestamps. Explain uncertainty and risk. Do not trade, transfer funds, or sign transactions without my explicit authorization and configured limits.",
  },
] as const;

export function buildQuickAgent(input: {
  name: string;
  instructions: string;
  framework: AgentRuntime;
  starter: string;
  model: string;
}) {
  const name = input.name.trim();
  const instructions = input.instructions.trim();
  if (
    name.length < 3 ||
    name.length > 50 ||
    !/^[a-zA-Z0-9 \-:'.()&]+$/.test(name)
  ) {
    throw new Error(
      "Use a name of 3–50 characters: letters, numbers, spaces, or simple punctuation.",
    );
  }
  if (!instructions || instructions.length > 8000)
    throw new Error("Add instructions of up to 8,000 characters.");
  if (!AGENT_RUNTIMES.includes(input.framework))
    throw new Error("Choose an available agent runtime.");
  return {
    name,
    description:
      AGENT_STARTERS.find((s) => s.id === input.starter)?.description ?? "",
    framework: input.framework,
    template: "custom",
    config: {
      systemPrompt: instructions,
      model: input.model || DEFAULT_HOSTED_MODEL,
      provider: "openrouter",
    },
  };
}

export function simpleAgentHref(
  id: string,
  tab: "chat" | "config" | "integrations" | "plugins" = "chat",
) {
  return `/agents/${encodeURIComponent(id)}?tab=${tab}&view=easy`;
}
