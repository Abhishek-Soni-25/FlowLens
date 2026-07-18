import { Handle, Position, type NodeProps } from '@xyflow/react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { routeFromUrl, type CapturedScreen } from '@flowlens/shared';
import { screenPreviewHeight } from '../../utils/layout';
export type ScreenNodeData = {
  screen: CapturedScreen;
  commentCount: number;
  annotationPreviewUrl?: string;
  onDelete: (id: string) => void;
  onPreview: (screen: CapturedScreen) => void;
};
export function ScreenNode({ data, selected }: NodeProps) {
  const value = data as unknown as ScreenNodeData;
  const { screen } = value;
  return (
    <div className={`screen-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <button
        className="screenshot-button"
        style={{ height: screenPreviewHeight(screen) }}
        onDoubleClick={() => value.onPreview(screen)}
        title="Double-click for a large preview"
      >
        <img
          src={value.annotationPreviewUrl ?? screen.screenshotDataUrl}
          alt={`Capture of ${routeFromUrl(screen.url)}`}
        />
      </button>
      <div className="screen-node-body">
        <div className="node-title-row">
          <strong title={screen.url}>{routeFromUrl(screen.url)}</strong>
          {value.commentCount > 0 && (
            <span className="node-comments" title={`${value.commentCount} comments`}>
              <MessageSquare size={14} /> {value.commentCount}
            </span>
          )}
          <button
            className="node-delete"
            aria-label="Delete screen"
            onClick={() => value.onDelete(screen.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
