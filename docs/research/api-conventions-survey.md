# 공개 API 조사 — 목표 49 (2026-11-23)

`@s2life/ui` 공개 API를 부품별로 센 기준선이다. 규약은 `DESIGN.md §6.3`, 검사는 `scripts/check-api-conventions.mjs`.
이 파일은 **고친 뒤 갱신하지 않는 스냅숏**이다. 지금 상태는 `node scripts/check-api-conventions.mjs --table`로 본다.

- 기준: `main` ddef6c1 (0.4.0 미게시) · 매니페스트 `packages/mcp/manifest.json` 115항목(부품 114 + 상수 1)
- 방법: 검사기를 빈 목록(공개 도우미·별칭·허용 0건)으로 돌린 위반 96건과 `--table` 출력. 공개 export 전수(224개 —
  값 143 · 타입 81)는 TypeScript 검사기(`getExportsOfModule`)로 따로 셌다.

## 요약 — 전과 후

| 항목 | 기준선 (ddef6c1) | 목표 49 뒤 | 비고 |
|---|---|---|---|
| ref: `forwardRef` | 22개 부품 · 공개 파일 8개(+ 내부 Popover 1) | 0 | Button·Input·Textarea·Checkbox·FormRow·SideNavItem·Select 부품 7·DropdownMenu 부품 9 |
| ref: prop (`ComponentProps<…>` 등) | 50 | 86 | |
| ref: DOM을 펼치는데 ref 타입 없음 | 14 | 0 | Card 5·StatusChip·AppShell·SideNav·SideNavGroup·PageHeader·DropdownMenuShortcut·Field·StatTile·Pagination |
| ref: 받지 않음(합성 부품) | 28 | 28 | 규약상 정상(§6.3 규칙 3) |
| 값 알림을 `onChange`로 부름 | 1 (DatePicker) | 0 | `onValueChange` + deprecated 별칭 `onChange` |
| 제어 전용(`defaultX` 없음) | 9 | 10 (허용 목록) | DatePicker.value 는 `onValueChange`로 바꾸며 쌍으로 잡혔다. 설계상 3 · 값 없음 표현 2 · 필수 open 2 · 응답 재승인 대기 3 (아래) |
| 상태를 받는데 알림 없음 | 1 (Hint.open) | 1 (허용 목록) | 닫힘만 `onDismiss` |
| 루트 `index.ts`의 `export *` | 27 | 0 | 공개 이름 224개 그대로 |
| 소문자 값 export | 28 | 28 | 공개 도우미 16 · deprecated 12(기존 예고 8 + 이번 4) |

제어 전용 10개(허용 목록 `scripts/api-conventions-allow.mjs`):

| 부품.값 | 분류 | 이유 |
|---|---|---|
| FileUpload.value | 설계상 제어 | 업로드 상태·진행률을 앱이 항목마다 갱신한다 |
| Pagination.page · pageSize | 설계상 제어 | URL·조회와 동기화는 앱 몫(§4.1) |
| Combobox.value | 값 없음 표현 | 단일 모드는 value 생략 = 선택 없음. 다중 모드만 내부 상태가 있다 |
| DatePicker.value | 값 없음 표현 | value 생략 = 빈 기간. 비제어를 넣으면 앱이 필터를 비울 때 동작이 바뀐다 |
| Peek.open · MediaViewer.open | 필수 open | open·onOpenChange 가 필수 prop |
| ClampText.expanded · MultiSelect.value · DataTable.selectedIds | 응답 재승인 대기 | 내부 상태가 있어 `defaultX`는 초기값 한 줄이지만, 세 부품이 MCP get_component 기준선(R28)에 고정돼 있다 |

## 내부 도우미 노출

루트가 내보내는 소문자 값 28개. 부품이 아닌 공개 이름은 `helpers` 목록에 용도가 있어야 한다.

| 분류 | 이름 |
|---|---|
| 공개 도우미 (16) | `cn` · `buttonVariants` · `chipVariants` · `toast` · `comboboxFilter` · `useReturnContext` · `useDataTable` · `dataTableFeatures` · `createDataTableColumnHelper` · `createSelectionColumn` · `toCsv` · `downloadCsv` · `useDelayedLoading` · `useTour` · `useFormFlow` · `useComposition` |
| 0.4.0에서 이미 deprecated (8) | `placeFallback` · `resolveStep` · `useAnchored` · `supportsAnchor` · `nextFocusable` · `focusNextFormStop` · `shouldValidate` · `nextPhase` |
| 이번에 찾아 deprecated (4) | `initials`(Avatar 내부) · `encodeRecord` · `decodeRecord`(useReturnContext 저장 형식) · `useElementWidth`(ChartFrame 폭 측정) |

`initials`·`encodeRecord`·`decodeRecord`는 부품 폴더 `index.ts`가 내보낸 것이 루트 `export *`로 새어 나왔다.
`useElementWidth`는 차트 3종을 더할 때(a063ff7) 루트에 명시로 들어갔고 문서·스토리 사용처가 없다.

## 기준선 표 (ddef6c1)

값 열은 **자체 prop**만 본다 — Radix에서 상속한 `value`·`open` 등은 상속 열에 남는다. `✗`는 없는 이름.
DatePicker는 알림이 `onChange`라 값 쌍으로 잡히지 않고 "그 밖의 핸들러"에 있다.

| 부품 | 값 (X · defaultX · onXChange) | 그 밖의 핸들러 | ref | 상속 |
| --- | --- | --- | --- | --- |
| Steps | — | onStepClick | ref prop | `Omit<ComponentProps<'div'>, 'children'>` |
| SegmentedControl | value · defaultValue · onValueChange | — | ref prop | `Omit<React.ComponentProps<'div'>, 'defaultValue' \| 'onChange' \| 'children'>` |
| FileUpload | value · ✗ · onValueChange | — | 없음(합성) | `React.AriaAttributes` |
| Pagination | page · ✗ · onPageChange<br>pageSize · ✗ · onPageSizeChange | — | 미노출 | `Omit<React.ComponentPropsWithoutRef<'nav'>, 'children' \| 'onChange'>` |
| AppShell | — | — | 미노출 | `React.HTMLAttributes<HTMLDivElement>` |
| SideNav | collapsed · defaultCollapsed · onCollapsedChange | — | 미노출 | `React.HTMLAttributes<HTMLElement>` |
| SideNavGroup ⊂ SideNav | — | — | 미노출 | `React.HTMLAttributes<HTMLDivElement>` |
| SideNavItem ⊂ SideNav | — | — | forwardRef | `React.AnchorHTMLAttributes<HTMLAnchorElement>` |
| PageHeader | — | — | 미노출 | `Omit<React.HTMLAttributes<HTMLElement>, 'title' \| 'children'>` |
| Carousel | — | — | 없음(합성) | — |
| CarouselSlide ⊂ Carousel | — | — | ref prop | `React.ComponentProps<'div'>` |
| MediaViewer | open · ✗ · onOpenChange | — | 없음(합성) | — |
| Collapsible | — | — | ref prop | `React.ComponentProps<typeof Primitive.Root>` |
| CollapsibleTrigger ⊂ Collapsible | — | — | ref prop | `React.ComponentProps<typeof Primitive.Trigger>` |
| CollapsibleContent ⊂ Collapsible | — | — | ref prop | `React.ComponentProps<typeof Primitive.Content>` |
| ClampText | expanded · ✗ · onExpandedChange | — | ref prop | `React.ComponentProps<'div'>` |
| Combobox | value · ✗ · onValueChange | — | ref prop | `Pick<React.ComponentPropsWithRef<'button'>, 'id' \| 'className' \| 'aria-label' \| 'aria-labelledby' \| 'aria-describedby' \| 'aria-invalid' \| 'aria-required'>` |
| MultiSelect | value · ✗ · onValueChange | — | ref prop | `Pick<React.ComponentPropsWithRef<'button'>, 'id' \| 'ref' \| 'className' \| 'aria-label' \| 'aria-labelledby' \| 'aria-describedby' \| 'aria-invalid' \| 'aria-required'>` |
| Tabs | — | — | ref prop | `React.ComponentProps<typeof Primitive.Root>` |
| TabsList ⊂ Tabs | — | — | ref prop | `React.ComponentProps<typeof Primitive.List>` |
| TabsTrigger ⊂ Tabs | — | — | ref prop | `React.ComponentProps<typeof Primitive.Trigger>` |
| TabsContent ⊂ Tabs | — | — | ref prop | `React.ComponentProps<typeof Primitive.Content>` |
| Breadcrumb | — | — | ref prop | `React.ComponentProps<'nav'>` |
| BreadcrumbList ⊂ Breadcrumb | — | — | ref prop | `React.ComponentProps<'ol'>` |
| BreadcrumbItem ⊂ Breadcrumb | — | — | ref prop | `React.ComponentProps<'li'>` |
| BreadcrumbLink ⊂ Breadcrumb | — | — | ref prop | `React.ComponentProps<'a'>` |
| BreadcrumbPage ⊂ Breadcrumb | — | — | ref prop | `React.ComponentProps<'span'>` |
| BreadcrumbSeparator ⊂ Breadcrumb | — | — | ref prop | `React.ComponentProps<'li'>` |
| BreadcrumbEllipsis ⊂ Breadcrumb | — | — | ref prop | `React.ComponentProps<'span'>` |
| Dialog | — | — | 없음(합성) | — |
| DialogTrigger ⊂ Dialog | — | — | ref prop | `React.ComponentProps<typeof Primitive.Trigger>` |
| DialogContent ⊂ Dialog | — | onDismissAttempt | ref prop | `React.ComponentProps<typeof Primitive.Content>` |
| SheetContent ⊂ Dialog | — | onDismissAttempt | ref prop | `React.ComponentProps<typeof Primitive.Content>` |
| SheetBody ⊂ Dialog | — | — | ref prop | `React.ComponentProps<'div'>` |
| DialogHeader ⊂ Dialog | — | — | ref prop | `React.ComponentProps<'div'>` |
| DialogTitle ⊂ Dialog | — | — | ref prop | `React.ComponentProps<typeof Primitive.Title>` |
| DialogDescription ⊂ Dialog | — | — | ref prop | `React.ComponentProps<typeof Primitive.Description>` |
| DialogFooter ⊂ Dialog | — | — | ref prop | `React.ComponentProps<'div'>` |
| DialogClose ⊂ Dialog | — | — | ref prop | `React.ComponentProps<typeof Primitive.Close>` |
| AlertDialog | — | — | ref prop | `React.ComponentProps<typeof Primitive.Root>` |
| AlertDialogTrigger ⊂ AlertDialog | — | — | ref prop | `React.ComponentProps<typeof Primitive.Trigger>` |
| AlertDialogContent ⊂ AlertDialog | — | — | ref prop | `React.ComponentProps<typeof Primitive.Content>` |
| AlertDialogHeader ⊂ AlertDialog | — | — | ref prop | `React.ComponentProps<'div'>` |
| AlertDialogTitle ⊂ AlertDialog | — | — | ref prop | `React.ComponentProps<typeof Primitive.Title>` |
| AlertDialogDescription ⊂ AlertDialog | — | — | ref prop | `React.ComponentProps<typeof Primitive.Description>` |
| AlertDialogFooter ⊂ AlertDialog | — | — | ref prop | `React.ComponentProps<'div'>` |
| AlertDialogAction ⊂ AlertDialog | — | — | ref prop | `React.ComponentProps<typeof Primitive.Action>`<br>`Pick<ButtonProps, 'variant'>` |
| AlertDialogCancel ⊂ AlertDialog | — | — | ref prop | `React.ComponentProps<typeof Primitive.Cancel>` |
| Select | — | — | ref prop | `React.ComponentProps<typeof SelectPrimitive.Root>`<br>`Pick<React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>, 'id' \| 'aria-describedby' \| 'aria-invalid' \| 'aria-label' \| 'aria-labelledby'>` |
| SelectTrigger ⊂ Select | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>` |
| SelectValue ⊂ Select | — | — | ref prop | `React.ComponentProps<typeof SelectPrimitive.Value>` |
| SelectContent ⊂ Select | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>` |
| SelectGroup ⊂ Select | — | — | ref prop | `React.ComponentProps<typeof SelectPrimitive.Group>` |
| SelectLabel ⊂ Select | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>` |
| SelectItem ⊂ Select | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>` |
| SelectSeparator ⊂ Select | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>` |
| SelectScrollUpButton ⊂ Select | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>` |
| SelectScrollDownButton ⊂ Select | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>` |
| DropdownMenu | — | — | 없음(합성) | — |
| DropdownMenuTrigger ⊂ DropdownMenu | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>` |
| DropdownMenuContent ⊂ DropdownMenu | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>` |
| DropdownMenuItem ⊂ DropdownMenu | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>` |
| DropdownMenuCheckboxItem ⊂ DropdownMenu | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>` |
| DropdownMenuRadioItem ⊂ DropdownMenu | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>` |
| DropdownMenuLabel ⊂ DropdownMenu | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>` |
| DropdownMenuSeparator ⊂ DropdownMenu | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>` |
| DropdownMenuShortcut ⊂ DropdownMenu | — | — | 미노출 | `React.HTMLAttributes<HTMLSpanElement>` |
| DropdownMenuGroup ⊂ DropdownMenu | — | — | ref prop | `React.ComponentProps<typeof DropdownMenuPrimitive.Group>` |
| DropdownMenuPortal ⊂ DropdownMenu | — | — | 없음(합성) | — |
| DropdownMenuSub ⊂ DropdownMenu | — | — | 없음(합성) | — |
| DropdownMenuSubContent ⊂ DropdownMenu | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>` |
| DropdownMenuSubTrigger ⊂ DropdownMenu | — | — | forwardRef | `React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger>` |
| DropdownMenuRadioGroup ⊂ DropdownMenu | — | — | ref prop | `React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>` |
| Toaster | — | — | ref prop | `React.ComponentProps<typeof Sonner>` |
| DatePicker | — | onChange | ref prop | `Omit<React.ComponentProps<typeof Input>, 'value' \| 'defaultValue' \| 'onChange' \| 'type'>` |
| Button | — | — | forwardRef | `React.ButtonHTMLAttributes<HTMLButtonElement>`<br>`VariantProps<typeof buttonVariants>` |
| Input | — | — | forwardRef | `React.InputHTMLAttributes<HTMLInputElement>` |
| Textarea | — | — | forwardRef | `React.TextareaHTMLAttributes<HTMLTextAreaElement>` |
| RadioGroup | — | — | ref prop | `React.ComponentProps<typeof Primitive.Root>` |
| RadioGroupItem ⊂ RadioGroup | — | — | ref prop | `React.ComponentProps<typeof Primitive.Item>` |
| Switch | — | — | ref prop | `React.ComponentProps<typeof Primitive.Root>` |
| Label | — | — | ref prop | `React.ComponentProps<typeof Primitive.Root>` |
| StatusChip | — | — | 미노출 | `React.HTMLAttributes<HTMLSpanElement>`<br>`VariantProps<typeof chipVariants>` |
| Card | — | — | 미노출 | `React.HTMLAttributes<HTMLDivElement>` |
| CardHeader ⊂ Card | — | — | 미노출 | `React.HTMLAttributes<HTMLDivElement>` |
| CardTitle ⊂ Card | — | — | 미노출 | `React.HTMLAttributes<HTMLHeadingElement>` |
| CardBody ⊂ Card | — | — | 미노출 | `React.HTMLAttributes<HTMLDivElement>` |
| CardFooter ⊂ Card | — | — | 미노출 | `React.HTMLAttributes<HTMLDivElement>` |
| Checkbox | — | — | forwardRef | `Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>` |
| DataTable | selectedIds · ✗ · onSelectedIdsChange | onRowClick, onRetry, onLoadMore | 없음(합성) | `UseDataTableOptions<T>` |
| ChartFrame | — | onRetry | 없음(합성) | — |
| StatTile | — | onRetry | 미노출 | `React.HTMLAttributes<HTMLElement>` |
| TrendBand | — | onRetry | 없음(합성) | `Pick<ChartFrameProps, 'state' \| 'emptyMessage' \| 'errorMessage' \| 'onRetry'>` |
| BulletRow | — | onRetry | 없음(합성) | `Pick<ChartFrameProps, 'state' \| 'emptyMessage' \| 'errorMessage' \| 'onRetry'>` |
| CompositionArea | — | onRetry | 없음(합성) | `Pick<ChartFrameProps, 'state' \| 'emptyMessage' \| 'errorMessage' \| 'onRetry'>` |
| EmptyState | — | — | 없음(합성) | — |
| ErrorState | — | onRetry | 없음(합성) | — |
| Avatar | — | — | 없음(합성) | — |
| Thumbnail | — | — | 없음(합성) | — |
| Skeleton | — | — | 없음(합성) | — |
| SkeletonText | — | — | 없음(합성) | — |
| CardSkeleton | — | — | 없음(합성) | — |
| ListSkeleton | — | — | 없음(합성) | `SkeletonPatternProps` |
| FormSkeleton | — | — | 없음(합성) | `SkeletonPatternProps` |
| ChartSkeleton | — | — | 없음(합성) | `SkeletonPatternProps` |
| ProgressTrack | — | — | 없음(합성) | — |
| TaskProgress | — | onDismiss | 없음(합성) | — |
| Tooltip | — | — | 없음(합성) | — |
| Hint | open · ✗ · ✗ | onDismiss | 없음(합성) | — |
| Tour | — | — | 없음(합성) | `ReturnType<typeof useTour>` |
| Field | — | — | 미노출 | `Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>` |
| FormRow ⊂ Field | — | — | forwardRef | `React.HTMLAttributes<HTMLDivElement>` |
| FormFlow | — | onSubmit, onSubmitError | ref prop | `Omit<React.ComponentPropsWithRef<'form'>, 'onSubmit'>`<br>`FormFlowOptions` |
| Peek | open · ✗ · onOpenChange | — | 없음(합성) | — |
