/**
 * `text` with each of `secrets` masked, as every front end shows plan and apply output. Pass
 * the list longest first (as `PlanView.secrets` is), so a secret that contains another is masked whole.
 */
export function maskSecrets(text: string, secrets: readonly string[]): string {
  let masked = text
  // Long secrets keep a few characters so people can tell which one it is; short ones are hidden whole.
  for (const secret of secrets) {
    const quoted = secret.length > 1 && secret.startsWith('"') && secret.endsWith('"')
    const hint = secret.length >= 12 ? `${secret.slice(0, 3)}***${secret.slice(-2)}` : quoted ? '"***"' : '***'
    // A callback, so `$&` and similar in the secret are inserted literally, not as replacement patterns.
    masked = masked.replaceAll(secret, () => hint)
  }
  return masked
}
