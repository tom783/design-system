import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { splitIconChildren } from './button-label.ts';

const Icon = (props) => React.createElement('svg', props);
const names = (nodes) => React.Children.toArray(nodes).map((node) => typeof node === 'string' ? node : node.type === Icon ? 'Icon' : node.type);

test('맨 앞·맨 뒤 아이콘 컴포넌트는 라벨 밖으로, 글은 라벨에 남긴다', () => {
  const lead = splitIconChildren([React.createElement(Icon, { key: 'a' }), '패키지 소비']);
  assert.equal(lead.lead.type, Icon);
  assert.deepEqual(names(lead.label), ['패키지 소비']);
  assert.equal(lead.trail, undefined);
  const both = splitIconChildren([React.createElement(Icon, { key: 'a' }), '열기', React.createElement('svg', { key: 'b' })]);
  assert.equal(both.lead.type, Icon);
  assert.equal(both.trail.type, 'svg');
  assert.deepEqual(names(both.label), ['열기']);
});
test('아이콘 하나뿐이거나 아이콘만 있으면 그대로 둔다(iconOnly)', () => {
  const only = React.createElement(Icon);
  assert.equal(splitIconChildren(only).label, only);
  assert.equal(splitIconChildren(only).lead, undefined);
  const icons = [React.createElement(Icon, { key: 'a' }), React.createElement(Icon, { key: 'b' })];
  assert.equal(splitIconChildren(icons).label, icons);
});
test('HTML 글 요소와 문자열 라벨은 라벨에 남긴다', () => {
  assert.equal(splitIconChildren('저장').lead, undefined);
  const strong = splitIconChildren([React.createElement('strong', { key: 'a' }, '3'), '건 선택']);
  assert.equal(strong.lead, undefined);
  assert.deepEqual(names(strong.label), ['strong', '건 선택']);
  const single = React.createElement('span', null, '바꾸기');
  assert.equal(splitIconChildren(single).label, single);
});
