# Coding Agent API 速查

## 1. CLI 命令速查

### 1.1 启动选项

```bash
# 基本启动
pi

# 指定模型
pi --model claude-sonnet-4
pi --provider anthropic --model claude-sonnet-4
pi --model anthropic/claude-sonnet-4:high  # provider/id:thinking

# 指定会话
pi --session <path|id>      # 打开指定会话
pi -c                       # 继续最近会话
pi -r                       # 选择会话恢复
pi --fork <path|id>         # 分叉会话
pi --no-session             # 临时会话（不保存）

# 运行模式
pi -p "prompt"              # 打印模式
pi --mode json              # JSON 模式
pi --mode rpc               # RPC 模式

# 工具控制
pi --tools read,write,edit,bash,grep,find,ls  # 指定工具
pi --no-tools               # 禁用所有内置工具
pi -e ./extension.ts        # 加载扩展
pi --skill ./skill.md       # 加载技能
```

### 1.2 包管理命令

```bash
pi install npm:@foo/bar                    # npm 包
pi install npm:@foo/bar@1.2.3             # 指定版本
pi install git:github.com/user/repo       # git 仓库
pi install ./local/path                   # 本地路径
pi install -l <source>                    # 项目本地安装

pi remove npm:@foo/bar
pi update                                 # 更新所有包
pi update npm:@foo/bar                    # 更新指定包
pi list                                   # 列出已安装包
pi config                                 # 配置包资源
```

---

## 2. 交互式命令速查

### 2.1 斜杠命令

| 命令 | 功能 |
|------|------|
| `/login` | OAuth 登录 |
| `/logout` | 登出 |
| `/model` | 切换模型 |
| `/scoped-models` | 配置作用域模型 |
| `/settings` | 打开设置 |
| `/resume` | 恢复历史会话 |
| `/new` | 新建会话 |
| `/name <name>` | 设置会话名称 |
| `/session` | 显示会话信息 |
| `/tree` | 会话树导航 |
| `/fork` | 分叉会话 |
| `/compact [prompt]` | 手动压缩 |
| `/copy` | 复制最后回复 |
| `/export [file]` | 导出 HTML |
| `/share` | 分享为 Gist |
| `/reload` | 重新加载配置/扩展 |
| `/hotkeys` | 显示快捷键 |
| `/changelog` | 显示更新日志 |
| `/quit`, `/exit` | 退出 |

### 2.2 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+C` | 清除编辑器 |
| `Ctrl+C` (x2) | 退出 |
| `Escape` | 取消/中止 |
| `Escape` (x2) | 打开 `/tree` |
| `Ctrl+L` | 选择模型 |
| `Ctrl+P` / `Shift+Ctrl+P` | 循环作用域模型 |
| `Shift+Tab` | 循环思考等级 |
| `Ctrl+O` | 折叠/展开工具输出 |
| `Ctrl+T` | 折叠/展开思考块 |
| `Shift+Enter` | 多行输入 |
| `Tab` | 路径补全 |
| `@` | 文件引用 |
| `!command` | 执行命令并发送结果 |
| `!!command` | 执行命令（不发送结果） |

---

## 3. SDK API 速查

### 3.1 创建会话

```typescript
import { createAgentSession } from "@mariozechner/pi-coding-agent"

// 最简
const { session } = await createAgentSession()

// 完整配置
const { session, extensionsResult } = await createAgentSession({
  cwd: "/path/to/project",
  model: myModel,
  thinkingLevel: "high",
  tools: [readTool, bashTool],
  sessionManager: SessionManager.inMemory()
})
```

### 3.2 发送消息

```typescript
// 简单文本
await session.prompt("Hello")

// 带图片
await session.prompt("Describe this", {
  images: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "..." } }]
})

// 不展开模板
await session.prompt("Hello", { expandPromptTemplates: false })
```

### 3.3 事件监听

```typescript
const unsubscribe = session.subscribe((event) => {
  switch (event.type) {
    case "message_start":
      console.log("Message started")
      break
    case "message_update":
      console.log("Text:", event.message.content)
      break
    case "message_end":
      console.log("Message completed")
      break
    case "tool_call":
      console.log("Tool called:", event.toolCall.name)
      break
    case "tool_result":
      console.log("Tool result:", event.result)
      break
    case "compaction_start":
      console.log("Compacting...")
      break
    case "compaction_end":
      console.log("Compacted:", event.result)
      break
  }
})

// 取消监听
unsubscribe()
```

### 3.4 模型管理

```typescript
// 切换模型
await session.setModel(newModel)

// 设置思考等级
session.setThinkingLevel("high")  // off | minimal | low | medium | high | xhigh

// 获取当前模型
console.log(session.model)

// 获取作用域模型
console.log(session.scopedModels)
```

### 3.5 会话管理

```typescript
// 手动压缩
const result = await session.compact({
  customInstructions: "Summarize focusing on API changes"
})

// 分叉会话
await session.fork(entryId)

// 导出 HTML
await session.exportToHtml("./session.html")

// 执行 bash
const result = await session.executeBash("ls -la", { timeout: 30000 })
```

---

## 4. Extension API 速查

### 4.1 基本结构

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent"

export default function (api: ExtensionAPI) {
  // 注册工具
  // 注册命令
  // 订阅事件
}
```

### 4.2 注册工具

```typescript
api.registerTool({
  name: "my-tool",
  description: "Description for LLM",
  schema: Type.Object({
    path: Type.String({ description: "File path" }),
    content: Type.String({ description: "Content to write" })
  }),
  async execute(input, context) {
    // 执行逻辑
    return {
      content: "Success",
      details: { path: input.path }
    }
  }
})
```

### 4.3 注册命令

```typescript
api.registerCommand("my-command", {
  description: "My custom command",
  async execute(context, args) {
    await context.ui.notify("Hello!")
    await context.compact()
  }
})

// 使用
// /my-command
```

### 4.4 注册快捷键

```typescript
api.registerShortcut("ctrl+k", async (context) => {
  const text = await context.ui.input("Enter text:")
  context.ui.setEditorText(text)
})
```

### 4.5 订阅事件

```typescript
api.on("agent_start", (event, context) => {
  console.log("Agent started")
})

api.on("turn_end", async (event, context) => {
  await context.ui.notify("Turn completed")
})

api.on("tool_call", async (event, context) => {
  // 拦截工具调用
  if (event.toolName === "bash") {
    const allowed = await context.ui.confirm(
      "Permission",
      `Run: ${event.input.command}?`
    )
    if (!allowed) {
      return { block: true, message: "Denied" }
    }
  }
})
```

### 4.6 UI 交互

```typescript
// 选择器
const choice = await api.ui.select("Choose:", ["A", "B", "C"])

// 确认
const ok = await api.ui.confirm("Title", "Are you sure?")

// 输入
const text = await api.ui.input("Enter value:", "placeholder")

// 通知
api.ui.notify("Message", "info")  // info | warning | error

// 多行编辑
const content = await api.ui.editor("Edit file", "initial content")

// 状态
api.ui.setStatus("my-ext", "Working...")
api.ui.setStatus("my-ext", undefined)  // 清除

// 小部件
api.ui.setWidget("my-widget", ["Line 1", "Line 2"])

// 设置编辑器内容
api.ui.setEditorText("Hello")
const current = api.ui.getEditorText()
```

### 4.7 自定义 UI 组件

```typescript
import { CustomEditor } from "@mariozechner/pi-coding-agent"

// 自定义编辑器
class VimEditor extends CustomEditor {
  private mode: "normal" | "insert" = "insert"
  
  handleInput(data: string): void {
    if (this.mode === "normal") {
      if (data === "i") {
        this.mode = "insert"
        return
      }
    }
    super.handleInput(data)
  }
}

api.ui.setEditorComponent((tui, theme, keybindings) => 
  new VimEditor(tui, theme, keybindings)
)

// 恢复默认
api.ui.setEditorComponent(undefined)
```

---

## 5. 内置工具速查

### 5.1 read

```typescript
// 定义
interface ReadToolInput {
  file_path: string
  offset?: number      // 起始行 (1-based)
  limit?: number       // 最大行数
}

// 使用
read({ file_path: "/path/to/file.ts", offset: 1, limit: 50 })
```

### 5.2 write

```typescript
// 定义
interface WriteToolInput {
  file_path: string
  content: string
}

// 使用
write({ file_path: "/path/to/file.ts", content: "..." })
```

### 5.3 edit

```typescript
// 定义
interface EditToolInput {
  file_path: string
  old_string: string   // 要替换的文本
  new_string: string   // 新文本
}

// 使用
edit({ 
  file_path: "/path/to/file.ts", 
  old_string: "const x = 1",
  new_string: "const x = 2"
})
```

### 5.4 bash

```typescript
// 定义
interface BashToolInput {
  command: