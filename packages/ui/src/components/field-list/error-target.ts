/**
 * FormActionBar '오류 N개'가 반복 입력 줄(FieldList)의 묶음 오류를 만났을 때 포커스할 곳(규칙 표 L-15).
 * fieldset 은 포커스를 받지 못하므로 그 안에서 고른다 — 빈 목록이면 추가 버튼, 아니면 첫 오류 칸, 오류 칸이
 * 없으면(최대 초과 등) 첫 줄 첫 칸. FieldList 본체를 가져오지 않도록 따로 둔다(FormActionBar 번들에 줄 부품이
 * 실리지 않게).
 */
export function fieldListErrorTarget(list: Element): HTMLElement | null {
  const add = list.querySelector<HTMLElement>('[data-slot="field-list-add"]:not([disabled])');
  const rows = list.querySelectorAll('[data-slot="field-list-row"]');
  if (rows.length === 0) return add;
  return list.querySelector<HTMLElement>('[data-slot="field-list-row"] [aria-invalid="true"]:not([disabled])')
    ?? rows[0]!.querySelector<HTMLElement>('[data-slot="field-list-cell"] :is(input, textarea, select, button):not([disabled]):not([type="hidden"]):not([aria-hidden="true"]):not([tabindex="-1"])')
    ?? add;
}
