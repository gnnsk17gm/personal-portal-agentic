# ADR 0001: 初期技術スタックの選定 (Next.js App Router + TypeScript + Tailwind CSS)

- **ステータス:** Accepted (採択)
- **決定日:** 202X-XX-XX
- **決定者:** [あなたの名前]

## 1. コンテキスト (Context)
個人向け自律型ポータル（タスク・知識管理）を開発するにあたり、高い開発生産性を維持しつつ、AIエージェント（Antigravity）が破綻なくコード生成・テストを行える堅牢な初期基盤を決定する必要がある。

## 2. 検討した選択肢 (Options Considered)
- **Option 1:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Option 2:** Vite + React SPA + CSS Modules
- **Option 3:** Remix (React Router v7)

## 3. 決定内容 (Decision)
**Option 1（Next.js App Router + TypeScript + Tailwind CSS）を採用する。**

### 選定理由:
1. **AIエージェントの出力精度:** Next.js App RouterおよびTailwind CSSは学習データが極めて豊富であり、AIが精度の高いコードを出力しやすい。公式の `AGENTS.md` サポートも充実している。
2. **Server Componentsによる責務分離:** データ取得や機密処理をサーバー側に閉じ込めやすく、ポータルとしてのセキュリティと表示パフォーマンスを両立しやすい。
3. **型安全性:** TypeScriptをStrictモードで運用することで、AI生成コードのバグを型検査（TypeCheck）で即座に検知・自動修正ループに回せる。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - クライアント・サーバーの分離が明確になり、将来的なMCPや外部API連携が容易になる。
  - スタイリングの破綻が起きにくく、モダンなUIコンポーネントを高速に構築できる。
- **トレードオフ・課題 (Negative):**
  - Server / Client Components の境界（`"use client"`）の扱いでエージェントが迷う可能性があるため、`.antigravity/rules/` でコンポーネント配置規約を明文化して制御する必要がある。
