import fengqiao from './poems/fengqiao.json';
import jiangxue from './poems/jiangxue.json';
import baidicheng from './poems/baidicheng.json';
export const poems = [fengqiao, jiangxue, baidicheng];
export type Poem = (typeof poems)[number];
export const findPoem = (id: string): Poem | undefined => poems.find((poem) => poem.id === id);
