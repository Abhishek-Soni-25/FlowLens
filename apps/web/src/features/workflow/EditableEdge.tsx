import { useEffect, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';

export type EditableEdgeData = {
  label: string;
  connectionIds?: string[];
  onLabelChange: (id: string, label: string) => void;
};

export function EditableEdge(props: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath(props);
  const data = props.data as EditableEdgeData | undefined;
  const label = data?.label || 'Navigate';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  useEffect(() => setDraft(label), [label]);

  const commit = () => {
    const next = draft.trim() || 'Navigate';
    data?.onLabelChange(props.id, next);
    setDraft(next);
    setEditing(false);
  };

  return (
    <>
      <BaseEdge id={props.id} path={path} markerEnd={props.markerEnd} style={props.style} />
      <EdgeLabelRenderer>
        <div
          className={`editable-edge-label nodrag nopan ${editing ? 'editing' : ''}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            setEditing(true);
          }}
          title="Double-click to rename"
        >
          {editing ? (
            <input
              autoFocus
              aria-label="Connection name"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commit();
                if (event.key === 'Escape') {
                  setDraft(label);
                  setEditing(false);
                }
              }}
            />
          ) : (
            label
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
