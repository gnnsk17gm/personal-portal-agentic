import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { resolveDatabasePath } from '../index.ts';

describe('resolveDatabasePath', () => {
  it('NODE_ENV が test の場合は常に :memory: を返す', () => {
    const result = resolveDatabasePath({
      nodeEnv: 'test',
      databasePath: '/custom/path/sqlite.db',
      cwd: '/mock/cwd',
    });
    expect(result).toBe(':memory:');
  });

  it('DATABASE_PATH が指定されている場合はそのパスを返す', () => {
    const result = resolveDatabasePath({
      nodeEnv: 'production',
      databasePath: '/app/data/sqlite.db',
      cwd: '/mock/cwd',
    });
    expect(result).toBe('/app/data/sqlite.db');
  });

  it('DATABASE_PATH が未指定かつ test 以外の場合は cwd 配下の sqlite.db を返す', () => {
    const result = resolveDatabasePath({
      nodeEnv: 'development',
      databasePath: undefined,
      cwd: '/mock/cwd',
    });
    expect(result).toBe(path.join('/mock/cwd', 'sqlite.db'));
  });

  it('DATABASE_PATH が空文字の場合は未指定として扱い cwd 配下の sqlite.db を返す', () => {
    const result = resolveDatabasePath({
      nodeEnv: 'production',
      databasePath: '   ',
      cwd: '/mock/cwd',
    });
    expect(result).toBe(path.join('/mock/cwd', 'sqlite.db'));
  });
});

