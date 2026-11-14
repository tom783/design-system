# R10-B · `toBeVisible()` 단언이 진입 전환을 기다리지 않는다

**컴포넌트는 정상이다. 고칠 것은 스토리 단언 하나다.**

## 1. 무슨 일이 일어났나

`peek.stories.tsx` 의 `줄수초과` play 가 실패한다:

```
expect(element).toBeVisible()
Received element is not visible:
  <div data-peek="" data-place="css" data-slot="guide-bubble" popover="manual" role="dialog" … />
```

말풍선은 `guide.css` 에서 `opacity: 0` 으로 시작해 `:popover-open` + `@starting-style`
로 **140ms(`--dur-fast`) 동안 페이드인**한다. `showPopover()` 직후에 단언하면
계산된 `opacity` 가 아직 0 에 가까워서 `toBeVisible()` 이 거짓 실패한다.

**내가 브라우저에서 전환이 끝난 뒤를 측정했다 — 정상이다:**
```
{ 열림: true, opacity: "1", display: "block", 크기: [386, 328], dd: 7 }
```

같은 이유로 `guide.stories.tsx` 는 `toBeVisible()` 을 쓰지 않고
`matches(':popover-open')` 를 본다. 그게 이 시스템의 방식이다.

## 2. 할 일

`줄수초과` play 의 이 줄을 고쳐라:

```ts
await expect(c.getByRole('dialog')).toBeVisible();
```

`guide.stories.tsx` 가 쓰는 방식(`:popover-open` 확인)에 맞춰라.
**전환 시간을 기다리는 `sleep` 을 넣어 통과시키지 마라** — 느린 기기에서 다시 깨진다.
열렸다는 사실 자체를 보는 단언으로 바꾸는 것이 맞다.

`peek.stories.tsx` 의 **다른 스토리에도 같은 패턴이 있으면 함께 고쳐라.**
먼저 `grep -n "toBeVisible" packages/ui/src/stories/peek.stories.tsx` 로 확인하라.

기존의 다른 단언(dd 7개, 경고 발생 등)은 **지우지 마라.**

## 3. 하지 마라

- `guide.css` 의 전환·`@starting-style` 수정 — 이건 R07 에서 실측으로 확정했고
  브라우저 검증 30건이 걸려 있다
- `peek.tsx` 수정 — 컴포넌트는 정상이다
- 단언을 약하게 만들어 통과시키는 것 (검사 자체를 지우는 것 포함)
- 커밋 · 푸시

## 4. 완료 조건

```bash
pnpm verify
node --test packages/ui/src/components/peek/*.test.mjs
```

## 5. 보고할 것

- 바꾼 줄 (before / after)
- `toBeVisible` 이 더 있었는지, 있었다면 어디
