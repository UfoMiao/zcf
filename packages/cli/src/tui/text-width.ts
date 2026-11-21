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

/**
 * Lines `text` takes when wrapped at `width` columns the way Ink wraps it: by words,
 * and a word longer than a line (a run of CJK has no spaces) broken across lines.
 */
export function wrappedLines(text: string, width: number): number {
  let lines = 1
  let used = 0
  for (const word of text.split(' ')) {
    const size = textWidth(word)
    if (used > 0 && used + 1 + size <= width) used += 1 + size
    else if (used === 0 && size <= width) used = size
    else {
      if (used > 0) lines += 1
      lines += Math.ceil(size / width) - 1
      used = size - (Math.ceil(size / width) - 1) * width
    }
  }
  return lines
}

/**
 * `text` wrapped at `width` columns the way Ink wraps it, as the lines themselves, for a list
 * that gives each line a row of its own.
 */
export function wrapText(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  let used = 0
  for (const word of text.split(' ')) {
    const size = textWidth(word)
    if (used > 0 && used + 1 + size <= width) {
      line += ` ${word}`
      used += 1 + size
      continue
    }
    if (used > 0) lines.push(line)
    line = ''
    used = 0
    // A word longer than a line breaks across lines, character by character.
    for (const char of word) {
      const columns = textWidth(char)
      if (used > 0 && used + columns > width) {
        lines.push(line)
        line = ''
        used = 0
      }
      line += char
      used += columns
    }
  }
  lines.push(line)
  return lines
}
