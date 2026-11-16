import { Combobox } from './combobox';

// 공개 API는 multiple 판별만으로 콜백과 value를 추론해야 한다.
function contract() {
  <Combobox options={[]} value="one" onValueChange={value => value.toUpperCase()} />;
  <Combobox options={[]} multiple={false} value="one" />;
  <Combobox options={[]} multiple value={['one']} onValueChange={value => value.map(item => item.toUpperCase())} />;
  // @ts-expect-error 단일 값은 배열을 받지 않는다.
  <Combobox options={[]} value={['one']} />;
  // @ts-expect-error multiple 값은 문자열을 받지 않는다.
  <Combobox options={[]} multiple value="one" />;
  // @ts-expect-error multiple 콜백은 배열이다.
  <Combobox options={[]} multiple onValueChange={(value: string) => value.toUpperCase()} />;
}
void contract;
