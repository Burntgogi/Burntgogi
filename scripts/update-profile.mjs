import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const START = '<!-- AUTO:BUILDER-INDEX:START -->';
const END = '<!-- AUTO:BUILDER-INDEX:END -->';

export function selectRepositories(repositories, config) {
  const excluded = new Set([config.owner.toLowerCase(), ...(config.exclude_repositories ?? []).map(name => name.toLowerCase())]);
  const eligible = repositories.filter(repo =>
    repo.owner?.login?.toLowerCase() === config.owner.toLowerCase() &&
    repo.visibility === 'public' && !repo.private && !repo.fork && !repo.archived && !repo.disabled &&
    !excluded.has(repo.name.toLowerCase())
  );
  const byName = (a, b) => a.name.localeCompare(b.name, 'en');
  const top = [...eligible].sort((a, b) => b.stargazers_count - a.stargazers_count || byName(a, b)).slice(0, config.top_count);
  const selected = new Set(top.map(repo => repo.name));
  // pushed_at tracks code pushes; updated_at also changes when a repository gets a star.
  const recent = eligible.filter(repo => !selected.has(repo.name) && repo.pushed_at)
    .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at) || byName(a, b))
    .slice(0, config.recent_count);
  return { eligible, top, recent };
}

function plain(value = '') {
  return String(value).replace(/\s+/g, ' ').trim().replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replace(/([\\`*_{}\[\]()#!|])/g, '\\$1');
}

function publicUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function link(label, url) {
  const safe = publicUrl(url);
  if (!safe) throw new Error(`Invalid public URL for ${label}`);
  return `[${plain(label)}](<${safe}>)`;
}

function describe(repo, config) {
  return plain(config.descriptions?.[repo.name] ?? repo.description ?? '');
}

function pagesTable(pages) {
  return ['| Page | About |', '| --- | --- |', ...pages.map(page => `| ${link(page.title, page.url)} | ${plain(page.description)} |`)].join('\n');
}

function isExcludedPage(url, config) {
  const safe = publicUrl(url);
  return safe && (config.exclude_page_slugs ?? []).includes(new URL(safe).hostname.split('.')[0]);
}

function visiblePages(pages, config) {
  return (pages ?? []).filter(page => !isExcludedPage(page.url, config));
}

function benchmarkGroups(config) {
  return (config.benchmark_groups ?? []).map(group => ({ ...group, pages: visiblePages(group.pages, config) })).filter(group => group.pages.length);
}

function renderBenchmarks(config, level) {
  const groups = benchmarkGroups(config);
  if (!groups.length) return [];
  const lines = [`${'#'.repeat(level)} BENCHMARKS`, ''];
  for (const group of groups) {
    lines.push(`${'#'.repeat(level + 1)} ${plain(group.title)}`, '');
    if (group.description) lines.push(plain(group.description), '');
    lines.push(pagesTable(group.pages), '');
  }
  return lines;
}

export function collectOpenSourcePages(eligible, config) {
  const reserved = new Set([...visiblePages(config.web_pages, config), ...benchmarkGroups(config).flatMap(group => group.pages)].map(page => publicUrl(page.url)));
  const pages = visiblePages(config.open_source_pages, config).filter(page => !reserved.has(publicUrl(page.url)));
  const used = new Set([...reserved, ...pages.map(page => publicUrl(page.url))]);
  for (const repo of [...eligible].sort((a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name, 'en'))) {
    const url = publicUrl(repo.homepage);
    if (url && !used.has(url) && !isExcludedPage(url, config)) {
      pages.push({ title: repo.name, url, description: config.descriptions?.[repo.name] ?? repo.description ?? '', repository: repo.html_url });
      used.add(url);
    }
  }
  return pages;
}

export function renderIndex(selection, config) {
  const { top, recent, eligible } = selection;
  const lines = ['### MOST STARRED', '', '| Repository | Stars | About |', '| --- | ---: | --- |'];
  for (const repo of top) lines.push(`| **${link(repo.name, repo.html_url)}** | ⭐ ${repo.stargazers_count} | ${describe(repo, config)} |`);
  lines.push('', '### RECENTLY UPDATED', '');
  for (const repo of recent) {
    lines.push(`- **${link(repo.name, repo.html_url)}** — ${describe(repo, config)}<br>`, `  Last code push: ${repo.pushed_at.slice(0, 10)} · ⭐ ${repo.stargazers_count}`);
  }
  if (!recent.length) lines.push('More projects are on the way.');
  lines.push('', `[View all public repositories →](https://github.com/${config.owner}?tab=repositories&sort=stargazers)`, '',
    '### WEB PAGES', '', pagesTable(visiblePages(config.web_pages, config)), '', ...renderBenchmarks(config, 3), '### OPEN-SOURCE PAGES', '');
  const openSourcePages = collectOpenSourcePages(eligible, config);
  if (openSourcePages.length) lines.push(pagesTable(openSourcePages), '');
  lines.push(`[Browse the web & open-source showcase →](https://github.com/${config.owner}/${config.owner}/blob/main/PROJECTS.md)`, '',
    `<sub>Top ${config.top_count} by stars + ${config.recent_count} recently updated project · refreshed every 6 hours.</sub>`);
  return lines.join('\n');
}

export function replaceIndex(readme, index) {
  if (readme.split(START).length !== 2 || readme.split(END).length !== 2 || readme.indexOf(START) > readme.indexOf(END)) {
    throw new Error('README must contain exactly one valid AUTO:BUILDER-INDEX marker pair.');
  }
  return readme.slice(0, readme.indexOf(START) + START.length) + '\n\n' + index + '\n\n' + readme.slice(readme.indexOf(END));
}

export function renderShowcase(selection, config) {
  const openSourcePages = collectOpenSourcePages(selection.eligible, config);
  return [
    '# WEB & OPEN-SOURCE SHOWCASE', '', `[← GitHub profile](https://github.com/${config.owner})`, '',
    '## Web pages', '', pagesTable(visiblePages(config.web_pages, config)), '', ...renderBenchmarks(config, 2), '## Open-source pages', '',
    openSourcePages.length ? pagesTable(openSourcePages) : '프로젝트 소개, 문서, 데모, GitHub Pages를 모아둘 공간입니다.', '',
    '공개 원본 저장소의 About → Website에 주소를 등록하면 이 목록과 프로필에 자동으로 추가됩니다. 포크·보관 저장소는 제외합니다.', '',
    '저장소와 별개로 만든 오픈소스 소개 페이지는 `profile.config.json`의 `open_source_pages`에 추가할 수 있습니다.', '',
    '[목록 관리와 자동 갱신 설정](docs/PROFILE.md)', ''
  ].join('\n');
}

async function fetchRepositories(owner) {
  const repositories = [];
  for (let page = 1; ; page++) {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(owner)}/repos?type=owner&per_page=100&page=${page}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Burntgogi-profile-updater', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) throw new Error(`GitHub repository request failed: ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('GitHub returned an invalid repository list.');
    repositories.push(...batch);
    if (batch.length < 100) return repositories;
  }
}

async function main() {
  const config = JSON.parse(await readFile(resolve(ROOT, 'profile.config.json'), 'utf8'));
  if (!Number.isInteger(config.top_count) || config.top_count < 1 || !Number.isInteger(config.recent_count) || config.recent_count < 0) throw new Error('Invalid repository counts.');
  const fixtureIndex = process.argv.indexOf('--repos');
  const repositories = fixtureIndex === -1 ? await fetchRepositories(config.owner) : JSON.parse((await readFile(process.argv[fixtureIndex + 1], 'utf8')).replace(/^\uFEFF/, ''));
  const selection = selectRepositories(repositories, config);
  if (!selection.top.length) throw new Error('No public repositories found; existing profile was preserved.');
  const readmePath = resolve(ROOT, 'README.md');
  // Build both outputs before writing so malformed URLs cannot leave a partial update.
  const readme = replaceIndex(await readFile(readmePath, 'utf8'), renderIndex(selection, config));
  const showcase = renderShowcase(selection, config);
  for (const [path, output] of [[readmePath, readme], [resolve(ROOT, 'PROJECTS.md'), showcase]]) {
    const current = await readFile(path, 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error; });
    if (current !== output) await writeFile(path, output);
  }
  console.log(JSON.stringify({ top: selection.top.map(repo => repo.name), recent: selection.recent.map(repo => repo.name) }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
