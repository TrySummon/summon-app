# AgentPort

**The Postman for AI Agents & MCP Servers**

AgentPort is an open-source, local-first desktop application that bridges the gap between your existing APIs and the AI ecosystem. Transform any OpenAPI specification into production-ready MCP (Model Context Protocol) servers and AI agents that work seamlessly with ChatGPT, GitHub Copilot, Google Gemini, and other AI clients.

![AgentPort Demo](https://img.shields.io/badge/Status-Open%20Source-brightgreen)
![License](https://img.shields.io/badge/License-Apache%202.0-blue)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

## 🚀 Why AgentPort?

The AI landscape is rapidly shifting toward interconnected agents, but connecting your existing APIs to this ecosystem is complex. AgentPort solves this by:

- **🔄 Automated Generation**: Transform OpenAPI specs into standards-compliant MCP servers in seconds
- **🛠️ Developer-First**: Local-first desktop app with secure credential management and intuitive debugging
- **🧪 Testing Made Easy**: Mock servers, playground environment, and real-time debugging tools
- **🔒 Security Built-In**: OS-level credential storage with support for API keys, OAuth 2.0, and more
- **🌐 Universal Compatibility**: Works with any MCP-compatible AI client

## ✨ Key Features

### 🎯 **MCP Generation & Management**
- **One-Click Generation**: Upload OpenAPI v3.x specs (YAML/JSON) and generate complete MCP servers
- **Tool Definition Editor**: Visual editor for modifying and optimizing tool definitions
- **Multi-API Support**: Combine multiple APIs into unified MCP servers
- **Standards Compliant**: Generated servers work across the entire AI ecosystem

### 🔌 **Flexible Connectivity**
- **Local MCPs**: Connect to stdio-based MCP servers for development
- **Remote MCPs**: HTTP/HTTPS support with full OAuth 2.0 flows
- **Mock Servers**: Instant local mocking based on OpenAPI examples
- **Real-time Debugging**: Observe raw input/output between AgentPort and MCPs

### 🎮 **Interactive Playground**
- **Multi-Provider Support**: Test with OpenAI, Anthropic, Google, Mistral, and more
- **Tool Selection**: Pick and choose which tools to enable for each session
- **Message History**: Full conversation history with undo/redo capabilities
- **Performance Metrics**: Track token usage, latency, and success rates

### 🔐 **Enterprise-Grade Security**
- **OS Keychain Integration**: Secure credential storage using your system's native keychain
- **Multiple Auth Methods**: API keys, Basic Auth, OAuth 2.0 Bearer tokens
- **Credential Management**: Visual interface for managing API credentials across projects
- **Local-First**: All data stays on your machine by default

## 🏗️ Architecture

AgentPort is built with modern technologies for performance and reliability:

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Backend**: Electron with Node.js
- **UI Components**: Radix UI + shadcn/ui
- **Code Editor**: CodeMirror 6 with syntax highlighting
- **MCP SDK**: Official Model Context Protocol SDK
- **AI Integration**: Vercel AI SDK with multi-provider support

## 🚀 Quick Start

### Installation

Download the latest release for your platform:

- **Windows**: `AgentPort-Setup-1.0.0.exe`
- **macOS**: `AgentPort-1.0.0.dmg`
- **Linux**: `AgentPort-1.0.0.AppImage`

### First Steps

1. **Import an API**: Upload your OpenAPI specification or start with our examples
2. **Generate MCP Server**: One-click generation of production-ready MCP servers
3. **Configure Credentials**: Securely store API keys and authentication details
4. **Test in Playground**: Use the built-in playground to test your tools with various AI providers
5. **Deploy**: Export your MCP server for production deployment

### Example Workflow

```bash
# 1. Import your OpenAPI spec
File → Import API → Select your openapi.yaml

# 2. Generate MCP server
APIs → [Your API] → Generate MCP Server

# 3. Configure authentication
MCPs → [Your MCP] → Configure → Add API Key

# 4. Test in playground
Playground → Select Tools → Start Conversation
```

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/agentport/agentport.git
cd agentport

# Install dependencies
npm install

# Start development server
npm run start

# Run tests
npm run test

# Build for production
npm run make
```

### Project Structure

```
src/
├── components/          # React components
│   ├── api-explorer/   # OpenAPI spec visualization
│   ├── mcp-builder/    # MCP server generation
│   ├── playground/     # AI testing environment
│   └── ui/             # Reusable UI components
├── helpers/            # Core business logic
│   ├── mcp/           # MCP server generation
│   ├── db/            # Local data management
│   └── ipc/           # Electron IPC handlers
├── pages/             # Application pages
└── types/             # TypeScript definitions
```

## 🌟 Use Cases

### **API Providers**
Make your APIs instantly accessible to AI agents and applications:
- Generate MCP servers for your REST APIs
- Enable AI-powered integrations for your customers
- Provide AI-native interfaces alongside traditional SDKs

### **Developers & Teams**
Streamline AI agent development and testing:
- Rapid prototyping of AI-powered applications
- Testing and debugging MCP integrations
- Local development with mock servers

### **Enterprises**
Secure, compliant AI integrations:
- Local-first approach for sensitive data
- Comprehensive audit trails and logging
- Integration with existing authentication systems

## 🗺️ Roadmap

### Open Source (Available Now)
- ✅ OpenAPI to MCP generation
- ✅ Local mock servers
- ✅ Multi-provider AI playground
- ✅ Secure credential management
- ✅ Real-time debugging tools

### Enterprise Features (Coming Soon)
- 🔄 Continuous optimization with AI
- 📊 Advanced observability and analytics
- 👥 Team collaboration and sharing
- 🔄 GitHub integration and CI/CD
- ☁️ Cloud hosting and deployment
- 📈 Performance monitoring and alerts

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.agentport.dev](https://docs.agentport.dev)
- **Community**: [GitHub Discussions](https://github.com/agentport/agentport/discussions)
- **Issues**: [GitHub Issues](https://github.com/agentport/agentport/issues)
- **Enterprise**: [Contact Sales](mailto:enterprise@agentport.dev)

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for the Model Context Protocol specification
- [Vercel](https://vercel.com) for the AI SDK
- [Electron](https://electronjs.org) for the desktop framework
- The open-source community for countless contributions

---

**Ready to connect your APIs to the AI ecosystem?** [Download AgentPort](https://github.com/agentport/agentport/releases) and start building AI-powered integrations in minutes.
