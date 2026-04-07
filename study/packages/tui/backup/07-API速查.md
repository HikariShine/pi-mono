 myKeybindings = {
  cursorUp: { key: "ctrl+k", handler: () => {} },
  cursorDown: { key: "ctrl+j", handler: () => {} },
  submit: { key: "ctrl+enter", handler: () => {} },
};

setKeybindings(TUI_KEYBINDINGS, myKeybindings);
```

---

## 工具函数 API

### 可见宽度

```typescript
import { visibleWidth, truncateToWidth, sliceByColumn } from "@mariozechner/pi-tui";

// 计算可见宽度
const width = visibleWidth("Hello 世界");  // 10 (8 + 2)

// 截断到指定宽度
const truncated = truncateToWidth("Hello World", 5);  // "Hello"

// 按列切片
const slice = sliceByColumn("Hello 世界", 0, 7);  // "Hello 世"
```

### 文本换行

```typescript
import { wrapTextWithAnsi } from "@mariozechner/pi-tui";

const lines = wrapTextWithAnsi(longText, width);
```

### 模糊匹配

```typescript
import { fuzzyMatch, fuzzyFilter } from "@mariozechner/pi-tui";

// 模糊匹配
const match = fuzzyMatch("hw", "Hello World");  // { score, matches }

// 过滤列表
const results = fuzzyFilter("hw", items, (item) => item.label);
```

---

## 终端图片 API

### 能力检测

```typescript
import { 
  detectCapabilities, 
  getCapabilities, 
  isImageLine 
} from "@mariozechner/pi-tui";

// 检测终端能力
const caps = detectCapabilities();
console.log(caps.images);      // 是否支持图片
console.log(caps.kitty);       // 是否支持 Kitty
console.log(caps.iterm2);      // 是否支持 iTerm2

// 获取缓存的能力
const cached = getCapabilities();

// 检测图片行
if (isImageLine(line)) {
  // 这是图片行
}
```

### 渲染图片

```typescript
import { renderImage, encodeKitty, encodeITerm2 } from "@mariozechner/pi-tui";

// 渲染图片
const imageLine = renderImage({
  data: imageBuffer,
  width: 800,    // 像素
  height: 600,
});

// 编码为 Kitty 格式
const kittyLine = encodeKitty(imageBuffer, { 
  width: 800, 
  height: 600 
});

// 编码为 iTerm2 格式
const iterm2Line = encodeITerm2(imageBuffer, {
  width: 800,
  height: 600,
});
```

### 单元格尺寸

```typescript
import { 
  getCellDimensions, 
  calculateImageRows, 
  setCellDimensions 
} from "@mariozechner/pi-tui";

// 获取单元格尺寸
const dims = getCellDimensions();  // { widthPx, heightPx }

// 计算图片占用行数
const rows = calculateImageRows(800, 600, dims.heightPx);
```

---

## 完整示例

### 简单的 TUI 应用

```typescript
import { TUI, ProcessTerminal, Editor, Text, Box } from "@mariozechner/pi-tui";

async function main() {
  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal);

  // 标题
  const title = new Text("My TUI App", { align: "center" });
  tui.addChild(title);

  // 编辑器容器
  const box = new Box({ title: "Input", border: true });
  
  const editor = new Editor(tui, {}, {
    placeholder: "Type something...",
    multiline: true,
  });
  
  editor.onSubmit = (text) => {
    console.log("Submitted:", text);
    tui.stop();
  };
  
  box.addChild(editor);
  tui.addChild(box);

  // 启动
  tui.start();

  // 优雅退出
  process.on("SIGINT", () => {
    tui.stop();
    process.exit(0);
  });
}

main();
```

### 带弹层的菜单

```typescript
import { TUI, SelectList, Text } from "@mariozechner/pi-tui";

function showMenu(tui: TUI) {
  const items = [
    { id: "1", label: "Option 1", shortcut: "1" },
    { id: "2", label: "Option 2", shortcut: "2" },
    { id: "3", label: "Cancel", shortcut: "Esc" },
  ];

  const menu = new SelectList(tui, {}, { items });
  
  const overlay = tui.showOverlay(menu, {
    width: 40,
    anchor: "center",
    maxHeight: 10,
  });

  menu.onSelect = (item) => {
    console.log("Selected:", item.id);
    overlay.hide();
  };

  menu.onCancel = () => {
    overlay.hide();
  };
}
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PI_HARDWARE_CURSOR` | 显示硬件光标 | `0` |
| `PI_CLEAR_ON_SHRINK` | 内容缩小时清除空行 | `0` |
| `PI_DEBUG_REDRAW` | 启用重绘调试日志 | `0` |
| `PI_TUI_DEBUG` | 启用 TUI 调试日志 | `0` |
| `PI_TUI_WRITE_LOG` | 记录终端写入 | - |
| `TERMUX_VERSION` | Termux 检测 | - |

---

## 常量参考

### CURSOR_MARKER

```typescript
import { CURSOR_MARKER } from "@mariozechner/pi-tui";

// 光标位置标记（APC 序列）
console.log(CURSOR_MARKER);  // "\x1b_pi:c\x07"
```

### ANSI 序列

```typescript
// 常用 CSI 序列
\x1b[?2026h    // 开始同步输出
\x1b[?2026l    // 结束同步输出
\x1b[2J        // 清屏
\x1b[H         // 光标归位
\x1b[K         // 清除到行尾
\x1b[2K        // 清除整行
\x1b[nA        // 上移 n 行
\x1b[nB        // 下移 n 行
\x1b[nC        // 右移 n 列
\x1b[nD        // 左移 n 列
\x1b[?25l      // 隐藏光标
\x1b[?25h      // 显示光标
```
