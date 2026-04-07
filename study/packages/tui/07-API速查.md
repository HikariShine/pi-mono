# pi-tui API 速查

## 核心 API

### 创建 TUI

```typescript
import { TUI, ProcessTerminal } from "@mariozechner/pi-tui";

const terminal = new ProcessTerminal();
const tui = new TUI(terminal);

// 设置根组件
tui.setComponent(new Container());

// 启动
terminal.start(
  (data) => tui.handleInput(data),   // 输入处理
  () => tui.render()                  // 尺寸变化
);

// 首次渲染
tui.render();

// 退出时
process.on("exit", () => {
  terminal.stop();
});
```

---

### 组件基础

```typescript
import { Container, Text, Box } from "@mariozechner/pi-tui";

// 容器
const container = new Container();
container.addChild(new Text("Hello"));
container.addChild(new Box({ border: true }));
container.removeChild(child);
container.clear();

// 文本
const text = new Text("Hello World", {
  style: "\x1b[31m",  // 红色
  wrap: true
});
```

---

### 编辑器组件

```typescript
import { Editor } from "@mariozechner/pi-tui";

const editor = new Editor({
  value: "initial text",
  language: "typescript",
  autocomplete: myProvider,
  onChange: (value) => console.log(value),
  onSubmit: (value) => console.log("Submitted:", value)
});

// 操作
editor.setValue("new text");
const text = editor.getValue();
editor.insertText("inserted");
editor.deleteSelection();
editor.selectAll();
editor.clear();

// 光标
editor.setCursor(0, 5);  // line, column
const { line, column } = editor.getCursor();

// 自动补全
editor.triggerAutocomplete();
editor.closeAutocomplete();
```

---

### 选择列表

```typescript
import { SelectList } from "@mariozechner/pi-tui";

const list = new SelectList({
  items: [
    { value: "1", label: "Option 1", description: "First option" },
    { value: "2", label: "Option 2" }
  ],
  onSelect: (item) => console.log("Selected:", item.value),
  onCancel: () => console.log("Cancelled"),
  theme: {
    selected: "\x1b[7m",  // 反色
    unselected: "\x1b[0m"
  },
  layout: {
    maxHeight: 10,
    showScrollbar: true
  }
});

// 操作
list.setItems(newItems);
list.filter("query");  // 模糊过滤
list.selectNext();
list.selectPrevious();
list.confirmSelection();
```

---

### 输入框

```typescript
import { Input } from "@mariozechner/pi-tui";

const input = new Input({
  value: "",
  placeholder: "Type here...",
  password: false,
  onChange: (value) => console.log(value),
  onSubmit: (value) => console.log("Submit:", value)
});

// 操作
input.setValue("text");
const value = input.getValue();
input.clear();
input.focus();
input.blur();
```

---

## 键盘处理

### Key ID

```typescript
import { Key, parseKey, matchesKey } from "@mariozechner/pi-tui";

// 创建 Key ID
Key.Enter;           // "Enter"
Key.Escape;          // "Escape"
Key.Tab;             // "Tab"
Key.Up;              // "Up"
Key.Ctrl("c");       // "Ctrl+c"
Key.Ctrl.Shift("c"); // "Ctrl+Shift+c"
Key.Alt("x");        // "Alt+x"
Key.F(1);            // "F1"

// 解析
const keyId = parseKey("\x1b[13;5u");  // "Ctrl+Enter"

// 匹配
if (matchesKey(data, Key.Ctrl("c"))) {
  // Ctrl+C pressed
}

// 检查 Kitty 协议
import { isKittyProtocolActive, isKeyRelease, isKeyRepeat } from "@mariozechner/pi-tui";

if (isKittyProtocolActive() && isKeyRelease(data)) {
  // Key released
}
```

---

## 快捷键绑定

```typescript
import { setKeybindings, getKeybindings, matchesKey } from "@mariozechner/pi-tui";

// 定义
setKeybindings("my-app", {
  submit: { key: Key.Enter, description: "Submit" },
  cancel: { key: Key.Escape, description: "Cancel" },
  copy: { key: Key.Ctrl("c"), description: "Copy" },
  paste: { key: Key.Ctrl("v"), description: "Paste" }
});

// 使用
const kb = getKeybindings("my-app");
if (matchesKey(data, kb.submit.key)) {
  // Handle submit
}
```

---

## 覆盖层

```typescript
// 显示覆盖层
const overlay = tui.showOverlay(component, {
  width: "50%",           // 或 80 (绝对值)
  minWidth: 20,
  maxHeight: "80%",
  anchor: "center",       // 或 "top-left", "bottom-right" 等
  offsetX: 2,
  offsetY: -1,
  margin: { top: 1, left: 2 },
  nonCapturing: false     // 是否捕获焦点
});

// 控制
overlay.hide();              // 永久移除
overlay.setHidden(true);     // 临时隐藏
overlay.setHidden(false);    // 显示
overlay.isHidden();          // 检查是否隐藏
overlay.focus();             // 聚焦
overlay.unfocus();           // 释放焦点
overlay.isFocused();         // 检查是否聚焦
```

---

## 终端图像

```typescript
import {
  renderImage,
  encodeKitty,
  encodeITerm2,
  detectCapabilities,
  allocateImageId,
  deleteKittyImage
} from "@mariozechner/pi-tui";

// 检测能力
const caps = detectCapabilities();
// { kitty: true, iterm2: false, ... }

// 渲染
renderImage(pngBuffer, {
  protocol: "kitty",  // 或 "iterm2"
  width: 800,
  height: 600,
  preserveAspectRatio: true
});

// 手动编码
const id = allocateImageId();
const kittyData = encodeKitty(pngBuffer, { imageId: id });
terminal.write(kittyData);

// 清理
deleteKittyImage(id);

// 尺寸检测
import { getPngDimensions, getJpegDimensions } from "@mariozechner/pi-tui";
const dims = getPngDimensions(buffer);  // { width, height }
```

---

## 自动补全

```typescript
import { CombinedAutocompleteProvider, fuzzyFilter } from "@mariozechner/pi-tui";

// 创建提供者
const fileProvider = {
  getSuggestions: async (input) => {
    const files = await getFiles();
    const matches = fuzzyFilter(files, input);
    return {
      items: matches.map(m => ({
        primary: m.item.name,
        secondary: m.item.path
      })),
      exactMatch: matches.some(m => m.score === 1)
    };
  }
};

// 组合多个提供者
const combined = new CombinedAutocompleteProvider([
  fileProvider,
  commandProvider
]);

// 模糊过滤
const results = fuzzyFilter(
  [{ text: "hello" }, { text: "world" }],
  "he"
);
// [{ item, score, matches }, ...]
```

---

## 工具函数

```typescript
import {
  visibleWidth,
  truncateToWidth,
  wrapTextWithAnsi
} from "@mariozechner/pi-tui";

// 可见宽度 (CJK = 2)
visibleWidth("hello 世界");  // 10

// 截断
truncateToWidth("hello world", 5);  // "he..."

// ANSI 安全截断
truncateToWidth("\x1b[31mred\x1b[0m text", 3);

// 文本换行
wrapTextWithAnsi(longText, maxWidth);
```

---

## Markdown 渲染

```typescript
import { Markdown } from "@mariozechner/pi-tui";

const md = new Markdown({
  content: "# Hello\n\n**Bold** text",
  theme: {
    heading1: "\x1b[1;36m",  // 加粗青色
    heading2: "\x1b[1;34m",  // 加粗蓝色
    bold: "\x1b[1m",
    code: "\x1b[90m"           // 灰色
  }
});

// 渲染
const lines = md.render(width);
```

---

## 事件类型速查

| 事件 | 触发 | 处理 |
|------|------|------|
| 按键 | 用户按键 | `component.handleInput(data)` |
| 尺寸变化 | 终端 resize | `onResize` 回调 |
| 焦点变化 | Tab/点击 | `tui.focus(comp)` |
| 覆盖层显示 | `showOverlay` | 自动渲染 |
| 覆盖层隐藏 | `overlay.hide()` | 自动渲染 |

---

## 常用导入

```typescript
// 核心
import { TUI, Container, ProcessTerminal } from "@mariozechner/pi-tui";

// 组件
import {
  Editor,
  SelectList,
  Input,
  Box,
  Text,
  Markdown,
  Loader,
  Image,
  Spacer
} from "@mariozechner/pi-tui";

// 键盘
import { Key, parseKey, matchesKey, isKeyRelease } from "@mariozechner/pi-tui";

// 快捷键
import { setKeybindings, getKeybindings } from "@mariozechner/pi-tui";

// 图像
import { renderImage, detectCapabilities } from "@mariozechner/pi-tui";

// 工具
import { visibleWidth, truncateToWidth, fuzzyFilter } from "@mariozechner/pi-tui";
```

---

## 版本信息

- **Package**: `@mariozechner/pi-tui`
- **Version**: 0.63.1
- **License**: MIT
- **Node**: >= 20.0.0
