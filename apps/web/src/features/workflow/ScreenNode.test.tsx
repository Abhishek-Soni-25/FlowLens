import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';
import { ScreenNode } from './ScreenNode';

describe('ScreenNode', () => {
  it('renders only the route and comment metadata', () => {
    const data = {
      screen: {
        id: 'a',
        projectId: 'p',
        sessionId: 's',
        url: 'https://shop.test/cart',
        normalizedUrl: 'https://shop.test/cart',
        title: 'Cart',
        screenshotDataUrl: 'data:image/png;base64,AA==',
        screenshotHash: 'h',
        viewportWidth: 100,
        viewportHeight: 100,
        pageWidth: 1440,
        pageHeight: 780,
        capturedAt: '2026-07-18T00:00:00.000Z',
        captureType: 'manual' as const,
      },
      commentCount: 2,
      annotationPreviewUrl: 'data:image/png;base64,BB==',
      onDelete: vi.fn(),
      onPreview: vi.fn(),
    };
    render(
      <ReactFlowProvider>
        <ScreenNode
          id="a"
          data={data}
          type="screen"
          selected={false}
          zIndex={0}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
          draggable={true}
          selectable={true}
          deletable={true}
        />
      </ReactFlowProvider>,
    );
    expect(screen.getByText('/cart')).toBeInTheDocument();
    expect(screen.queryByText('Cart')).not.toBeInTheDocument();
    expect(screen.queryByText('manual')).not.toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', data.annotationPreviewUrl);
    expect(screen.getByRole('button', { name: 'Capture of /cart' })).toHaveStyle({
      height: '157px',
    });
  });
});
