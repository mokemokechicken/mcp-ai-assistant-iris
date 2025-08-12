# Conversation Continuity Feature - 要件定義書

## 1. 概要

OpenAI Responses APIの `previous_response_id` 機能を利用して、MCPツール「iris」に会話継続機能を追加する。

## 2. 機能要件

### 2.1 基本機能
- **MCPツール引数の拡張**
  - `previous_response_id` パラメータを optional として追加
  - 型: `string | undefined`
  - 前回のレスポンスIDを指定することで会話を継続

- **OpenAI API連携**
  - `previous_response_id` が指定された場合、OpenAI `responses.create()` APIに渡す
  - 会話の文脈を自動で引き継ぎ

- **レスポンス拡張**
  - OpenAIからのレスポンスに含まれる `response.id` を抽出
  - MCPツールの戻り値に `response_id` フィールドを追加
  - 次回の会話継続で使用可能にする

### 2.2 会話継続の仕様
- **引き継がれるもの**
  - 会話履歴（ユーザー/アシスタントのメッセージ）
  - ツール呼び出しとその結果
  - 推論アイテム（reasoning items）

- **引き継がれないもの**
  - instructions（システム/開発者メッセージ）
  - 毎回明示的に指定が必要

### 2.3 有効期間と制約
- **有効期間**: 30日間（OpenAI APIの仕様）
- **保存設定**: `store: true` がデフォルト
- **コスト影響**: 過去のトークンも入力トークンとして課金対象

## 3. 非機能要件

### 3.1 エラーハンドリング
- **無効な previous_response_id**
  - 存在しないIDが指定された場合の適切なエラーメッセージ
- **有効期限切れ**
  - 30日を超過したIDが指定された場合のエラーハンドリング
- **API エラー**
  - OpenAI API側のエラーの適切な処理と報告

### 3.2 ベストプラクティス対応
- 長い会話での `truncation: "auto"` 設定を推奨
- パフォーマンスとコスト最適化のガイダンス提供

### 3.3 バージョン管理
- 機能追加のため 0.3.0 → 0.4.0 にバージョンアップ
- `src/index.ts`, `package.json`, `CLAUDE.md` の同期更新

## 4. ユーザーインターフェース

### 4.1 ツール引数
```typescript
{
  input: string,
  searchContextSize?: 'low' | 'medium' | 'high',
  reasoningEffort?: 'low' | 'medium' | 'high', 
  model?: 'gpt-5' | 'o3',
  useCodeInterpreter?: boolean,
  previous_response_id?: string  // 新規追加
}
```

### 4.2 レスポンス形式

**AIが認識可能な形式（推奨）**
```typescript
{
  content: [
    {
      type: "text",
      text: "検索結果をお答えします...\n\n[Response ID: resp_abc123xyz]"  // text内に明示
    }
  ],
  structuredContent?: {
    response_id: string  // 機械可読形式
  }
}
```

**実装方針**
- `content.text` の末尾に `[Response ID: {response_id}]` を追加してAIが認識可能にする
- `structuredContent` にも同じ `response_id` を含めて機械可読性を確保
- AIは自然にResponse IDを認識し、次回の会話で `previous_response_id` として使用できる

## 5. 受け入れ基準

- [ ] `previous_response_id` パラメータが正しくOpenAI APIに渡される
- [ ] 会話の文脈が適切に継続される
- [ ] レスポンスのtext内に `[Response ID: xxx]` 形式でIDが含まれる
- [ ] `structuredContent` にもresponse_idが含まれる
- [ ] AIが自然にResponse IDを認識できる
- [ ] 無効なIDに対して適切なエラーメッセージが表示される
- [ ] 有効期限切れIDに対して適切なエラーメッセージが表示される
- [ ] バージョンが0.4.0に更新される
- [ ] 既存機能に影響を与えない
- [ ] 統合テストがパスする

## 6. 制約事項

- OpenAI APIの仕様に依存するため、API側の変更影響を受ける可能性
- 30日間の有効期限は変更不可
- instructionsの自動継承は不可（OpenAI API仕様）

## 7. リスク

- **低リスク**: 既存機能への影響（optionalパラメータのため）
- **中リスク**: OpenAI API仕様変更の影響
- **低リスク**: エラーハンドリングの不備