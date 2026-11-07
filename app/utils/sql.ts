/**
 * The app's side of the SQLite worker: queries are promises, and every write bumps `dbVersion`
 * so live queries re-run (other tabs hear about it over a BroadcastChannel).
 */
import type { Bind, Request, Response, RunResult, Statement, Status } from '~/workers/protocol'

export type { Bind, Statement }

export const dbVersion = ref(0)
export const dbState = ref<{ status: 'loading' | 'ready' | 'failed', persistent?: boolean, message?: string, busy?: boolean }>({ status: 'loading' })

type Pending = { resolve: (v: unknown) => void, reject: (e: Error) => void }
const pending = new Map<number, Pending>()
let worker: Worker | null = null
let ready: Promise<void> | null = null
let seq = 0
let channel: BroadcastChannel | null = null

function start(): Promise<void> {
  if (ready) return ready
  worker = new Worker(new URL('../workers/db.worker.ts', import.meta.url), { type: 'module' })
  channel = new BroadcastChannel('draupne-db')
  channel.onmessage = () => { dbVersion.value++ }
  ready = new Promise((resolve, reject) => {
    worker!.onmessage = (e: MessageEvent<Response | Status>) => {
      const m = e.data
      if ('type' in m) {
        if (m.type === 'ready') {
          dbState.value = { status: 'ready', persistent: m.persistent }
          resolve()
        } else {
          dbState.value = { status: 'failed', message: m.message, busy: m.busy }
          reject(new Error(m.message))
        }
        return
      }
      const p = pending.get(m.id)
      if (!p) return
      pending.delete(m.id)
      if (m.ok) p.resolve(m.result)
      else p.reject(new Error(m.error))
    }
  })
  return ready
}

type Op = Request extends infer R ? R extends { op: infer O } ? O : never : never
async function call<T>(op: Op, payload: Record<string, unknown> = {}, transfer: Transferable[] = []): Promise<T> {
  await start()
  return new Promise<T>((resolve, reject) => {
    const id = ++seq
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
    worker!.postMessage({ id, op, ...payload }, transfer)
  })
}

function changed() {
  dbVersion.value++
  channel?.postMessage('changed')
}

/** Rows as objects; alias columns in the SQL to get camelCase keys. */
export function dbQuery<T>(sql: string, bind?: Bind): Promise<T[]> {
  return call<T[]>('query', { sql, bind })
}

export async function dbFirst<T>(sql: string, bind?: Bind): Promise<T | undefined> {
  return (await dbQuery<T>(sql, bind))[0]
}

export async function dbRun(sql: string, bind?: Bind): Promise<RunResult> {
  const r = await call<RunResult>('run', { sql, bind })
  changed()
  return r
}

/** Several statements in one transaction: all or nothing. */
export async function dbBatch(statements: Statement[]): Promise<void> {
  await call('batch', { statements })
  changed()
}

/** The whole database as a `.sqlite` file. */
export function dbExport(): Promise<Uint8Array> {
  return call<Uint8Array>('export')
}

/** Replaces the database with a `.sqlite` file. */
export async function dbImport(bytes: Uint8Array): Promise<void> {
  await call('import', { bytes }, [bytes.buffer])
  changed()
}
