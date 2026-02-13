/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QDB_HOST: string
  readonly VITE_QDB_PORT: string
  readonly VITE_QDB_HTTP_PORT: string
  readonly VITE_QDB_HTTP_URL: string
  readonly VITE_QDB_USER: string
  readonly VITE_QDB_PASSWORD: string
  readonly VITE_QDB_DATABASE: string
  readonly VITE_QDB_TABLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
