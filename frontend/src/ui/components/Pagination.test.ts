import { describe, expect, it } from 'vitest';
import { listPageSize, paginate } from './Pagination';

describe('poem pagination', () => {
  const poems = Array.from({ length: 32 }, (_, index) => index);
  it('keeps exactly three rows at each responsive column count', () => {
    expect([390, 600, 1024, 1440, 1920].map(listPageSize)).toEqual([3, 6, 9, 12, 15]);
  });
  it('moves across all pages without omissions or duplicates', () => {
    const pages = [1, 2, 3].map((page) => paginate(poems, page, 12));
    expect(pages.map((page) => page.items.length)).toEqual([12, 12, 8]);
    expect(pages.flatMap((page) => page.items)).toEqual(poems);
  });
  it('clamps the last page after removing items and handles an empty collection', () => {
    expect(paginate(poems.slice(0, 12), 3, 12).page).toBe(1);
    expect(paginate([], 0, 12)).toMatchObject({ items: [], page: 1, pageCount: 1, total: 0 });
  });
});
