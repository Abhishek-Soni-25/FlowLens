# Usage

## Record a journey

1. Start the web editor with `npm run dev:web` and open the website to record.
2. Open FlowLens and confirm the project name. For a previously recorded domain, FlowLens automatically suggests the existing project name and adds a new session to that project.
3. Select **Start recording**. The current viewport is captured immediately and navigation capture is always enabled.
4. Navigate normally. Full loads and SPA route changes are captured after about one second. The page badge and extension badge show that recording is active.
5. Select **Stop recording**. FlowLens opens the local project editor and imports the completed payload. Each completed recording of the same domain increments that project's session count.

Password fields and `[data-flowlens-mask]` elements are blurred only during capture. Add `[data-flowlens-ignore]` to hide an element entirely. Always review screenshots before exporting.

## Edit the workflow

- Drag nodes to rearrange them; pan the background and use the mouse wheel/controls to zoom.
- Select **Auto layout** for a left-to-right Dagre layout and **Save** to persist positions.
- Drag between node handles to create a connection. Double-click an edge to rename it; enter an empty label to delete it. Select an edge and press Delete/Backspace to remove it.
- Edit a node title inline. Double-click its screenshot for a large preview.
- Select a screen in the canvas or left list to open its details, URL, dimensions, connections, and comments.
- Delete a screen from its node or details panel. Related edges, comments, and annotations are removed.

## Comments and annotations

In the details panel, add a comment, filter by status, edit it, resolve/reopen it, or delete it. Comments use `Local User` unless `VITE_DEFAULT_AUTHOR` changes it.

Select **Annotate screenshot** to open the per-screen editor. Available tools are freehand, rectangle, circle, arrow, text, sticky note, eraser, and selection/move. Stroke color and width are configurable; undo and redo apply before saving. Saved annotations survive refresh and show an indicator on the node.

## Export and delete

- **JSON** exports all entities and canvas state in the version 1.0 schema.
- **PNG** exports the currently visible workflow canvas.
- Delete one project from its dashboard card, or use **Clear local data** to reset the entire IndexedDB database.
