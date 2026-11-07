/// <reference lib="webworker" />
/**
 * Owns the SQLite database. It lives in the Origin Private File System through the `opfs-sahpool`
 * VFS (no COOP/COEP headers needed); without OPFS it falls back to memory and says so.
 */
import sqlite3InitModule from '@sqlite.org/sqlite-wasm'
import type { Request, Response, Status } from './protocol'
import { MIGRATIONS } from './schema'

const FILE = '/draupne.sqlite3'
type Sqlite3 = Awaited<ReturnType<typeof sqlite3InitModule>>
type DB = InstanceType<Sqlite3['oo1']['DB']>

let sqlite3: Sqlite3
let pool: Awaited<ReturnType<Sqlite3['installOpfsSAHPoolVfs']>> | null = null
let db: DB

const post = (m: Response | Status) => (self as unknown as Worker).postMessage(m)

function open() {
  db = pool ? new pool.OpfsSAHPoolDb(FILE) : new sqlite3.oo1.DB(':memory:', 'c')
  db.exec('PRAGMA foreign_keys = ON')
  migrate()
}

function migrate() {
  const version = Number(db.selectValue('PRAGMA user_version') ?? 0)
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]!)
      db.exec(`PRAGMA user_version = ${v + 1}`)
    })
  }
}

async function start() {
  try {
    sqlite3 = await sqlite3InitModule()
    try {
      pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'draupne', initialCapacity: 6 })
    } catch (e) {
      const message = String((e as Error)?.message ?? e)
      // Another window holds the pool's file handles: only one can write at a time.
      if (/NoModificationAllowed|locked|access handle/i.test(message)) {
        post({ type: 'failed', message: 'Draupne is open in another window.', busy: true })
        return
      }
      console.warn('[draupne] OPFS unavailable, using memory:', message)
      pool = null
    }
    open()
    post({ type: 'ready', persistent: !!pool, version: sqlite3.version.libVersion })
  } catch (e) {
    post({ type: 'failed', message: String((e as Error)?.message ?? e), busy: false })
  }
}

function handle(req: Request): unknown {
  switch (req.op) {
    case 'query':
      return db.exec({ sql: req.sql, bind: req.bind, rowMode: 'object', returnValue: 'resultRows' })
    case 'run': {
      db.exec({ sql: req.sql, bind: req.bind })
      return { changes: db.changes(), lastInsertRowid: Number(db.selectValue('SELECT last_insert_rowid()')) }
    }
    case 'batch':
      db.transaction(() => {
        for (const s of req.statements) db.exec({ sql: s.sql, bind: s.bind })
      })
      return null
    case 'export':
      return sqlite3.capi.sqlite3_js_db_export(db)
  }
}

async function replaceWith(bytes: Uint8Array) {
  if (!pool) throw new Error('Importing a database file needs persistent storage, which this browser doesn\'t offer.')
  // Check it's ours before touching the real file.
  const probe = new sqlite3.oo1.DB(':memory:', 'c')
  try {
    const p = sqlite3.wasm.allocFromTypedArray(bytes)
    const rc = sqlite3.capi.sqlite3_deserialize(probe, 'main', p, bytes.byteLength, bytes.byteLength,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE)
    probe.checkRc(rc)
    const tables = probe.selectValues("SELECT name FROM sqlite_master WHERE type = 'table'") as string[]
    if (!['categories', 'accounts', 'transactions'].every((t) => tables.includes(t))) throw new Error('That file is not a Draupne database.')
  } finally {
    probe.close()
  }
  db.close()
  await pool.importDb(FILE, bytes)
  open()
}

self.onmessage = async (e: MessageEvent<Request>) => {
  const req = e.data
  try {
    const result = req.op === 'import' ? await replaceWith(req.bytes) : handle(req)
    post({ id: req.id, ok: true, result })
  } catch (err) {
    post({ id: req.id, ok: false, error: String((err as Error)?.message ?? err) })
  }
}

start()
