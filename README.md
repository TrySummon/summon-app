<picture align="center">
  <source media="(prefers-color-scheme: light)" srcset="./images/logo-dark.svg">
  <source media="(prefers-color-scheme: dark)" srcset="./images/logo-light.svg">
  <img alt="Summon Logo" src="images/logo-dark.svg" width="80%">
</picture>

[![Latest Release](https://img.shields.io/github/v/release/TrySummon/summon-app?logo=github&color=brightgreen)](https://github.com/TrySummon/summon-app/releases)
[![License](https://img.shields.io/github/license/TrySummon/summon-app?color=blue)](https://github.com/TrySummon/summon-app/blob/main/LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/TrySummon/summon-app/build.yml?branch=main&logo=githubactions)](https://github.com/TrySummon/summon-app/actions/workflows/build.yml)
[![GitHub Stars](https://img.shields.io/github/stars/TrySummon/summon-app?logo=github&color=gold)](https://github.com/TrySummon/summon-app/stargazers)
[![Y Combinator S25](https://img.shields.io/badge/Y%20Combinator-S25-orange)](https://www.ycombinator.com/companies?batch=S25)

**Your All-in-One Desktop App for Designing, Building, and Testing Model Context Protocol (MCP) Servers & AI Agents.**

---

Summon streamlines the development workflow for AI agents using the Model Context Protocol (MCP). It empowers developers to:

* **Generate MCP servers** from one or more OpenAPI specifications.
* **Run and manage** these generated servers locally.
* **Connect to external MCP servers**.
* **Test and iterate** on tools within an interactive AI Playground, with the ability to **edit tool definitions on the fly**.

## ✨ Key Features

*   🚀 **OpenAPI to MCP Server Generation:**
    *   Import existing OpenAPI (v3) specifications.
    *   Visually select endpoints to include in your MCP server.
    *   Generate a complete, runnable Node.js MCP server project with a single click.
*   🧩 **Multi-API Composition:**
    *   Combine endpoints from multiple OpenAPI specifications into a single, cohesive MCP server.
    *   Easily manage authentication and server URLs for each integrated API.
*   💻 **Local MCP Server Management:**
    *   Start, stop, and restart your generated MCP servers directly from the Summon GUI.
    *   View server status, logs (soon!), and available tools.
*   🔗 **External MCP Integration:**
    *   Connect to any existing MCP server (local or remote) by configuring its URL or CLI command in `mcp.json`.
    *   Bring external tools into your Summon Playground.
*   🧪 **Interactive AI Playground:**
    *   Test your MCP tools in a chat-like interface with various AI models (OpenAI, Anthropic, Mistral, Azure OpenAI, etc.).
    *   Enable/disable specific tools from any connected MCP server for fine-grained testing.
*   ✏️ **Dynamic Tool Editing (Playground):**
    *   Modify tool names, descriptions, and even input schemas directly within the Playground.
    *   Test changes immediately without regenerating or restarting your MCP server.
    *   View a diff of your modifications against the original tool definition.
*   🔐 **Secure Credential Management:**
    *   Safely store API keys and tokens for AI providers and MCP-integrated APIs using system keychain services.

## 📺 Showcase

*(It would be great to add a GIF or a couple of screenshots here showing the main workflows, e.g., API import -> MCP build -> Playground testing)*

<p align="center">
  <em>(Imagine a GIF showcasing Summon in action here!)</em>
</p>

## 🚀 Getting Started

### 1. Download
Grab the latest release for your operating system from the [**GitHub Releases**](https://github.com/TrySummon/summon-app/releases) page.

### 2. Install
Follow the standard installation procedure for your OS:
*   **Windows:** Run the `.exe` installer.
*   **macOS:** Open the `.dmg` file and drag `Summon.app` to your Applications folder.
*   **Linux:** Use the `.AppImage` or `.deb` package.

### 3. Launch Summon
Open the application and you're ready to go!

## 🛠️ Usage Workflow

1.  **Import Your APIs:**
    *   Navigate to the "APIs" section in the sidebar.
    *   Click the "+" button or the "Upload OpenAPI spec" button.
    *   Select your OpenAPI v3 `json` or `yaml` file.
    *   Your API will appear in the list, allowing you to explore its endpoints.

2.  **Build an MCP Server (Optional - for local generation):**
    *   Navigate to "My MCPs" > "Create MCP" or the "Build an MCP Server" option on the Home page.
    *   Click "Pick Endpoints" and select an imported API.
    *   Choose the specific endpoints you want to include in your MCP server.
    *   Click "Update" and then "Create & Start Server".
    *   Configure the server name and authentication details for each API group.
    *   Summon will generate the server code and start it locally.

3.  **Connect to an External MCP Server (Optional):**
    *   Navigate to "External MCPs" > "Connect MCP" or the "Connect to an External MCP" option on the Home page.
    *   Click "Open mcp.json". This file is located in your user data directory.
    *   Add your external MCP server configurations to this file (see examples provided in the app). Summon will automatically detect changes and connect.

4.  **Configure AI Providers (for Playground):**
    *   Go to "Settings" (⚙️ icon in the sidebar).
    *   Under "AI Providers", configure credentials for services like OpenAI, Anthropic, etc. These are stored securely in your system's keychain.

5.  **Test in the Playground:**
    *   Navigate to the "Playground" (💻 icon).
    *   Select an AI model from the dropdown.
    *   Open the "Enabled Tools" sidebar (➡️ icon or click the "Tools" button).
    *   Enable the tools you want the AI to use from your local or external MCPs.
    *   Start chatting! You can edit tool definitions (name, description, schema) on the fly by clicking the pencil icon next to a tool in the sidebar.

## 💻 For Developers (Building from Source)

If you want to contribute or run Summon from source:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/TrySummon/summon-app.git
    cd summon-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm start
    ```

4.  **Build the application:**
    ```bash
    npm run make # For your current platform
    ```
    (See `package.json` for other build scripts.)

## 🏗️ Technology Stack

*   **Electron:** For cross-platform desktop application framework.
*   **Tailwind & shadcn:** For the user interface.
*   **TanStack Router & Query:** For routing and data fetching/caching.
*   **Zustand:** For global state management.
*   **Model Context Protocol SDK:** For MCP client/server interactions.
*   **AI SDK (Vercel AI SDK):** For LLM interactions in the Playground.

## 🗺️ Roadmap

We have exciting plans for Summon! Our collaborative roadmap, including upcoming features and long-term vision, can be found on our [website](https://www.trysummon.com/roadmap).

## ❤️ Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or code contributions, please feel free to:

1.  Check our [Contribution Guidelines](CONTRIBUTING.md).
2.  Open an issue on the [GitHub Issues page](https://github.com/TrySummon/summon-app/issues).
3.  Fork the repository and submit a pull request.

---

<p align="center">
  Made with ❤️ by the Summon Team
</p>