import { layerCollisionPadding } from '../../lib/layer';
/** shadcn 원본의 Radix 동작은 유지하고, DESIGN.md 4절의 치수·슬롯·평면 규약만 번역한다. */
import * as React from "react"
import * as SelectPrimitive from "../../internal/select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "../../lib/cn"

type Wiring = Pick<React.ComponentProps<typeof SelectPrimitive.Trigger>, 'id' | 'aria-describedby' | 'aria-invalid' | 'aria-label' | 'aria-labelledby'>;
const SelectWiring = React.createContext<Wiring>({});
const SelectOptions = React.createContext<((delta: number) => void) | null>(null);
/** Field가 Root에 주입한 배선을 실제 button에 전달한다. 옵션 등록은 그룹·조건부 렌더도 센다. */
function Select({ id, 'aria-describedby': describedBy, 'aria-invalid': invalid,
  'aria-label': label, 'aria-labelledby': labelledBy, children, ...props
}: React.ComponentProps<typeof SelectPrimitive.Root> & Wiring) {
  const count = React.useRef(0);
  const warned = React.useRef(false);
  const register = React.useCallback((delta: number) => {
    count.current += delta;
    if (import.meta.env.DEV && count.current > 20 && !warned.current) {
      warned.current = true;
      console.warn('Select: 옵션이 20개를 넘으면 Combobox를 사용하세요.');
    }
  }, []);
  return <SelectWiring.Provider value={{ id, 'aria-describedby': describedBy, 'aria-invalid': invalid,
    'aria-label': label, 'aria-labelledby': labelledBy }}>
    <SelectOptions.Provider value={register}><SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root></SelectOptions.Provider>
  </SelectWiring.Provider>;
}

function SelectGroup(props: React.ComponentProps<typeof SelectPrimitive.Group>) { return <SelectPrimitive.Group data-slot="select-group" {...props} />; }

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) { return <SelectPrimitive.Value data-slot="select-value" {...props} />; }

function SelectTrigger({ className, children, ref, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger data-slot="select-trigger"
      ref={ref}
      {...React.useContext(SelectWiring)}
      // 키보드 포커스는 전역 :focus-visible(2px --border-focus · offset 2px, styles.css)을 그대로 쓴다 — 옆 Input·Combobox·
      // MultiSelect 트리거와 같은 모양이다(0.7.1). shadcn 원본의 focus:outline-none + ring-1 은 경계에 붙은 1px 링이라
      // 필터 바 한 줄에 포커스 모양이 둘이었다(0.7.0 게시 전 검수 관찰 ①).
      className={cn(
        "flex h-[var(--control-h-md)] min-w-[var(--field-min-w)] w-full items-center justify-between gap-2 whitespace-nowrap rounded-[var(--radius-md)] border border-field bg-surface px-3 py-2 text-sm text-fg data-[placeholder]:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon data-slot="select-icon" asChild>
        <ChevronDown className="ds-select-chevron" aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectScrollUpButton({ className, ref, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton data-slot="select-scroll-up-button"
      ref={ref}
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({ className, ref, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton data-slot="select-scroll-down-button"
      ref={ref}
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

function SelectContent({ className, children, position = "popper", ref, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content data-slot="select-content"
        ref={ref}
        className={cn(
          "relative z-50 max-h-[var(--radix-select-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-[var(--radius-md)] border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[var(--radix-select-content-transform-origin)]",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        collisionPadding={layerCollisionPadding}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport data-slot="select-viewport"
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({ className, ref, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label data-slot="select-label"
      ref={ref}
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      {...props}
    />
  )
}

function OptionRegistration() {
  const register = React.useContext(SelectOptions);
  React.useEffect(() => { register?.(1); return () => register?.(-1); }, [register]);
  return null;
}

function SelectItem({ className, children, ref, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item data-slot="select-item"
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-[var(--radius-md)] py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({ className, ref, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator data-slot="select-separator"
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
