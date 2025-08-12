# Conversation Continuity Feature - 設計書

## 1. 概要

OpenAI Responses APIの `previous_response_id` 機能を利用した会話継続機能の技術設計。

## 2. アーキテクチャ設計

### 2.1 全体フロー

```
1. MCPクライアント → iris tool (previous_response_id含む)
2. iris tool → OpenAI API (previous_response_idを渡す)
3. OpenAI API → iris tool (response含む)
4. iris tool → レスポンス処理 (response.id抽出)
5. iris tool → MCPクライアント (text + structuredContentでresponse_id返却)
```

### 2.2 データフロー

```typescript
// 入力
{
  input: string,
  previous_response_id?: string  // 新規
  // ... 既存パラメータ
}

// OpenAI API呼び出し
{
  model: string,
  input: string,
  previous_response_id?: string,  // 条件付きで追加
  tools: array,
  // ... その他パラメータ
}

// OpenAI レスポンス
{
  id: string,  // 抽出対象
  output: array,
  // ... その他フィールド
}

// MCP レスポンス
{
  content: [
    {
      type: "text",
      text: "回答内容...\n\n[Response ID: resp_xxx]"
    }
  ],
  structuredContent: {
    response_id: "resp_xxx"
  }
}
```

## 3. 実装設計

### 3.1 MCPツール引数の拡張

**場所**: `src/index.ts:153-159`

**現在**:
```typescript
{
  input: z.string().describe('...'),
  searchContextSize: z.enum(['low', 'medium', 'high']).optional().describe('...'),
  reasoningEffort: z.enum(['low', 'medium', 'high']).optional().describe('...'),
  model: z.enum(['gpt-5', 'o3']).optional().describe('...'),
  useCodeInterpreter: z.boolean().optional().describe('...'),
}
```

**修正後**:
```typescript
{
  input: z.string().describe('...'),
  searchContextSize: z.enum(['low', 'medium', 'high']).optional().describe('...'),
  reasoningEffort: z.enum(['low', 'medium', 'high']).optional().describe('...'),
  model: z.enum(['gpt-5', 'o3']).optional().describe('...'),
  useCodeInterpreter: z.boolean().optional().describe('...'),
  previous_response_id: z.string().optional().describe(
    'Previous OpenAI response ID for conversation continuity. ' +
    'Valid for 30 days from creation. Enables context preservation ' +
    'across multiple tool calls. Use the Response ID from previous iris tool response.'
  ),
}
```

### 3.2 OpenAI API呼び出しの修正

**場所**: `src/index.ts:172-179`

**現在**:
```typescript
const response = await openai.responses.create({
  model: selectedModel,
  input,
  tools: dynamicTools,
  tool_choice: 'auto',
  parallel_tool_calls: true,
  reasoning: { effort: finalReasoningEffort },
})
```

**修正後**:
```typescript
const apiRequest = {
  model: selectedModel,
  input,
  tools: dynamicTools,
  tool_choice: 'auto',
  parallel_tool_calls: true,
  reasoning: { effort: finalReasoningEffort },
};

// previous_response_id が指定されている場合のみ追加
if (previous_response_id) {
  apiRequest.previous_response_id = previous_response_id;
}

const response = await openai.responses.create(apiRequest);
```

### 3.3 レスポンス処理の拡張

**場所**: `src/index.ts:88-146` の `processOpenAIResponse` 関数

**新しい関数**: `processOpenAIResponseWithId`

```typescript
function processOpenAIResponseWithId(response: any): {
  text: string;
  response_id?: string;
} {
  try {
    // 既存のテキスト処理
    const processedText = processOpenAIResponse(response);
    
    // response.id を抽出
    const responseId = response.id;
    
    // テキストにResponse IDを追加
    const textWithId = responseId 
      ? `${processedText}\n\n[Response ID: ${responseId}]`
      : processedText;
    
    return {
      text: textWithId,
      response_id: responseId
    };
  } catch (error) {
    console.error("Error in processOpenAIResponseWithId:", error);
    return {
      text: response.output_text || "Error processing response."
    };
  }
}
```

### 3.4 ツールレスポンスの修正

**場所**: `src/index.ts:184-191`

**現在**:
```typescript
return {
  content: [
    {
      type: "text",
      text: processedText,
    },
  ],
};
```

**修正後**:
```typescript
const { text, response_id } = processOpenAIResponseWithId(response);

const result = {
  content: [
    {
      type: "text",
      text: text,
    },
  ],
};

// structuredContent を追加（response_id が存在する場合）
if (response_id) {
  result.structuredContent = {
    response_id: response_id
  };
}

return result;
```

### 3.5 エラーハンドリングの拡張

**場所**: `src/index.ts:192-237` のcatchブロック

**追加するエラータイプ**:

```typescript
// previous_response_id 関連エラー
invalidResponseId: (id: string) => 
  `Invalid or expired previous_response_id: ${id}. Response IDs are valid for 30 days.`,

responseIdNotFound: (id: string) => 
  `Previous response not found: ${id}. The response may have expired (30 day limit) or never existed.`,
```

**エラー判定ロジック**:

```typescript
} else if (error.message.includes('previous_response_id') || 
           error.message.includes('response not found') ||
           error.message.includes('invalid response') ||
           (error as any).code === 'invalid_response_id') {
  // previous_response_id 関連エラー
  console.error("Previous response ID error:", error);
  errorMessage = errorHandling.invalidResponseId(previous_response_id || 'unknown');
```

## 4. データ構造設計

### 4.1 型定義の追加

```typescript
interface ProcessedResponse {
  text: string;
  response_id?: string;
}

interface IrisToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  structuredContent?: {
    response_id: string;
  };
}
```

### 4.2 OpenAI API Request 型

```typescript
interface OpenAIRequestParams {
  model: string;
  input: string;
  tools: any[];
  tool_choice: string;
  parallel_tool_calls: boolean;
  reasoning: { effort: string };
  previous_response_id?: string;  // 新規追加
}
```

## 5. テスト設計

### 5.1 単体テストケース

1. **previous_response_id なし**: 既存動作の確認
2. **previous_response_id あり**: API呼び出しにパラメータが含まれることを確認
3. **response_id 抽出**: レスポンスからIDが正しく抽出されることを確認
4. **テキスト追加**: `[Response ID: xxx]` が正しく追加されることを確認
5. **structuredContent**: response_idが正しく含まれることを確認

### 5.2 統合テストケース

1. **会話継続**: 1回目の呼び出し → response_id取得 → 2回目で継続
2. **無効ID**: 存在しないIDでのエラーハンドリング
3. **期限切れID**: 30日経過後のエラーハンドリング

### 5.3 エラーケーステスト

1. **不正なprevious_response_id**
2. **OpenAI APIエラー**
3. **response.id が存在しない場合**

## 6. パフォーマンス考慮事項

### 6.1 最適化ポイント

- `previous_response_id` のバリデーションは最小限に留める
- レスポンス処理のオーバーヘッドを最小化
- エラーハンドリングの効率化

### 6.2 メモリ使用量

- 追加メモリ使用量: 微量（response_id文字列のみ）
- 既存処理への影響: なし

## 7. セキュリティ考慮事項

### 7.1 入力検証

- `previous_response_id` の形式検証（OpenAI ID形式）
- インジェクション攻撃の防止

### 7.2 情報漏洩防止

- response_id の適切な取り扱い
- エラーメッセージでの機密情報漏洩防止

## 8. 互換性

### 8.1 下位互換性

- 既存のprevious_response_id なしの呼び出しは完全に互換
- 既存のレスポンス処理は影響なし

### 8.2 上位互換性

- 将来のOpenAI API変更に対応可能な設計
- MCPクライアントの対応状況に依存しない実装

## 9. 実装順序

1. **フェーズ1**: ツール引数の拡張
2. **フェーズ2**: OpenAI API呼び出しの修正
3. **フェーズ3**: レスポンス処理の拡張
4. **フェーズ4**: エラーハンドリングの強化
5. **フェーズ5**: テストとバージョン更新