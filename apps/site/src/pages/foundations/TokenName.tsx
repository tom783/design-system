/** 토큰 이름 칸 — 검색이 이 자리로 온다(#token-이름). */
export function TokenName({ name }: { name: string }) {
  return <code id={`token-${name}`} className="site-code">--{name}</code>;
}
