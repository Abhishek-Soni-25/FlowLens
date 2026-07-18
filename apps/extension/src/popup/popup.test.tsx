import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Popup } from './main';

beforeEach(() => {
  (globalThis as any).chrome = {
    tabs: { query: vi.fn().mockResolvedValue([{ url: 'https://example.com/' }]) },
    storage: {
      local: { get: vi.fn().mockResolvedValue({}) },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    runtime: {
      sendMessage: vi
        .fn()
        .mockImplementation((message: { type: string }) =>
          Promise.resolve(
            message.type === 'GET_PROJECT_SUGGESTION'
              ? { ok: true }
              : { ok: true, active: false, screens: [], connections: [] },
          ),
        ),
    },
  };
});
describe('Popup', () => {
  it('shows the idle recording form', async () => {
    render(<Popup />);
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open workflow' })).toBeTruthy();
    expect(screen.queryByText('Idle')).toBeNull();
    expect(screen.queryByLabelText('Session name')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    await waitFor(() => expect(screen.getByText('example.com')).toBeTruthy());
  });
  it('suggests the existing project name for a recorded domain', async () => {
    chrome.runtime.sendMessage = vi
      .fn()
      .mockImplementation((message: { type: string }) =>
        Promise.resolve(
          message.type === 'GET_PROJECT_SUGGESTION'
            ? { ok: true, suggestion: { id: 'p1', name: 'Example redesign' } }
            : { ok: true, active: false, screens: [], connections: [] },
        ),
      );
    render(<Popup />);
    await waitFor(() => expect(screen.getByDisplayValue('Example redesign')).toBeTruthy());
    expect(screen.getByText(/Existing project/)).toBeTruthy();
  });
  it('shows recording controls', async () => {
    chrome.runtime.sendMessage = vi.fn().mockImplementation((message: { type: string }) =>
      Promise.resolve(
        message.type === 'GET_PROJECT_SUGGESTION'
          ? { ok: true }
          : {
              ok: true,
              active: true,
              screens: [{ title: 'Home' }],
              connections: [],
              project: { name: 'Checkout flow' },
            },
      ),
    );
    render(<Popup />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Stop recording' })).toBeTruthy(),
    );
    expect(screen.queryByRole('button', { name: 'Capture current screen' })).toBeNull();
  });
});
