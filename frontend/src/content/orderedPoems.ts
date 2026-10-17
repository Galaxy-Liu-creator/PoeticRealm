import { type Poem } from './catalog';
import type { LibraryData } from '../stores/LibraryStore';
export function orderedPoems(collection: Poem[], data: LibraryData, recommendations = false): Poem[] {
  const result = [...collection];
  const lastVisit = (id: string): number => Date.parse(data.visits.find(visit => visit.id === id)?.at || '') || 0;
  if (data.preferences.sort === 'title') result.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
  else if (data.preferences.sort === 'recent') result.sort((a, b) => lastVisit(b.id) - lastVisit(a.id));
  else if (recommendations && data.preferences.recommend && data.privacy.personalization) {
    // The small launch catalog uses favorite and recent reading signals locally.
    const score = (id: string): number => Number(data.favorites.includes(id)) * 2 + Number(lastVisit(id) > 0);
    result.sort((a, b) => score(b.id) - score(a.id));
  }
  return result;
}
