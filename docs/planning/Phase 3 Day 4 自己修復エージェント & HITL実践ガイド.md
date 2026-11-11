# Phase 3 / Day 4: 自律自己修復エージェント & Human-in-the-loop (HITL) 承認ワークフローの実装（Spec 013 & ADR 0011）

Day 3 では、システムの状態を定期巡回して期限切れや放置タスクを発見する「Task Doctor（診断機能）」を構築しました。

しかし、実際の業務システムにおいて「悪いところを見つけて警告を出すだけ」では不十分です。 Phase 3 Day 4 では、エージェントが発見した不健全なタスクに対して **「具体的な是正プラン（リスケジュール日、優先度の見直し案）を自動起草（Draft）し、人間が画面上で確認してワンクリックで安全に適用できる自己修復（Self-Healing）と Human-in-the-loop (HITL) パイプライン」** を実装します。

今回も **完全0円（外部API課金ゼロ）** かつ、100%単体テスト可能な設計を貫きます。

---

## 1\. なぜ「Human-in-the-loop (HITL)」が転職市場で極めて高く評価されるのか？

現在、AIエージェント開発の現場で最も議論されているセキュリティ・運用上の課題が **「AIによる暴走・意図しないデータ破壊」** です。

* **初級開発者（危険な全自動）:** 「AIが勝手にDBのタスク日付やステータスを書き換えて、ユーザーが知らない間に予定が狂ってしまった」  
* **あなた（本プロジェクトの実践）:** 「エージェントは **『是正プランの起草（Propose）』** までを自律的に行い、重要なデータ変更の直前に **人間の承認ゲート（Human-in-the-loop）** を挟むセーフティアーキテクチャを設計。人間が画面で内容を確認し、『Apply Remediation（是正を適用）』を押した瞬間のみアトミックにDBへ反映される」

面接官に **「AIエージェントを本番運用する上で不可欠な、自律性と安全制御（Safety Guardrails）のバランスを熟知しているエンジニア」** として決定的な説得力を持ちます。

---

## 2\. Phase 3 / Day 4 の到達目標（Definition of Done）

- [ ] Day 3 の仕様書（`012`）が `specs/completed/` に移動され、コミット済みであることを確認する  
- [ ] 自己修復とHITLの設計根拠を記した `docs/adr/0011-self-healing-remediation-and-hitl.md` を作成する  
- [ ] 自己修復アクションの仕様書 `specs/active/013-agentic-task-remediation-hitl.md` を作成する  
- [ ] Antigravity に Implementation Plan を出力させ、レビュー・承認する  
- [ ] `npm run verify`（全テストGreen）を維持したまま実装を完了させる  
- [ ] ダッシュボード（`/`）の `SystemHealthCard` 上で、警告時に「是正プラン（リスケジュール案）」が提案され、ワンクリックで一括是正・Healthy復帰できることを確認する

---

## 3\. 意思決定の記録：ADR 0011 の作成

### File 1: `docs/adr/0011-self-healing-remediation-and-hitl.md`

以下の内容でファイルを作成してください。

```markdown
# ADR 0011: 自律自己修復エージェント（Self-Healing）と Human-in-the-loop (HITL) 承認パターンの採用

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-10
- **決定者:** Project Architect

## 1. コンテキスト (Context)
Spec 012（Task Doctor）により期限切れタスクや滞留タスクの検知が可能になったが、ユーザーは手動で各タスク画面を開き、1件ずつ期日や優先度を修正し直す必要があり、運用の手間が残っていた。
一方で、エージェントがユーザーの確認なしにデータベース内の期日や優先度を全自動で一括更新してしまうと、ユーザーの本来の意図に反するスケジュール変更が発生するリスクがある。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: 完全自動修復（Autonomous Auto-Fix）**
  - Sweeper が検知した瞬間に、エージェントが即座に `dueDate` や `priority` を自動更新する。
  - 手間は最小だが、ユーザーが気づかないうちに重要な締切が勝手に書き換わる致命的なリスクがある。
- **Option 2: Human-in-the-loop (HITL) 型の是正プラン起草 & ユーザーワンクリック承認**
  - エージェントは「提案（Proposal / Draft Remediation Plan）」を生成して一時保持し、UI上で差分を提示。ユーザーが「承認（Approve / Apply）」を押して初めてDBトランザクションを実行する。

## 3. 決定内容 (Decision)
**Option 2（HITL型自己修復パイプライン）を採用する。**

### 選定理由:
1. **エンタープライズ水準のエージェント安全性（AI Safety & Governance）:**
   - データ書き込みを伴うエージェントにおいて、人間が最終決定権を持つガードレールを敷くことで、事故をゼロにする。
2. **圧倒的な利便性とUX（ワンクリック是正）:**
   - 1件ずつ修正する面倒を排除し、AIが立案した論理的なリスケジュール案（例: 期限切れタスクを「今日 + 2日」へ再設定、滞留タスクの優先度是正）を1クリックで一括適用できる。
3. **Observability の完全維持:**
   - 是正の提案および適用ステップも `agent_runs` / `agent_steps` に記録され、誰がいつ承認・適用したかを完全に追跡できる。
4. **完全0円・決定論的テストの担保:**
   - 是正アルゴリズム（リスケジュール日付の計算等）を純粋なTypeScriptルールで決定論的にテスト可能。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - ポータルの健全性をユーザーの手間をかけずに安全に維持できる。
  - 面接で「Human-in-the-loopの実践例」として強力なアピールになる。
- **トレードオフ (Negative):**
  - 是正プランの一時保持や承認用Server Actionなど、UI・アクション層のコードがやや増加する。
```

&nbsp;

---

## 4\. 自己修復エージェント & HITL の仕様書（Spec 013）

### File 2: `specs/active/013-agentic-task-remediation-hitl.md`

以下の内容でファイルを作成してください。

```markdown
# Spec 013: 自律自己修復エージェント（Self-Healing Remediation）と Human-in-the-loop (HITL) 承認の実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. Spec 012 で検知された不健全タスク（期限切れ、高優先度滞留）に対し、エージェントが具体的な「是正プラン（再スケジュール日付・優先度調整）」を自律提案するため。
  2. 勝手にデータを書き換えるリスクを防ぐため、人間がUI上で提案差分を確認し、ワンクリックで安全に是正を適用できる「Human-in-the-loop (HITL)」ガードレールを構築するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0011-self-healing-remediation-and-hitl.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **是正プラン生成ロジック (`src/services/remediationService.ts` または `sweeperService.ts` 拡張):**
  - 期限切れの未完了タスクに対し、現在日を基準とした論理的な新規期日（例: `now + 2日` 等）の修正案（`RemediationAction`）を生成できること。
  - 7日以上滞留している高優先度タスクに対し、優先度調整または再確認の是正案を生成できること。
- [ ] **是正適用エンジン (`applyRemediations(plan, deps)`):**
  - 人間が承認した是正プランを一括でデータベース（`tasks` テーブル）にアトミック反映（トランザクション）できること。
  - 適用後、`agent_runs` に `goal: "Task Remediation Execution (HITL Approved)"` として実行ログを永続化すること。
  - 適用後、再度ヘルスチェックが自動実行（または再計算）され、ステータスが **🟢 Healthy** に復帰すること。
- [ ] **UIの統合 (`SystemHealthCard.tsx`):**
  - 警告（Warning / Critical）時、カード内に「AI是正提案（例: 『期限切れタスク 1件 を 2日後にリスケジュール』）」のリストが表示されること。
  - 提案の横に「✨ Apply Remediation（是正を適用）」ボタンが表示され、クリックすると Server Action 経由で即座に適用・画面更新（`revalidatePath('/')`）されること。
  - 健全（Healthy）時にはこのボタンや提案リストは非表示（または完了表示）となること。
- [ ] **単体テストと品質ゲート:**
  - 是正プラン生成、トランザクション適用、適用後のHealthy復帰を検証する単体テストが追加されること。
  - `npm run verify`（ESLint + TypeCheck + Vitest）がすべてエラーゼロでパスすること。

## 3. 技術設計 (Technical Design)
### 3.1 データ型定義 (`src/types/portal.ts` への追加)
```typescript
export interface RemediationAction {
  taskId: number;
  taskTitle: string;
  actionType: 'reschedule' | 'adjust_priority';
  currentValue: string | null;
  proposedValue: string;
  reason: string;
}

export interface RemediationPlan {
  actions: RemediationAction[];
  generatedAt: string;
}
```

&nbsp;

### 3.2 作成・変更予定ファイル

- `src/types/portal.ts` (変更: `RemediationAction`, `RemediationPlan` 型の追加)  
- `src/services/remediationService.ts` (新規: 是正プラン生成・一括適用・DI対応)  
- `src/services/__tests__/remediationService.test.ts` (新規: 単体テスト)  
- `src/app/actions.ts` (変更: `applyRemediationAction` の追加)  
- `src/components/dashboard/SystemHealthCard.tsx` (変更: 是正プランのプレビュー表示)  
- `src/components/dashboard/ApplyRemediationButton.tsx` (新規: `"use client"` 是正承認ボタン)

## 4\. 検証手順 (Verification Steps)

1. `npm run verify` がすべてエラーゼロでパスすること。  
2. 過去日付のタスクを作成し、ダッシュボードで「Run Health Check」を実行して Warning にする。  
3. `SystemHealthCard` に是正プラン（リスケジュール提案）が表示されることを確認。  
4. 「Apply Remediation」ボタンをクリックし、タスクの期日が更新され、診断ステータスが Healthy に戻ることを確認。

````

---

## 5. Antigravity への指示（プロンプト実行）

上記2つのファイル（`docs/adr/0011-self-healing-remediation-and-hitl.md` と `specs/active/013-agentic-task-remediation-hitl.md`）を作成・保存したら、Antigravity に以下の指示プロンプトを送信してください。

※推奨モデル: **`Gemini 4 Argon (Medium)`** または **`Claude Sonnet 5.5`**

### 💬 エージェントへの指示プロンプト（コピペ用）

```text
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@docs/adr/0011-self-healing-remediation-and-hitl.md の設計判断を踏まえた上で、
@specs/active/013-agentic-task-remediation-hitl.md の仕様を実装してください。

外部API課金は一切行わず、決定論的なローカルエンジンで完結させてください。
まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
````

&nbsp;