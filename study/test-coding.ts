import { AuthStorage, createAgentSession, ModelRegistry, SessionManager, SettingsManager, DefaultResourceLoader } from "../packages/coding-agent/src/index.js";

import tps from "./extensions/tps.js";

// Set up credential storage and model registry
const authStorage = AuthStorage.create();
const modelRegistry = new ModelRegistry(authStorage);

const settingsManager = SettingsManager.create()
const extensionFactories = [tps];
const resourceLoader = new DefaultResourceLoader({ settingsManager, extensionFactories });
await resourceLoader.reload();

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),resourceLoader
});

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt("你好");