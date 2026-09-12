import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

type ReleaseMetadata = {
  id: string
  commitSha: string
  shortSha: string
  title: string
  body: string
  changedFiles: string[]
  committedAt: string
  ref: string
}

function readGit(args: string[]) {
  try {
    return execFileSync('git', args, {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function cleanCommitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(co-authored-by|signed-off-by):/i.test(line))
}

function buildReleaseMetadata(): ReleaseMetadata {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || readGit(['rev-parse', 'HEAD']) || 'local'
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || ''
  const rawMessage = process.env.SAUDY_RELEASE_NOTES
    || readGit(['log', '-1', '--format=%B'])
    || process.env.VERCEL_GIT_COMMIT_MESSAGE
    || 'Atualizações gerais do sistema'
  const messageLines = cleanCommitLines(rawMessage)
  const title = (messageLines[0] || 'Atualizações gerais do sistema').slice(0, 160)
  const body = messageLines.slice(1).join('\n').slice(0, 6000)
  const changedFiles = Array.from(new Set(
    (readGit(['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', commitSha])
      || readGit(['show', '--format=', '--name-only', commitSha]))
      .split(/\r?\n/)
      .map((file) => file.trim())
      .filter(Boolean),
  )).slice(0, 120)

  return {
    id: [deploymentId, commitSha].filter(Boolean).join(':') || 'local',
    commitSha,
    shortSha: commitSha === 'local' ? 'local' : commitSha.slice(0, 7),
    title,
    body,
    changedFiles,
    committedAt: process.env.VERCEL_GIT_COMMIT_DATE || readGit(['show', '-s', '--format=%cI', commitSha]),
    ref: process.env.VERCEL_GIT_COMMIT_REF || readGit(['branch', '--show-current']),
  }
}

const releaseMetadata = buildReleaseMetadata()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __SAUDY_RELEASE__: JSON.stringify(releaseMetadata),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/dicom-web': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/accounts': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/care': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/procedures': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
