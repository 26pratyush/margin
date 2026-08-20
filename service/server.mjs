import { createServer } from 'node:http'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { openStorage } from './storage.mjs'
import { BackupError } from './backup.mjs'
import {
  ConflictError,
  ValidationError,
  createSyntheticDataset,
  collectionNames,
} from './validation.mjs'

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 4318
const MAX_BODY_BYTES = 5 * 1024 * 1024

function sendJson(response, statusCode, value, headers = {}) {
  const body = JSON.stringify(value)
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  })
  response.end(body)
}

function isAllowedOrigin(origin) {
  if (!origin) return true
  try {
    const url = new URL(origin)
    return (url.protocol === 'http:' || url.protocol === 'https:') && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

async function readBody(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new ValidationError('Request body is too large')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new ValidationError('Request body must be valid JSON')
  }
}

function requireBrowserMutation(request) {
  if (request.headers['x-margin-client'] !== 'browser') {
    const error = new Error('Mutating requests must include the Margin client header')
    error.statusCode = 403
    throw error
  }
}

function errorResponse(error) {
  if (error instanceof ValidationError) return { statusCode: 400, body: { error: error.code, message: error.message, details: error.details } }
  if (error instanceof ConflictError) return { statusCode: 409, body: { error: error.code, message: error.message } }
  if (error instanceof BackupError) return { statusCode: error.statusCode, body: { error: error.code, message: error.message, details: error.details } }
  if (error.statusCode) return { statusCode: error.statusCode, body: { error: 'FORBIDDEN', message: error.message } }
  return { statusCode: 500, body: { error: 'INTERNAL_ERROR', message: 'Margin service could not complete the request' } }
}

async function handleRequest(request, response, storage) {
  const origin = request.headers.origin
  if (!isAllowedOrigin(origin)) {
    sendJson(response, 403, { error: 'FORBIDDEN', message: 'Only localhost browser origins are allowed' })
    return
  }

  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  const segments = url.pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment))
  if (segments[0] !== 'api') {
    sendJson(response, 404, { error: 'NOT_FOUND', message: 'Unknown Margin service route' })
    return
  }

  const method = request.method || 'GET'
  const route = segments.slice(1)
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  if (mutating) requireBrowserMutation(request)

  if (method === 'GET' && route[0] === 'health') {
    sendJson(response, 200, { status: 'ok', storage: 'sqlite', databaseFile: 'margin.sqlite' })
    return
  }

  if (method === 'GET' && route[0] === 'dataset') {
    sendJson(response, 200, storage.getDataset())
    return
  }

  if (method === 'GET' && route[0] === 'backup') {
    sendJson(response, 200, storage.exportBackup(), {
      'Content-Disposition': 'attachment; filename="margin-backup.json"',
    })
    return
  }

  if (method === 'POST' && route[0] === 'backup' && route[1] === 'validate') {
    sendJson(response, 200, storage.validateBackup(await readBody(request)))
    return
  }

  if (method === 'POST' && (route[0] === 'restore' || (route[0] === 'backup' && route[1] === 'restore'))) {
    sendJson(response, 200, await storage.restoreBackup(await readBody(request)))
    return
  }

  if (method === 'POST' && route[0] === 'reset') {
    sendJson(response, 200, storage.reset())
    return
  }

  if (method === 'POST' && route[0] === 'seed') {
    sendJson(response, 200, storage.replaceDataset(createSyntheticDataset()))
    return
  }

  if (method === 'POST' && route[0] === 'reconcile') {
    sendJson(response, 201, storage.reconcile(await readBody(request)))
    return
  }

  if (route[0] === 'collections' && collectionNames().includes(route[1])) {
    const collection = route[1]
    const id = route[2]
    if (method === 'GET' && !id) {
      sendJson(response, 200, { collection, records: storage.getCollection(collection) })
      return
    }
    if (method === 'POST' && !id) {
      sendJson(response, 201, storage.createRecord(collection, await readBody(request)))
      return
    }
    if (method === 'PUT' && id) {
      sendJson(response, 200, storage.updateRecord(collection, id, await readBody(request)))
      return
    }
    if (method === 'DELETE' && id) {
      sendJson(response, 200, { deleted: storage.deleteRecord(collection, id) })
      return
    }
  }

  sendJson(response, 404, { error: 'NOT_FOUND', message: 'Unknown Margin service route' })
}

export async function createMarginServer({ dataDirectory } = {}) {
  const storage = await openStorage({ dataDirectory })
  const server = createServer((request, response) => {
    handleRequest(request, response, storage).catch((error) => {
      const result = errorResponse(error)
      sendJson(response, result.statusCode, result.body)
    })
  })
  server.on('close', () => storage.close())
  return { server, storage }
}

async function main() {
  const { server } = await createMarginServer()
  const host = process.env.MARGIN_SERVICE_HOST || DEFAULT_HOST
  const port = Number(process.env.MARGIN_SERVICE_PORT || DEFAULT_PORT)
  server.listen(port, host, () => {
    console.log(`Margin service listening on http://${host}:${port}`)
  })

  const shutdown = () => {
    server.close(() => process.exit(0))
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(fileURLToPath(import.meta.url)).href) {
  await main()
}
