import { useState } from 'react';
import { Check, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { ScreenComment } from '@flowlens/shared';
import { db } from '../../db/database';

export function CommentsPanel({
  projectId,
  screenId,
  comments,
}: {
  projectId: string;
  screenId: string;
  comments: ScreenComment[];
}) {
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const add = async () => {
    if (!text.trim()) return;
    const now = new Date().toISOString();
    await db.comments.add({
      id: crypto.randomUUID(),
      projectId,
      screenId,
      text: text.trim(),
      author: import.meta.env.VITE_DEFAULT_AUTHOR || 'Local User',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });
    setText('');
  };
  const visible = comments.filter((comment) => filter === 'all' || comment.status === filter);
  return (
    <section className="comments">
      <div className="section-heading">
        <h3>
          Comments <span>{comments.length}</span>
        </h3>
        <select
          aria-label="Filter comments"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
      <div className="comment-compose">
        <textarea
          aria-label="New comment"
          placeholder="Add a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="primary" disabled={!text.trim()} onClick={() => void add()}>
          Add comment
        </button>
      </div>
      <div className="comment-list">
        {visible.map((comment) => (
          <article key={comment.id} className={`comment ${comment.status}`}>
            <div>
              <strong>{comment.author}</strong>
              <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
            </div>
            <p>{comment.text}</p>
            <div className="comment-actions">
              <button
                title={comment.status === 'open' ? 'Resolve' : 'Reopen'}
                onClick={() =>
                  void db.comments.update(comment.id, {
                    status: comment.status === 'open' ? 'resolved' : 'open',
                    updatedAt: new Date().toISOString(),
                  })
                }
              >
                {comment.status === 'open' ? <Check size={14} /> : <RotateCcw size={14} />}
              </button>
              <button
                title="Edit"
                onClick={() => {
                  const next = prompt('Edit comment', comment.text);
                  if (next?.trim())
                    void db.comments.update(comment.id, {
                      text: next.trim(),
                      updatedAt: new Date().toISOString(),
                    });
                }}
              >
                <Pencil size={14} />
              </button>
              <button title="Delete" onClick={() => void db.comments.delete(comment.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        ))}
        {visible.length === 0 && (
          <p className="empty-small">No {filter === 'all' ? '' : filter} comments.</p>
        )}
      </div>
    </section>
  );
}
