// The tool registry, ported from canvas/tools/index.js.
//
// Unchanged in shape: tools are modules, `tools` is the ordered list, and getToolForNode asks
// which one claims a node. One thing changes, and it is load-bearing.
//
// Konva tagged every node with a space-separated `name` ('card element') and each tool answered
// matchesNode with node.hasName('card'). Pixi has no such field, so a node carries an explicit
// `kind` string instead and the registry is keyed by it. That is a straight upgrade rather than
// a workaround: hasName was a substring search over a string, it silently matched any node
// whose name merely contained the word, and it is the single most repeated Konva idiom in the
// codebase — 23 sites in multiplayer.js alone, all of which become `node.kind === 'card'`.

import * as select from './select.js'
import * as rect from './rect.js'
import * as card from './card.js'
import * as board from './board.js'
import * as marker from './marker.js'
import * as counter from './counter.js'
import * as dice from './dice.js'
import * as text from './text.js'
import * as arrow from './arrow.js'

// In the Konva version the order was matching priority. Keyed lookup makes priority moot — a node
// has exactly one kind — and the palette is the app's now, so the order carries no meaning.
export const tools = [select, rect, arrow, text, card, board, marker, counter, dice]

export const toolById = Object.fromEntries(tools.map(t => [t.id, t]))

// The tools a player can pick up: every tool with pointer handlers (an empty set counts — see
// select.js), and pan, which is the pointer machine's own mode and has no module. Handed out as
// table.tools.ids; which of them a UI puts in reach, and how it draws them, is the UI's.
export const toolIds = Object.freeze([...tools.filter(t => t.handlers).map(t => t.id), 'pan'])

// The tool that owns a node. O(1) and exact, where the Konva version was a linear scan calling
// each tool's matchesNode in turn.
export function getToolForNode(node) {
    return node?.kind ? toolById[node.kind] ?? null : null
}

// What the player would say they picked up when they clicked this node. A grouped card pulls in
// its whole pile; everything else is itself. The tool answers, because only it knows whether it
// has a notion of grouping at all.
export function expandToGroup(node) {
    if (!node) return []
    return getToolForNode(node)?.expandToGroup?.(node) ?? [node]
}

// Active tool dispatch. Modal tools without registry entries (pan, clone) leave active_tool null.
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
