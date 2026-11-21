/**
 * Wide characters: Hangul jamo, CJK and its punctuation (`。`, `、`), Hangul syllables,
 * compatibility ideographs, vertical and small forms, fullwidth forms (`：；（）`),
 * emoji and the supplementary ideograph planes. Each takes two terminal columns, the
 * way Ink lays them out.
 */
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︐-︙︰-﹯＀-｠￠-￦\u{1F300}-\u{1F64F}\u{1F900}-\u{1F9FF}\u{20000}-\u{3FFFD}]/u

/** Terminal columns a string takes; CJK and other wide characters take two. */
export function textWidth(text: string): number {
  let width = 0
  for (const char of text) width += WIDE.test(char) ? 2 : 1
  return width
}
