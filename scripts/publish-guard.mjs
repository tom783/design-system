// 배포는 사람이 명시적으로 허가할 때만 한다.
//
// 지금은 "배포할 수 있게 준비만" 하는 단계다. 준비가 끝나면 손이 미끄러져
// `npm publish` 가 나가기 쉬우므로 여기서 막는다.
//
// 허가하는 법:
//   S2LIFE_PUBLISH=1 npm publish --workspace packages/ui
//
// 레지스트리도 아직 정하지 않았다. 정해지면 각 package.json 의
// publishConfig.registry 를 한 줄 바꾸면 된다 (DESIGN.md 15.8).
const name = process.env.npm_package_name ?? '(알 수 없음)';
if (process.env.S2LIFE_PUBLISH !== '1') {
  console.error(`\n✗ ${name} 배포가 막혔습니다.\n`);
  console.error('  아직 배포 단계가 아닙니다. 사람이 허가하면 이렇게 실행합니다:');
  console.error('    S2LIFE_PUBLISH=1 npm publish --workspace packages/<이름>\n');
  console.error('  레지스트리(GitHub Packages vs npmjs)도 아직 정해지지 않았습니다.\n');
  process.exit(1);
}
console.error(`• ${name}: S2LIFE_PUBLISH=1 확인됨. 배포를 진행합니다.`);
