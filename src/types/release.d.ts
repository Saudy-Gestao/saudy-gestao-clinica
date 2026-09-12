interface SaudyReleaseMetadata {
  id: string
  commitSha: string
  shortSha: string
  title: string
  body: string
  changedFiles: string[]
  committedAt: string
  ref: string
}

declare const __SAUDY_RELEASE__: SaudyReleaseMetadata
