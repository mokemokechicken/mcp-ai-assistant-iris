# mcp-ai-assistant-iris

An MCP (Model Context Protocol) server that provides web search and code execution capabilities using OpenAI models. The `iris` tool supports model selection (gpt-5/o3) and optional code interpreter for data analysis.

*Named after Iris, the Greek goddess of the rainbow and divine messenger, who swiftly carries information between gods and mortals.*

## Installation

### Using npx (Recommended)

Simply install and use the package from the official npm registry:

```bash
claude mcp add iris -s user -e OPENAI_API_KEY=your-api-key -- npx @mokemokechicken/mcp-ai-assistant-iris
```

Or configure manually in Claude:

```json
{
  "mcpServers": {
    "iris": {
      "command": "npx",
      "args": ["@mokemokechicken/mcp-ai-assistant-iris"],
      "env": {
        "OPENAI_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Features

- **Model Selection**: Choose between gpt-5 (default) and o3.
- **Web Search**: Advanced web search capabilities with configurable context size
- **Code Interpreter**: Optional code execution for data analysis and visualization
- **Conversation Continuity**: Continue previous conversations using response IDs
- **Flexible Configuration**: Customizable reasoning effort and search context

## Usage

The `iris` tool accepts the following parameters:

### Parameters
- `input` (required): Your question or search query
- `searchContextSize` (optional): Search context size - "low", "medium", or "high" (default: "medium")  
- `reasoningEffort` (optional): Reasoning effort level - "low", "medium", or "high" (default: "medium")
- `model` (optional): AI model to use - "gpt-5" or "o3" (default: "gpt-5")
- `useCodeInterpreter` (optional): Enable code interpreter for data analysis (default: false)
- `previous_response_id` (optional): Previous OpenAI response ID for conversation continuity

### Conversation Continuity

The `iris` tool supports conversation continuity through the `previous_response_id` parameter. This allows you to maintain context across multiple tool calls by referencing a previous response.

#### How it works:
1. Each `iris` tool response includes a Response ID in the format: `[Response ID: resp_abc123xyz]`
2. Use this Response ID as the `previous_response_id` parameter in subsequent calls
3. The AI will automatically continue the conversation with full context

#### Response Format:
When you call the `iris` tool, the response will include:
- The main response content
- A Response ID at the end in the format: `[Response ID: {response_id}]`

#### Usage Example:
```
First call:
- input: "Tell me about machine learning"
- Response: "Machine learning is... [Response ID: resp_abc123xyz]"

Second call (continuing the conversation):
- input: "Can you give me some practical examples?"
- previous_response_id: "resp_abc123xyz"
- Response: "Based on our previous discussion about machine learning... [Response ID: resp_def456uvw]"
```

#### Important Notes:
- **Validity Period**: Response IDs are valid for 30 days from creation
- **Context Inheritance**: Previous conversation history, tool calls, and reasoning are preserved
- **Cost Impact**: Previous conversation tokens are included in the input token count
- **Instructions**: System instructions are not automatically inherited and must be specified each time


## Environment Variables

- `OPENAI_API_KEY`: Required OpenAI API key

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.