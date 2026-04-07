# coding-agent API 速查

## 核心 API

### 创建 AgentSession

```typescript
import { createAgentSession, type CreateAgentSessionOptions } from "@mariozechner/pi-coding-agent";

const { session, cleanup } = await createAgentSession({
  cwd: "/home/user/project",
  // 可选配置
  settingsPath: "~/.pi/agent/settings.json",
  model: getModel("openai", "gpt-4o"),
});

// 清理
await cleanup();
```

---

### 发送消息

```typescript
// 简单发送
await session.prompt("Hello, what can you do?");

// 带选项
await session.prompt("Explain this code", {
  expandPromptTemplates: true,  // 展开 @file:path 语法
  images: [{ type: "image", data: base64, mimeType: "image/png" }],
  streamingBehavior: "steer",  // 或 "followUp"
});
```

---

### 监听事件

```typescript
const listener = (event: AgentSessionEvent) => {
  if (event.type === "text_delta") {
    process.stdout.write(event.delta);
  }
  if (event.type === "toolcall_end") {
    console.log("Tool called:", event.toolCall.name);
  }
};

session.addEventListener(listener);

// 移除监听
session.removeEventListener(listener);
```

---

### 工具执行

```typescript
// 执行 Bash 命令
const result = await session.executeBash("ls -la", { timeout: 30000 });
console.log(result.stdout);

// 执行单个工具
const toolResult = await session.executeTool({
  name: "read",
  arguments: { path: "README.md" }
});
```

---

## 工具系统

### 创建工具

```typescript
import { 
  createReadTool, createBashTool, createEditTool, createWriteTool,
  createGrepTool, createFindTool, createLsTool
} from "@mariozechner/pi-coding-agent";

const readTool = createReadTool("/home/user/project");
const bashTool = createBashTool("/home/user/project", { timeout: 60000 });
const editTool = createEditTool("/home/user/project");
```

### 工具定义

```typescript
import { Type, type ToolDefinition } from "@mariozechner/pi-coding-agent";

const customTool: ToolDefinition = {
  name: "my_tool",
  description: "Does something useful",
  parameters: Type.Object({
    input: Type.String({ description: "Input to process" })
  }),
  execute: async (input, context) => {
    // 执行逻辑
    return {
      content: "Result: " + input.input,
      isError: false
    };
  }
};
```

---

## 扩展系统

### 创建扩展

```typescript
import type { Extension, ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

const myExtension: Extension = {
  name: "my-extension",
  version: "1.0.0",
  description: "My custom extension",
  
  setup(api: ExtensionAPI) {
    // 注册命令
    api.registerCommand("hello", async () => {
      await api.sendUserMessage("Hello from extension!");
    });
    
    // 注册工具
    api.registerTool(customTool);
  },
  
  async initialize(context: ExtensionContext) {
    console.log("Extension initialized");
  }
};

export default myExtension;
```

---

## 会话管理

### SessionManager 操作

```typescript
import { SessionManager, getSessionsDir } from "@mariozechner/pi-coding-agent";

const manager = new SessionManager(getSessionsDir());

// 加载会话
const entries = await manager.loadSession("session-abc");

// 添加 entry
await manager.appendEntry("session-abc", {
  type: "message",
  id: "1",
  parentId: null,
  timestamp: new Date().toISOString(),
  message: { /* ... */ }
});

// 列出所有会话
const sessions = await manager.listSessions();
```

---

## 设置管理

### SettingsManager

```typescript
import { SettingsManager, getSettingsPath } from "@mariozechner/pi-coding-agent";

const settings = new SettingsManager(getSettingsPath());

// 加载
await settings.load();

// 获取值
const model = settings.get("model");

// 设置值
settings.set("model", "gpt-4o");

// 保存
await settings.save();
```

---

## Skill 系统

### 加载 Skills

```typescript
import { loadSkillsFromDir, getAgentDir } from "@mariozechner/pi-coding-agent";
import { join } from "path";

const skillsDir = join(getAgentDir(), "skills");
const { skills, diagnostics } = await loadSkillsFromDir(skillsDir);

// 检查诊断
for (const diag of diagnostics) {
  console.warn(`${diag.severity}: ${diag.message}`);
}

// 使用 skill
const skill = skills.find(s => s.name === "my-skill");
```

---

## 认证管理

### AuthStorage

```typescript
import { AuthStorage, FileAuthStorageBackend, getAuthPath } from "@mariozechner/pi-coding-agent";

const backend = new FileAuthStorageBackend(getAuthPath());
const auth = new AuthStorage(backend);

// 加载
await auth.load();

// 设置 API Key
auth.setApiKeyCredential("openai", { type: "apiKey", key: "sk-xxx" });

// 设置 OAuth
auth.setOAuthCredential("anthropic", {
  type: "oauth",
  accessToken: "xxx",
  refreshToken: "yyy",
  expires: Date.now() + 3600000
});

// 保存
await auth.save();
```

---

## 压缩管理

### 手动压缩

```typescript
// 检查是否需要压缩
import { shouldCompact, calculateContextTokens } from "@mariozechner/pi-coding-agent";

const context = { messages: [...], tools: [...] };
if (shouldCompact(context)) {
  await session.compact("manual");
}

// 计算 token
const tokens = calculateContextTokens(context.messages);
```

---

## 事件类型速查

| 事件 | 触发时机 | 关键字段 |
|------|----------|----------|
| `turn_start` | 用户发送消息 | `userMessage` |
| `text_delta` | 接收文本增量 | `delta: string` |
| `toolcall_start` | 开始执行工具 | `toolCall` |
| `toolcall_end` | 工具执行完成 | `toolCall`, `result` |
| `compaction_start` | 开始压缩 | `reason` |
| `compaction_end` | 压缩完成 | `result`, `aborted` |
| `session_switch` | 切换会话 | `sessionId` |
| `model_change` | 切换模型 | `model` |

---

## 配置路径

| 路径 | 获取函数 | 说明 |
|------|----------|------|
| `~/.pi/agent/` | `getAgentDir()` | 配置根目录 |
| `~/.pi/agent/settings.json` | `getSettingsPath()` | 设置文件 |
| `~/.pi/agent/auth.json` | `getAuthPath()` | 认证文件 |
| `~/.pi/agent/models.json` | `getModelsPath()` | 模型配置 |
| `~/.pi/agent/sessions/` | `getSessionsDir()` | 会话目录 |
| `~/.pi/agent/skills/` | - | Skills 目录 |
| `~/.pi/agent/tools/` | `getToolsDir()` | 工具目录 |

---

## CLI 使用

```bash
# 启动交互式模式
pi

# 打印模式
pi --print "Explain this code" --file main.ts

# 指定模型
pi --models openai:gpt-4o,anthropic:claude-3-5-sonnet

# 指定工作目录
pi /path/to/project

# 斜杠命令
pi /session      # 会话管理
pi /compact      # 手动压缩
pi /model        # 切换模型
pi /tools        # 工具管理
```

---

## 环境变量

| 变量 | 用途 |
|------|------|
| `PI_CODING_AGENT_DIR` | 覆盖配置目录 |
| `PI_PACKAGE_DIR` | 覆盖包资源目录 |
| `PI_DEBUG` | 启用调试日志 |
| `PI_SHARE_VIEWER_URL` | 自定义分享查看器 URL |
| `HTTP_PROXY` / `HTTPS_PROXY` | HTTP 代理 |

---

## 版本信息

- **Package**: `@mariozechner/pi-coding-agent`
- **Version**: 0.63.1
- **License**: MIT
- **Node**: >= 20.6.0
