export function listPageSize(width: number): number {
  const columns = width >= 1760 ? 5 : width >= 1100 ? 4 : width >= 760 ? 3 : width >= 520 ? 2 : 1;
  return columns * 3;
}

export function paginate<T>(items: readonly T[], requestedPage = 1, pageSize = 12) {
  const size = Math.max(1, Math.trunc(pageSize) || 1);
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(pageCount, Math.max(1, Math.trunc(requestedPage) || 1));
  return { items: items.slice((page - 1) * size, page * size), page, pageCount, pageSize: size, total: items.length };
}

export function pagination({ page, pageCount, pageSize, total }: ReturnType<typeof paginate>): string {
  return `<nav class="pagination" aria-label="诗词分页"><span class="pagination-count" role="status">共 ${total} 首 · 每页最多 ${pageSize} 首</span>
    <button type="button" data-page-step="-1" ${page === 1 ? 'disabled' : ''} aria-label="上一页">← 上一页</button>
    <form class="page-jump" data-page-jump novalidate><label>第 <input type="text" inputmode="numeric" pattern="[0-9]+" data-list-page data-page-count="${pageCount}" aria-label="输入页码" title="输入页码后按回车跳转" value="${page}" autocomplete="off"> 页 / ${pageCount} 页</label></form>
    <button type="button" data-page-step="1" ${page === pageCount ? 'disabled' : ''} aria-label="下一页">下一页 →</button></nav>`;
}
