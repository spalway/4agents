/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Token contract address. Unset hides the contract from the UI. */
  readonly VITE_CONTRACT_ADDRESS?: string
  /** X handle, with or without the leading @. */
  readonly VITE_X_HANDLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
