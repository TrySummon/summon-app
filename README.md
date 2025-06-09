<div align="center">
<picture>
  <source media="(prefers-color-scheme: light)" srcset="./images/logo-light.svg">
  <source media="(prefers-color-scheme: dark)" srcset="./images/logo-dark.svg">
  <img alt="Summon Logo" src="images/logo-dark.svg" width="200px">
</picture>
</div>

<br>

[![Latest Release](https://img.shields.io/github/v/release/TrySummon/summon-app?logo=github&color=brightgreen)](https://github.com/TrySummon/summon-app/releases)
[![License](https://img.shields.io/github/license/TrySummon/summon-app?color=blue)](https://github.com/TrySummon/summon-app/blob/main/LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/TrySummon/summon-app/build.yml?branch=main&logo=githubactions)](https://github.com/TrySummon/summon-app/actions/workflows/build.yml)
[![GitHub Stars](https://img.shields.io/github/stars/TrySummon/summon-app?logo=github&color=gold)](https://github.com/TrySummon/summon-app/stargazers)
[![Y Combinator S25](https://img.shields.io/badge/Y%20Combinator-S25-orange)](https://www.ycombinator.com/companies?batch=S25)

**Your All-in-One Desktop App for Designing, Building, and Testing Model Context Protocol (MCP) Servers & AI Agents.**

---

The main Summon features are:

| Features | Description |
|----------|-------------|
| **OpenAPI Integration** | Import OpenAPI (v3) specifications and visually select endpoints to include in your MCP server. Combine multiple APIs into a single, cohesive server. |
| **MCP Server Generation** | Generate complete, runnable Node.js MCP server projects with one click. Configure authentication and manage servers directly from the GUI. |
| **External MCP Support** | Connect to any existing MCP server (local or remote) via `mcp.json` configuration. Support for CLI-based servers with automatic tool discovery. |
| **AI Playground** | Test MCP tools in an interactive chat interface with multiple AI models including OpenAI, Anthropic, Mistral, and Azure OpenAI. |
| **Live Tool Editing** | Modify tool names, descriptions, and input schemas on the fly without restarting servers. View diffs of your modifications in real-time. |
| **Secure Credentials** | Store API keys and tokens safely using system keychain services. All credentials managed locally with secure authentication for AI providers and APIs. |

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