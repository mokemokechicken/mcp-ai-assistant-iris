# mcp-ai-assistant-iris

An MCP (Model Context Protocol) server that provides web search and code execution capabilities using OpenAI models. The `iris` tool supports model selection (gpt-5/o3) and optional code interpreter for data analysis.

**Version: 0.3.0**

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

### From GitHub Releases

Download the latest release from [GitHub Releases](https://github.com/mokemokechicken/mcp-ai-assistant-iris/releases):

#### Option 1: Using .dxt file (DXT package manager)
```bash
# Download and install the .dxt file using DXT
```

#### Option 2: Manual installation from .tgz file
```bash
# Download the .tgz file from releases
npm install -g ./mokemokechicken-mcp-ai-assistant-iris-*.tgz
```

## Features

- **Model Selection**: Choose between gpt-5 (default, cost-effective) and o3 (high-precision reasoning)
- **Web Search**: Advanced web search capabilities with configurable context size
- **Code Interpreter**: Optional code execution for data analysis and visualization
- **Flexible Configuration**: Customizable reasoning effort and search context
- **Error Handling**: Comprehensive error handling with detailed messages

## Usage

The `iris` tool accepts the following parameters:

### Basic Parameters
- `input` (required): Your question or search query
- `searchContextSize` (optional): Search context size - "low", "medium", or "high" (default: "medium")  
- `reasoningEffort` (optional): Reasoning effort level - "low", "medium", or "high" (default: "medium")

### New Parameters (v0.3.0)
- `model` (optional): AI model to use - "gpt-5" or "o3" (default: "gpt-5")
- `useCodeInterpreter` (optional): Enable code interpreter for data analysis (default: false)

### Usage Examples

#### Basic web search (default)
```
Use the iris tool to search for "latest developments in AI"
```

#### High-precision reasoning with o3 model
```
Use the iris tool with model="o3" to analyze complex mathematical problems
```

#### Data analysis with code interpreter
```
Use the iris tool with useCodeInterpreter=true to analyze CSV data and create visualizations
```

#### Advanced usage with all options
```
Use the iris tool with model="o3", useCodeInterpreter=true, searchContextSize="high", and reasoningEffort="high" to perform comprehensive data analysis on market trends
```


## Environment Variables

- `OPENAI_API_KEY`: Required OpenAI API key
- `SEARCH_CONTEXT_SIZE`: Optional default search context size (low/medium/high)
- `REASONING_EFFORT`: Optional default reasoning effort level (low/medium/high)

## Cost Optimization

- **gpt-5**: More cost-effective for general web search and analysis
- **o3**: Higher cost but provides superior reasoning for complex problems
- **Code Interpreter**: Additional $0.03 per session, automatically expires after 20 minutes of inactivity

Choose the model and features based on your specific use case to optimize costs.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.