<div align="center">
    <picture>
    <source media="(prefers-color-scheme: light)" srcset="./images/logo-light.svg">
    <source media="(prefers-color-scheme: dark)" srcset="./images/logo-dark.svg">
    <img alt="Summon Logo" src="images/logo-dark.svg" width="200px">
    </picture>
</div>

<br>

[![Latest Release](https://img.shields.io/github/v/release/TrySummon/summon-app?logo=github&color=brightgreen)](https://github.com/TrySummon/summon-app/releases)
[![License](https://img.shields.io/github/license/TrySummon/summon-app?color=blue&v=1)](https://github.com/TrySummon/summon-app/blob/main/LICENSE)
[![Y Combinator S25](https://img.shields.io/badge/Y%20Combinator-S25-orange)](https://www.ycombinator.com/companies?batch=S25)

**The Collaborative Desktop App for Teams to Build, Test, and Manage MCP Servers & AI Agents.**

[Download the latest release](https://www.trysummon.com/downloads)

---

The main features of the Summon app are:

| Features | Description |
|----------|-------------|
| **OpenAPI to MCP Generation** | Import OpenAPI specs, visually select endpoints to include in your MCP server. Combine multiple APIs into a single, cohesive server. |
| **API Auth** | Configure authentication for real API calls or use mock servers to test your MCP tools without external dependencies. |
| **External MCP Support** | Connect to any existing MCP server (local or remote) via `mcp.json` configuration. Support for CLI-based servers with automatic tool discovery. |
| **AI Playground** | Test MCP tool calling in an interactive chat interface with multiple AI models including OpenAI, Anthropic and more. |
| **Live Tool Editing** | Modify tool names, descriptions, and input schemas on the fly without restarting servers. View diffs of your modifications in real-time. |
| **Datasets** | Create and manage test datasets with conversation scenarios, expected tool calls, and evaluation criteria. AI-assisted generation of test cases. |
| **Evals** | Run evaluations of your MCPs against dataset items. Track performance metrics and tool calling accuracy. |

## 📺 Showcase

https://github.com/user-attachments/assets/9f4dc327-7507-4f2e-9144-44f8cfb50961

## 🚀 Getting Started

### 1. Download
Grab the [latest release](https://www.trysummon.com/downloads) for your operating system.

### 2. Install
Follow the standard installation procedure for your OS:
*   **macOS:** Open the `.dmg` file and drag `Summon.app` to your Applications folder.
*   **Windows:** Run the `.exe` installer.
*   **Linux:** Use the `.rpm` or `.deb` package.

### 3. Launch Summon

> [!NOTE]
> **Keychain Access:** You may be prompted to grant keychain access when first using Summon. This is because Summon encrypts and stores API keys locally on your device using your system's secure keychain services. All credentials are stored locally and never sent to external servers.

Open the application and you're ready to go!

## 🗺️ Roadmap

We have exciting plans for Summon! Our collaborative roadmap, including upcoming features and long-term vision, can be found on our [website](https://www.trysummon.com/roadmap).

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
*   **Express:** For running local MCP servers and API mock servers.


## ❤️ Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or code contributions, please feel free to:

1.  Check our [Contribution Guidelines](CONTRIBUTING.md).
2.  Open an issue on the [GitHub Issues page](https://github.com/TrySummon/summon-app/issues).
3.  Fork the repository and submit a pull request.

---

<p align="center">
  Made with ❤️ by the Summon Team
</p>
