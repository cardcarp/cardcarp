// The select tool — what is left of canvas/tools/select.js once the pointer machine owns the
// gestures.
//
// The original was 292 lines: marquee, click-to-select, shift-toggle, topElementAt,
// reselectUnderPointer, and the 'back'-named hit target. All of that is in pointer.js now,
// because it was never really about this tool — it was about what a press MEANS, which is one
// question however many tools are registered.
//
// What is left is what the tool actually is: an id, and the fact that it declines to draw
// anything. That is the whole of it, and the shrinkage is the point. Its name, its icon and its
// key belong to whichever UI puts it in reach.

export const id = 'select'

// toolIds counts every tool with handlers, so an empty handler set is how a tool says "a player
// can pick me up, and the pointer machine's default behaviour is my behaviour".
export const handlers = {}
