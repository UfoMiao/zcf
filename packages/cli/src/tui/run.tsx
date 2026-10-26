import type { ZcfService } from '@zcf/ui-kit'
import { render } from 'ink'

import type { Lang } from '../i18n'
import { App } from './app'

/** Run the terminal UI until the user quits. Loaded lazily, so other commands never load Ink or React. */
export async function runTui(service: ZcfService, lang: Lang, home: string, langPinned: boolean): Promise<void> {
  // The alternate screen covers the whole terminal and gives the shell back its scroll on exit.
  const app = render(<App service={service} lang={lang} langPinned={langPinned} home={home} />, {
    alternateScreen: true,
  })
  await app.waitUntilExit()
}
