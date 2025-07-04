export function buildReadmeCode(
  serviceName: string,
  categories: string[],
  connectionType: string,
): string {
  const documentation = `
# ${serviceName}

Protocol server built from API specification.

## Setup Instructions

1. Install required packages:
\`\`\`
npm install
\`\`\`

2. Launch the server:
\`\`\`
npm start
\`\`\`

## Environment Setup

Configure the server using environment variables. Refer to \`.env.example\` for available settings.

## API Access

${connectionType === "http" ? "API documentation is accessible at `/docs` when the server is active." : ""}

## Tool Categories

Configure available tools using the --tools parameter during startup.

Available categories:
${categories.map((category) => `\`${category}\``).join(", ")}

Permission levels:
- all
- create
- read
- update
- delete

`;
  return documentation;
}
