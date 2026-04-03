# pi-agent-core API 速查

## Agent 类

### 构造

```typescript
const agent = new Agent({
  initialState: {
    systemPrompt: "You are helpful.",
    model: getModel("anthropic", "claude-sonnet-4-20250514"),
    thinkingLevel: "medium",
    tools: [],
    messages: [],
  },
  convertToLlm: (msgs) => msgs.filter(m => 
    ["user", "assistant", "toolResult"].includes(m.role)
  ),
  transformContext: async (msgs) => msgs,
  steeringMode: "one-at-a-time",
  followUpMode: "one-at-a-time",
  toolExecution: "parallel",
  beforeToolCall: async ({ toolCall }) => undefined,
  afterToolCall: async ({ result }) => undefined,
});
```

### 核心方法

| 方法 | 签名 | 用途 |
|------|------|------|
| `prompt()` | `prompt(msg: string, images?: ImageContent[]): Promise<void>` | 发送消息，启动对话 |
| `continue()` | `continue(): Promise<void>` | 从当前上下文继续 |
| `subscribe()` | `subscribe(fn: (e: AgentEvent) => void): () => void` | 订阅事件 |
| `abort()` | `abort(): void` | 取消当前操作 |
| `waitForIdle()` | `waitForIdle(): Promise<void>` | 等待完成 |
| `reset()` | `reset(): void` | 重置状态 |

### 状态管理

```typescript
// Getter
agent.state: AgentState

// Setters
agent.setSystemPrompt(prompt: string): void
agent.setModel(model: Model<any>): void
agent.setThinkingLevel(level: ThinkingLevel): void
agent.setTools(tools: AgentTool[]): void
agent.replaceMessages(messages: AgentMessage[]): void
agent.appendMessage(message: AgentMessage): void

// Session
agent.sessionId: string | undefined
agent.thinkingBudgets: ThinkingBudgets | undefined

// Tool execution
agent.toolExecution: ToolExecutionMode
agent.setToolExecution(mode: ToolExecutionMode): void
agent.setBeforeToolCall(fn): void
agent.setAfterToolCall(fn): void
```

### 队列操作

```typescript
// Steering（转向）
agent.steer(message: AgentMessage): void
agent.setSteeringMode(mode: "all" | "one-at-a-time"): void
agent.getSteeringMode(): "all" | "one-at-a-time"
agent.clearSteeringQueue(): void

// Follow-up（跟进）
agent.followUp(message: AgentMessage): void
agent.setFollowUpMode(mode: "all" | "one-at-a-time"): void
agent.getFollowUpMode(): "all" | "one-at-a-time"
agent.clearFollowUpQueue(): void

agent.clearAllQueues(): void
agent.hasQueuedMessages(): boolean
```

---

## 低层 API (agent-loop.ts)

### agentLoop

```typescript
import { agentLoop, agentLoopContinue } from "@mariozechner/pi-agent-core";

// 启动新对话
const stream = agentLoop(
  prompts: AgentMessage[],      // 初始消息
  context: AgentContext,        // 上下文
  config: AgentLoopConfig,      // 配置
  signal?: AbortSignal,         // 取消信号
  streamFn?: StreamFn,          // 自定义流函数
);

// 订阅事件
for await (const event of stream) {
  console.log(event.type);
}

// 获取最终结果
const messages = await stream.result();
```

### agentLoopContinue

```typescript
// 从现有上下文继续
const stream = agentLoopContinue(
  context: AgentContext,
  config: AgentLoopConfig,
  signal?: AbortSignal,
  streamFn?: StreamFn,
);

// 要求：context.messages.length > 0
// 要求：最后一条不是 assistant
```

---

## 类型定义

### AgentState

```typescript
interface AgentState {
  systemPrompt: string;
  model: Model<any>;
  thinkingLevel: ThinkingLevel;
  tools: AgentTool<any>[];
  messages: AgentMessage[];
  isStreaming: boolean;
  streamMessage: AssistantMessage | null;
  pendingToolCalls: Set<string>;
  error?: string;
}
```

### AgentContext

```typescript
interface AgentContext {
  systemPrompt: string;
  messages: AgentMessage[];  // 注意：引用！
  tools: AgentTool<any>[];
}
```

### AgentTool

```typescript
interface AgentTool<T> {
  name: string;
  label: string;
  description: string;
  parameters: TSchema;
  execute: (
    toolCallId: string,
    params: Static<T>,
    signal?: AbortSignal,
    onUpdate?: (update: ToolUpdate) => void
  ) => Promise<AgentToolResult<T>>;
}
```

### AgentLoopConfig

```typescript
interface AgentLoopConfig extends SimpleStreamOptions {
  model: Model<any>;
  convertToLlm: (messages: AgentMessage[]) => Message[] | Promise<Message[]>;
  transformContext?: (messages: AgentMessage[], signal?: AbortSignal) => Promise<AgentMessage[]>;
  toolExecution?: ToolExecutionMode;
  beforeToolCall?: BeforeToolCallFn;
  afterToolCall?: AfterToolCallFn;
  getSteeringMessages?: () => Promise<AgentMessage[]>;
  getFollowUpMessages?: () => Promise<AgentMessage[]>;
}
```

---

## 事件类型

```typescript
type AgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; messages: AgentMessage[] }
  | { type: "turn_start" }
  | { type: "turn_end"; message: AssistantMessage; toolResults: ToolResultMessage[] }
  | { type: "message_start"; message: AgentMessage }
  | { type: "message_update"; message: AssistantMessage; assistantMessageEvent: AssistantMessageEvent }
  | { type: "message_end"; message: AgentMessage }
  | { type: "tool_execution_start"; toolCallId: string; toolName: string; args: unknown }
  | { type: "tool_execution_update"; toolCallId: string; partialResult: ToolUpdate }
  | { type: "tool_execution_end"; toolCallId: string; result: AgentToolResult<any> };
```

---

## 常用类型别名

```typescript
// 执行模式
type ToolExecutionMode = "sequential" | "parallel";

// 队列模式
type QueueMode = "all" | "one-at-a-time";

// 推理级别
type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

// Stream 函数
type StreamFn = (
  model: Model<any>,
  context: Context,
  options: SimpleStreamOptions
) => ReturnType<typeof streamSimple> | Promise<ReturnType<typeof streamSimple>>;
```

---

## 快速示例

### 基本使用

```typescript
import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";

const agent = new Agent({
  initialState: {
    systemPrompt: "You are helpful.",
    model: getModel("openai", "gpt-4o"),
    tools: [],
  },
});

agent.subscribe(console.log);
await agent.prompt("Hello!");
```

### 带工具

```typescript
import { Type } from "@sinclair/typebox";

const readTool: AgentTool = {
  name: "read_file",
  label: "Read File",
  description: "Read a file",
  parameters: Type.Object({
    path: Type.String(),
  }),
  execute: async (id, params) => ({
    content: [{ type: "text", text: await fs.readFile(params.path, "utf-8") }],
  }),
};

agent.setTools([readTool]);
await agent.prompt("Read package.json");
```

### 流式输出

```typescript
agent.subscribe((event) => {
  if (event.type === "message_update" && 
      event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});
```

### 拦截工具

```typescript
const agent = new Agent({
  beforeToolCall: async ({ toolCall }) => {
    if (toolCall.name === "bash") {
      return { block: true, reason: "Security: bash disabled" };
    }
  },
});
```

### 继续对话

```typescript
try {
  await agent.prompt("Do something risky");
} catch (e) {
  // 出错后重试
  await agent.continue();
}
```

---

## 错误码

| 错误 | 触发条件 | 处理 |
|------|----------|------|
| `Agent is already processing` | `prompt()`/`continue()` 时 `isStreaming === true` | 等待或 `abort()` |
| `Cannot continue from message role: assistant` | `continue()` 时最后一条是 assistant | 添加 steering 或等待 tool |
| `No messages to continue from` | `continue()` 时 messages 为空 | 使用 `prompt()` |
| `Tool not found` | LLM 调用了未注册的工具 | 检查 tools 配置 |
| `Validation failed` | 工具参数不符合 schema | 检查参数类型 |
