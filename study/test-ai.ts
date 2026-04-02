import { Model, Context, stream, getModel } from "../packages/ai/src/index.js";


// 最简单的测试代码
async function testAnthropic() {

    const model = { ...getModel("openai", "gpt-5-codex"), baseUrl: "http://10.200.1.6:3000/v1" }

    const context: Context = {
        systemPrompt: "你是一个简洁的助手，回答控制在 100 字以内。",
        messages: [
            {
                role: "user",
                content: [{ type: "text", text: "用一句话解释什么是闭包" }],
                timestamp: Date.now(),
            },
        ],
    };

    const eventStream = stream(model, context, {
        maxTokens: 200,
        thinkingEnabled: true,
        apiKey: "sk-mAeZNDVxVTUUYyFxeGprAAXafhXvOcdLzRV0kTCEZn2YFK2C",
        reasoningEffort: "low"
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

testAnthropic();