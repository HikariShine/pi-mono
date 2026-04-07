# pi-ai API 速查

## 核心 API

### 流式调用

```typescript
import { stream, complete, streamSimple, completeSimple } from "@mariozechner/pi-ai";

// 流式调用 - 返回事件流
const stream = stream(model, context, options);
for await (const event of stream) {
  if (event.type === "text_delta") {
    process.stdout.write(event.delta);
  }
}

// 非流式调用 - 返回完整消息
const message = await complete(model, context, options);
console.log(message.content[0].text);

// Simple 模式 - 自动处理 reasoning
const stream = streamSimple(model, context, { reasoning: "high" });
```

---

### 模型获取

```typescript
import { getModel, getModels, getProviders } from "@mariozechner/pi-ai";

// 获取特定模型
const model = getModel("openai", "gpt-4o-mini");

// 获取所有提供商
const providers = getProviders();  // ["openai", "anthropic", "google", ...]

// 获取提供商的所有模型
const openaiModels = getModels("openai");
```

---

### 成本计算

```typescript
import { calculateCost } from "@mariozechner/pi-ai";

const message = await complete(model, context);
const cost = calculateCost(model, message.usage);
console.log(`Cost: $${cost.total.toFixed(4)}`);
```

---

## 工具定义

```typescript
import { Type, type Tool } from "@mariozechner/pi-ai";

const tools: Tool[] = [
  {
    name: "get_weather",
    description: "获取指定城市的天气",
    parameters: Type.Object({
      city: Type.String({ description: "城市名称" }),
      unit: Type.Optional(Type.StringEnum(["celsius", "fahrenheit"]))
    })
  }
];

const context: Context = {
  systemPrompt: "你是助手",
  messages: [{ role: "user", content: "北京天气如何？" }],
  tools
};
```

---

## 工具验证

```typescript
import { validateToolCall, validateToolArguments } from "@mariozechner/pi-ai";

// 验证工具调用
const validatedArgs = validateToolCall(tools, toolCall);

// 验证已知工具的参数
const validatedArgs = validateToolArguments(tool, toolCall);
```

---

## 图像输入

```typescript
import * as fs from "fs";

const imageBase64 = fs.readFileSync("image.png", "base64");

const context: Context = {
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "描述这张图片" },
      { type: "image", data: imageBase64, mimeType: "image/png" }
    ]
  }]
};
```

---

## OAuth 登录

### 程序化登录

```typescript
import { getOAuthProvider } from "@mariozechner/pi-ai";

const provider = getOAuthProvider("anthropic");
const credentials = await provider.login({
  onAuth: (info) => {
    console.log("请访问:", info.url);
  },
  onPrompt: async (prompt) => {
    return await askUser(prompt.message);
  },
  onProgress: (msg) => console.log(msg)
});
```

### CLI 登录

```bash
npx @mariozechner/pi-ai login anthropic
```

### 获取 OAuth API Key

```typescript
import { getOAuthApiKey } from "@mariozechner/pi-ai";

const result = await getOAuthApiKey("anthropic", storedCredentials);
if (result) {
  const { newCredentials, apiKey } = result;
  // 如有需要，保存 newCredentials
}
```

---

## 取消请求

```typescript
const controller = new AbortController();

// 启动请求
const stream = stream(model, context, { signal: controller.signal });

// 5 秒后取消
setTimeout(() => controller.abort(), 5000);

// 处理流
for await (const event of stream) {
  // ...
}
```

---

## 自定义请求体

```typescript
const stream = stream(model, context, {
  onPayload: (payload, model) => {
    // 修改或替换请求体
    return {
      ...payload,
      custom_field: "value"
    };
  }
});
```

---

## Provider 注册

```typescript
import { registerApiProvider, getApiProvider } from "@mariozechner/pi-ai";

// 注册自定义 Provider
registerApiProvider({
  api: "my-custom-api",
  stream: (model, context, options) => {
    // 实现流式调用
    const stream = new AssistantMessageEventStream();
    // ...
    return stream;
  },
  streamSimple: (model, context, options) => {
    // 实现 simple 模式
    return stream(model, context, options);
  }
});
```

---

## 事件类型速查

| 事件类型 | 触发时机 | 关键字段 |
|----------|----------|----------|
| `start` | 流开始 | `partial: AssistantMessage` |
| `text_start` | 开始接收文本 | `contentIndex: number` |
| `text_delta` | 文本增量 | `delta: string` |
| `text_end` | 文本结束 | `content: string` |
| `thinking_start` | 开始接收思考 | `contentIndex: number` |
| `thinking_delta` | 思考增量 | `delta: string` |
| `thinking_end` | 思考结束 | `content: string` |
| `toolcall_start` | 开始接收工具调用 | `contentIndex: number` |
| `toolcall_delta` | 工具调用参数增量 | `delta: string` |
| `toolcall_end` | 工具调用完成 | `toolCall: ToolCall` |
| `done` | 请求完成 | `reason: StopReason, message: AssistantMessage` |
| `error` | 发生错误 | `reason: "aborted" \| "error", error: AssistantMessage` |

---

## 选项速查

### StreamOptions

| 选项 | 类型 | 说明 |
|------|------|------|
| `temperature` | `number` | 温度 (0-2) |
| `maxTokens` | `number` | 最大输出 tokens |
| `signal` | `AbortSignal` | 取消信号 |
| `apiKey` | `string` | API Key（覆盖环境变量）|
| `transport` | `"sse" \| "websocket" \| "auto"` | 传输方式 |
| `cacheRetention` | `"none" \| "short" \| "long"` | 缓存保留 |
| `sessionId` | `string` | 会话 ID |
| `headers` | `Record<string, string>` | 自定义 HTTP 头 |
| `onPayload` | `(payload, model) => unknown` | 修改请求体 |
| `maxRetryDelayMs` | `number` | 最大重试等待 |
| `metadata` | `Record<string, unknown>` | 元数据 |

### SimpleStreamOptions (extends StreamOptions)

| 选项 | 类型 | 说明 |
|------|------|------|
| `reasoning` | `"minimal" \| "low" \| "medium" \| "high" \| "xhigh"` | 推理级别 |
| `thinkingBudgets` | `ThinkingBudgets` | 自定义推理预算 |

---

## 环境变量

| 环境变量 | 用途 |
|----------|------|
| `OPENAI_API_KEY` | OpenAI API Key |
| `ANTHROPIC_API_KEY` | Anthropic API Key |
| `ANTHROPIC_OAUTH_TOKEN` | Anthropic OAuth Token |
| `GEMINI_API_KEY` | Google Gemini API Key |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API Key |
| `MISTRAL_API_KEY` | Mistral API Key |
| `GROQ_API_KEY` | Groq API Key |
| `AWS_ACCESS_KEY_ID` | AWS Access Key |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key |
| `GOOGLE_CLOUD_PROJECT` | Vertex AI Project |
| `GOOGLE_CLOUD_LOCATION` | Vertex AI Location |
| `GOOGLE_APPLICATION_CREDENTIALS` | ADC 凭证路径 |

---

## TypeBox 速查

```typescript
import { Type } from "@mariozechner/pi-ai";

// 字符串
Type.String({ description: "名称" });

// 数字
Type.Number({ minimum: 0, maximum: 100 });

// 布尔
Type.Boolean();

// 枚举
Type.StringEnum(["a", "b", "c"]);

// 数组
Type.Array(Type.String());

// 对象
Type.Object({
  name: Type.String(),
  age: Type.Optional(Type.Number())
});

// 联合类型
Type.Union([Type.String(), Type.Number()]);

// 可选字段
Type.Optional(Type.String());
```

---

## 常用代码片段

### 处理工具调用

```typescript
const stream = stream(model, context);
let currentToolCall: ToolCall | null = null;

for await (const event of stream) {
  if (event.type === "toolcall_end") {
    currentToolCall = event.toolCall;
    const result = await executeTool(currentToolCall);
    
    // 添加工具结果到上下文
    context.messages.push({
      role: "toolResult",
      toolCallId: currentToolCall.id,
      toolName: currentToolCall.name,
      content: [{ type: "text", text: JSON.stringify(result) }],
      isError: false,
      timestamp: Date.now()
    });
  }
}
```

### 保存/加载上下文

```typescript
import * as fs from "fs";

// 保存
fs.writeFileSync("context.json", JSON.stringify(context, null, 2));

// 加载
const context: Context = JSON.parse(fs.readFileSync("context.json", "utf-8"));
```

### 多轮对话

```typescript
const context: Context = {
  systemPrompt: "你是助手",
  messages: []
};

while (true) {
  const userInput = await getUserInput();
  
  context.messages.push({
    role: "user",
    content: userInput,
    timestamp: Date.now()
  });
  
  const message = await complete(model, context);
  
  context.messages.push(message);
  
  console.log(message.content[0].text);
}
```

---

## 导入速查

```typescript
// 核心 API
import { 
  stream,
  complete,
  streamSimple,
  completeSimple,
  getModel,
  getModels,
  getProviders,
  calculateCost,
  Type
} from "@mariozechner/pi-ai";

// 工具验证
import {
  validateToolCall,
  validateToolArguments
} from "@mariozechner/pi-ai";

// OAuth
import {
  getOAuthProvider,
  getOAuthProviders,
  getOAuthApiKey
} from "@mariozechner/pi-ai";

// Provider 注册
import {
  registerApiProvider,
  getApiProvider
} from "@mariozechner/pi-ai";

// 事件流
import {
  createAssistantMessageEventStream,
  AssistantMessageEventStream
} from "@mariozechner/pi-ai";

// 环境变量
import { getEnvApiKey } from "@mariozechner/pi-ai";
```

---

## 版本信息

- **Package**: `@mariozechner/pi-ai`
- **Version**: 0.63.1
- **License**: MIT
- **Node**: >= 20.0.0

---

## 相关链接

- [GitHub Repository](https://github.com/badlogic/pi-mono)
- [NPM Package](https://www.npmjs.com/package/@mariozechner/pi-ai)
