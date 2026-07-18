import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CommentsPanel } from './CommentsPanel';
import { db } from '../../db/database';

afterEach(async () => {
  await db.delete();
  await db.open();
});
describe('CommentsPanel', () => {
  it('creates a comment', async () => {
    render(<CommentsPanel projectId="p" screenId="s" comments={[]} />);
    fireEvent.change(screen.getByLabelText('New comment'), {
      target: { value: 'Check this step' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }));
    await waitFor(async () => expect(await db.comments.count()).toBe(1));
  });
  it('resolves an open comment', async () => {
    const comment = {
      id: 'c',
      projectId: 'p',
      screenId: 's',
      text: 'Fix',
      author: 'Local User',
      status: 'open' as const,
      createdAt: '2026-07-18T00:00:00.000Z',
      updatedAt: '2026-07-18T00:00:00.000Z',
    };
    await db.comments.add(comment);
    render(<CommentsPanel projectId="p" screenId="s" comments={[comment]} />);
    fireEvent.click(screen.getByTitle('Resolve'));
    await waitFor(async () => expect((await db.comments.get('c'))?.status).toBe('resolved'));
  });
});
