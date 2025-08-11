# 統合テスト

このディレクトリにはMCPサーバーの統合テストが含まれています。

## テスト内容

`integration.test.js` は以下のシナリオをテストします：

1. **環境変数の確認** - `.env`ファイルから`OPENAI_API_KEY`を読み込み
2. **MCPサーバーの起動** - stdio経由でサーバーを起動
3. **MCP プロトコルの初期化** - サーバーとの通信を確立
4. **ツールの確認** - `iris`ツールが利用可能であることを確認
5. **天気予報クエリのテスト** - 「What is the current weather in New York City?」を英語で質問
6. **レスポンスの検証** - エラーではない応答が返ることを確認

## セットアップ

### 1. 環境変数の設定

`.env`ファイルを作成してOpenAI APIキーを設定：

```bash
cp .env.example .env
# .envファイルを編集してOPENAI_API_KEYを設定
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. プロジェクトのビルド

```bash
npm run build
```

## テストの実行

```bash
npm run test:integration
```

## テスト結果の例

成功時の出力：
```
🚀 Starting MCP Integration Test...

✅ OPENAI_API_KEY found
✅ MCP Server started
✅ Server initialized
✅ Tools listed: [ 'iris' ]

🌤️  Testing weather query...
✅ Weather query completed
📋 Result: {
  "content": [
    {
      "type": "text",
      "text": "Based on current weather information..."
    }
  ],
  "isError": false
}

🎉 Integration test completed successfully!
```

## 技術詳細

- **通信方式**: stdio (標準入出力) を使用したJSON-RPC 2.0
- **プロトコル**: MCP (Model Context Protocol) 2024-11-05
- **テストタイムアウト**: メッセージごとに30秒
- **環境変数**: `dotenv`パッケージで`.env`から読み込み

## トラブルシューティング

- **OPENAI_API_KEY not found**: `.env`ファイルが存在し、正しいAPIキーが設定されていることを確認
- **Server failed to start**: `npm run build`でプロジェクトをビルドしていることを確認
- **Message timeout**: ネットワーク接続やOpenAI APIの応答時間を確認