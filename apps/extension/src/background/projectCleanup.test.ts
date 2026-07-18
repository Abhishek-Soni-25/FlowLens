import { describe, expect, it } from 'vitest';
import type { FlowLensProjectExport, RecordingState } from '@flowlens/shared';
import { removeProjectCopies } from './projectCleanup';

describe('removeProjectCopies', () => {
  it('removes the suggestion index, stored export, and matching recording', () => {
    const recording = {
      active: false,
      project: {
        id: 'p1',
        name: 'One',
        domain: 'one.test',
        createdAt: '2026-07-18T00:00:00.000Z',
        updatedAt: '2026-07-18T00:00:00.000Z',
      },
      screens: [],
      connections: [],
    } as RecordingState;
    const result = removeProjectCopies(
      'p1',
      { p1: {} as FlowLensProjectExport, p2: {} as FlowLensProjectExport },
      [
        { id: 'p1', name: 'One', domain: 'one.test', sessionCount: 1, createdAt: '' },
        { id: 'p2', name: 'Two', domain: 'two.test', sessionCount: 1, createdAt: '' },
      ],
      recording,
    );

    expect(Object.keys(result.exports)).toEqual(['p2']);
    expect(result.projectIndex.map((project) => project.id)).toEqual(['p2']);
    expect(result.clearRecording).toBe(true);
  });
});
