# Spec 005: 動的コンテキストアセンブラ（Context Assembler）と Morning Briefing の実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. ダッシュボード（`/`）の `BriefingCard` をハードコードされたダミーデータから脱却させ、実際の「未完了タスク」「直近のSecond Brainノート」「本日のスケジュールイベント」を統合した実用的なブリーフィングへ進化させるため。
  2. AIエージェントにタスクや状況判断を依頼する際、トークン予算（文字数制限）内で最も関連性の高い情報だけを構造化する「Dynamic Context Assembler」を構築し、コンテキストエンジニアリングをシステム内に実装するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0003-context-assembler-and-provider-pattern.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **スケジュールイベントの取得（Provider抽象化）:**
  - 本日の予定（時刻、タイトル、種別：`meeting` | `focus` | `personal`）を提供する `scheduleService`（または `LocalScheduleProvider`）が実装されていること。
- [ ] **Dynamic Context Assembler (`src/services/contextAssemblerService.ts`):**
  - 現在の未完了タスク（優先度順）、直近のノート、本日のスケジュールを集約し、指定された文字数予算（例: デフォルト `maxChars: 1500`）を超えないように優先度順で切り詰めた **構造化Markdownコンテキスト** と **メタデータ（推定トークン数、文字数、含まれた件数）** を生成できること。
  - タスクの滞留状況や予定数に応じた「本日のフォーカス提案サマリー（Briefing Summary）」を生成できること。
- [ ] **Morning Briefing カードの刷新 (`BriefingCard.tsx`):**
  - ダミーデータを廃止し、`contextAssemblerService` から取得した「本日のサマリー（未完了タスク数・高優先度タスク数・本日の予定リスト）」を動的に表示すること。
  - カード下部（または `<details>` 折りたたみ）に **「AI Context Payload Preview（推定トークン数バッジ付き）」** を設け、実際にAIエージェントへ注入される構造化Markdownコンテキストをリアルタイムに確認できること。
- [ ] **単体テストと品質ゲート:**
  - `src/services/__tests__/contextAssemblerService.test.ts` が作成され、データ統合・優先度ソート・文字数予算（`maxChars`）による切り詰め処理の単体テストがすべてパスすること。
  - `npm run verify` がすべて Green であること。

## 3. 技術設計 (Technical Design)
### 3.1 追加パッケージ
- なし（既存スタックのみで実装）。

### 3.2 データ構造 (`src/types/portal.ts` への追加案)
```typescript
export interface ScheduleEvent {
  id: string;
  time: string; // 例: "10:00 - 11:00"
  title: string;
  category: 'meeting' | 'focus' | 'personal';
}

export interface AssembledContext {
  summaryText: string;          // 人間向けの朝の要約文
  stats: {
    pendingTasksCount: number;
    highPriorityCount: number;
    recentNotesCount: number;
    todayEventsCount: number;
  };
  todayEvents: ScheduleEvent[];
  markdownPayload: string;      // AI注入用の構造化Markdown
  charCount: number;
  estimatedTokens: number;      // 例: Math.ceil(charCount / 3) 等の概算
  truncated: boolean;           // 予算上限により切り詰めが発生したか
}
