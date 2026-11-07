/** Messages between the app and the SQLite worker. */
export type Bind = (string | number | null)[] | Record<string, string | number | null>
export interface Statement { sql: string, bind?: Bind }

export type Request =
  | { id: number, op: 'query', sql: string, bind?: Bind }
  | { id: number, op: 'run', sql: string, bind?: Bind }
  | { id: number, op: 'batch', statements: Statement[] }
  | { id: number, op: 'export' }
  | { id: number, op: 'import', bytes: Uint8Array }

export type Response =
  | { id: number, ok: true, result: unknown }
  | { id: number, ok: false, error: string }

export type Status =
  | { type: 'ready', persistent: boolean, version: string }
  | { type: 'failed', message: string, busy: boolean }

export interface RunResult { changes: number, lastInsertRowid: number }
