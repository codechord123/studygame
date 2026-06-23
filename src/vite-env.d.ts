/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVERT_ENDPOINT?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
