import { resolveUrl } from '@cardcarp/core/storage.js'

export const project = { id: null, name: '' }
export const file = {}

export function setProject({ config, storage }) {
    project.id = config.id
    project.name = config.game?.name ?? ''
    for (const [key, path] of Object.entries(storage.file ?? {})) file[key] = resolveUrl(storage.root, path)
}
