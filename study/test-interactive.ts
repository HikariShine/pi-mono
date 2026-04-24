import { createAgentSession, InteractiveMode } from "../packages/coding-agent/src/index.js";

const { session } = await createAgentSession({ /* ... */ });

const mode = new InteractiveMode(session, {
  // All optional
  migratedProviders: [],           // Show migration warnings
  modelFallbackMessage: undefined, // Show model restore warning
  initialMessage: "Hello",         // Send on startup
  initialImages: [],               // Images with initial message
  initialMessages: [],             // Additional startup prompts
});

await mode.run();  // Blocks until exit