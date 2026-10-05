import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRepositories, collectOpenSourcePages, renderIndex, replaceIndex } from './update-profile.mjs';

const config = { owner: 'Burntgogi', top_count: 4, recent_count: 1, web_pages: [], open_source_pages: [] };
const repo = (name, stars, pushed, extra = {}) => ({ name, stargazers_count: stars, pushed_at: pushed, owner: { login: 'Burntgogi' }, visibility: 'public', html_url: `https://github.com/Burntgogi/${name}`, ...extra });

test('selects four by stars and a distinct latest code push, not metadata updates', () => {
  const data = [repo('a', 31, '2026-01-01'), repo('b', 10, '2026-01-01'), repo('c', 5, '2026-01-01'), repo('d', 3, '2026-01-01'), repo('older', 2, '2026-01-02', { updated_at: '2026-10-05' }), repo('new-project', 0, '2026-10-05')];
  const selected = selectRepositories(data, config);
  assert.deepEqual(selected.top.map(r => r.name), ['a', 'b', 'c', 'd']);
  assert.deepEqual(selected.recent.map(r => r.name), ['new-project']);
  const promoted = selectRepositories([...data, repo('breakout', 100, '2026-10-06')], config);
  assert.equal(promoted.top[0].name, 'breakout');
  assert.equal(promoted.recent[0].name, 'new-project');
});

test('excludes self, private, forks, archives, other owners and explicit exclusions', () => {
  const selected = selectRepositories([repo('Burntgogi', 100, '2026-10-05'), repo('private', 100, '2026-10-05', { visibility: 'private' }), repo('fork', 100, '2026-10-05', { fork: true }), repo('archived', 100, '2026-10-05', { archived: true }), repo('foreign', 100, '2026-10-05', { owner: { login: 'someone' } }), repo('skip', 100, '2026-10-05'), repo('good', 1, '2026-10-05')], { ...config, exclude_repositories: ['SKIP'] });
  assert.deepEqual(selected.eligible.map(r => r.name), ['good']);
});

test('ties are stable and smaller accounts do not duplicate featured repositories', () => {
  const selected = selectRepositories([repo('z', 1, '2026-10-05'), repo('a', 1, '2026-10-05')], config);
  assert.deepEqual(selected.top.map(r => r.name), ['a', 'z']);
  assert.deepEqual(selected.recent, []);
});

test('collects public project homepages, deduplicates them, rejects executable URLs', () => {
  const pages = collectOpenSourcePages([repo('first', 2, '', { homepage: 'https://example.com/' }), repo('same', 1, '', { homepage: 'https://example.com/' }), repo('bad', 0, '', { homepage: 'javascript:alert(1)' })], config);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].title, 'first');
});

test('preserves surrounding README, escapes descriptions, and fails closed on missing markers', () => {
  const selection = selectRepositories([repo('project', 1, '2026-10-05', { description: '<script> | [unexpected](url)\nnext' })], config);
  const output = renderIndex(selection, config);
  assert.ok(output.includes('&lt;script&gt; \\| \\[unexpected\\]'));
  const readme = 'Header\n<!-- AUTO:BUILDER-INDEX:START -->\nold\n<!-- AUTO:BUILDER-INDEX:END -->\nFooter';
  const updated = replaceIndex(readme, output);
  assert.ok(updated.startsWith('Header\n'));
  assert.ok(updated.endsWith('\nFooter'));
  assert.equal(replaceIndex(updated, output), updated);
  assert.throws(() => replaceIndex('missing', output), /marker/);
});
