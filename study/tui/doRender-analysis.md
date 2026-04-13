# TUI doRender 渲染机制深度解析

## 一、整体架构

`doRender` 是 TUI 的核心渲染引擎，负责在终端上高效更新内容。它采用**差异渲染（Differential Rendering）**策略，只更新变化的行，同时处理各种边界情况。

### 核心设计原则

1. **正确性优先**：任何不确定的情况都回退到全量重绘
2. **性能优化**：正常情况只渲染变化的行
3. **防御性编程**：各种极端情况都有兜底处理

---

## 二、关键变量定义

| 变量 | 类型 | 含义 | 典型值 |
|------|------|------|--------|
| `cursorRow` | `number` | 内容最后一行的索引（固定） | `newLines.length - 1` |
| `hardwareCursorRow` | `number` | 硬件光标实际所在行 | `lastChanged` 或 `newLines.length-1` |
| `previousViewportTop` | `number` | 上次视口起始位置（逻辑可见区域第一行） | 0 或 `newLines.length - height` |
| `maxLinesRendered` | `number` | 历史最大渲染行数 | `max(旧值, newLines.length)` |
| `firstChanged` | `number` | 第一处变化的行索引 | `-1`（无变化）或 `0~n` |
| `lastChanged` | `number` | 最后一处变化的行索引 | `-1` 或 `0~n` |

### 变量关系图

```
内容数组 (newLines)
├─ 第 0 行
├─ 第 1 行
│  ...
├─ 第 previousViewportTop 行 ← 逻辑视口起始
│  ...
├─ 第 hardwareCursorRow 行 ← 硬件光标位置
│  ...
└─ 第 cursorRow 行 (newLines.length-1) ← 内容最后一行

逻辑视口范围：[previousViewportTop, previousViewportTop + height)
```

---

## 三、渲染流程与 Case 分析

### Case 1: 首次渲染

```typescript
if (this.previousLines.length === 0 && !widthChanged && !heightChanged) {
    fullRender(false);
    return;
}
```

**条件**：没有上次渲染记录，且终端尺寸未变  
**行为**：直接输出所有内容，不清屏  
**原因**：假设终端是干净的（刚进入 TUI）

---

### Case 2: 终端宽度变化

```typescript
if (widthChanged) {
    fullRender(true);
    return;
}
```

**条件**：`this.previousWidth !== 0 && this.previousWidth !== width`  
**行为**：清屏后全量重绘  
**原因**：文字换行会改变，每行内容都可能不同

---

### Case 3: 终端高度变化（非 Termux）

```typescript
if (heightChanged && !isTermuxSession()) {
    fullRender(true);
    return;
}
```

**条件**：终端高度改变，且不是 Termux  
**行为**：清屏后全量重绘  
**原因**：高度变化影响视口对齐和滚动

**Termux 例外**：软键盘弹出/收起频繁触发高度变化，全量重绘会导致刷屏

---

### Case 4: 内容收缩（clearOnShrink）

```typescript
if (this.clearOnShrink && newLines.length < this.maxLinesRendered && this.overlayStack.length === 0) {
    fullRender(true);
    return;
}
```

**条件**：
- 内容比历史最大值少（"缩水"了）
- 开启了 `clearOnShrink`（默认开启）
- 没有 overlay

**行为**：清屏后全量重绘  
**原因**：第 `newLines.length` 行之后的内容需要清理  
**无 overlay 时才触发**：有 overlay 时可能依赖这些行做定位

---

### Case 5: 变化在视口上方（关键防御逻辑）

```typescript
if (firstChanged < prevViewportTop) {
    logRedraw(`firstChanged < viewportTop (${firstChanged} < ${prevViewportTop})`);
    fullRender(true);
    return;
}
```

**条件**：第一处变化的位置在逻辑视口起始位置之上  
**行为**：清屏后全量重绘  
**核心原因**：

差异渲染只能操作**当前屏幕上可见的行**。如果变化在视口上方（屏幕外），光标无法移动到那里（ANSI 序列是相对移动，不能"跳出"屏幕）。

> **重要假设**：TUI 假设用户始终在看"自己上次留下的世界"，即逻辑视口范围内的内容。如果用户用终端滚动条滚到了历史缓冲区，TUI 无法感知，此时会强制清屏把用户拉回"标准状态"。

---

### Case 6: 无变化

```typescript
if (firstChanged === -1) {
    this.positionHardwareCursor(cursorPos, newLines.length);
    this.previousViewportTop = prevViewportTop;
    this.previousHeight = height;
    return;
}
```

**条件**：新旧内容完全一致  
**行为**：只更新硬件光标位置，不输出任何内容  
**原因**：内容没变，但光标位置可能变了（如输入框内移动光标）

---

### Case 7: 纯删除（无新增/修改）

```typescript
if (firstChanged >= newLines.length) {
    if (this.previousLines.length > newLines.length) {
        // 移动光标到新内容最后一行
        // 逐行清除多余行（extraLines = previousLines.length - newLines.length）
        // 如果 extraLines > height，回退到 fullRender
    }
    this.positionHardwareCursor(cursorPos, newLines.length);
    this.previousLines = newLines;
    // ...
    return;
}
```

**条件**：`firstChanged >= newLines.length`，即所有变化都在"已删除区域"  
**行为**：移动光标到尾部，清理多余行  
**原因**：没有新内容需要渲染，只需清理旧内容残留

---

### Case 8: 正常增量更新（默认路径）

当以上所有 case 都不满足时，执行增量更新：

1. 移动光标到 `firstChanged`
2. 输出从 `firstChanged` 到 `lastChanged` 的修改行
3. 如果旧内容比新内容长，清理尾部多余行
4. 更新状态

---

## 四、视口（Viewport）机制详解

### 4.1 什么是视口

TUI 维护了一个**逻辑视口**（`previousViewportTop`），表示"当前应该显示内容的哪一段"。

**关键区分**：
- **TUI 逻辑视口**：`previousViewportTop` 到 `previousViewportTop + height`
- **终端实际显示**：最后输出的 `height` 行（如果用户没有手动滚动）

### 4.2 viewportTop 的计算

```typescript
this.previousViewportTop = Math.max(
    prevViewportTop,                    // 保持当前视口
    finalCursorRow - height + 1         // 确保光标可见的最小视口
);
```

**什么时候保持不变（取 `prevViewportTop`）？**
- 当 `finalCursorRow` 在 `[prevViewportTop, prevViewportTop + height)` 范围内
- 简单说：光标已经在屏幕内，不需要滚动

**什么时候向下滚动（取 `finalCursorRow - height + 1`）？**
- 当 `finalCursorRow > prevViewportBottom`（光标在屏幕下方）
- 必须向下滚动才能看到光标

### 4.3 视口调整的时机

| 触发条件 | viewportTop 变化 | 目的 |
|---------|-----------------|------|
| 终端变高 | 减小（向上滚） | 显示更多上方内容 |
| 终端变矮 | 增大（向下滚） | 保持底部内容可见 |
| 内容追加 | 增大（向下滚） | 跟随新输入 |
| 光标位置兜底 | 确保 ≥ `finalCursorRow - height + 1` | 光标必须在屏幕内 |

---

## 五、光标位置管理

### 5.1 两种光标

| 光标类型 | 变量 | 是否可见 | 用途 |
|---------|------|---------|------|
| **软件光标** | 组件自己渲染（如 `_`） | ✅ 可见 | 用户看到的"假光标" |
| **硬件光标** | `hardwareCursorRow` 追踪 | ❌ 默认隐藏 | IME 定位、光标移动计算 |

### 5.2 hardwareCursorRow 的更新时机

| 时机 | 新值 | 说明 |
|------|------|------|
| **全量渲染** | `newLines.length - 1` | 光标遍历了所有行，停在最后 |
| **增量更新** | `finalCursorRow` | 可能是 `lastChanged` 或 `newLines.length - 1` |
| **IME 定位** | `cursorPos.row` | 为了输入法候选窗口 |
| **退出** | `previousLines.length` | 确保 shell prompt 位置正确 |

### 5.3 光标移动计算

```typescript
const computeLineDiff = (targetRow: number): number => {
    const currentScreenRow = hardwareCursorRow - prevViewportTop;
    const targetScreenRow = targetRow - viewportTop;
    return targetScreenRow - currentScreenRow;
};
```

**作用**：计算光标从当前位置到目标位置需要**上移/下移多少行**（相对屏幕的偏移量）。

---

## 六、关键代码逻辑详解

### 6.1 追加模式（Append Mode）

```typescript
const appendStart = appendedLines 
                 && firstChanged === this.previousLines.length 
                 && firstChanged > 0;
```

**满足条件**：
1. 新内容比旧内容长（`appendedLines = true`）
2. 第一处变化正好是旧内容的末尾（`firstChanged === previousLines.length`）
3. 旧内容不为空

**优化效果**：光标先移到旧内容最后一行，然后直接 `\r\n` 换行输出新内容，省去多次光标移动。

### 6.2 目标行在屏幕外时的滚动

```typescript
if (moveTargetRow > prevViewportBottom) {
    const scroll = moveTargetRow - prevViewportBottom;
    buffer += "\r\n".repeat(scroll);
    prevViewportTop += scroll;
    viewportTop += scroll;
    hardwareCursorRow = moveTargetRow;
}
```

**场景**：内容追加超过一屏，需要自动向下滚动  
**原理**：输出 `\r\n` 让终端向上滚动，新内容从底部进入

### 6.3 清理尾部多余行

```typescript
if (this.previousLines.length > newLines.length) {
    if (renderEnd < newLines.length - 1) {
        const moveDown = newLines.length - 1 - renderEnd;
        buffer += `\x1b[${moveDown}B`;
        finalCursorRow = newLines.length - 1;
    }
    const extraLines = this.previousLines.length - newLines.length;
    for (let i = newLines.length; i < this.previousLines.length; i++) {
        buffer += "\r\n\x1b[2K";
    }
    buffer += `\x1b[${extraLines}A`;
}
```

**步骤**：
1. 如果渲染停在中间，先移到最后
2. 逐行清除（`\r\n` 换行 + `\x1b[2K` 清除）
3. 光标上移回到新内容末尾

---

## 七、边界情况与防御性编程

### 7.1 为什么 `firstChanged < prevViewportTop` 要全量重绘

TUI 只相信"自己上次留下的世界"（逻辑视口）。如果变化发生在那个世界之外：
- 光标位置可能和记录不一致（用户可能滚动了终端）
- 相对移动计算会出错
- 清屏（`\x1b[2J`）强制把用户拉回"标准状态"

### 7.2 `extraLines > height` 的回退

```typescript
if (extraLines > height) {
    fullRender(true);
    return;
}
```

**原因**：如果要删除的行数超过终端高度，逐行清除的 ANSI 序列反而比全量重绘更多，性能更差。

### 7.3 内容少于一屏时的 viewportTop

```typescript
// 内容 10 行，终端 20 行
this.previousViewportTop = Math.max(0, 9 - 20 + 1) = 0
```

内容少于一屏时，`viewportTop` 保持为 0，从第 0 行开始显示，不滚动到底部。

---

## 八、改进建议

### 8.1 启用 Alternate Screen Buffer

```typescript
// 启动时
process.stdout.write("\x1b[?1049h");

// 退出时
process.stdout.write("\x1b[?1049l");
```

**效果**：
- 禁用终端滚动条（没有历史缓冲区可滚）
- 退出后自动恢复之前的终端内容
- 这是 vim/tmux 等全屏 TUI 的标准做法

### 8.2 处理鼠标滚动事件

捕获鼠标滚动序列，手动调整 `viewportTop`，让 TUI 内部视口和终端视图同步。

---

## 九、总结

`doRender` 是一个精心设计的渲染引擎，核心权衡：

| 场景 | 策略 | 原因 |
|------|------|------|
| 正常增量更新 | 只改变化的行 | 性能最优 |
| 尺寸变化/视口外变化 | 全量重绘 | 确保正确性 |
| 边界情况 | 各种兜底处理 | 防御性编程 |

**关键洞察**：`previousViewportTop` 是 TUI 的"逻辑可见区域"，和终端实际显示可能不一致（如果用户手动滚动）。TUI 通过保守策略（变化在视口外就全量重绘）来保证渲染正确性。
