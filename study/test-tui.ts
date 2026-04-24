import { 
    TUI, 
    Container, 
    Text, 
    Editor, 
    ProcessTerminal, 
    matchesKey,
    type EditorOptions,
    type EditorTheme 
} from "../packages/tui/src/index";

const terminal = new ProcessTerminal();
const tui = new TUI(terminal, false);

// ========== 基础 UI ==========
const app = new Container();

// 定义 EditorTheme（必须）
const editorTheme: EditorTheme = {
    borderColor: (str: string) => str,  // 无边框颜色，直接返回原字符串
    selectList: {
        // SelectListTheme 的字段（用于自动补全下拉框）
        selectedPrefix: (t) => `→ ${t}`,
        selectedText: (t) => t,
        description: (t) => t,
        scrollInfo: (t) => t,
        noMatch: (t) => t,
    }
};

// Editor 配置
const editorOptions: EditorOptions = {
    paddingX: 1,  // 左右内边距
    autocompleteMaxVisible: 5,  // 自动补全显示数量
};

// 创建 Editor（需要 tui, theme, options）
const editor = new Editor(tui, editorTheme, editorOptions);

// 设置初始值（用 setValue）
editor.setText("// 在这里输入代码...\nfunction hello() {\n  console.log('Hello World');\n}");

app.addChild(new Text("=== 简单编辑器 ==="));
app.addChild(new Text("Ctrl+S: 保存 | Ctrl+Q: 退出 | Ctrl+Enter: 提交"));
app.addChild(editor);

tui.addChild(app);

// 设置焦点给 Editor（必须！）
tui.setFocus(editor);
tui.setShowHardwareCursor(true);

// ========== 输入处理 ==========
tui.addInputListener((event) => {
    const data = event;

    // Ctrl+C 退出
    if (matchesKey(data, "ctrl+c")) {
        console.log("退出编辑器");
        tui.stop();
        process.exit(0);
    }

    // Ctrl+S 保存（示例）
    if (matchesKey(data, "ctrl+s")) {
        const content = editor.getText();
        console.log("\n[保存内容]长度:", content.length, "行数:", content.split('\n').length);
        return { consume: true };
    }

    // 继续传给 Editor 处理
    return { data };
});

tui.start();