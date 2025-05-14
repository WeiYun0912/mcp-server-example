<template>
    <div class="guitar-store">
        <h1>Guitar Store</h1>

        <div v-if="!connected" class="connection-status">
            <p>Connecting to MCP server...</p>
            <button @click="connectToServer">Connect</button>
        </div>

        <div v-else class="store-content">
            <div class="chat-section">
                <div class="messages">
                    <div v-for="(message, index) in chatMessages" :key="index" :class="['message', message.role]">
                        <p>{{ message.content }}</p>
                    </div>
                </div>

                <div class="input-area">
                    <textarea
                        v-model="userInput"
                        placeholder="Ask about guitars or place an order..."
                        @keydown.enter.prevent="sendMessage"
                    ></textarea>
                    <button @click="sendMessage">Send</button>
                </div>
            </div>

            <div class="guitars-section" v-if="guitars.length > 0">
                <h2>Available Guitars</h2>
                <div class="guitar-list">
                    <div v-for="guitar in guitars" :key="guitar.id" class="guitar-card">
                        <h3>{{ guitar.name }}</h3>
                        <p>{{ guitar.shortDescription }}</p>
                        <p class="price">${{ guitar.price }}</p>
                        <button @click="selectGuitar(guitar)">View Details</button>
                    </div>
                </div>
            </div>

            <div v-if="selectedGuitar" class="guitar-detail">
                <h2>{{ selectedGuitar.name }}</h2>
                <p>{{ selectedGuitar.description }}</p>
                <p class="price">${{ selectedGuitar.price }}</p>
                <button @click="purchaseGuitar(selectedGuitar)">Purchase</button>
                <button @click="selectedGuitar = null">Close</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// 狀態管理
const connected = ref(false);
const client = ref(null);
const guitars = ref([]);
const selectedGuitar = ref(null);
const chatMessages = ref([{ role: "assistant", content: "Welcome to the Guitar Store! How can I help you today?" }]);
const userInput = ref("");
const customerName = ref("");

// 連接到 MCP 服務器
async function connectToServer() {
    try {
        // 首先嘗試使用 StreamableHTTP 傳輸
        const newClient = new Client({
            name: "guitar-store-client",
            version: "1.0.0",
        });

        const baseUrl = new URL("http://localhost:8081/sse");

        try {
            // 先嘗試較新的 StreamableHTTP 傳輸
            const transport = new StreamableHTTPClientTransport(baseUrl);
            await newClient.connect(transport);
            console.log("Connected using Streamable HTTP transport");
        } catch (error) {
            // 如果失敗則嘗試較舊的 SSE 傳輸
            console.log("Streamable HTTP connection failed, falling back to SSE transport");
            const sseTransport = new SSEClientTransport(baseUrl);
            await newClient.connect(sseTransport);
            console.log("Connected using SSE transport");
        }

        client.value = newClient;
        connected.value = true;

        // 獲取吉他列表
        await fetchGuitars();
    } catch (error) {
        console.error("Failed to connect to MCP server:", error);
        alert("Connection failed: " + error.message);
    }
}

// 獲取吉他列表
async function fetchGuitars() {
    try {
        // 使用 getProducts 工具獲取吉他列表
        console.log("client", client.value);
        const result = await client.value.callTool({
            name: "getProducts",
            arguments: {},
        });

        if (result && result.content && result.content.length > 0) {
            const text = result.content[0].text;
            guitars.value = JSON.parse(text);
        }
    } catch (error) {
        console.error("Failed to fetch guitars:", error);
        chatMessages.value.push({
            role: "assistant",
            content: "Sorry, I had trouble retrieving the product list. Please try again.",
        });
    }
}

// 發送消息
async function sendMessage() {
    if (!userInput.value.trim()) return;

    // 添加用戶消息
    chatMessages.value.push({ role: "user", content: userInput.value });

    // 如果用戶提到名字，嘗試提取客戶名稱
    if (userInput.value.toLowerCase().includes("my name is") && !customerName.value) {
        const nameMatch = userInput.value.match(/my name is\s+([a-zA-Z\s]+)/i);
        if (nameMatch && nameMatch[1]) {
            customerName.value = nameMatch[1].trim();
        }
    }

    // 清空輸入
    const message = userInput.value;
    userInput.value = "";

    // 這裡實際上可以連接到 LLM，但為了示例，使用簡單回應
    try {
        if (message.toLowerCase().includes("inventory") || message.toLowerCase().includes("stock")) {
            await checkInventory();
        } else if (message.toLowerCase().includes("list") || message.toLowerCase().includes("show guitars")) {
            await fetchGuitars();
            chatMessages.value.push({
                role: "assistant",
                content: "Here are our available guitars. Let me know if you're interested in any of them!",
            });
        } else {
            // 默認回應
            chatMessages.value.push({
                role: "assistant",
                content:
                    "I can help you browse our guitars, check inventory, or place an order. What would you like to do?",
            });
        }
    } catch (error) {
        console.error("Error processing message:", error);
        chatMessages.value.push({
            role: "assistant",
            content: "Sorry, I encountered an error processing your request.",
        });
    }
}

// 查詢庫存
async function checkInventory() {
    try {
        // 使用 getInventory 工具獲取庫存信息
        const result = await client.value.callTool({
            name: "getInventory",
            arguments: {},
        });

        if (result && result.content && result.content.length > 0) {
            const text = result.content[0].text;
            const inventory = JSON.parse(text);

            let response = "Current inventory status:\n";
            inventory.forEach((item) => {
                const guitar = guitars.value.find((g) => g.id === item.guitarId);
                if (guitar) {
                    response += `- ${guitar.name}: ${item.quantity} in stock\n`;
                }
            });

            chatMessages.value.push({ role: "assistant", content: response });
        }
    } catch (error) {
        console.error("Failed to check inventory:", error);
        chatMessages.value.push({
            role: "assistant",
            content: "Sorry, I had trouble retrieving the inventory information.",
        });
    }
}

// 選擇吉他
function selectGuitar(guitar) {
    selectedGuitar.value = guitar;
}

// 購買吉他
async function purchaseGuitar(guitar) {
    if (!customerName.value) {
        chatMessages.value.push({
            role: "assistant",
            content: "Before we complete your purchase, may I have your name?",
        });
        return;
    }

    try {
        // 使用 purchase 工具購買吉他
        const result = await client.value.callTool({
            name: "purchase",
            arguments: {
                items: [{ guitarId: guitar.id, quantity: 1 }],
                customerName: customerName.value,
            },
        });

        if (result && result.content && result.content.length > 0) {
            const text = result.content[0].text;
            const orderInfo = JSON.parse(text);

            chatMessages.value.push({
                role: "assistant",
                content: `Thank you, ${customerName.value}! You've made a great choice with the ${guitar.name}. Your order will be processed soon and you'll be playing your new guitar in no time! Your order ID is: ${orderInfo.id}.`,
            });

            // 關閉詳情視圖
            selectedGuitar.value = null;
        }
    } catch (error) {
        console.error("Failed to purchase guitar:", error);
        chatMessages.value.push({
            role: "assistant",
            content: "Sorry, there was an error processing your purchase. Please try again.",
        });
    }
}

// 在組件掛載時嘗試連接
onMounted(() => {
    connectToServer();
});

// 在組件卸載時斷開連接
onUnmounted(() => {
    if (client.value) {
        try {
            client.value.close();
        } catch (error) {
            console.error("Error closing client:", error);
        }
    }
});
</script>

<style scoped>
.guitar-store {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
}

.connection-status {
    text-align: center;
    margin: 50px 0;
}

.store-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.chat-section {
    display: flex;
    flex-direction: column;
    height: 500px;
    border: 1px solid #ddd;
    border-radius: 8px;
}

.messages {
    flex: 1;
    overflow-y: auto;
    padding: 15px;
}

.message {
    margin-bottom: 10px;
    padding: 10px;
    border-radius: 8px;
}

.message.user {
    background-color: #e5f6ff;
    margin-left: 20%;
}

.message.assistant {
    background-color: #f0f0f0;
    margin-right: 20%;
}

.input-area {
    display: flex;
    padding: 10px;
    border-top: 1px solid #ddd;
}

.input-area textarea {
    flex: 1;
    min-height: 50px;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: none;
}

.input-area button {
    margin-left: 10px;
    padding: 8px 16px;
    background-color: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.guitars-section {
    overflow-y: auto;
    max-height: 500px;
}

.guitar-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
}

.guitar-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    transition: transform 0.2s;
}

.guitar-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.price {
    font-weight: bold;
    color: #e63946;
}

.guitar-detail {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    max-width: 500px;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
    z-index: 10;
}

.guitar-detail button {
    margin-right: 10px;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.guitar-detail button:first-of-type {
    background-color: #4caf50;
    color: white;
}

.guitar-detail button:last-of-type {
    background-color: #f0f0f0;
}

button {
    transition: background-color 0.3s;
}

button:hover {
    opacity: 0.9;
}
</style>
