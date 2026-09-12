export type ReleaseMetadata = {
  id: string
  commitSha: string
  shortSha: string
  title: string
  body: string
  changedFiles: string[]
  committedAt: string
  ref: string
}

const fallbackRelease: ReleaseMetadata = {
  id: 'local',
  commitSha: 'local',
  shortSha: 'local',
  title: 'Atualizações gerais do sistema',
  body: '',
  changedFiles: [],
  committedAt: '',
  ref: '',
}

export const releaseMetadata: ReleaseMetadata = typeof __SAUDY_RELEASE__ === 'undefined'
  ? fallbackRelease
  : __SAUDY_RELEASE__

export const releaseNotes = releaseMetadata.body
  .split(/\r?\n/)
  .map((line) => line.replace(/^[-*]\s*/, '').trim())
  .filter(Boolean)
