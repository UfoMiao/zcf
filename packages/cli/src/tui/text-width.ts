/** Terminal columns a string takes; CJK and other wide characters take two. */
export function textWidth(text: string): number {
  let width = 0
  for (const char of text) width += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u.test(char) ? 2 : 1
  return width
}
