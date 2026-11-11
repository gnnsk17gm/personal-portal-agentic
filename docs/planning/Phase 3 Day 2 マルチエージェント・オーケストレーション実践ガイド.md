# Phase 3 / Day 2: 階層型マルチエージェント（Multi-Subagent）協調と検証パイプラインの実装（Spec 011 & ADR 0009）

Day 1 では、単一の自律エージェントが目標を分解し、実行ステップ（トレース）をDBに永続化する基盤を構築しました。

Phase 3 Day 2 では、この仕組みをさらに進化させ、近年のAIエージェントアーキテクチャの最高峰である **「マルチエージェント・オーケストレーション（Multi-Agent Orchestration）」** をポータルに組み込みます。

単一の処理にすべてを任せるのではなく、役割が特化した **3つの専門サブエージェント（Researcher / Planner / Critic）** が合議・検証しながらタスク分解を行うパイプラインを構築します。もちろん今回も **完全0円（外部API課金ゼロ）** かつ100%単体テスト可能な設計です。

---

## 1\. なぜ「マルチエージェント協調」が転職市場で圧倒的な強みになるのか？

AIエージェントの開発現場において、業界が直面している最大の課題は **「単一プロンプト・単一エージェントの限界（視野狭窄とエラーの見落とし）」** です。 1つのエージェントに「探して、考えて、チェックして」と全部やらせると、指示の抜け漏れや非現実的な計画が混入します。

これを解決するのが、人間組織のように役割を分担させる **マルチエージェント・パターン** です：

```
               ┌───────────────────────────────┐
               │    Orchestrator (統括指令)    │
               └──────────────┬────────────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  Researcher  │  ──>  │   Planner    │  ──>  │    Critic    │
│  (ナレッジ探査)│       │  (タスク立案) │       │ (品質・期日検証)│
└──────────────┘       └──────────────┘       └──────────────┘
 過去ノートの関連       目標と知識から          期日順序や優先度
 知識を専門収集         3〜5件のタスクを合成    の矛盾を厳しく監査
```

* **Researcher Agent (調査員):** 目標キーワードから Second Brain を徹底探索し、前提ナレッジを抽出する。  
* **Planner Agent (設計者):** 目標と調査結果を照合し、優先度順のタスク案を立案する。  
* **Critic / Verifier Agent (批評家・検査官):** 立案されたタスクの日程順序（期日の前後関係）や優先度の偏りを厳しく監査し、必要に応じて修正・承認する。

面接官に **「単一エージェントの限界を理解し、役割分離（SoC）と自己修正ループ（Self-Refinement）を備えたマルチエージェント・システムを設計・実装できるエンジニア」** として決定的なアピールができます。

---

## 2\. Phase 3 / Day 2 の到達目標（Definition of Done）

- [ ] マルチエージェント設計を記した `docs/adr/0009-multi-agent-orchestration-and-critic.md` を作成する  
- [ ] 協調型タスク分解の仕様書 `specs/active/011-multi-agent-orchestrator.md` を作成する  
- [ ] Antigravity に Implementation Plan を出力させ、レビュー・承認する  
- [ ] `npm run verify`（全テストGreen）を維持したまま、3つのサブエージェント協調ロジックを実装する  
- [ ] `/tasks` の実行タイムラインで、どのサブエージェント（Researcher / Planner / Critic）が何を思考・判定したのかが色分けバッジで可視化される

---

## 3\. 意思決定の記録：ADR 0009 の作成

### File 1: `docs/adr/0009-multi-agent-orchestration-and-critic.md`

以下の内容でファイルを作成してください。

```markdown
# ADR 0009: 専門Subagentの協調（Researcher / Planner / Critic）によるタスク分解品質の向上

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-08
- **決定者:** Project Architect

## 1. コンテキスト (Context)
Spec 010 で単一のタスク分解エージェント（`taskDecomposerService`）を実装したが、目標の分析・知識検索・タスク生成・検証を1つのロジックで抱え込んでおり、以下の課題が生じやすい：
1. **責任過多（Tight Coupling）:** 知識探索のルール変更や、タスク生成ルールの変更が相互に影響しやすい。
2. **監査・自己修正（Self-Refinement）の欠如:** 生成されたタスクに「日付の逆転（着手タスクより後工程タスクの期日が先に来る）」や「優先度の不均衡」があっても、生成後に検証・補正するステップが存在しない。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: 単一エージェントの関数内により複雑な条件分岐を追加する**
  - コードが肥大化し、テストケースの組み合わせ爆発が起きる。
- **Option 2: 役割ごとの専門Subagent（Researcher, Planner, Critic）に分割し、オーケストレーターがパイプライン制御する**
  - 各エージェントを疎結合なインターフェースとして独立定義し、直列（または並行）パイプラインで連携させる。Critic による出力検証・補正ステップを必須とする。

## 3. 決定内容 (Decision)
**Option 2（Researcher / Planner / Critic の3役マルチエージェント協調）を採用する。**

### 選定理由:
1. **関心の分離（Separation of Concerns）とテスト容易性:**
   - Researcher（検索）、Planner（立案）、Critic（検証・補正）を独立したユニットテストで検証でき、それぞれのアルゴリズムを安全に改善できる。
2. **自己修正（Self-Correction）メカニズムの実証:**
   - Plannerが生成したドラフトに対して、Critic が「期日の矛盾」や「優先度の偏り」を検出して自動修正（Guardrail）する設計により、実務で極めて重要な信頼性（Reliability）を担保できる。
3. **可観測性（Observability）の向上:**
   - 各ステップに担当エージェント名（`agent_role: researcher | planner | critic`）を付与することで、UI上でチームが合議しているかのような推論プロセスを視覚化できる。
4. **完全無料・決定論的実行の継続:**
   - 外部LLMに課金せず、純粋なTypeScriptルール・アルゴリズムで各Subagentを決定論的に稼働させる。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - タスク生成の破綻（期日逆転や無効な優先度）を Critic が確実にブロック・修正する。
  - 面接で「マルチエージェント設計とガードレール（Guardrails）」を具体例付きで語れる。
- **トレードオフ (Negative):**
  - ステップ数が増えるため、データベース（`agent_steps`）に記録されるレコード数が増加する。
```

&nbsp;

---

## 4\. マルチエージェント仕様書（Spec 011）の作成

### File 2: `specs/active/011-multi-agent-orchestrator.md`

以下の内容でファイルを作成してください。

````markdown
# Spec 011: 階層型マルチエージェント（Researcher / Planner / Critic）によるタスク分解と検証パイプラインの実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. Spec 010 で構築した単一エージェントを、3つの自律サブエージェント（Researcher, Planner, Critic）による協調オーケストレーション型へアップグレードするため。
  2. Planner が立案したタスク候補に対して、Critic サブエージェントが「相対期日の論理順序」や「優先度の配分」を厳密に監査し、不整合があれば自己修正（Refinement）してDBに永続化するため。
  3. `/tasks` の実行タイムライン（Agent Timeline）において、各ステップを実行した「担当サブエージェント（Researcher / Planner / Critic）」のバッジを表示し、推論の役割分担を可視化するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0009-multi-agent-orchestration-and-critic.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **3つの専門Subagentの責務分離 (`src/services/taskDecomposerService.ts` 等):**
  - **Researcher:** 目標からキーワードを抽出し、`searchNotes`（BM25）を実行して関連ノートを構造化サマリーとしてまとめる（思考ログにヒット件数と最高スコアを記録）。
  - **Planner:** 目標と Researcher の調査レポートに基づき、3〜5件のタスク候補（タイトル、仮の優先度、仮の期日）を立案する。
  - **Critic (Verifier):** Planner のタスク候補を検証し、以下のルールを自動補正（Self-Correction）する：
    1. 期日の整合性チェック: タスク1 -> タスク2 -> タスク3 の期日が時系列順（昇順）になっているか確認し、逆転していれば正しく並び替える/再計算する。
    2. 優先度チェック: 最初のタスクが必ず `high` で始まっているかを確認し、不整合があれば補正する。
    3. Critic の検証結果（合格、または修正内容）を思考ログに明記する。
- [ ] **実行トレース（`agent_steps`）の拡張:**
  - 各ステップの詳細（または新設カラム/JSON）に、担当エージェントのロール（`researcher`, `planner`, `critic`, `orchestrator`）が識別できる情報を含めること。
- [ ] **UIの可視化（`/tasks` の AgentRunTimeline）:**
  - 実行トレースの各ステップに、担当サブエージェントのバッジ（例: `🔍 Researcher`, `📐 Planner`, `⚖️ Critic`）が表示されること。
  - Critic がタスクを検証・補正したログ（「All checks passed」や「Dates corrected」等）が確認できること。
- [ ] **単体テストと品質ゲート:**
  - Researcher、Planner、Critic 単体およびオーケストレーション全体の単体テストが追加されること。
  - 期日が逆転したタスク案を Critic が自動修正するテストケースが含まれること。
  - `npm run verify`（ESLint + TypeCheck + Vitest）がすべてエラーゼロで Green であること。

## 3. 技術設計 (Technical Design)
### 3.1 追加パッケージ
- なし（Pure TypeScript による決定論的アルゴリズム）。

### 3.2 サブエージェント構造設計案
```typescript
export interface SubagentReport<T> {
  agentRole: 'researcher' | 'planner' | 'critic' | 'orchestrator';
  summary: string;
  data: T;
}

// Criticによる検証・補正結果
export interface CriticEvaluation {
  approved: boolean;
  adjustmentsMade: string[];
  finalTasks: DecomposedTaskCandidate[];
}
```

### 3.3 作成・変更予定ファイル
- `src/types/portal.ts` (変更: Subagent関連の型、Critic判定型の追加)
- `src/services/taskDecomposerService.ts` (変更: Researcher / Planner / Critic のクラスまたは関数への責務分割とオーケストレーション)
- `src/services/__tests__/taskDecomposerService.test.ts` (変更: Criticの自己修正テスト、各Subagentの単体テスト追加)
- `src/components/agent/AgentRunTimeline.tsx` (変更: サブエージェントのロールバッジ表示、Criticの検証結果の表示)

## 4. 検証手順 (Verification Steps)
1. `npm run verify`（全テストGreen）を達成すること。
2. ブラウザで `/tasks` を開き、目標を入力して「Decompose Goal」を実行。
3. タイムラインを展開し、以下の流れが色分けバッジ付きで表示されることを確認：
   - 🔍 Researcher: 目標分析とナレッジ検索
   - 📐 Planner: タスク候補の立案
   - ⚖️ Critic: 期限順序と優先度バランスの監査・承認
   - 🚀 Orchestrator: トランザクション永続化
````

&nbsp;

---

## 5\. Antigravity への指示（プロンプト実行）

上記2つのファイル（`docs/adr/0009-multi-agent-orchestration-and-critic.md` と `specs/active/011-multi-agent-orchestrator.md`）を作成・保存したら、Antigravity に以下の指示プロンプトを送信してください。

※推奨モデル: **`Gemini 4 Argon (Medium)`** または **`Claude Sonnet 5.5`**

### 💬 エージェントへの指示プロンプト（コピペ用）

```
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@docs/adr/0009-multi-agent-orchestration-and-critic.md の設計判断を踏まえた上で、
@specs/active/011-multi-agent-orchestrator.md の仕様を実装してください。

外部API課金は一切行わず、決定論的なローカルエンジンで完結させてください。
まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
```

&nbsp;