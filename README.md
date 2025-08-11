# mcp-ai-assistant-iris

An MCP (Model Context Protocol) server that provides web search and code execution capabilities using OpenAI models. The `iris` tool supports model selection (gpt-5/o3) and optional code interpreter for data analysis.

*Named after Iris, the Greek goddess of the rainbow and divine messenger, who swiftly carries information between gods and mortals.*

## Installation

### Using npx (Recommended)

Simply install and use the package from the official npm registry:

```bash
$ claude mcp add iris -s user \
	-e OPENAI_API_KEY=your-api-key \
	-- npx @mokemokechicken/mcp-ai-assistant-iris
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
- **Flexible Configuration**: Customizable reasoning effort and search context

## Usage

The `iris` tool accepts the following parameters:

### Parameters
- `input` (required): Your question or search query
- `searchContextSize` (optional): Search context size - "low", "medium", or "high" (default: "medium")  
- `reasoningEffort` (optional): Reasoning effort level - "low", "medium", or "high" (default: "medium")
- `model` (optional): AI model to use - "gpt-5" or "o3" (default: "gpt-5")
- `useCodeInterpreter` (optional): Enable code interpreter for data analysis (default: false)


## Environment Variables

- `OPENAI_API_KEY`: Required OpenAI API key

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.