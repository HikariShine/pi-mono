# Pi-mono Coding-Agent 学习笔记

> 生成时间: 2026-04-24
> 学习范围: `packages/coding-agent/src/core` 核心模块

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        Coding-Agent 架构                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Agent     │◄───│AgentSession │◄───│   SDK API   │         │
│  │(pi-agent-core)│   │(会话管理)   │   │(createAgentSession)│    │
│  └─────────────┘    └──────┬──────┘    └─────────────┘         │
│                            │                                      │
│         ┌──────────────────┼──────────────────┐                  │
│         │                  │                  │                  │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐           │
│  │SessionManager│  │ExtensionRunner│  │ResourceLoader│           │
│  │(持久化存储)  │  │(扩展系统)     │  │(资源加载)    │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ModelRegistry│    │SettingsManager│   │  AuthStorage │         │
│  │(模型管理)   │    │(配置管理)     │   │(凭证存储)    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心入口: createAgentSession

### 2.1 调用流程

```typescript
const { session } = await createAgentSession({
  model,              // 使用的模型
  thinkingLevel,      // 推理等级
  tools,              // 工具列表
  customTools,        // 自定义工具
  sessionManager,     // 会话管理器
  resourceLoader,     // 资源加载器
  // ... 其他选项
});
```

### 2.2 内部初始化流程

```
createAgentSession()
    ↓
new AgentSession(config)           // 1. 创建会话实例
    ↓
_createRetryPromiseForAgentEnd()   // 2. 创建重试 Promise
    ↓
_agent.subscribe(_handleAgentEvent)  // 3. 订阅 Agent 事件
    ↓
_installAgentToolHooks()           // 4. 安装工具钩子
    ↓
_buildRuntime()                      // 5. 构建扩展运行时
    ├── ResourceLoader.loadExtensions()  // 加载扩展
    ├── new ExtensionRunner()            // 创建扩展运行器
    ├── _bindExtensionCore()           // 绑定核心方法
    ├── _applyExtensionBindings()      // 应用扩展绑定
    └── _refreshToolRegistry()         // 刷新工具注册表
    ↓
构建消息上下文
    ↓
返回 session 实例
```

---

## 3. AgentSession 核心方法

### 3.1 prompt() - 用户输入入口

**功能**: 处理用户输入，触发 LLM 调用

**处理流程**:
```
prompt(text, options)
    ↓
1. 斜杠命令处理 (/_tryExecuteExtensionCommand)
    ↓ 是扩展命令？
    ├── 是 → 执行命令，返回（不触发 LLM）
    └── 否 → 继续
    ↓
2. 扩展 input 事件拦截 (_extensionRunner.emitInput)
    ↓ 扩展处理了？
    ├── handled → 返回
    ├── transform → 修改 text/images，继续
    └── continue → 继续
    ↓
3. Skill/Prompt 模板展开
    - _expandSkillCommand()      // /skill:name
    - expandPromptTemplate()     // /template
    ↓
4. 流式状态检查
    ↓ 正在流式输出？
    ├── 是 → 需要指定 streamingBehavior
    │         ├── "followUp" → _queueFollowUp()  等待
    │         └── "steer" → _queueSteer()       中断
    └── 否 → 继续
    ↓
5. 前置检查
    - _flushPendingBashMessages()    // 刷出待处理 bash 消息
    - 验证模型和 API key
    - _checkCompaction()              // 检查是否需要压缩
    ↓
6. 构建消息数组
    - 用户消息
    - _pendingNextTurnMessages       // 延迟投递消息
    - before_agent_start 扩展消息
    ↓
7. 触发 LLM
    await this.agent.prompt(messages)
    await this.waitForRetry()
```

### 3.2 _handleAgentEvent() - 事件处理器

**作用**: 处理来自底层 Agent 的所有事件

**事件类型**:
- `message_start`: 消息开始，更新 UI 队列
- `message_end`: 消息结束，持久化到 SessionManager
- `agent_end`: Agent 完成，触发重试/压缩检查
- `tool_execution_start/end`: 工具执行事件

### 3.3 _buildRuntime() - 扩展运行时构建

```typescript
private _buildRuntime(options): void {
    // 1. 创建基础工具定义
    const baseToolDefinitions = createAllToolDefinitions(cwd, {...});
    
    // 2. 加载扩展
    const extensionsResult = this._resourceLoader.getExtensions();
    
    // 3. 创建 ExtensionRunner
    this._extensionRunner = new ExtensionRunner(
        extensionsResult.extensions,
        extensionsResult.runtime,
        this._cwd,
        this.sessionManager,
        this._modelRegistry,
    );
    
    // 4. 绑定核心方法
    this._bindExtensionCore(this._extensionRunner);
    
    // 5. 应用扩展绑定（UI/命令上下文）
    this._applyExtensionBindings(this._extensionRunner);
    
    // 6. 刷新工具注册表
    this._refreshToolRegistry({ activeToolNames: [...] });
}
```

---

## 4. Extension 扩展系统

### 4.1 ExtensionRuntime vs ExtensionRunner

| 组件 | 职责 |
|------|------|
| **ExtensionRuntime** | 数据容器（状态 + 方法引用） |
| **ExtensionRunner** | 调度器（管理扩展、触发事件） |

**关系**:
```
ExtensionRunner
    ├── extensions: Extension[]        // 扩展实例列表
    └── runtime: ExtensionRuntime      // 共享运行时
            ├── flagValues: Map         // CLI flag 值
            ├── pendingProviderRegistrations // provider 注册队列
            ├── sendMessage()           // 方法（由 bindCore 绑定）
            ├── setModel()              // 方法（由 bindCore 绑定）
            └── ...
```

### 4.2 扩展生命周期

```
1. 创建阶段 (createExtensionRuntime)
   └─ 方法为 stub（抛出异常，防加载时调用）
   
2. 加载阶段 (loadExtensions)
   └─ 扩展调用 pi.registerXxx() 注册能力
   
3. 绑定阶段 (_bindExtensionCore)
   └─ stub 方法替换为真实实现（委托给 AgentSession）
   
4. 运行阶段
   └─ 扩展通过 pi.* 与系统交互
```

### 4.3 扩展 API (pi.*)

**事件订阅**:
```typescript
pi.on("session_start", handler);
pi.on("turn_start/end", handler);
pi.on("tool_call/result", handler);
pi.on("input", handler);              // 拦截用户输入
```

**动作方法**:
```typescript
pi.sendMessage(message, options);       // 发送消息
pi.setModel(model);                     // 切换模型
pi.appendEntry(type, data);             // 追加自定义 entry
pi.getActiveTools();                    // 获取激活工具
pi.exec(command);                       // 执行 bash
```

---

## 5. Session 会话系统

### 5.1 Entry 类型

| Entry 类型 | 作用 | 是否传给 LLM |
|-----------|------|------------|
| `message` | 普通消息（user/assistant/toolResult）| ✅ |
| `thinking_level_change` | 推理等级切换 | ❌ |
| `model_change` | 模型切换 | ❌ |
| `compaction` | 压缩摘要 | ✅（转成 compactionSummary）|
| `custom` | 扩展数据 | ❌ |
| `custom_message` | 扩展消息 | ✅ |
| `branch_summary` | 分支摘要 | ✅ |
| `label` | 标签标记 | ❌ |
| `session_info` | 会话元数据 | ❌ |

### 5.2 buildSessionContext - 构建 LLM 上下文

**功能**: 将 entry 树转换为 AgentMessage[]

**处理逻辑**:
```
entries (JSONL 存储)
    ↓
从 leaf 向上遍历到 root
    ↓
提取状态（thinkingLevel, model）
    ↓
遇到 compaction entry?
    ├── 是 → 添加 compactionSummary 消息
    │         只保留 firstKeptEntryId 之后的消息
    └── 否 → 添加普通消息
    ↓
返回 { messages, thinkingLevel, model }
```

### 5.3 压缩机制 (Compaction)

**触发条件**:
1. **Overflow**: LLM 返回上下文溢出错误
2. **Threshold**: 上下文超过阈值（如 80%）

**压缩流程**:
```
_checkCompaction()
    ↓
prepareCompaction()
    ├── findCutPoint()           // 找切割点
    │   ├── 从后往前累加 token
    │   └── 找 keepRecentTokens 切割点
    ├── 处理 Split Turn
    └── 提取 fileOps
    ↓
compact()
    ├── generateSummary()        // 生成历史摘要
    ├── generateTurnPrefixSummary()  // Split turn 特殊处理
    └── formatFileOperations()   // 追加文件操作记录
    ↓
appendCompaction()               // 保存到 Session
    ↓
buildSessionContext()            // 重建上下文
    ↓
agent.replaceMessages()          // 替换 Agent 消息
```

**Split Turn 处理**:
- 当切割点落在 assistant/tool 消息上（非 user）
- 使用特殊 prompt (`TURN_PREFIX_SUMMARIZATION_PROMPT`)
- 保留"用户请求是什么"的 context，确保保留的后半部分可被理解

---

## 6. 工具系统

### 6.1 内置工具

| 工具 | 功能 | 特点 |
|------|------|------|
| **read** | 读取文件 | 自动识别图片/文本，支持分页、图片压缩 |
| **bash** | 执行 shell | 流式输出，支持超时/取消，大输出写临时文件 |
| **edit** | 编辑文件 | 精确替换，fuzzy match（智能引号/空格归一化），支持多 edit |
| **write** | 写入文件 | 创建/覆盖文件 |
| **grep** | 内容搜索 | 使用 ripgrep，支持正则/纯文本，返回匹配行 |
| **find** | 文件查找 | glob 模式，支持 .gitignore |
| **ls** | 目录列表 | 纯 Node.js 实现，目录加 `/` 后缀 |

### 6.2 Edit 工具核心设计

**模糊匹配 (fuzzyFindText)**:
```typescript
// 1. 精确匹配
const exactIndex = content.indexOf(oldText);
if (exactIndex !== -1) return { found: true, usedFuzzyMatch: false };

// 2. 模糊匹配（归一化后）
const fuzzyContent = normalizeForFuzzyMatch(content);
const fuzzyOldText = normalizeForFuzzyMatch(oldText);
// 归一化：NFKC + 去尾部空格 + 智能引号转 ASCII + 各种横线/空格统一
```

**多 Edit 处理**:
```typescript
// 检查唯一性
const occurrences = countOccurrences(baseContent, edit.oldText);
if (occurrences > 1) throw error;  // oldText 必须唯一

// 检查重叠
for (sorted matchedEdits) {
    if (prev.matchIndex + prev.matchLength > current.matchIndex) {
        throw error;  // edits 不能重叠
    }
}

// 从后往前应用（避免索引变化）
for (let i = matchedEdits.length - 1; i >= 0; i--) {
    newContent = newContent.substring(0, edit.matchIndex) + 
                 edit.newText + 
                 newContent.substring(edit.matchIndex + edit.matchLength);
}
```

---

## 7. 系统提示词 (System Prompt)

### 7.1 构建流程

```typescript
buildSystemPrompt({
    customPrompt,       // 自定义提示词（可选）
    selectedTools,      // 激活的工具列表
    toolSnippets,       // 工具简介（promptSnippet）
    promptGuidelines,   // 工具使用指南
    contextFiles,       // 项目上下文文件
    skills,             // Skill 列表
    cwd,                // 工作目录
})
```

### 7.2 提示词结构

```
You are an expert coding assistant...

Available tools:
- read: Read file contents
- bash: Execute bash commands...
[有 promptSnippet 的工具才会显示]

Guidelines:
- Prefer grep/find/ls tools over bash...
- Be concise in your responses
[来自 promptGuidelines + 固定指南]

Pi documentation:
- Main documentation: /path/to/readme
- Additional docs: /path/to/docs
[当询问 pi 相关话题时参考]

# Project Context
## .cursorrules
[项目特定指令]

Current date: 2026-04-24
Current working directory: /home/shine/projects/xxx
```

### 7.3 promptSnippet vs promptGuidelines

| 属性 | 位置 | 用途 |
|------|------|------|
| `promptSnippet` | Available tools 列表 | 工具简介，一句话说明功能 |
| `promptGuidelines` | Guidelines 部分 | 使用建议，告诉 LLM 怎么用 |

**注意**: 没有 `promptSnippet` 的自定义工具会被隐藏。

---

## 8. 关键类型定义

### 8.1 SessionEntry 联合类型

```typescript
type SessionEntry =
    | SessionMessageEntry
    | ThinkingLevelChangeEntry
    | ModelChangeEntry
    | CompactionEntry
    | BranchSummaryEntry
    | CustomEntry
    | CustomMessageEntry
    | LabelEntry
    | SessionInfoEntry;
```

### 8.2 AgentMessage 联合类型

```typescript
type AgentMessage =
    | UserMessage
    | AssistantMessage
    | ToolResultMessage
    | CustomMessage               // 来自 custom_message entry
    | BranchSummaryMessage        // 来自 branch_summary entry  
    | CompactionSummaryMessage;   // 来自 compaction entry
```

### 8.3 Extension API 类型

```typescript
interface ExtensionAPI {
    // 事件订阅
    on<T extends ExtensionEvent>(event: T["type"], handler: Handler<T>): void;
    
    // 注册
    registerTool(tool: RegisteredTool): void;
    registerCommand(name: string, options: CommandOptions): void;
    registerShortcut(key: string, options: ShortcutOptions): void;
    registerFlag(name: string, options: FlagOptions): void;
    registerProvider(name: string, config: ProviderConfig): void;
    
    // 动作
    sendMessage(message: CustomMessage, options?: SendMessageOptions): void;
    setModel(model: Model<Api>): Promise<boolean>;
    exec(command: string, args?: string[], options?: ExecOptions): Promise<ExecResult>;
}
```

---

## 9. 核心设计模式

### 9.1 依赖注入 + Ref 模式

**问题**: Agent 构造时需要 ExtensionRunner，但 ExtensionRunner 又在 AgentSession 中创建。

**解决**:
```typescript
// 1. 创建可变引用
const extensionRunnerRef: { current?: ExtensionRunner } = {};

// 2. Agent 通过 ref 访问（延迟解析）
const agent = new Agent({
    onPayload: async (payload) => {
        const runner = extensionRunnerRef.current;  // 运行时取值
        // ...
    }
});

// 3. AgentSession 创建后填充
const session = new AgentSession({ extensionRunnerRef });
// 内部: extensionRunnerRef.current = this._extensionRunner;
```

### 9.2 事件队列 + 状态机

```typescript
// AgentSession 中的事件队列
this._agentEventQueue = this._agentEventQueue.then(
    () => this._processAgentEvent(event),
    () => this._processAgentEvent(event),
);

// 保证顺序：message_start → message_update → message_end → agent_end
// 避免竞态：同步创建重试 Promise，异步处理事件
```

### 9.3 树形 Session 结构

```
Session Tree (parentId 链):

root
├── msg1
│   ├── msg2 (branch A)
│   │   └── msg3
│   └── msg2 (branch B)
│       └── msg4
└── compaction
    └── msg5 (保留)

通过 leafId 确定当前分支
通过 parentId 回溯到 root
支持分支、fork、导航
```

### 9.4 分层存储策略

| 层级 | 存储内容 | 示例 |
|------|---------|------|
| **Session Entry** | 完整历史 | JSONL 文件 |
| **Agent Context** | 给 LLM 的消息 | 经 buildSessionContext 转换 |
| **Compaction** | 摘要 + 保留消息 | 压缩后减少 token |
| **Runtime State** | 临时状态 | AbortController、队列等 |

---

## 10. 关键配置项

### 10.1 Compaction 设置

```json
{
  "compaction": {
    "enabled": true,
    "keepRecentTokens": 4000,      // 保留最近 4000 tokens
    "reserveTokens": 2000,          // 摘要预算 2000 tokens
    "summaryModel": "claude-3-5-sonnet"  // 可选专用模型
  }
}
```

### 10.2 模型注册

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "https://api.anthropic.com",
      "apiKey": "$ANTHROPIC_API_KEY"  // 支持环境变量
    }
  },
  "models": [
    {
      "id": "claude-opus-4",
      "provider": "anthropic",
      "contextWindow": 200000
    }
  ]
}
```

---

## 11. 学习心得

### 11.1 设计亮点

1. **Split Turn 处理**: 压缩切断 turn 时，用特殊 prompt 保留 context，确保后半部分可被理解

2. **嵌套摘要**: 多层压缩时通过 `previousSummary` 嵌套，避免多个 summary message 污染上下文

3. **Fuzzy Match**: 归一化 Unicode（智能引号、横线、空格），提高 LLM 生成代码的匹配成功率

4. **延迟绑定**: ExtensionRuntime 先创建占位方法，AgentSession 初始化后填充实现，解耦加载和执行

5. **事件驱动**: 扩展通过事件与系统交互，避免直接依赖，支持拦截和修改

### 11.2 最佳实践

- **PromptSnippet**: 自定义工具务必提供，否则不会出现在 Available tools
- **Error 处理**: 扩展命令出错也返回 `true`，防止当成普通消息发给 LLM
- **Token 估算**: `estimateContextTokens` 需要 `buildSessionContext` 转换后的消息
- **文件操作**: 大输出写临时文件，返回路径供 LLM 继续读取
- **Session 分支**: 通过 `firstKeptEntryId` 精确保留，支持任意粒度导航

### 11.3 调试技巧

```typescript
// 查看当前 Session 结构
sessionManager.getTree();
sessionManager.getBranch();

// 检查消息上下文
buildSessionContext(sessionManager.getEntries());

// 查看扩展注册的工具
extensionRunner.getAllRegisteredTools();

// 查看工具注册表
toolRegistry.keys();
```

---

## 附录：关键文件路径

```
packages/coding-agent/src/core/
├── agent-session.ts          # AgentSession 核心类
├── session-manager.ts        # Session 持久化管理
├── extensions/
│   ├── types.ts              # Extension 类型定义
│   ├── loader.ts             # 扩展加载逻辑
│   └── runner.ts             # ExtensionRunner
├── compaction/
│   └── compaction.ts         # 压缩算法
├── tools/
│   ├── read.ts               # Read 工具
│   ├── edit.ts / edit-diff.ts # Edit 工具
│   └── bash.ts               # Bash 工具
├── system-prompt.ts          # 系统提示词构建
└── messages.ts               # 消息类型定义
```

---

*笔记完成*
