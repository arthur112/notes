import type { ComponentType } from 'react'

/**
 * The contract between the shell and a micro-app. In a real multi-repo
 * setup this type would live in a small shared npm package; here each
 * app keeps its own copy to stay self-contained.
 */
export type ShellServices = {
  user: { name: string; role: string }
  publish: (source: string, message: string) => void
}

export type RemoteComponent = ComponentType<ShellServices>
