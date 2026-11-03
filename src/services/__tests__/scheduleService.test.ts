import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCHEDULE_EVENTS,
  LocalScheduleProvider,
  getTodayEvents,
  type ScheduleProvider,
} from '@/services/scheduleService';
import type { ScheduleEvent } from '@/types/portal';

describe('scheduleService', () => {
  it('デフォルトプロバイダーから本日の予定一覧を取得できる', () => {
    const events = getTodayEvents();
    expect(events).toEqual(DEFAULT_SCHEDULE_EVENTS);
    expect(events.length).toBe(3);
    expect(events[0]).toMatchObject({
      id: 'event-1',
      time: '10:00 - 11:00',
      title: '週次プランニング',
      category: 'meeting',
    });
  });

  it('カスタムイベントを注入したLocalScheduleProviderを利用できる', () => {
    const customEvents: ScheduleEvent[] = [
      { id: 'custom-1', time: '09:00 - 10:00', title: '朝会', category: 'meeting' },
    ];
    const provider = new LocalScheduleProvider(customEvents);
    expect(getTodayEvents(provider)).toEqual(customEvents);
  });

  it('モックプロバイダーを差し替えて予定を取得できる（Providerパターン検証）', () => {
    const mockProvider: ScheduleProvider = {
      getTodayEvents: () => [
        { id: 'mock-1', time: '14:00 - 15:00', title: '外部API連携予定', category: 'focus' },
      ],
    };
    const events = getTodayEvents(mockProvider);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('外部API連携予定');
  });
});
