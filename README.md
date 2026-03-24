# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

## MCP Server

This project includes a backend server (`mcp-server`) that uses Google's Gemini LLM to convert natural language queries into SQL, executes them against a Superset instance, and returns the data to the frontend.

### Setup and Running the MCP Server

1.  **Navigate to the server directory:**
    ```bash
    cd 'mcp-server'
    ```

2.  **Install dependencies:**
    Make sure to run this after the recent changes to update the packages.
    ```bash
    npm install
    ```

3.  **Configure your environment variables:**
    Create a `.env` file inside the `mcp-server` directory. You will need to add your actual credentials for Gemini and Superset.
    ```
    # Gemini
    GEMINI_API_KEY="your-gemini-api-key"

    # Superset
    SUPERSET_URL="http://localhost:8088"
    SUPERSET_USERNAME="admin"
    SUPERSET_PASSWORD="admin"
    SUPERSET_DATABASE_ID=1
    ```

4.  **Start the server:**
    ```bash
    node server.js
    ```
    The server will start on `http://localhost:3000`.

### Frontend Integration

The frontend connects to the `mcp-server` through the `askAI` function located in `src/services/api.js`. You can import and use this function within your Vue components to send queries and receive data for charting.
