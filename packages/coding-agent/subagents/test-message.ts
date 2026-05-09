/**
 * 测试三种消息渲染的脚本
 * 
 * 使用方法：
 * 1. 将此文件放到 packages/coding-agent 目录
 * 2. 在 test-interactive.ts 的 extensionFactories 中添加此扩展
 * 3. 运行 npx tsx ./test-interactive.ts
 * 
 * 或者直接通过 -e 参数加载：
 * npx tsx ./test-interactive.ts -e ./test-render-messages.ts
 */

import type { ExtensionAPI, ExtensionContext } from "../src/index.js";

// 从 types.ts 导入常量
const SLASH_RESULT_TYPE = "subagent-slash-result";
const SUBAGENT_CONTROL_MESSAGE_TYPE = "subagent_control_notice";

export default function registerTestRenderExtension(pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, ctx: ExtensionContext) => {
    // 等待一会儿让 UI 完全初始化
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    ctx.ui.notify("🧪 测试消息渲染 - 3种消息类型将依次显示", "info");

    // ============================================
    // 1. 发送 "subagent-notify" - 后台任务完成通知
    // ============================================
    setTimeout(() => {
      pi.sendMessage({
        customType: "subagent-notify",
        content: "Background task completed: **oracle** (15s)\n\nAnalysis complete. Found 3 potential issues in the codebase.\n\nSession: /tmp/test-session.jsonl",
        display: true,
        details: {
          agent: "oracle",
          status: "completed",
          durationMs: 15000,
          resultPreview: "Analysis complete. Found 3 potential issues in the codebase.",
          sessionLabel: "Session",
          sessionValue: "/tmp/test-session.jsonl"
        }
      }, { triggerTurn: true });
      
      ctx.ui.notify("✅ 已发送: subagent-notify (后台任务完成)", "info");
    }, 5000);

    // 2. 发送一个 failed 状态的通知
    setTimeout(() => {
      pi.sendMessage({
        customType: "subagent-notify",
        content: "Background task failed: **reviewer** (5s)\n\nError: Connection timeout while analyzing src/index.ts",
        display: true,
        details: {
          agent: "reviewer",
          status: "failed",
          durationMs: 5000,
          resultPreview: "Error: Connection timeout while analyzing src/index.ts",
          sessionLabel: "Session",
          sessionValue: "/tmp/failed-session.jsonl"
        }
      }, { triggerTurn: true });
      
      ctx.ui.notify("✅ 已发送: subagent-notify (后台任务失败)", "error");
    }, 6000);

    // 3. 发送一个 paused 状态的通知
    setTimeout(() => {
      pi.sendMessage({
        customType: "subagent-notify",
        content: "Background task paused: **worker**\n\nPaused after interrupt. Waiting for explicit next action.",
        display: true,
        details: {
          agent: "worker",
          status: "paused",
          resultPreview: "Paused after interrupt. Waiting for explicit next action."
        }
      }, { triggerTurn: true });
      
      ctx.ui.notify("✅ 已发送: subagent-notify (后台任务暂停)", "warning");
    }, 7000);

    // ============================================
    // 2. 发送 "subagent_control_notice" - 控制事件通知
    // ============================================
    setTimeout(() => {
      // paused 事件
      pi.sendMessage({
        customType: SUBAGENT_CONTROL_MESSAGE_TYPE,
        content: "Subagent paused",
        display: true,
        details: {
          event: { type: "paused", agent: "oracle" },
          source: "async",
          childIntercomTarget: "intercom-test-123"
        }
      }, { triggerTurn: true });
      
      ctx.ui.notify("✅ 已发送: subagent_control_notice (paused)", "info");
    }, 8000);

    setTimeout(() => {
      // resumed 事件
      pi.sendMessage({
        customType: SUBAGENT_CONTROL_MESSAGE_TYPE,
        content: "Subagent resumed",
        display: true,
        details: {
          event: { type: "resumed", agent: "oracle" },
          source: "async",
          childIntercomTarget: "intercom-test-123"
        }
      }, { triggerTurn: true });
      
      ctx.ui.notify("✅ 已发送: subagent_control_notice (resumed)", "info");
    }, 9000);

    setTimeout(() => {
      // interrupted 事件
      pi.sendMessage({
        customType: SUBAGENT_CONTROL_MESSAGE_TYPE,
        content: "Subagent interrupted",
        display: true,
        details: {
          event: { type: "interrupted", agent: "reviewer" },
          source: "foreground",
          childIntercomTarget: undefined
        }
      }, { triggerTurn: true });
      
      ctx.ui.notify("✅ 已发送: subagent_control_notice (interrupted)", "info");
    }, 10000);

    // ============================================
    // 3. 发送 SLASH_RESULT_TYPE - Slash 命令结果
    // ============================================
    setTimeout(() => {
      // 模拟一个单任务执行结果
      pi.sendMessage({
        customType: SLASH_RESULT_TYPE,
        content: "Subagent execution result",
        display: true,
        details: {
          kind: "single",
          agent: "oracle",
          status: "complete",
          exitCode: 0,
          summary: "Code analysis complete. Found 3 issues: 2 style warnings, 1 potential null reference.",
          results: [
            {
              agent: "oracle",
              task: "Analyze code quality",
              status: "complete",
              exitCode: 0,
              output: "Line 42: Unused import 'fs'\nLine 88: Potential null reference\nLine 156: Console.log left in production code",
              durationMs: 3200
            }
          ]
        }
      }, { triggerTurn: true });
      
      ctx.ui.notify("✅ 已发送: SLASH_RESULT_TYPE (单任务完成)", "info");
    }, 11000);

    setTimeout(() => {
      // 模拟一个链式执行结果
      pi.sendMessage({
        customType: SLASH_RESULT_TYPE,
        content: "Chain execution result",
        display: true,
        details: {
          kind: "chain",
          chainLength: 3,
          status: "complete",
          results: [
            {
              agent: "scout",
              task: "Explore codebase",
              status: "complete",
              exitCode: 0,
              output: "Found 5 modules: auth, api, db, utils, config",
              durationMs: 1500
            },
            {
              agent: "planner",
              task: "Create migration plan",
              status: "complete",
              exitCode: 0,
              output: "1. Update auth module\n2. Migrate api endpoints\n3. Test db connections",
              durationMs: 2800
            },
            {
              agent: "worker",
              task: "Execute migration",
              status: "complete",
              exitCode: 0,
              output: "Migration successful. All tests passing.",
              durationMs: 5200
            }
          ]
        }
      }, { triggerTurn: true });
      
      ctx.ui.notify("✅ 已发送: SLASH_RESULT_TYPE (链式执行完成)", "info");
    }, 12000);

    setTimeout(() => {
      // 模拟一个并行任务结果（带错误）
      pi.sendMessage({
        customType: SLASH_RESULT_TYPE,
        content: "Parallel execution result",
        display: true,
        details: {
          kind: "parallel",
          parallelCount: 3,
          status: "partial",
          results: [
            {
              agent: "reviewer",
              task: "Check correctness",
              status: "complete",
              exitCode: 0,
              output: "Logic looks correct. No issues found.",
              durationMs: 2100
            },
            {
              agent: "reviewer",
              task: "Check tests",
              status: "complete",
              exitCode: 1,
              output: "Error: Missing test for edge case at line 45",
              durationMs: 1800
            },
            {
              agent: "reviewer",
              task: "Check complexity",
              status: "complete",
              exitCode: 0,
              output: "Complexity score: 7/10 (acceptable)",
              durationMs: 1500
            }
          ]
        }
      }, { triggerTurn: true });
      
      ctx.ui.notify("✅ 已发送: SLASH_RESULT_TYPE (并行任务，部分失败)", "info");
    }, 13000);

    // 最后显示完成提示
    setTimeout(() => {
      ctx.ui.notify("🎉 所有测试消息已发送完成！请查看上方的消息渲染效果。", "info");
      ctx.ui.notify("💡 提示：使用 Ctrl+O 展开/折叠消息查看详情", "info");
    }, 14000);
  });
}