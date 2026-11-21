import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveManifestComponent } from '../../packages/ui/docs/_manifest-data.ts';
import { restoreComponent } from '../../packages/mcp/catalog.mjs';

const manifest = JSON.parse(readFileSync(new URL('../../packages/mcp/manifest.json', import.meta.url), 'utf8'));

test('ManifestProps: 사라진 이름은 빈 표 대신 렌더 전에 실패한다', () => {
  assert.throws(() => resolveManifestComponent(manifest.components, manifest.derived, 'MissingComponent'), /매니페스트.*MissingComponent/);
});
test('ManifestProps: 모든 API는 MCP와 동일하게 복원하며 매니페스트를 변경하지 않는다', () => {
  const before = structuredClone(manifest);
  for (const entry of manifest.components) {
    const result = resolveManifestComponent(manifest.components, manifest.derived, entry.name);
    assert.deepEqual(result, restoreComponent(entry, manifest.derived, manifest.components));
  }
  assert.deepEqual(manifest, before);
  const slide = resolveManifestComponent(manifest.components, manifest.derived, 'CarouselSlide');
  assert.deepEqual(slide.props, []);
  assert.deepEqual(slide.extends, ["React.ComponentProps<'div'>"], 'props 0개여도 상속 계약을 보존한다');
  const trend = resolveManifestComponent(manifest.components, manifest.derived, 'TrendBand');
  assert.ok(trend.props.find(prop => prop.name === 'yLow').doc, '차트 접근자의 JSDoc 보존');
  const carousel = resolveManifestComponent(manifest.components, manifest.derived, 'Carousel');
  assert.equal(carousel.props.find(prop => prop.name === 'label').required, true);
  assert.equal(carousel.props.find(prop => prop.name === 'className').type, 'string | undefined');
});
