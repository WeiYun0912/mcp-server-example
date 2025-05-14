# Vue3 MCP Guitar Store Client

這是一個使用 Vue3 和 Model Context Protocol (MCP) 開發的吉他商店客戶端應用。該應用可以與 MCP 服務器通信，展示吉他列表，查詢庫存，並處理購買流程。

## 功能

-   連接到 MCP 服務器
-   顯示吉他產品列表
-   查詢庫存信息
-   處理購買流程
-   與 AI 助手對話

## 安裝

```bash
# 安裝依賴
npm install
```

## 運行

```bash
# 開發模式運行
npm run dev
```

## 構建

```bash
# 構建生產版本
npm run build
```

## 配置

應用默認連接到 `http://localhost:8081/sse` 的 MCP 服務器。要修改此地址，請編輯 `src/components/GuitarStore.vue` 文件中的 `baseUrl` 變量。

## 使用 MCP 工具

此應用使用以下 MCP 工具：

-   `getProducts` - 獲取吉他列表
-   `getInventory` - 獲取庫存信息
-   `purchase` - 處理購買請求

## 與 MCP 服務器集成

該應用首先嘗試使用較新的 StreamableHTTP 傳輸協議連接到 MCP 服務器，如果失敗則回退到使用 SSE 傳輸。

```javascript
async function connectToServer() {
    try {
        const newClient = new Client({
            name: "guitar-store-client",
            version: "1.0.0",
        });

        const baseUrl = new URL("http://localhost:8081/sse");

        try {
            // 先嘗試較新的 StreamableHTTP 傳輸
            const transport = new StreamableHTTPClientTransport(baseUrl);
            await newClient.connect(transport);
        } catch (error) {
            // 如果失敗則嘗試較舊的 SSE 傳輸
            const sseTransport = new SSEClientTransport(baseUrl);
            await newClient.connect(sseTransport);
        }

        client.value = newClient;
        // ...
    } catch (error) {
        // 錯誤處理
    }
}
```
