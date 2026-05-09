import { createAgentSession, InteractiveMode, SettingsManager,DefaultResourceLoader } from "../src/index.js";
import testMessage from "./test-message.js";

const settingsManager = SettingsManager.create()
const extensionFactories = [testMessage];
const resourceLoader = new DefaultResourceLoader({ settingsManager, extensionFactories });
await resourceLoader.reload();

const { session } = await createAgentSession({resourceLoader});

console.log(process.execPath)

console.log(process.argv[1]);

const mode = new InteractiveMode(session, {
  // All optional
  migratedProviders: [],           // Show migration warnings
  modelFallbackMessage: undefined, // Show model restore warning
  initialMessage: "",         // Send on startup
  initialImages: [],               // Images with initial message
  initialMessages: [],             // Additional startup prompts
});

await mode.run();  // Blocks until exit