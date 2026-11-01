import { getDb } from './index.ts';
import { seedIfEmpty } from './seed.ts';

seedIfEmpty(getDb());
console.log('seed: done');
