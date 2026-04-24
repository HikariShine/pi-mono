// Windows ANSI 测试脚本
// 运行: node test-ansi.js

console.log("=== 1. 颜色测试 ===");
console.log("\x1b[31m红色文字\x1b[0m");
console.log("\x1b[32m绿色文字\x1b[0m");
console.log("\x1b[33m黄色文字\x1b[0m");
console.log("\x1b[36m青色文字\x1b[0m");
console.log("\x1b[1m粗体文字\x1b[0m");
console.log("\x1b[3m斜体文字\x1b[0m");

console.log("\n=== 2. 光标控制测试 ===");
process.stdout.write("第一行\n");
process.stdout.write("第二行\n");
process.stdout.write("\x1b[2A"); // 光标上移 2 行
process.stdout.write("\x1b[10C"); // 光标右移 10 列
process.stdout.write("[插入在这里]");
process.stdout.write("\x1b[2B\n"); // 光标下移 2 行，回到底部

console.log("\n=== 3. 清屏测试 ===");
console.log("3秒后清屏...");
setTimeout(() => {
    process.stdout.write("\x1b[2J\x1b[H"); // 清屏 + 光标归位
    console.log("屏幕已清空！");

    // Kitty 协议查询测试
    console.log("\n=== 4. Kitty 键盘协议测试 ===");
    console.log("如果你的终端支持 Kitty 协议，按任意键后会显示特殊序列");
    console.log("不支持的话会正常显示按键");
    console.log("按 Ctrl+C 退出\n");
    // 1. 先设置 stdin 监听
    process.stdin.setRawMode(true);  // 原始模式，直接收字节
    process.stdout.write("\x1b[?u");
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    // 启用 Kitty 协议查询
    process.stdout.write("\x1b[?u");

    // 启用原始模式接收按键
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        process.stdin.on('data', (data) => {
            console.log("收到数据:", JSON.stringify(data));
            console.log("原始字节:", [...data].map(c => `0x${c.charCodeAt(0).toString(16)}`).join(' '));

            if (data === '\x03') { // Ctrl+C
                process.exit(0);
            }
            if (data === '\x1a') { // Ctrl+Z
                console.log("1234");
                process.stdout.write("\x1b[?u");
            }
        });
    }
}, 3000);