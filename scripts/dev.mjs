import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const children = [
  spawn(process.execPath, ['service/server.mjs'], { stdio: 'inherit', env: process.env }),
  spawn(npmCommand, ['--workspace', 'app', 'run', 'dev'], { stdio: 'inherit', env: process.env }),
]

let shuttingDown = false

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) child.kill('SIGTERM')
  setTimeout(() => process.exit(exitCode), 500)
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!shuttingDown && (code ?? 1) !== 0) {
      console.error(`Margin development process stopped (${code ?? signal}).`)
      shutdown(code ?? 1)
    }
  })
}

process.once('SIGINT', () => shutdown(0))
process.once('SIGTERM', () => shutdown(0))
