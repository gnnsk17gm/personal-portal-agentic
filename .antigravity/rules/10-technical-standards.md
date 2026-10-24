# Technical Standards (技術規約)

## 1. フロントエンド & UI規約 (Next.js App Router)
- **コンポーネント構成:**
  - 状態を持たない表示用UIは Server Components を優先する。
  - インタラクティブな操作やクライアントフックを要する場合のみ最上部に `"use client"` を明記する。
- **スタイリング:**
  - Tailwind CSS を使用し、インラインスタイルや独自のCSSファイルは作成しない。
  - デザインはシンプル・ミニマル（Modern Dashboard）を基調とし、**デフォルトは通常のライトモード（Light Mode）** を前提とした配色設計とする（将来的なダークモード切り替えにも拡張しやすい構成を意識）。
- **ファイル命名規則:**
  - コンポーネント: `PascalCase.tsx`
  - ユーティリティ・フック: `camelCase.ts`

## 2. TypeScript 規約
- `strict: true` を前提とし、型安全性を最優先する。
- `any` の使用は原則禁止。未知の型を扱う場合は `unknown` を用い、Type Guardで絞り込むこと。
- 型定義は `src/types/` または各機能モジュール近傍に配置する。

## 3. アーキテクチャ原則
- ビジネスロジックをUIコンポーネント内に直接ベタ書きしない。
- データのフェッチや操作は Server Actions または専用の Service レイヤーに分離する。
