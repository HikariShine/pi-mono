#!/usr/bin/env tsx
/**
 * Agent 功能测试脚本
 * 用法: cd ~/projects/pi-mono && npx tsx test-agent.ts
 */

import { Agent, AgentTool, AgentEvent, AgentMessage } from "../packages/agent/src/index.js";
import { AssistantMessage } from "../packages/ai/dist/types.js";
import { getModel } from "../packages/ai/src/index.js";
import { Type } from "@sinclair/typebox";

// ==================== 工具定义 ====================

const echoTool: AgentTool<any> = {
    name: "echo",
    label: "Echo",
    description: "Echo back the input",
    parameters: Type.Object({ message: Type.String() }),
    async execute(_id, params) {
        console.log(`  [Tool] echo("${params.message}")`);
        return {
            content: [{ type: "text", text: `Echo: ${params.message}` }],
            details: {},
        };
    },
};

const timeTool: AgentTool<any> = {
    name: "get_time",
    label: "Time",
    description: "Get current time",
    parameters: Type.Object({}),
    async execute() {
        console.log(`  [Tool] get_time()`);
        return {
            content: [{ type: "text", text: `Time: ${new Date().toISOString()}` }],
            details: {},
        };
    },
};

// ==================== 主测试 ====================

async function main() {
    const agent = new Agent({
        initialState: {
            systemPrompt: "You are a helpful assistant with echo and time tools.",
            model: { ...getModel("opencode", "kimi-k2.5"), baseUrl: "http://10.200.1.6:3000/v1" },
            tools: [echoTool, timeTool],
        },
        getApiKey: () => "sk-mAeZNDVxVTUUYyFxeGprAAXafhXvOcdLzRV0kTCEZn2YFK2C",
        beforeToolCall: async (ctx) => {
            console.log("执行命令:", ctx.toolCall);
            return undefined;
        },
        afterToolCall: async (ctx) => {
            console.log("执行结果:", ctx.result);
            return undefined;
        },
    });

    // 订阅所有事件
    agent.subscribe((event: AgentEvent) => {
        switch (event.type) {
            case "agent_start":
                console.log("\n🚀 Agent started");
                break;
            case "turn_start":
                console.log("\n🔄 Turn started");
                break;
            case "message_start":
                console.log(`\n📝 Message start: ${event.message.role}`);
                break;
            case "message_update":
                if (event.assistantMessageEvent.type === "text_delta") {
                    process.stdout.write(event.assistantMessageEvent.delta);
                }
                break;
            case "message_end":
                console.log("\n📨 Message end");
                break;
            case "tool_execution_start":
                console.log(`\n🔧 Tool start: ${event.toolName}`);
                console.log(`   args: ${JSON.stringify(event.args)}`);
                break;
            case "tool_execution_end":
                console.log(`\n🔩 Tool end: ${event.result.content[0]?.text}`);
                if (event.isError) console.log("   [ERROR]");
                break;
            case "turn_end":
                console.log(`\n✅ Turn end (${event.toolResults.length} tool results)`);
                break;
            case "agent_end":
                console.log("\n🏁 Agent ended");
                break;
        }
    });

    // 测试对话
    console.log("=".repeat(50));
    console.log("User: What's the time?");
    console.log("=".repeat(50));
    await agent.prompt("What's the time?");

    await agent.continue();
    console.log("\n" + "=".repeat(50));
    console.log("User: Echo 'Hello World'");
    console.log("=".repeat(50));
    await agent.prompt("Echo 'Hello World'");

    // 打印最终状态
    console.log("\n" + "=".repeat(50));
    console.log("Final state:");
    console.log("-".repeat(50));
    console.log(`Messages: ${agent.state.messages.length}`);
    console.log(`Tools: ${agent.state.tools.length}`);
    console.log(`Model: ${agent.state.model.id}`);

    // 打印对话历史
    console.log("\nConversation history:");
    agent.state.messages.forEach((msg, i) => {
        const content = typeof msg.content === "string"
            ? msg.content.slice(0, 50)
            : JSON.stringify(msg.content).slice(0, 50);
        console.log(`${i}. [${msg.role}] ${content}...`);
        if ((msg as AssistantMessage).errorMessage) {
            console.log(`   [ERROR] ${(msg as AssistantMessage).errorMessage}`);
        }
    });
}

main().catch(console.error)