# Phase 2 / Day 1: 動的コンテキスト設計（Context Assembler）と Morning Briefing の統合（Spec 005）

Phase 1では、AIエージェントを統治する開発基盤（Rules / Skills / Hooks）と、タスク・ノートの永続化、そして `/agent` インスペクターまでを完成させました。

今日から始まる **Phase 2（データ統合 & Context Layer）** では、アプリケーション自体に **「コンテキストエンジニアリングの仕組み」** を組み込みます。 その第一歩として、ダッシュボードの `BriefingCard`（現在ダミー表示）を本物のデータ駆動にし、**「タスク・ノート・外部スケジュール等の散在する情報を、優先度とトークン予算（文字数上限）に基づいて動的に取捨選択・構造化する Context Assembler（文脈構築エンジン）」** を実装します。

---

## 1\. なぜ「Context Assembler」が転職で高く評価されるのか？

AI機能をアプリに組み込む際、初級者がやりがちな失敗は **「DB内の全タスクや全メモをそのままプロンプトに詰め込んでLLMに投げること（Context Stuffing）」** です。これではトークンコストが爆発し、重要な情報が埋もれてハルシネーション（Lost in the Middle現象）が起きます。

一方、シニアレベルのAIエンジニアは **「Context Assembler（動的コンテキストアセンブラ）」** を設計します。

* ユーザーの現在の目的（例：朝のブリーフィング、タスク分解、ノート検索）に応じて必要なデータソースだけを選択する。  
* 各セクションに **トークン予算（文字数バジェット）** を割り当て、優先度の高い情報だけを抽出・圧縮して構造化コンテキスト（Markdown / JSON）を生成する。  
* 外部API（Google CalendarやGitHub等）は **Adapter / Provider パターン** で抽象化し、APIキーがない環境やテスト環境でもローカルプロバイダで100%決定論的に動作・検証できるようにする。

この設計思想を **ADR 0003** と **Spec 005** としてリポジトリに刻みます。

---

## 2\. Phase 2 / Day 1 の到達目標（Definition of Done）

- [ ] 外部データ連携と動的コンテキスト構築の設計判断を記した `docs/adr/0003-context-assembler-and-provider-pattern.md` を作成する  
- [ ] Morning Briefing と Context Assembler の仕様書 `specs/active/005-context-assembler-and-briefing.md` を作成する  
- [ ] Antigravity に計画・テスト駆動実装を行わせる  
- [ ] ダッシュボード（`/`）の Morning Briefing が実データ（優先タスク、直近ノート、今日のスケジュール）から動的に生成され、かつ「AIに渡す構造化コンテキスト（Prompt Context Preview）」を確認できるようになる

---

## 3\. 意思決定の記録：ADR 0003 の作成

まずはアーキテクトとして、外部データ統合とコンテキスト圧縮の設計方針をADRとして定義します。

### File 1: `docs/adr/0003-context-assembler-and-provider-pattern.md`

以下の内容でファイルを作成してください。

```markdown
# ADR 0003: 動的コンテキストアセンブラ（Context Assembler）と外部データProviderパターンの採用

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-02
- **決定者:** Project Architect

## 1. コンテキスト (Context)
パーソナルポータルにおいて、AIによる「朝のブリーフィング（Morning Briefing）」や「自律タスク支援」を実現するには、DB内のタスク・ノートに加え、カレンダー予定や開発アクティビティ等の複数データソースを統合してAIエージェントへ渡す必要がある。
しかし、以下の2つの技術的課題が存在する：
1. **コンテキストウィンドウの肥大化:** 全データを無制限に結合すると、トークン消費の増大およびLLMの推論精度低下（ノイズ混入）を招く。
2. **外部API依存による開発・テストの阻害:** 外部サービス（Google Calendar API等）に強結合させると、認証情報が未設定の環境（採用担当者のローカル確認環境やCIテスト）でアプリが動作しなくなる。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: UIやAction内で直接外部APIを叩き、全データを文字列結合する**
  - 実装は簡単だが、テストが困難であり、データ量増加時にコンテキスト長の上限を超える。
- **Option 2: Providerパターンによるデータソース抽象化 + トークン予算（Budget）制御付き Context Assembler 層の導入**
  - 外部データ取得を共通インターフェース（Provider）として切り出し、収集したデータを優先度順にスコアリング・切り詰め（Truncate）して構造化コンテキストを生成する専用サービスを設ける。

## 3. 決定内容 (Decision)
**Option 2（Providerパターン + 予算制御付き Context Assembler 層）を採用する。**

### 選定理由:
1. **コンテキストエンジニアリングの実践:**
   - セクションごと（優先タスク、直近ノート、本日の予定）に最大件数および文字数予算（Budget）を設け、常に高密度・低ノイズなコンテキストペイロードを構築できる。
2. **ローカルファーストな再現性とテスト容易性:**
   - カレンダー等の外部ソースを `ScheduleProvider` インターフェースで抽象化し、デフォルト実装としてDBまたは設定ファイルベースの `LocalScheduleProvider` を用意することで、外部APIキーなしでも即座に動作・単体テストが可能になる（将来的にMCPサーバーやGoogle Calendar APIへ差し替え可能）。
3. **透明性（Observability）:**
   - 組み立てられたコンテキスト文字列と推定トークン数をUI上でプレビュー可能にすることで、「AIにどのような文脈が注入されているか」を人間が監査できる。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - 外部API障害や認証有無に関わらずポータルが安定稼働し、Vitestによる100%の単体テストが可能になる。
  - 後続フェーズでLLM / MCP連携を行う際、Context Assemblerの出力をそのままシステムプロンプトへ注入できる。
- **トレードオフ (Negative):**
  - 抽象化レイヤー（Provider / Assembler）が増えるため、シンプルなCRUDに比べて初期設計ファイル数がわずかに増加する。
```

&nbsp;

---

## 4\. 動的コンテキスト & Morning Briefing の仕様書（Spec 005）

続いて、ダミーだった `BriefingCard` を刷新し、今日のスケジュール管理と Context Assembler を実装する仕様書を作成します。

### File 2: `specs/active/005-context-assembler-and-briefing.md`

以下の内容でファイルを作成してください。

```markdown
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
```

&nbsp;

### 3.3 作成・変更予定ファイル

- `src/types/portal.ts` (変更: `ScheduleEvent`, `AssembledContext` 等の型追加)  
- `src/services/scheduleService.ts` (新規: Providerパターンに基づく本日のスケジュール取得サービス)  
- `src/services/contextAssemblerService.ts` (新規: DBのTasks/CapturesとScheduleを統合し、予算内でコンテキストを組み立てるサービス)  
- `src/services/__tests__/contextAssemblerService.test.ts` (新規: コンテキスト組み立て・予算切り詰め・空データ時の単体テスト)  
- `src/components/dashboard/BriefingCard.tsx` (変更: 動的データ表示＋ `<details>` による AI Context Payload プレビュー表示)

## 4\. 検証手順 (Verification Steps)

1. `npm run verify`（ESLint \+ TypeScript \+ Vitest）がすべてエラーなしでパスすること。  
2. ブラウザで `/`（ダッシュボード）を開き、タスクやノートを追加・完了した際に、`BriefingCard` の数値サマリーと「AI Context Payload Preview」の中身・トークン推定値が連動して変化すること。

````

---

## 5. Antigravity への指示（プロンプト実行）

上記2つのファイル（`docs/adr/0003-context-assembler-and-provider-pattern.md` と `specs/active/005-context-assembler-and-briefing.md`）を保存したら、Antigravityに以下のプロンプトを投げてください。

### 💬 エージェントへの指示プロンプト（コピペ用）

```text
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@docs/adr/0003-context-assembler-and-provider-pattern.md の設計判断を踏まえた上で、
@specs/active/005-context-assembler-and-briefing.md の仕様を実装してください。

まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
````

&nbsp;