import { expect, it } from 'vitest';
import { poems } from './catalog';
import { orderedPoems } from './orderedPoems';
import { normalizeLibrary } from '../stores/LibraryStore';
it('uses the selected sort order while preserving the catalog', () => {
  const data=normalizeLibrary({version:1,visits:[{id:'baidicheng',at:'2026-10-06T00:00:00Z'}]});
  data.preferences.sort='recent'; expect(orderedPoems(poems,data)[0].id).toBe('baidicheng');
  expect(poems[0].id).toBe('fengqiao');
});
it('uses reading signals only after recommendation and personalization consent', () => {
  const data=normalizeLibrary({version:1,favorites:['baidicheng']});
  expect(orderedPoems(poems,data,true)[0].id).toBe('fengqiao');
  data.privacy.personalization=true; expect(orderedPoems(poems,data,true)[0].id).toBe('baidicheng');
  data.preferences.recommend=false; expect(orderedPoems(poems,data,true)[0].id).toBe('fengqiao');
});
