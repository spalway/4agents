/**
 * Deployment-specific values, supplied through the environment rather than
 * committed.
 *
 * The contract address in particular should not live in the source: it differs
 * per deployment, it changes late, and a placeholder sitting in a public repo
 * reads as a real address to anyone who finds it. Unset is a valid state — the
 * UI hides the contract entirely rather than showing an empty field, which is
 * the correct look before launch.
 */

export const CONTRACT: string = (import.meta.env.VITE_CONTRACT_ADDRESS ?? '').trim()

/** Without the leading @. Falls back to the project handle. */
export const X_HANDLE: string = (import.meta.env.VITE_X_HANDLE ?? 'xstartupenv')
  .trim()
  .replace(/^@/, '')

export const X_URL = `https://x.com/${X_HANDLE}`

/** Shortened for the header, where the full string will not fit. */
export function shortContract(ca = CONTRACT): string {
  return ca.length > 12 ? `${ca.slice(0, 4)}…${ca.slice(-4)}` : ca
}
