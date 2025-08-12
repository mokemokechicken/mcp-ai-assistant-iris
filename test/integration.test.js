import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .envファイルから環境変数を読み込み
config({ path: join(__dirname, '..', '.env') });

class MCPIntegrationTest {
  constructor() {
    this.serverProcess = null;
    this.messageId = 0;
  }

  async runTest() {
    console.log('🚀 Starting MCP Integration Test...\n');

    try {
      // 1. 環境変数の確認
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not found in environment variables or .env file');
      }
      console.log('✅ OPENAI_API_KEY found');

      // 2. MCPサーバーの起動
      await this.startMCPServer();
      console.log('✅ MCP Server started');

      // 3. 初期化メッセージの送信
      await this.initializeServer();
      console.log('✅ Server initialized');

      // 4. ツール一覧の取得
      const tools = await this.listTools();
      console.log('✅ Tools listed:', tools.map(t => t.name));

      // 5. 天気予報のテスト実行
      console.log('\n🌤️  Testing weather query...');
      const result1 = await this.testWeatherQuery();
      console.log('✅ Weather query completed');
      console.log('📋 Result:', JSON.stringify(result1, null, 2));

      // 6. Response IDの抽出とテスト
      const responseId = this.extractResponseId(result1);
      if (responseId) {
        console.log(`\n🔗 Found Response ID: ${responseId}`);
        
        // 7. 会話継続テスト
        console.log('\n🔄 Testing conversation continuity...');
        const result2 = await this.testConversationContinuity(responseId);
        console.log('✅ Conversation continuity test completed');
        console.log('📋 Continuation Result:', JSON.stringify(result2, null, 2));
      } else {
        console.log('\n⚠️  Warning: No Response ID found in response');
      }

      console.log('\n🎉 Integration test completed successfully!');
      return true;

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      console.error('Stack:', error.stack);
      return false;
    } finally {
      if (this.serverProcess) {
        this.serverProcess.kill();
        console.log('🔄 Server process terminated');
      }
    }
  }

  startMCPServer() {
    return new Promise((resolve, reject) => {
      const serverPath = join(__dirname, '..', 'server', 'index.js');
      
      this.serverProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error('Server stderr:', data.toString());
      });

      this.serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start server: ${error.message}`));
      });

      // サーバーが起動するまで少し待つ
      setTimeout(() => {
        if (this.serverProcess.pid) {
          resolve();
        } else {
          reject(new Error('Server failed to start'));
        }
      }, 1000);
    });
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      const messageStr = JSON.stringify(message) + '\n';
      
      let responseData = '';
      const onData = (data) => {
        responseData += data.toString();
        
        // JSONメッセージの終了を検出
        const lines = responseData.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              this.serverProcess.stdout.removeListener('data', onData);
              resolve(response);
              return;
            } catch (e) {
              // まだ完全なJSONではない場合は続行
            }
          }
        }
      };

      this.serverProcess.stdout.on('data', onData);
      
      // タイムアウト設定（conversation continuityは時間がかかる場合があるので延長）
      setTimeout(() => {
        this.serverProcess.stdout.removeListener('data', onData);
        reject(new Error(`Message timeout for message: ${JSON.stringify(message, null, 2)}`));
      }, 60000 * 3);

      this.serverProcess.stdin.write(messageStr);
    });
  }

  async initializeServer() {
    const initMessage = {
      jsonrpc: '2.0',
      id: ++this.messageId,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'integration-test',
          version: '1.0.0'
        }
      }
    };

    const response = await this.sendMessage(initMessage);
    if (response.error) {
      throw new Error(`Initialization failed: ${JSON.stringify(response.error)}`);
    }

    // initialized通知を送信
    const initializedMessage = {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {}
    };

    this.serverProcess.stdin.write(JSON.stringify(initializedMessage) + '\n');
  }

  async listTools() {
    const listMessage = {
      jsonrpc: '2.0',
      id: ++this.messageId,
      method: 'tools/list',
      params: {}
    };

    const response = await this.sendMessage(listMessage);
    if (response.error) {
      throw new Error(`Tool listing failed: ${JSON.stringify(response.error)}`);
    }

    return response.result.tools || [];
  }

  async testWeatherQuery() {
    const callMessage = {
      jsonrpc: '2.0',
      id: ++this.messageId,
      method: 'tools/call',
      params: {
        name: 'iris',
        arguments: {
          input: 'What is the current weather in New York City?',
          searchContextSize: 'low',
          reasoningEffort: 'low',
          model: 'gpt-5'
        }
      }
    };

    const response = await this.sendMessage(callMessage);
    if (response.error) {
      throw new Error(`Tool call failed: ${JSON.stringify(response.error)}`);
    }

    // レスポンスが成功であることを確認
    if (!response.result || !response.result.content) {
      throw new Error('Invalid response structure');
    }

    return response.result;
  }

  extractResponseId(result) {
    try {
      // structuredContentからresponse_idを取得
      if (result.structuredContent && result.structuredContent.response_id) {
        return result.structuredContent.response_id;
      }

      // テキストから[Response ID: xxx]パターンを抽出
      if (result.content && result.content[0] && result.content[0].text) {
        const text = result.content[0].text;
        const match = text.match(/\[Response ID: ([^\]]+)\]/);
        if (match) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting response ID:', error);
      return null;
    }
  }

  async testConversationContinuity(previousResponseId) {
    console.log(`📤 Sending conversation continuity request with Response ID: ${previousResponseId}`);
    
    const callMessage = {
      jsonrpc: '2.0',
      id: ++this.messageId,
      method: 'tools/call',
      params: {
        name: 'iris',
        arguments: {
          input: 'Based on our previous conversation, can you pick up all numbers and sum up them in your response?',
          searchContextSize: 'low',
          reasoningEffort: 'low',
          model: 'gpt-5',
          previous_response_id: previousResponseId
        }
      }
    };

    try {
      const response = await this.sendMessage(callMessage);
      if (response.error) {
        throw new Error(`Conversation continuity test failed: ${JSON.stringify(response.error)}`);
      }

      // レスポンスが成功であることを確認
      if (!response.result || !response.result.content) {
        throw new Error('Invalid response structure in continuation test');
      }

      return response.result;
    } catch (error) {
      console.error('🔴 Conversation continuity test error:', error.message);
      throw error;
    }
  }
}

// テスト実行
const test = new MCPIntegrationTest();
test.runTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });