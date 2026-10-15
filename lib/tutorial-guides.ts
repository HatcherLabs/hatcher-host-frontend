export interface TutorialGuide {
  before: string;
  steps: [string, string][];
  note: string;
}

// Written companion guides, not verbatim transcripts of the recordings.
export const TUTORIAL_GUIDES: Record<string, TutorialGuide> = {
  "create-first-agent": {
    "before": "Have a Hatcher account and a specific task in mind. Available agent capacity and model access depend on your plan and configuration.",
    "steps": [
      [
        "Define a first task",
        "Choose one bounded job, such as researching a topic or drafting a document. Describe the desired result and the information the agent should use."
      ],
      [
        "Review the agent setup",
        "Choose the framework and model configuration offered in the creation flow. Check the instructions before creating the agent."
      ],
      [
        "Open the workspace",
        "Wait for the agent to become ready, then open its workspace. Send a small first request to check that the model and tools are available."
      ],
      [
        "Inspect the result",
        "Review the response and any files the agent produced. Refine its instructions before giving it a larger or recurring task."
      ]
    ],
    "note": "Creating an agent does not automatically connect external accounts. Configure integrations and permissions separately."
  },
  "models-ai-credits": {
    "before": "Open an agent you own. The framework, language model, and provider route are separate choices.",
    "steps": [
      [
        "Choose a suitable model",
        "Review the available models and their descriptions. Start with a model suited to the task, then compare results on the same small request."
      ],
      [
        "Save the selection",
        "Save the model in the agent configuration. Reopen the configuration to confirm the chosen value persisted."
      ],
      [
        "Compare quality and usage",
        "Review the output alongside recorded usage. Longer prompts, larger responses, and repeated tool calls can change the total cost of a task."
      ],
      [
        "Check current prices",
        "Use the current model catalog and billing information for purchasing decisions. The video shows pricing examples recorded on 2 October 2026."
      ]
    ],
    "note": "A model change does not install skills or grant permissions. With BYOK, provider charges and Hatcher plan entitlements remain separate."
  },
  "neural-mesh": {
    "before": "Have agents available for the workflow and decide which responsibility each agent should handle.",
    "steps": [
      [
        "Inspect available peers",
        "Open Neural Mesh and review which agents are available. Choose peers based on their capabilities and the work they are allowed to do."
      ],
      [
        "Define the handoff",
        "Describe the task, the expected output, and any relevant constraints so that a receiving agent has enough context."
      ],
      [
        "Run a bounded task",
        "Start with a small request and follow the routing shown in the interface. Check the response from each participating agent."
      ],
      [
        "Verify the outcome",
        "Inspect the returned result before relying on it or extending the workflow. A routed request is not proof that the underlying task succeeded."
      ]
    ],
    "note": "Only share the context needed for a handoff. Agent availability and installed tools can affect which tasks a peer can complete."
  },
  "chat-files-attachments": {
    "before": "Prepare the document or image you want the agent to work with, and remove information that is not needed for the task.",
    "steps": [
      [
        "Attach the file",
        "Open the agent chat and use the attachment control to select a supported file or image."
      ],
      [
        "Check the preview",
        "Review the file name and preview before sending. Confirm that you selected the intended version."
      ],
      [
        "Explain what to do",
        "Send a request that refers to the attachment and states the desired output, such as a summary, comparison, or edited draft."
      ],
      [
        "Review the response",
        "Check the answer against the source and open any generated files. If the agent cannot read the format, provide a supported version or relevant text."
      ]
    ],
    "note": "Supported formats and size limits depend on the current interface and model. An uploaded image requires an appropriate model or tool to interpret it."
  },
  "mission-control": {
    "before": "Choose an agent and define an outcome, a budget, and the actions that should require your approval.",
    "steps": [
      [
        "Create a governed task",
        "Open Mission Control and describe the work and the artifact or answer you expect."
      ],
      [
        "Set execution limits",
        "Review the available budget controls and approval rules before starting. Match permissions to the specific task."
      ],
      [
        "Follow execution",
        "Inspect progress and respond to approval requests when needed. Keep the task bounded if new work is discovered."
      ],
      [
        "Inspect outputs",
        "Review the execution history, outputs, and artifacts. Check that the result satisfies the original request before considering the task complete."
      ]
    ],
    "note": "Approval controls depend on the configured workflow. Review external actions and their results rather than inferring success from task status alone."
  },
  "routines-v2": {
    "before": "Decide what should run, how often it should run, and what limits should apply to each execution.",
    "steps": [
      [
        "Describe the recurring objective",
        "Open Automations and state a repeatable task with a clear expected result."
      ],
      [
        "Review the schedule",
        "Check the proposed schedule and timezone before saving. Make sure the cadence matches the frequency at which the work is useful."
      ],
      [
        "Set limits and approvals",
        "Review the available execution limits and approval settings. Avoid giving a routine broader access than its task needs."
      ],
      [
        "Check run history",
        "Inspect completed runs and their outputs. Adjust the instructions or schedule if the results are incomplete or no longer useful."
      ]
    ],
    "note": "A saved schedule does not guarantee every run will succeed. Agent availability, provider access, and task inputs can affect execution."
  },
  "skills": {
    "before": "Choose an agent and identify a capability it needs. Review a skill before installing it, especially if it accesses external services.",
    "steps": [
      [
        "Find a relevant skill",
        "Browse or search the skills available to the agent. Read the description and the tasks it is designed to support."
      ],
      [
        "Review requirements",
        "Check any required tools, credentials, and permissions. Only connect services needed for the intended use."
      ],
      [
        "Install the skill",
        "Use the installation flow and confirm that it appears among the agent capabilities. Follow any additional setup instructions."
      ],
      [
        "Try a small request",
        "Ask the agent to perform a bounded task using the skill. Inspect the response and any external result before expanding its use."
      ]
    ],
    "note": "Installing a skill does not guarantee that all of its dependencies or external accounts are configured."
  },
  "agent-mail": {
    "before": "Open an agent you own and review the mail capabilities available to its configuration.",
    "steps": [
      [
        "Set up the managed inbox",
        "Open the mail controls for the agent and follow the setup flow. Confirm the address shown before sharing it."
      ],
      [
        "Inspect an incoming request",
        "Send a small test message and review the inbound content. Treat messages from external senders as untrusted input."
      ],
      [
        "Prepare a reply",
        "Give the agent clear instructions about the recipient and the response. Review the content before authorizing an outbound message."
      ],
      [
        "Check delivery",
        "Inspect the outbound delivery information. Confirm any important communication through the available status and recipient feedback."
      ]
    ],
    "note": "Mail content can contain misleading instructions. Keep permissions and approval rules scoped to the task."
  },
  "github-workflow": {
    "before": "Have access to the intended GitHub repository and define a small change that can be reviewed in a pull request.",
    "steps": [
      [
        "Connect the repository",
        "Use the GitHub connection flow and select the repositories the agent may access. Confirm the intended repository before starting work."
      ],
      [
        "Specify a bounded change",
        "Describe the problem, expected behavior, and relevant checks. Include constraints that the agent should preserve."
      ],
      [
        "Inspect the proposed changes",
        "Follow the work and review the resulting diff and commit. Check that unrelated files or credentials are not included."
      ],
      [
        "Review the pull request",
        "Open the resulting GitHub PR, inspect its tests and description, and complete your normal review before merging."
      ]
    ],
    "note": "A created PR is a review artifact, not evidence that the change has been merged or deployed."
  },
  "image-to-image": {
    "before": "Choose a reference image that you have permission to use and describe the change you want.",
    "steps": [
      [
        "Attach the reference",
        "Upload the reference image in the supported image workflow and check its preview."
      ],
      [
        "Describe the transformation",
        "State what should remain recognizable and what should change, such as the background, colors, or composition."
      ],
      [
        "Review the generated result",
        "Compare the output with the reference and your request. Check text, small details, and anything that must be preserved."
      ],
      [
        "Download or refine",
        "Download a satisfactory result, or request a specific correction using the generated image as the next reference."
      ]
    ],
    "note": "Image generation can alter details unexpectedly. Inspect the final file before publishing or using it in production."
  }
};
