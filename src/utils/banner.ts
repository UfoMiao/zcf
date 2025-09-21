import ansis from 'ansis'
import { homepage, version } from '../../package.json'
import { ensureI18nInitialized, i18n } from '../i18n'

function getDisplayWidth(str: string): number {
  let width = 0
  for (const char of str) {
    // Chinese characters, full-width symbols, and other wide characters
    if (char.match(/[\u4E00-\u9FFF\uFF01-\uFF60\u3000-\u303F]/)) {
      width += 2
    }
    else {
      width += 1
    }
  }
  return width
}

function padToDisplayWidth(str: string, targetWidth: number): string {
  const currentWidth = getDisplayWidth(str)
  const paddingNeeded = Math.max(0, targetWidth - currentWidth)
  return str + ' '.repeat(paddingNeeded)
}

export function displayBanner(subtitle?: string): void {
  ensureI18nInitialized()
  const defaultSubtitle = i18n.t('cli:banner.subtitle')
  const subtitleText = subtitle || defaultSubtitle
  const paddedSubtitle = padToDisplayWidth(subtitleText, 30)
  const paddedTitle = padToDisplayWidth('Zero-Config Code Flow', 60)

  console.log(
    ansis.cyan.bold(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   ███████╗  ██████╗ ███████╗                                   ║
║       ██╔╝  ██╔═══╝  ██╔═══╝                                   ║
║      ██╔╝   ██║      █████╗                                    ║
║    ██╔╝     ██║      ██╔══╝                                    ║
║   ███████╗  ╚██████╗ ██║                                       ║
║   ╚══════╝   ╚═════╝ ╚═╝        ${ansis.gray(paddedSubtitle)} ║
║                                                                ║
║   ${ansis.white.bold(paddedTitle)} ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`),
  )
}

export function displayBannerWithInfo(subtitle?: string): void {
  displayBanner(subtitle)
  console.log(ansis.gray(`  Version: ${ansis.cyan(version)}  |  ${ansis.cyan(homepage)}\n`))
}
