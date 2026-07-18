import type {
  FlowLensProjectExport,
  ProjectIndexEntry,
  RecordingState,
} from '@flowlens/shared';

export function removeProjectCopies(
  projectId: string,
  exports: Record<string, FlowLensProjectExport>,
  projectIndex: ProjectIndexEntry[],
  recording: RecordingState,
) {
  const nextExports = { ...exports };
  delete nextExports[projectId];
  return {
    exports: nextExports,
    projectIndex: projectIndex.filter((project) => project.id !== projectId),
    clearRecording: recording.project?.id === projectId,
  };
}
