import { ExternalLink, PencilLine, Trash2, X } from 'lucide-react';
import {
  routeFromUrl,
  type CapturedScreen,
  type ScreenComment,
  type ScreenConnection,
} from '@flowlens/shared';
import { CommentsPanel } from '../comments/CommentsPanel';
export function DetailsPanel({
  screen,
  projectId,
  comments,
  connections,
  onClose,
  onAnnotate,
  onDelete,
  previewDataUrl,
}: {
  screen: CapturedScreen;
  projectId: string;
  comments: ScreenComment[];
  connections: ScreenConnection[];
  onClose: () => void;
  onAnnotate: () => void;
  onDelete: () => void;
  previewDataUrl?: string;
}) {
  const incoming = connections.filter((edge) => edge.targetScreenId === screen.id).length;
  const outgoing = connections.filter((edge) => edge.sourceScreenId === screen.id).length;
  return (
    <aside className="details-panel">
      <div className="details-header">
        <div>
          <span>Screen details</span>
          <h2>{routeFromUrl(screen.url)}</h2>
        </div>
        <button className="icon-button" aria-label="Close details" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <img
        className="details-preview"
        src={previewDataUrl ?? screen.screenshotDataUrl}
        alt={`Preview of ${routeFromUrl(screen.url)}`}
      />
      <dl className="screen-facts">
        <div>
          <dt>URL</dt>
          <dd>
            <a href={screen.url} target="_blank" rel="noreferrer">
              {screen.url} <ExternalLink size={12} />
            </a>
          </dd>
        </div>
        <div>
          <dt>Captured</dt>
          <dd>{new Date(screen.capturedAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Recorded page</dt>
          <dd>
            {screen.pageWidth ?? screen.viewportWidth} × {screen.pageHeight ?? screen.viewportHeight}
          </dd>
        </div>
        <div>
          <dt>Connections</dt>
          <dd>
            {incoming} in · {outgoing} out
          </dd>
        </div>
      </dl>
      <button className="button full" onClick={onAnnotate}>
        <PencilLine size={16} /> Annotate screenshot
      </button>
      <CommentsPanel projectId={projectId} screenId={screen.id} comments={comments} />
      <button className="button danger-text full" onClick={onDelete}>
        <Trash2 size={16} /> Delete screen
      </button>
    </aside>
  );
}
