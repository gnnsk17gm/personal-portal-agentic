export interface NavItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
}

export interface TaskPreview {
  id: number;
  title: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  dueDate: string | null;
}

export interface CapturePreview {
  id: number;
  content: string;
  createdAt: string;
}

export type AgentContextCategory = 'rules' | 'skills' | 'hooks' | 'specs-active' | 'specs-completed' | 'adrs';

export interface AgentContextFile {
  category: AgentContextCategory;
  /** ファイル名（例: 00-agent-constitution.md） */
  name: string;
  /** プロジェクトルートからの相対パス（表示用） */
  path: string;
  /** 読み込んだ内容の文字数 */
  charCount: number;
  /** 元ファイルのバイトサイズ */
  size: number;
  content: string;
  /** サイズ上限を超えたため先頭のみ読み込んだ場合 true */
  truncated: boolean;
}
