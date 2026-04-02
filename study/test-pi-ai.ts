#!/usr/bin/env node
/**
 * pi-ai 测试脚本
 * 运行: npx tsx study/test-pi-ai.ts
 */

import { Model, Context, stream, getModel, complete } from "../packages/ai/src/index.js";

// ============ 配置区 ============

// 方式 1: 使用内置模型（修改 baseUrl）
const model: Model<"openai-responses"> = { ...getModel("openai", "gpt-5-codex"), baseUrl: "http://10.200.1.6:3000/v1" }

// 方式 2: 完全自定义模型（适合自定义中转站）
// const model: Model<"openai-responses"> = {
// 	id: "custom-gpt-4",
// 	name: "Custom GPT-4",
// 	api: "openai-responses",
// 	provider: "openai",
// 	baseUrl: "https://your-custom-endpoint.com/v1", // ← 自定义 base URL
// 	apiKey: "sk-your-key",
// 	contextWindow: 128000,
// 	maxTokens: 4096,
// 	input: ["text", "image"],
// 	cost: { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 },
// };

// ============ 测试函数 ============

async function testStream() {
	console.log("=== 测试 stream (流式输出) ===\n");

	const context: Context = {
		systemPrompt: "你是一个简洁的助手，回答控制在 100 字以内。",
		messages: [
			{
				role: "user",
				content: "用一句话解释什么是闭包",
				timestamp: Date.now(),
			},
		],
	};

	const eventStream = stream(model, context, {
		temperature: 0.7,
		maxTokens: 200,
	});

	console.log("AI: ");
	for await (const event of eventStream) {
		switch (event.type) {
			case "text_delta":
				process.stdout.write(event.delta);
				break;
			case "done":
				console.log("\n\n✅ 完成");
				console.log("Token 用量:", JSON.stringify(event.message.usage, null, 2));
				break;
			case "error":
				console.error("\n❌ 错误:", event.error.errorMessage);
				break;
		}
	}
}

async function testComplete() {
	console.log("\n=== 测试 complete (一次性返回) ===\n");

	const context: Context = {
		messages: [
			{
				role: "user",
				content: "列举 3 个 JavaScript 数组方法",
				timestamp: Date.now(),
			},
		],
	};

	try {
		const message = await complete(model, context, {
			temperature: 0.5,
			maxTokens: 200,
		});

		console.log("AI 回复:");
		console.log(message.content[0]); // { type: "text", text: "..." }
		console.log("\n停止原因:", message.stopReason);
		console.log("Token 用量:", message.usage);
	} catch (error) {
		console.error("❌ 调用失败:", error);
	}
}

async function testSimple() {
	console.log("\n=== 测试 streamSimple (简化版，带 reasoning) ===\n");

	// 需要换成支持 reasoning 的模型
	const reasoningModel: Model<"anthropic-messages"> = { ...getModel("anthropic", "claude-sonnet-4-6"), baseUrl: "http://10.200.1.6:3000/v1" };

	const context: Context = {
		messages: [
			{
				role: "user",
				content: "1+1 等于几？请一步步思考。",
				timestamp: Date.now(),
			},
		],
	};

	const { streamSimple } = await import("@mariozechner/pi-ai");
	const eventStream = streamSimple(reasoningModel, context, {
		reasoning: "low", // 自动映射到各厂商的 reasoning 参数
	});

	console.log("AI 思考过程:");
	for await (const event of eventStream) {
		switch (event.type) {
			case "thinking_delta":
				process.stdout.write(event.delta);
				break;
			case "text_delta":
				process.stdout.write(event.delta);
				break;
			case "done":
				console.log("\n✅ 完成");
				break;
		}
	}
}

// ============ 主函数 ============

async function main() {
	console.log("🚀 pi-ai 测试开始\n");
	console.log("使用的模型:", model.id);
	console.log("API:", model.api);
	console.log("Base URL:", model.baseUrl);
	console.log("Provider:", model.provider);
	console.log("");

	// 根据环境变量选择测试
	const testType = process.env.TEST_TYPE || "stream";

	switch (testType) {
		case "stream":
			await testStream();
			break;
		case "complete":
			await testComplete();
			break;
		case "simple":
			await testSimple();
			break;
		case "all":
			await testStream();
			await testComplete();
			// await testSimple(); // 需要 anthropic key
			break;
		default:
			console.log("用法: TEST_TYPE=stream npx tsx study/test-pi-ai.ts");
			console.log("可选: stream | complete | simple | all");
	}

	console.log("\n🏁 测试结束");
}

main().catch((err) => {
	console.error("💥 程序错误:", err);
	process.exit(1);
});
