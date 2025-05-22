
export function generateReadme(
  serverName: string,
  tags: string[],
  transport: string
): string {
  const readmeContent = `
# ${serverName}

API server generated from OpenAPI specification.

## Getting Started

1. Install dependencies:
\`\`\`
npm install
\`\`\`

2. Start the server:
\`\`\`
npm start
\`\`\`

## Configuration

The server can be configured using environment variables. See the \`.env.example\` file for available options.

## API Documentation

${transport === "web" ? "The API documentation is available at `/docs` when the server is running." : ""}

## Tool Scopes

You can configure which tools are exposed by the MCP server by using the --tools option at start time.

Available scopes:
${tags.map((tag) => `\`${tag}\``).join(", ")}

Available permissions:
- all
- create
- read
- update
- delete

`;
  return readmeContent;
}
