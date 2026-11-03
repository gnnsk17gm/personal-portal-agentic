import type { ScheduleEvent } from '@/types/portal';

export interface ScheduleProvider {
  getTodayEvents(): ScheduleEvent[];
}

export const DEFAULT_SCHEDULE_EVENTS: readonly ScheduleEvent[] = [
  {
    id: 'event-1',
    time: '10:00 - 11:00',
    title: '週次プランニング',
    category: 'meeting',
  },
  {
    id: 'event-2',
    time: '13:30 - 15:00',
    title: 'ポートフォリオ実装（Spec 005）',
    category: 'focus',
  },
  {
    id: 'event-3',
    time: '17:00 - 17:30',
    title: '振り返りとログ整理',
    category: 'personal',
  },
];

export class LocalScheduleProvider implements ScheduleProvider {
  private readonly events: ScheduleEvent[];

  constructor(events: ScheduleEvent[] = [...DEFAULT_SCHEDULE_EVENTS]) {
    this.events = events;
  }

  getTodayEvents(): ScheduleEvent[] {
    return [...this.events];
  }
}

export const defaultScheduleProvider = new LocalScheduleProvider();

export function getTodayEvents(provider: ScheduleProvider = defaultScheduleProvider): ScheduleEvent[] {
  return provider.getTodayEvents();
}
