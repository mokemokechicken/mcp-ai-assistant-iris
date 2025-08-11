#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import OpenAI from "openai";
import { z } from "zod";
import fetch, { Headers, Blob, FormData, File, Request, Response } from "node-fetch";

// Set up fetch and Web API polyfills for Node.js environment
if (!globalThis.fetch) {
  globalThis.fetch = fetch as any;
}
if (!globalThis.Headers) {
  globalThis.Headers = Headers as any;
}
if (!globalThis.Blob) {
  globalThis.Blob = Blob as any;
}
if (!globalThis.FormData) {
  globalThis.FormData = FormData as any;
}
if (!globalThis.File) {
  globalThis.File = File as any;
}
if (!globalThis.Request) {
  globalThis.Request = Request as any;
}
if (!globalThis.Response) {
  globalThis.Response = Response as any;
}
if (!globalThis.URL && typeof URL !== 'undefined') {
  globalThis.URL = URL;
}
if (!globalThis.URLSearchParams && typeof URLSearchParams !== 'undefined') {
  globalThis.URLSearchParams = URLSearchParams;
}

// Create server instance
const server = new McpServer({
  name: "mcp-ai-assistant-iris",
  version: "0.3.0",
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Task3: Model Selection Logic
function selectModel(modelParam?: string): string {
  if (modelParam && modelParam !== 'gpt-5' && modelParam !== 'o3') {
    throw new Error(`Invalid model: ${modelParam}. Supported models: gpt-5, o3`);
  }
  return modelParam === 'o3' ? 'o3' : 'gpt-5';
}

// Task4: Dynamic Tools Construction
function buildToolsArray(contextSize: string, useCodeInterpreter: boolean): any[] {
  const tools: any[] = [
    { type: 'web_search_preview', search_context_size: contextSize }
  ];
  
  if (useCodeInterpreter) {
    tools.push({
      type: 'code_interpreter',
      container: { type: 'auto' }
    });
  }
  
  return tools;
}

// Task7: Error Handling Enhancement
const errorHandling = {
  // 無効なモデル指定
  invalidModel: (model: string) => `Invalid model: ${model}. Supported models: gpt-5, o3`,
  
  // Code Interpreter エラー
  codeInterpreterError: (error: any) => `Code Interpreter error: ${error.message || error}`,
  
  // OpenAI API エラー
  apiError: (error: any) => `OpenAI API error: ${error.message || error}`,
  
  // 一般的なエラー
  generalError: (error: any) => `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`
};

// Task6: Response Processing Extension with Error Handling
function processOpenAIResponse(response: any): string {
  try {
    if (!response.output || !Array.isArray(response.output)) {
      return response.output_text || "No response available.";
    }

    const textParts: string[] = [];

    for (const outputItem of response.output) {
      try {
        if (outputItem.type === 'code_interpreter_call') {
          // Process code interpreter results
          if (outputItem.results && Array.isArray(outputItem.results)) {
            for (const result of outputItem.results) {
              try {
                if (result.type === 'logs' && result.logs) {
                  textParts.push(`Code Execution:\n${result.logs}`);
                } else if (result.type === 'error' && result.error) {
                  // Handle code interpreter execution errors
                  textParts.push(`Code Execution Error:\n${result.error}`);
                }
              } catch (resultError) {
                console.error("Error processing code interpreter result:", resultError);
                textParts.push("Error processing code execution result.");
              }
            }
          }
        } else if (outputItem.type === 'message') {
          // Process message content
          if (outputItem.content && Array.isArray(outputItem.content)) {
            for (const contentItem of outputItem.content) {
              try {
                if (contentItem.type === 'output_text' && contentItem.text) {
                  textParts.push(contentItem.text);
                }
              } catch (contentError) {
                console.error("Error processing message content:", contentError);
                textParts.push("Error processing message content.");
              }
            }
          }
        }
      } catch (outputError) {
        console.error("Error processing output item:", outputError);
        textParts.push("Error processing response item.");
      }
    }

    // Fall back to output_text if no parts were extracted
    if (textParts.length === 0) {
      return response.output_text || "No response available.";
    }

    return textParts.join('\n\n');
  } catch (error) {
    console.error("Error in processOpenAIResponse:", error);
    return response.output_text || "Error processing response.";
  }
}


// Define the iris tool
server.tool(
  "iris",
  `iris (v0.3.0): An AI agent with advanced web search and code execution capabilities. Supports model selection (gpt-5/o3) and optional code interpreter for data analysis. Useful for finding latest information, troubleshooting errors, and executing code. Supports natural language queries.`,
  { 
    input: z.string().describe('Ask questions, search for information, or consult about complex problems in English.'),
    searchContextSize: z.enum(['low', 'medium', 'high']).optional().describe('Search context size for web search (low/medium/high). Defaults to medium.'),
    reasoningEffort: z.enum(['low', 'medium', 'high']).optional().describe('Reasoning effort level (low/medium/high). Defaults to medium.'),
    model: z.enum(['gpt-5', 'o3']).optional().describe('AI model to use (gpt-5/o3). Defaults to gpt-5 (is better).'),
    useCodeInterpreter: z.boolean().optional().describe('Enable code interpreter for data analysis and code execution. Defaults to false.'),
  },
  async ({ input, searchContextSize: contextSize, reasoningEffort: effort, model, useCodeInterpreter }) => {
    const finalContextSize = contextSize || 'medium';
    const finalReasoningEffort = effort || 'medium';
    const finalUseCodeInterpreter = useCodeInterpreter || false;
    
    try {
      // Task3: Use dynamic model selection - may throw for invalid model
      const selectedModel = selectModel(model);
      
      // Task4: Use dynamic tools construction
      const dynamicTools = buildToolsArray(finalContextSize, finalUseCodeInterpreter);
      
      const response = await openai.responses.create({
        model: selectedModel,
        input,
        tools: dynamicTools,
        tool_choice: 'auto',
        parallel_tool_calls: true,
        reasoning: { effort: finalReasoningEffort },
      })

      // Task6: Use enhanced response processing
      const processedText = processOpenAIResponse(response);
      
      return {
        content: [
          {
            type: "text",
            text: processedText,
          },
        ],
      };
    } catch (error) {
      // Task7: Enhanced Error Handling
      let errorMessage: string;
      
      if (error instanceof Error) {
        // Check for specific error types based on error patterns
        if (error.message.includes('Invalid model:')) {
          // Invalid model error from selectModel function
          console.error("Model selection error:", error.message);
          errorMessage = error.message; // Already formatted by selectModel function
        } else if (error.message.includes('code_interpreter') || 
                   error.message.includes('Code Interpreter') ||
                   error.message.includes('container') ||
                   (error as any).type === 'code_interpreter_error') {
          // Code Interpreter specific error
          console.error("Code Interpreter error:", error);
          errorMessage = errorHandling.codeInterpreterError(error);
        } else if (error.name === 'OpenAIError' || 
                   error.name === 'APIError' ||
                   error.message.includes('OpenAI') || 
                   error.message.includes('API') ||
                   error.message.includes('status') ||
                   error.message.includes('rate limit')) {
          // OpenAI API specific error
          console.error("OpenAI API error:", error);
          errorMessage = errorHandling.apiError(error);
        } else {
          // General error
          console.error("General error:", error);
          errorMessage = errorHandling.generalError(error);
        }
      } else {
        // Unknown error type (not an Error instance)
        console.error("Unknown error type:", error);
        errorMessage = errorHandling.generalError(error);
      }
      
      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          },
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
