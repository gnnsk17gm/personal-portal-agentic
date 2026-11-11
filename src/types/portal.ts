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

export interface ScoredCapture extends CapturePreview {
  score?: number;
}

export interface RankedCapture extends CapturePreview {
  score: number;
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

export interface ScheduleEvent {
  id: string;
  time: string; // 例: "10:00 - 11:00"
  title: string;
  category: 'meeting' | 'focus' | 'personal';
}

export interface EnrichedTask {
  id: number;
  title: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  dueDate: string | null;
  relevantNotes?: {
    id: number;
    content: string;
    score: number;
  }[];
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
  enrichedTasks: EnrichedTask[]; // 高優先度タスクと関連ノート（RAG濃縮）
  markdownPayload: string;      // AI注入用の構造化Markdown
  charCount: number;
  estimatedTokens: number;      // 例: Math.ceil(charCount / 3) 等の概算
  truncated: boolean;           // 予算上限により切り詰めが発生したか
}

export type AgentRunStatus = 'running' | 'completed' | 'failed';
export type AgentStepStatus = 'success' | 'error';
export type AgentRole = 'researcher' | 'planner' | 'critic' | 'orchestrator';

export interface AgentRunPreview {
  id: number;
  goal: string;
  status: AgentRunStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface AgentStepPreview {
  id: number;
  runId: number;
  stepName: string;
  status: AgentStepStatus;
  detail: string;
  agentRole: AgentRole;
  createdAt: string;
}

export interface AgentRunDetail extends AgentRunPreview {
  steps: AgentStepPreview[];
}

export interface DecomposedTaskCandidate {
  title: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;
}

export interface SubagentReport<T> {
  agentRole: AgentRole;
  summary: string;
  data: T;
}

export interface CriticEvaluation {
  approved: boolean;
  adjustmentsMade: string[];
  finalTasks: DecomposedTaskCandidate[];
}

export interface DecompositionResult {
  run: AgentRunPreview;
  steps: AgentStepPreview[];
  createdTasks: TaskPreview[];
}

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface SweepReport {
  status: HealthStatus;
  summary: string;
  overdueTasksCount: number;
  highPriorityPendingCount: number;
  totalPendingCount: number;
  recommendations: string[];
  sweptAt: string;
}

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

export interface AgentDailyActivity {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface AgentSystemMetrics {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  runningRuns: number;
  activeSubagents: number;
  successRate: number; // 0 - 100 (%) 切り捨て
  roleBreakdown: {
    researcher: number;
    planner: number;
    critic: number;
    orchestrator: number;
  };
  recentActivity: AgentDailyActivity[];
}

export interface ScenarioResult {
  injectedCount: number;
  sweepStatus: HealthStatus;
  remediationPlanCount: number;
}





