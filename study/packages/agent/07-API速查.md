# agent API 速查

## 核心 API

### 创建 Agent

```typescript
import { Agent, type AgentOptions } from "@mariozechner/pi-agent-core";

const agent = new Agent({
  // 初始状态
  initialState: {
    systemPrompt: "You are a helpful assistant.",
    model: getModel("openai", "gpt-4o"),
    thinkingLevel: "medium",
    tools: []
  },
  
  // 消息转换
  convertToLlm: (messages) => messages.filter(m => 
    m.role === "user" || m.role === "assistant" || m.role === "toolResult"
  ),
  
  // 上下文变换
  transformContext: async (messages, signal) => {
    // 裁剪旧消息
    return messages.slice(-20);
  },
  
  // 工具钩子
  beforeToolCall: async (context, signal) => {
    if (context.toolCall.name === "dangerous") {
      return { block: true, reason: "Too dangerous" };
    }
  },
  
  afterToolCall: async (context, signal) => {
    // 修改结果
    return { isError: false };
  },
  
  // 其他选项
  toolExecution: "parallel",  // "sequential" | "parallel"
  sessionId: "my-session",
  transport: "sse"
});
```

---

### 发送消息

```typescript
// 发送用户消息
await agent.prompt({
  role: "user",
  content: "Hello!",
  timestamp: Date.now()
});

// 发送带图片的消息
await agent.prompt({
  role: "user",
  content: [
    { type: "text", text: "What's in this image?" },
    { type: "image", data: base64, mimeType: "image/png" }
  ],
  timestamp: Date.now()
});
```

---

### 监听事件

```typescript
agent.addListener((event) => {
  switch (event.type) {
    case "agent_start":
      console.log("Agent started");
      break;
      
    case "turn_start":
      console.log("New turn");
      break;
      
    case "message_update":
      // 流式更新
      console.log(event.message.content[0]?.text);
      break;
      
    case "message_end":
      console.log("Message complete");
      break;
      
    case "tool_execution_start":
      console.log(`Tool ${event.toolName} started`);
      break;
      
    case "tool_execution_end":
      console.log(`Tool ${event.toolName} ended: ${event.isError ? "ERROR" : "OK"}`);
      break;
      
    case "turn_end":
      console.log("Turn ended");
      break;
      
    case "agent_end":
      console.log("Agent ended");
      break;
  }
});

// 移除监听
agent.removeListener(listener);
```

---

### 设置管理

```typescript
// 切换模型
agent.setModel(getModel("anthropic", "claude-3-5-sonnet"));

// 设置系统提示
agent.setSystemPrompt("New system prompt");

// 添加工具
agent.addTool(myTool);

// 设置 steering 消息
agent.setSteeringMessages([{
  role: "user",
  content: "Correction: do it this way",
  timestamp: Date.now()
}]);

// 设置 follow-up 消息
agent.setFollowUpMessages([{
  role: "user",
  content: "Also check...",
  timestamp: Date.now()
}]);
```

---

## Agent Loop 函数

### 使用 agentLoop

```typescript
import { agentLoop, type AgentLoopConfig } from "@mariozechner/pi-agent-core";

const stream = agentLoop(
  prompts,  // AgentMessage[]
  context,  // AgentContext
  config,   // AgentLoopConfig
  signal    // AbortSignal?
);

// 监听事件
for await (const event of stream) {
  console.log(event.type);
}

// 获取结果
const messages = await stream.result();
```

### 使用 agentLoopContinue

```typescript
import { agentLoopContinue } from "@mariozechner/pi-agent-core";

// 继续现有循环（不添加新消息）
const stream = agentLoopContinue(context, config, signal);

// 同样监听事件...
```

---

## 工具定义

```typescript
import { Type, type AgentTool } from "@mariozechner/pi-agent-core";

const myTool: AgentTool = {
  name: "my_tool",
  description: "Does something useful",
  label: "My Tool",
  parameters: Type.Object({
    input: Type.String({ description: "Input to process" }),
    count: Type.Optional(Type.Number({ default: 1 }))
  }),
  execute: async (toolCallId, params, signal, onUpdate) => {
    // 流式更新（可选）
    onUpdate?.({
      content: [{ type: "text", text: "Processing..." }],
      details: { progress: 50 }
    });
    
    // 实际执行
    const result = await doSomething(params);
    
    // 返回结果
    return {
      content: [{ type: "text", text: result.text }],
      details: result.data
    };
  }
};
```

---

## Proxy 支持

```typescript
import { streamProxy, type ProxyStreamOptions } from "@mariozechner/pi-agent-core";

const agent = new Agent({
  streamFn: (model, context, options) => 
    streamProxy(model, context, {
      ...options,
      authToken: "your-token",
      proxyUrl: "https://genai.example.com"
    })
});
```

---

## 事件类型速查

| 事件 | 触发时机 | 关键字段 |
|------|----------|----------|
| `agent_start` | Agent 开始 | - |
| `agent_end` | Agent 结束 | `messages` |
| `turn_start` | 回合开始 | - |
| `turn_end` | 回合结束 | `message`, `toolResults` |
| `message_start` | 消息开始 | `message` |
| `message_update` | 消息更新 | `message`, `assistantMessageEvent` |
| `message_end` | 消息结束 | `message` |
| `tool_execution_start` | 工具开始 | `toolCallId`, `toolName`, `args` |
| `tool_execution_update` | 工具更新 | `toolCallId`, `partialResult` |
| `tool_execution_end` | 工具结束 | `toolCallId`, `result`, `isError` |

---

## 配置选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `initialState` | `Partial<AgentState>` | 初始状态 |
| `convertToLlm` | `(AgentMessage[]) => Message[]` | 消息转换 |
| `transformContext` | `(AgentMessage[], signal?) => Promise<AgentMessage[]>` | 上下文变换 |
| `steeringMode` | `"all" \| "one-at-a-time"` | steering 模式 |
| `followUpMode` | `"all" \| "one-at-a-time"` | follow-up 模式 |
| `streamFn` | `StreamFn` | 自定义流函数 |
| `sessionId` | `string` | 会话 ID |
| `getApiKey` | `(provider) => string?` | 动态 API Key |
| `thinkingBudgets` | `ThinkingBudgets` | 推理预算 |
| `transport` | `Transport` | 传输方式 |
| `maxRetryDelayMs` | `number` | 最大重试延迟 |
| `toolExecution` | `"sequential" \| "parallel"` | 工具执行模式 |
| `beforeToolCall` | `BeforeToolCallHook` | 工具前钩子 |
| `afterToolCall` | `AfterToolCallHook` | 工具后钩子 |

---

## 常用类型导入

```typescript
// 核心
import { Agent, type AgentOptions, type AgentState } from "@mariozechner/pi-agent-core";

// Loop
import { agentLoop, agentLoopContinue, type AgentLoopConfig } from "@mariozechner/pi-agent-core";

// 类型
import {
  type AgentMessage,
  type AgentEvent,
  type AgentTool,
  type AgentToolResult,
  type BeforeToolCallContext,
  type AfterToolCallContext,
  type ThinkingLevel,
  type ToolExecutionMode
} from "@mariozechner/pi-agent-core";

// Proxy
import { streamProxy, type ProxyStreamOptions } from "@mariozechner/pi-agent-core";
```

---

## 版本信息

- **Package**: `@mariozechner/pi-agent-core`
- **Version**: 0.63.1
- **License**: MIT
- **Node**: >= 20.0.0
