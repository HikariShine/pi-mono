# @mariozechner/pi-ai

统一的 LLM API，支持工具调用（函数调用）、上下文管理、Token 及成本追踪，并提供在单个会话中跨模型和提供商无缝切换的能力。

**注意**：本仓库仅包含支持工具调用的模型，因为这是构建 Agent 工作流（Agentic Workflows）的基础。

## 目录

- [支持的提供商](#支持的提供商)
- [安装](#安装)
- [快速开始](#快速开始)
- [工具 (Tools)](#工具)
  - [定义工具](#定义工具)
  - [处理工具调用](#处理工具调用)
  - [使用部分 JSON 流式传输工具调用](#使用部分-json-流式传输工具调用)
  - [验证工具参数](#验证工具参数)
  - [完整事件参考](#完整事件参考)
- [图像输入](#图像输入)
- [思考/推理 (Reasoning)](#思考推理)
  - [统一接口 (streamSimple/completeSimple)](#统一接口-streamsimplecompletesimple)
  - [特定提供商选项](#特定提供商选项-streamcomplete)
  - [流式传输思考内容](#流式传输思考内容)
- [停止原因 (Stop Reasons)](#停止原因)
- [错误处理](#错误处理)
  - [中止请求](#中止请求)
  - [在中止后继续](#在中止后继续)
- [API，模型和提供商](#api模型和提供商)
  - [提供商和模型](#提供商和模型)
  - [查询提供商和模型](#查询提供商和模型)
  - [自定义模型](#自定义模型)
  - [OpenAI 兼容性设置](#openai-兼容性设置)
  - [类型安全](#类型安全)
- [跨提供商切换 (Handoff)](#跨提供商切换)
- [上下文序列化](#上下文序列化)
- [浏览器环境使用](#浏览器环境使用)
  - [浏览器兼容性说明](#浏览器兼容性说明)
  - [环境变量 (仅 Node.js)](#环境变量-仅-nodejs)
  - [检查环境变量](#检查环境变量)
- [OAuth 提供商](#oauth-提供商)
  - [Vertex AI](#vertex-ai)
  - [CLI 登录](#cli-登录)
  - [编程式 OAuth](#编程式-oauth)
  - [登录流程示例](#登录流程示例)
  - [使用 OAuth Tokens](#使用-oauth-tokens)
  - [提供商说明](#提供商说明)
- [开发](#开发)
  - [添加新提供商](#添加新提供商)
- [许可证](#许可证)

## 支持的提供商

- **OpenAI**
- **Azure OpenAI**
- **Anthropic**
- **Google**
- **Vertex AI** (Gemini via Vertex AI)
- **Mistral**
- **Groq**
- **Cerebras**
- **xAI**
- **OpenRouter**
- **Vercel AI Gateway**
- **MiniMax**
- **GitHub Copilot**, **Google Gemini CLI**, **Antigravity** (需 OAuth)
- **Amazon Bedrock**, **OpenCode Zen**, **OpenCode Go** 等等...
- 以及 **任何 OpenAI 兼容的 API** (如 Ollama, vLLM, LM Studio)

## 安装

```bash
npm install @mariozechner/pi-ai
```

我们从 TypeBox 中重新导出了 `Type`、`Static` 和 `TSchema` 以方便使用。

## 快速开始

```typescript
import { Type, getModel, stream, complete, Context, Tool, StringEnum } from '@mariozechner/pi-ai';

// 提供全面的类型安全和自动补全支持
const model = getModel('openai', 'gpt-4o-mini');

// 工具通过 TypeBox schemas 定义，提供类型安全并允许自动校验
const tools: Tool[] = [{
  name: 'get_time',
  description: '获取当前时间',
  parameters: Type.Object({
    timezone: Type.Optional(Type.String({ description: '可选此时区 (例如 America/New_York)' }))
  })
}];

// 上下文是包含了 system prompt、messages 和 tools 的集合（JSON 序列化友好）
const context: Context = {
  systemPrompt: 'You are a helpful assistant.',
  messages: [{ role: 'user', content: 'What time is it?' }],
  tools
};

// 方式 1: 流式传输
const s = stream(model, context);

for await (const event of s) {
  switch (event.type) {
    case 'start': console.log(`Started model ${event.partial.model}`); break;
    case 'text_delta': process.stdout.write(event.delta); break;
    case 'toolcall_delta':
      const partialCall = event.partial.content[event.contentIndex];
      if (partialCall.type === 'toolCall') console.log(`Streaming args for ${partialCall.name}`);
      break;
    case 'toolcall_end':
      console.log(`\nTool call: ${event.toolCall.name} with ${JSON.stringify(event.toolCall.arguments)}`);
      break;
    case 'done': console.log(`\nDone, reason: ${event.reason}`); break;
    case 'error': console.error(`Error: ${event.error}`); break;
  }
}

// 获取最终的结果消息并添加到当前上下文
const finalMessage = await s.result();
context.messages.push(finalMessage);

// 处理出现的工具调用
const toolCalls = finalMessage.content.filter(b => b.type === 'toolCall');
for (const call of toolCalls) {
  const result = call.name === 'get_time' ? new Date().toISOString() : 'Unknown tool';
  
  context.messages.push({
    role: 'toolResult',
    toolCallId: call.id,
    toolName: call.name,
    content: [{ type: 'text', text: result }],
    isError: false,
    timestamp: Date.now()
  });
}

// 可选：将工具调用结果发送回模型继续对话
if (toolCalls.length > 0) {
  const continuation = await complete(model, context);
  context.messages.push(continuation);
  console.log('Continuation:', continuation.content);
}

// 方式 2: 非流式传输直接调用 (完整返回)
// const response = await complete(model, context);
```

## 工具 (Tools)

工具允许大模型与你的应用交互。此库统一使用 TypeBox 进行工具参数描述，并通过 AJV 进行自动验证。

### 定义工具
```typescript
const weatherTool: Tool = {
  name: 'get_weather',
  description: '获取某地天气',
  parameters: Type.Object({
    location: Type.String({ description: '城市或坐标' }),
    units: StringEnum(['celsius', 'fahrenheit'], { default: 'celsius' })
  }) // 注意使用 StringEnum 而不是 Type.Enum
};
```

### 验证工具参数

流式调用时，框架自带的 `agentLoop`（可选扩展功能）会在模型调用您的工具之前验证其参数。如果您自己编写循环，您可以直接使用 `validateToolCall` 函数：

```typescript
import { validateToolCall } from '@mariozechner/pi-ai';

// 在 'toolcall_end' 事件或解析完 message 后
try {
  const validatedArgs = validateToolCall(tools, toolCall);
  const result = await myTool(validatedArgs);
} catch (error) {
  // 当验证错误发生时，将该错误返回给模型，模型通常会重试修正参数
  context.messages.push({
    role: 'toolResult',
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    content: [{ type: 'text', text: error.message }],
    isError: true,
    timestamp: Date.now()
  });
}
```

## 图像输入

很多模型支持接收图像作为输入。系统通过 `model.input.includes('image')` 特性来标记支持图像的模型。向不支持图像的模型发送图像时会被静默过滤。

```typescript
import { readFileSync } from 'fs';

const imageBuffer = readFileSync('image.png');
const base64Image = imageBuffer.toString('base64');

const response = await complete(model, {
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: '图中有什么？' },
      { type: 'image', data: base64Image, mimeType: 'image/png' }
    ]
  }]
});
```

## 思考/推理 (Reasoning)

越来越多的模型公开了自身的内部推理过程，我们可以通过流读取这些数据。受支持的模型会在其对象中具有 `reasoning: true` 标识。

开发者可以使用两种主要接口来开启推理能力。

### 统一接口 (`streamSimple`/`completeSimple`)
通过 `streamSimple` / `completeSimple`，可以使用通用的参数抽象能力在不同的模型间实现推理设置。

```typescript
import { completeSimple } from '@mariozechner/pi-ai';

const response = await completeSimple(model, context, {
  reasoning: 'medium' // 选项: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
});
```

### 特定提供商选项 (`stream`/`complete`)
也可以直接传入模型特有的原生 API 配置。

```typescript
import { stream } from '@mariozechner/pi-ai';

const s = stream(getModel('anthropic', 'claude-3-7-sonnet-20250219'), context, {
  thinking: { type: 'enabled', budget_tokens: 4096 }
});

for await (const event of s) {
  if (event.type === 'thinking_start') console.log('[思考开始]');
  if (event.type === 'thinking_delta') process.stdout.write(event.delta);
  if (event.type === 'thinking_end') console.log('[思考结束]');
}
```

## 停止原因 (Stop Reasons)
如果请求被中断、长度到达上限等，事件最终将以结束标识收尾。主要的 `reason` 有：
- `stop`: 自然结束或模型判定应停止。
- `length`: 达到了 `maxTokens` 最大设定值。
- `toolUse`: 模型因为选择了调用工具而中止生成文本。
- `aborted`: 请求被调用端强行取消终止。
- `error`: 请求因为服务错误而异常中止。

## 跨提供商切换

由于 `Context` 数据结构统一且所有提供商都被抽象到了相同的内部层，因此，你可以随时在中途将上下文转交分配给另一个不同的提供商或模型进行续接补答，这是“零开销（Zero Overhead）”的。

```typescript
let context: Context = { /* ... */ };

// 阶段 1：使用 Groq (基于速度优势) 来快速生成基本框架解答
let model = getModel('groq', 'llama-3.3-70b-versatile');
let message = await complete(model, context);
context.messages.push(message);

// 阶段 2：使用更强大、更通用的 Anthropic 模型进行精修及代码编写
model = getModel('anthropic', 'claude-3-5-sonnet-20241022');
message = await complete(model, context);
context.messages.push(message);
```

> **注意：所有详细配置、错误中止以及更多的 OAuth、环境配置和添加模型实现，均可在 [英文原始 README](README.md) 中获取细节。此中文版本节选了开发及调用的核心示例以便快速上手。**
