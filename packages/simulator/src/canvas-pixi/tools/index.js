import * as select from './select.js'
import * as rect from './rect.js'
import * as card from './card.js'
import * as board from './board.js'
import * as marker from './marker.js'
import * as counter from './counter.js'
import * as dice from './dice.js'
import * as text from './text.js'
import * as arrow from './arrow.js'

export const tools = [select, rect, arrow, text, card, board, marker, counter, dice]

export const toolById = Object.fromEntries(tools.map(t => [t.id, t]))

export const toolIds = Object.freeze([...tools.filter(t => t.handlers).map(t => t.id), 'pan'])

export function getToolForNode(node) {
    return node?.kind ? toolById[node.kind] ?? null : null
}

export function expandToGroup(node) {
    if (!node) return []
    return getToolForNode(node)?.expandToGroup?.(node) ?? [node]
}

let active_tool = toolById.select ?? null
let active_tool_id = 'select'

export function getActiveTool() {
    return active_tool
}

export function getActiveToolId() {
    return active_tool_id
}

export function setActiveTool(id) {
    if (active_tool?.handlers?.deactivate) active_tool.handlers.deactivate()
    active_tool_id = id
    active_tool = toolById[id] ?? null
}

export function initTools() {
    for (const tool of tools) {
        if (tool.init) tool.init()
    }
}
