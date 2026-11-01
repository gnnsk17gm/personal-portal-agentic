import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type AppDb } from '@/db';
import { createTask, deleteTask, getAllTasks, toggleTaskStatus } from '@/services/taskService';

describe('taskService', () => {
  let db: AppDb;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('createTask', () => {
    it('タスクを作成し、既定値（medium / todo / 期限なし）が入る', () => {
      const task = createTask({ title: '買い物' }, db);
      expect(task).toMatchObject({ title: '買い物', priority: 'medium', status: 'todo', dueDate: null });
      expect(task.id).toBeGreaterThan(0);
      expect(getAllTasks(db)).toHaveLength(1);
    });

    it('優先度と期限日を指定でき、タイトルは前後の空白が除去される', () => {
      const task = createTask({ title: '  資料作成  ', priority: 'high', dueDate: '2026-12-31' }, db);
      expect(task).toMatchObject({ title: '資料作成', priority: 'high', dueDate: '2026-12-31' });
    });

    it('期限日が空文字なら null として保存される', () => {
      expect(createTask({ title: 'a', dueDate: '' }, db).dueDate).toBeNull();
    });

    it('空・空白のみのタイトルはエラー', () => {
      expect(() => createTask({ title: '' }, db)).toThrow();
      expect(() => createTask({ title: '   ' }, db)).toThrow();
      expect(getAllTasks(db)).toHaveLength(0);
    });

    it('不正な優先度・期限日形式はエラー', () => {
      expect(() => createTask({ title: 'a', priority: 'urgent' as never }, db)).toThrow();
      expect(() => createTask({ title: 'a', dueDate: '2026/12/31' }, db)).toThrow();
      expect(() => createTask({ title: 'a', dueDate: '2026-02-30' }, db)).toThrow();
    });
  });

  describe('getAllTasks', () => {
    it('空のDBでは空配列', () => {
      expect(getAllTasks(db)).toEqual([]);
    });

    it('優先度順（high → medium → low）に並ぶ', () => {
      createTask({ title: 'low', priority: 'low' }, db);
      createTask({ title: 'high', priority: 'high' }, db);
      createTask({ title: 'medium', priority: 'medium' }, db);
      expect(getAllTasks(db).map((t) => t.title)).toEqual(['high', 'medium', 'low']);
    });
  });

  describe('toggleTaskStatus', () => {
    it('todo → done → todo と切り替わる', () => {
      const { id } = createTask({ title: 'a' }, db);
      toggleTaskStatus(id, db);
      expect(getAllTasks(db)[0].status).toBe('done');
      toggleTaskStatus(id, db);
      expect(getAllTasks(db)[0].status).toBe('todo');
    });

    it('存在しないIDでは何も起きない', () => {
      createTask({ title: 'a' }, db);
      expect(() => toggleTaskStatus(9999, db)).not.toThrow();
      expect(getAllTasks(db)[0].status).toBe('todo');
    });
  });

  describe('deleteTask', () => {
    it('指定タスクだけを削除する', () => {
      const a = createTask({ title: 'a' }, db);
      createTask({ title: 'b' }, db);
      expect(deleteTask(a.id, db)).toBe(true);
      expect(getAllTasks(db).map((t) => t.title)).toEqual(['b']);
    });

    it('存在しないIDでは false を返す', () => {
      expect(deleteTask(9999, db)).toBe(false);
    });
  });
});
