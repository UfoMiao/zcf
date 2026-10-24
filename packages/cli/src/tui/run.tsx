import type { ZcfService } from '@zcf/ui-kit'
import { render } from 'ink'

import type { Translate } from '../i18n'
import { App } from './app'

/** Run the terminal UI until the user quits. Loaded lazily, so other commands never load Ink or React. */
export async function runTui(service: ZcfService, t: Translate, home: string): Promise<void> {
  const app = render(<App service={service} t={t} home={home} />)
  await app.waitUntilExit()
}
