import { toPng } from 'html-to-image';
import type { FlowLensProjectExport } from '@flowlens/shared';
import { slugify } from '@flowlens/shared';

function download(data: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = data;
  link.click();
}
export function exportJson(payload: FlowLensProjectExport) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  download(
    url,
    `flowlens-${slugify(payload.project.name)}-${new Date().toISOString().slice(0, 10)}.json`,
  );
  URL.revokeObjectURL(url);
}
export async function exportPng(element: HTMLElement, projectName: string) {
  const dataUrl = await toPng(element, {
    backgroundColor: '#f8fafc',
    cacheBust: true,
    pixelRatio: 2,
    filter: (node) => !(node instanceof HTMLElement && node.dataset.exportExclude === 'true'),
  });
  download(
    dataUrl,
    `flowlens-${slugify(projectName)}-${new Date().toISOString().slice(0, 10)}.png`,
  );
}
