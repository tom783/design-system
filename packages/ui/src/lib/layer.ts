import { runtimeTokens } from './runtime-tokens';

// R32: 안내 레이어와 같은 4px 그리드 두 칸. 화면 경계와 패널 윤곽이 붙지 않게 한다.
// 값은 생성 상수에서 읽는다 — tokens.json 전체를 import 하면 앱 번들에 그대로 들어간다(목표 57).
export const layerCollisionPadding = parseFloat(runtimeTokens.sizing['anchor-edge-pad']);
