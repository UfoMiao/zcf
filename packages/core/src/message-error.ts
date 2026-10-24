import type { Message } from './plan/types'

/** An error that front ends translate from `detail`; `message` is the English fallback for logs. */
export class MessageError extends Error {
  override name = 'MessageError'

  constructor(
    readonly detail: Message,
    message: string = detail.key,
  ) {
    super(message)
  }
}
