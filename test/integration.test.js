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
      const result = await this.testWeatherQuery();
      console.log('✅ Weather query completed');
      console.log('📋 Result:', JSON.stringify(result, null, 2));

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
      
      // タイムアウト設定
      setTimeout(() => {
        this.serverProcess.stdout.removeListener('data', onData);
        reject(new Error('Message timeout'));
      }, 30000);

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
          searchContextSize: 'medium',
          reasoningEffort: 'medium',
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