# Phase 1 / Day 2: 初回SDDサイクル実践 & ダッシュボード骨格の構築

Day 1で構築した「ルール（Rules）」と「ディレクトリ基盤」の上で、いよいよ **仕様駆動開発（Spec-Driven Development: SDD）の最初のサイクル** を回します。

今日の最大のポイントは、**「人間は1行もアプリケーションコード（`.tsx`）を書かず、仕様書（Spec）とスキル（Skill）を通じてAntigravityに計画・実装・検証を行わせる」** というAI駆動開発の型を体得することです。

---

## 1\. Day 2 の到達目標（Definition of Done）

- [ ] エージェントに定石手順を教える初の `Skill`（仕様書から実装する手順書）を配備する  
- [ ] 最初の機能仕様書 `specs/active/001-dashboard-layout-skeleton.md` を作成する  
- [ ] Antigravityに仕様書を読ませ、**Implementation Plan（実装計画）** を出力させてレビュー・承認する  
- [ ] 承認後に自動実装させ、ライトモード基調のポータル基本画面（サイドバー＋メイン領域）を完成させる  
- [ ] 完了した仕様書を `specs/completed/` へ移動し、SDDの1サイクルを完結させる

---

## 2\. コンテキストエンジニアリング実践：最初の「Skill」を定義する

Day 1で設定した `Rules` が「常に守るべき憲法」だとすれば、今日作成する **`Skills` は「特定のタスクを遂行するための標準作業手順書（SOP）」** です。

これを定義しておくことで、毎回チャットで「まず仕様書を読んで、計画を立てて、型チェックして…」と長文で指示する必要がなくなります。

### File 1: `.antigravity/skills/implement-from-spec.md`

以下のファイルを `.antigravity/skills/` 配下に作成してください。

```markdown
# Skill: Implement Feature from Specification (仕様書からの機能実装手順)

人間から特定の仕様書（`specs/active/xxx.md`）の実装を指示された場合、以下の4フェーズを順番に実行してください。**フェーズを飛び越えていきなりコードを書いてはいけません。**

## Phase 1: 仕様の読み込みと分析 (Analysis)
1. 指定された `specs/active/` 内の仕様書と、`.antigravity/rules/` 内の全ルールを読み込む。
2. 既存のディレクトリ構造や関連ファイルを確認する。
3. 仕様に曖昧な点や技術的矛盾がある場合は、この時点で人間に質問する。

## Phase 2: 実装計画の策定と承認待ち (Planning)
コードを編集する前に、以下の構成で **Implementation Plan（実装計画）** をチャットに出力し、人間の承認（Approval）を求めること。
- **新規作成するファイル一覧**（パスと役割）
- **変更する既存ファイル一覧**（パスと変更内容）
- **追加パッケージの有無**（原則として無断追加は禁止、必要な場合は理由を明記）
- **実装ステップの順序**

> ⚠️ **STOP:** 人間から「承認します（Approved / LGTM / 進めてください）」の返答があるまで、Phase 3 には進まないこと。

## Phase 3: 実装の実行 (Execution)
承認された計画に従い、ファイルを順次作成・編集する。
- `.antigravity/rules/10-technical-standards.md` の規約（ライトモード基調、TypeScript Strict、Server Component優先など）を厳守すること。

## Phase 4: 自己検証と完了報告 (Verification)
実装後、人間に完了報告をする前に以下のコマンドをターミナルで実行し、エラーがないことを確認する。
1. `npm run lint`
2. `npx tsc --noEmit` (型チェック)
3. エラーが出た場合は自律的に修正し、すべてパスした状態で人間に変更サマリーを報告する。
```

&nbsp;

---

## 3\. 最初の仕様書（Spec 001）の作成

ポータル全体の器となる「基本ダッシュボードレイアウト（サイドバー、ヘッダー、3大機能のプレースホルダー）」の仕様書を作成します。 ※アイコン表示用として定番の `lucide-react` の導入も仕様に含めます。

### File 2: `specs/active/001-dashboard-layout-skeleton.md`

以下の内容でファイルを作成してください。

````markdown
# Spec 001: ポータル基本レイアウト & ダッシュボード骨格の構築

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:** パーソナルポータルの全機能（ブリーフィング、タスク管理、ナレッジベース）を統合・遷移するための基本レイアウト骨格（App Shell）を確立するため。
- **ユーザーが得られる価値:** 毎朝ポータルを開いた際に、今日の日付・全体状況・各機能へのナビゲーションが一目で把握できるクリーンな画面を提供する。

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **ライトモード基調のクリーンなUI:** 背景は明るいトーン（`bg-slate-50` や `bg-white` 基調）、テキストは視認性の高いダークグレー（`text-slate-900` 等）で統一されていること。
- [ ] **左サイドバーナビゲーション:** 以下のメニューが表示され、現在のアクティブ項目が視覚的にわかること。
  - Dashboard (Home)
  - Tasks & Projects
  - Second Brain (Notes)
  - Agent Status & Logs
  - Settings
- [ ] **トップヘッダー:** 現在のページタイトル、今日の日付表示、および「AI Agent Ready」のステータスバッジが表示されていること。
- [ ] **メインダッシュボード（3カラム/グリッド骨格）:** トップページ（`/`）に以下の3つのウィジェット領域（プレースホルダーカード）が配置されていること。
  1. **Morning Briefing（朝の要約）:** 今日の予定と優先事項のサマリー枠（ダミーデータ表示）
  2. **Priority Tasks（優先タスク）:** 直近のタスク一覧枠（ダミーデータ3件程度表示）
  3. **Quick Capture（クイックメモ）:** 思いつきやメモを即座に入力できるテキストエリアと保存ボタンのUI骨格（状態管理やDB保存は次フェーズ以降、今回はUIのみ）

## 3. 技術設計 (Technical Design)
### 3.1 依存パッケージ
- アイコン表示用に `lucide-react` をインストールして使用すること。

### 3.2 データモデル / スキーマ
```typescript
// src/types/portal.ts
export interface NavItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
}

export interface TaskPreview {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
}
```

### 3.3 影響範囲 / 作成・変更予定ファイル
- `src/types/portal.ts` (新規: 基本型定義)
- `src/components/layout/Sidebar.tsx` (新規: サイドバーナビゲーション)
- `src/components/layout/Header.tsx` (新規: トップヘッダー)
- `src/components/dashboard/BriefingCard.tsx` (新規: ブリーフィング枠)
- `src/components/dashboard/PriorityTasksCard.tsx` (新規: 優先タスク枠)
- `src/components/dashboard/QuickCaptureCard.tsx` (新規: クイックメモ枠)
- `src/app/layout.tsx` (変更: 全体フォント・メタデータ・ベースレイアウト調整)
- `src/app/page.tsx` (変更: ダッシュボード画面の構築)

## 4. 検証手順 (Verification Steps)
1. `npm run lint` がエラーなしで通過すること。
2. `npx tsc --noEmit` がエラーなしで通過すること。
3. `npm run dev` で開発サーバーを起動し、`http://localhost:3000` でサイドバー・ヘッダー・3つのダッシュボードカードが崩れずライトモードで表示されること。
````

&nbsp;

---

## 4\. Antigravity への指示（プロンプト実行）

上記2つのファイル（Skill と Spec 001）を保存したら、Antigravityのチャット欄（Agentモード）を開き、以下のプロンプトを入力して実行してください。

### 💬 エージェントへの指示プロンプト

```
@.antigravity/skills/implement-from-spec.md の手順に従い、
@specs/active/001-dashboard-layout-skeleton.md の仕様を実装してください。

まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
```

---

## 5\. 人間（アーキテクト）としてのレビュー手順

1. **計画のレビュー:**  
   * Antigravityがファイル一覧と実装ステップ（Implementation Plan）を出力して一時停止します。  
   * 余計なライブラリを入れようとしていないか、`src/` 配下の適切な場所にファイルを作ろうとしているかを確認します。  
2. **承認（Goサイン）:**  
   * 問題なければチャットで **「承認します。Phase 3（実装）と Phase 4（検証）を進めてください。」** と返信します。  
3. **動作確認:**  
   * エージェントが実装と `lint` / `tsc` の検証を終えたら、手元のターミナルで `npm run dev` を実行し、ブラウザで `http://localhost:3000` を開いて画面を確認します。  
4. **仕様書のアーカイブとコミット:**  
   * 受け入れ基準を満たしていたら、仕様書を完了フォルダへ移動してコミットします。

```sh
# 完了した仕様書を completed へ移動
mv specs/active/001-dashboard-layout-skeleton.md specs/completed/

# 変更をステージングしてコミット
git add .
git commit -m "feat(ui): implement dashboard layout skeleton based on Spec 001"
```

---

## 💡 転職アピールに向けたワンポイント記録

このサイクルを回す際、**「エージェントが出した Implementation Plan」** や **「もし一発でうまくいかずルールを微修正した点」** があれば、簡単なメモを残しておきましょう。面接で「実際にSkillファイルでPhase 2に承認ゲートを設けることで、AIの暴走を防ぎ手戻りをゼロにしました」と語れる非常にリアルなエピソードになります！