import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Circle,
  Eraser,
  Minus,
  MousePointer2,
  Pencil,
  Plus,
  Redo2,
  Save,
  Square,
  Type,
  Undo2,
  X,
} from 'lucide-react';
import {
  routeFromUrl,
  type AnnotationElement,
  type CapturedScreen,
  type ScreenAnnotation,
} from '@flowlens/shared';
import { db } from '../../db/database';
import { useUI } from '../../store/ui';

type Tool = 'select' | AnnotationElement['type'] | 'erase';
const COLORS = ['#ef4444', '#f59e0b', '#2563eb', '#111827', '#ffffff'];

function drawArrow(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  const angle = Math.atan2(endY - startY, endX - startX);
  const head = 14;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - head * Math.cos(angle - Math.PI / 6),
    endY - head * Math.sin(angle - Math.PI / 6),
  );
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - head * Math.cos(angle + Math.PI / 6),
    endY - head * Math.sin(angle + Math.PI / 6),
  );
  ctx.stroke();
}

function renderElement(ctx: CanvasRenderingContext2D, element: AnnotationElement) {
  ctx.save();
  ctx.strokeStyle = element.color;
  ctx.fillStyle = element.color;
  ctx.lineWidth = element.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const endX = element.endX ?? element.x;
  const endY = element.endY ?? element.y;
  if (element.type === 'freehand') {
    ctx.beginPath();
    element.points?.forEach((p, index) => (index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  if (element.type === 'rectangle') {
    ctx.strokeRect(element.x, element.y, endX - element.x, endY - element.y);
  }
  if (element.type === 'circle') {
    ctx.beginPath();
    ctx.ellipse(
      (element.x + endX) / 2,
      (element.y + endY) / 2,
      Math.abs(endX - element.x) / 2,
      Math.abs(endY - element.y) / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  if (element.type === 'arrow') drawArrow(ctx, element.x, element.y, endX, endY);
  if (element.type === 'text') {
    ctx.font = `600 ${Math.max(18, element.width * 7)}px Inter, sans-serif`;
    (element.text ?? '').split('\n').forEach((line, index) => {
      ctx.fillText(line, element.x, element.y + index * Math.max(24, element.width * 9));
    });
  }
  ctx.restore();
}

export function AnnotationModal({
  screen,
  existing,
}: {
  screen: CapturedScreen;
  existing?: ScreenAnnotation;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>();
  const [elements, setElements] = useState<AnnotationElement[]>(
    (existing?.data as AnnotationElement[] | undefined) ?? [],
  );
  const [future, setFuture] = useState<AnnotationElement[][]>([]);
  const [tool, setTool] = useState<Tool>('freehand');
  const [color, setColor] = useState('#ef4444');
  const [width, setWidth] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string }>();
  const drawing = useRef<AnnotationElement | null>(null);
  const moving = useRef<{
    id: string;
    origin: { x: number; y: number };
    before: AnnotationElement[];
  } | null>(null);
  const close = useUI((state) => state.openAnnotation);
  const notify = useUI((state) => state.notify);
  const canvasWidth = screen.pageWidth ?? screen.viewportWidth;
  const canvasHeight = screen.pageHeight ?? screen.viewportHeight;

  const redraw = (draft?: AnnotationElement) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    elements.forEach((item) => renderElement(ctx, item));
    if (draft) renderElement(ctx, draft);
  };
  // The image should reload only when the screenshot changes; element redraws are handled below.
  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      redraw();
    };
    image.src = screen.screenshotDataUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.screenshotDataUrl]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => redraw(), [elements]);

  const point = (event: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvasRef.current!.width / rect.width),
      y: (event.clientY - rect.top) * (canvasRef.current!.height / rect.height),
    };
  };
  const pointerDown = (event: React.PointerEvent) => {
    const p = point(event);
    if (tool === 'select') {
      const target = [...elements].reverse().find((item) => {
        const xs = item.points?.map((value) => value.x) ?? [
          item.x,
          item.endX ?? item.x + (item.type === 'text' ? 180 : 0),
        ];
        const ys = item.points?.map((value) => value.y) ?? [
          item.y,
          item.endY ?? item.y + (item.type === 'text' ? 32 : 0),
        ];
        return (
          p.x >= Math.min(...xs) - 18 &&
          p.x <= Math.max(...xs) + 18 &&
          p.y >= Math.min(...ys) - 18 &&
          p.y <= Math.max(...ys) + 18
        );
      });
      if (target) moving.current = { id: target.id, origin: p, before: elements };
      return;
    }
    if (tool === 'erase') {
      let index = -1;
      for (let i = elements.length - 1; i >= 0; i -= 1) {
        const item = elements[i];
        if (item && Math.hypot(item.x - p.x, item.y - p.y) < 80) {
          index = i;
          break;
        }
      }
      if (index >= 0) {
        setElements(elements.filter((_, i) => i !== index));
        setFuture([]);
      }
      return;
    }
    if (tool === 'text') {
      setTextDraft({ x: p.x, y: p.y, value: '' });
      return;
    }
    canvasRef.current?.setPointerCapture(event.pointerId);
    drawing.current = {
      id: crypto.randomUUID(),
      type: tool,
      x: p.x,
      y: p.y,
      endX: p.x,
      endY: p.y,
      points: tool === 'freehand' ? [p] : undefined,
      color,
      width,
    };
  };
  const clickCanvas = (event: React.MouseEvent) => {
    if (tool !== 'text') return;
    const p = point(event);
    setTextDraft({ x: p.x, y: p.y, value: '' });
  };
  const pointerMove = (event: React.PointerEvent) => {
    const p = point(event);
    if (moving.current) {
      const dx = p.x - moving.current.origin.x;
      const dy = p.y - moving.current.origin.y;
      setElements(
        moving.current.before.map((item) =>
          item.id !== moving.current?.id
            ? item
            : {
                ...item,
                x: item.x + dx,
                y: item.y + dy,
                endX: item.endX === undefined ? undefined : item.endX + dx,
                endY: item.endY === undefined ? undefined : item.endY + dy,
                points: item.points?.map((value) => ({ x: value.x + dx, y: value.y + dy })),
              },
        ),
      );
      return;
    }
    if (!drawing.current) return;
    drawing.current = {
      ...drawing.current,
      endX: p.x,
      endY: p.y,
      points:
        drawing.current.type === 'freehand' ? [...(drawing.current.points ?? []), p] : undefined,
    };
    redraw(drawing.current);
  };
  const pointerUp = () => {
    if (moving.current) {
      moving.current = null;
      setFuture([]);
      return;
    }
    if (!drawing.current) return;
    setElements([...elements, drawing.current]);
    drawing.current = null;
    setFuture([]);
  };
  const commitText = () => {
    if (!textDraft) return;
    const text = textDraft.value.trim();
    if (text) {
      setElements((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: textDraft.x,
          y: textDraft.y,
          text,
          color,
          width,
        },
      ]);
      setFuture([]);
      setTool('select');
    }
    setTextDraft(undefined);
  };
  const save = async () => {
    const now = new Date().toISOString();
    await db.annotations.put({
      id: existing?.id ?? crypto.randomUUID(),
      projectId: screen.projectId,
      screenId: screen.id,
      editorType: 'native-canvas',
      data: elements,
      previewDataUrl: canvasRef.current?.toDataURL('image/jpeg', 0.7),
      updatedAt: now,
    });
    notify('Annotations saved');
    close(undefined);
  };
  const undo = () => {
    if (!elements.length) return;
    setFuture([elements, ...future]);
    setElements(elements.slice(0, -1));
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setElements(next);
    setFuture(future.slice(1));
  };
  const tools: Array<[Tool, React.ReactNode, string]> = [
    ['select', <MousePointer2 />, 'Select'],
    ['freehand', <Pencil />, 'Freehand'],
    ['rectangle', <Square />, 'Rectangle'],
    ['circle', <Circle />, 'Circle'],
    ['arrow', <ArrowUpRight />, 'Arrow'],
    ['text', <Type />, 'Text'],
    ['erase', <Eraser />, 'Erase'],
  ];
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Annotate ${screen.title}`}
    >
      <div className="annotation-modal">
        <header>
          <div>
            <span>Annotating</span>
            <h2>{routeFromUrl(screen.url)}</h2>
          </div>
          <div className="annotation-actions">
            <button title="Undo" disabled={!elements.length} onClick={undo}>
              <Undo2 />
            </button>
            <button title="Redo" disabled={!future.length} onClick={redo}>
              <Redo2 />
            </button>
            <div className="annotation-zoom" aria-label="Canvas zoom controls">
              <button
                aria-label="Zoom out"
                disabled={zoom <= 0.5}
                onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))}
              >
                <Minus />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                aria-label="Zoom in"
                disabled={zoom >= 2}
                onClick={() => setZoom((value) => Math.min(2, value + 0.1))}
              >
                <Plus />
              </button>
            </div>
            <button className="button primary" onClick={() => void save()}>
              <Save size={16} /> Save
            </button>
            <button
              className="icon-button"
              aria-label="Close annotation editor"
              onClick={() => close(undefined)}
            >
              <X />
            </button>
          </div>
        </header>
        <div className="annotation-workspace">
          <aside className="annotation-toolbar">
            {tools.map(([id, icon, label]) => (
              <button
                key={id}
                className={tool === id ? 'active' : ''}
                title={label}
                onClick={() => setTool(id)}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
            <hr />
            <label>
              Stroke
              <input
                type="range"
                min="1"
                max="10"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
              />
            </label>
            <div className="color-list">
              {COLORS.map((item) => (
                <button
                  key={item}
                  className={color === item ? 'active' : ''}
                  aria-label={`Color ${item}`}
                  style={{ background: item }}
                  onClick={() => setColor(item)}
                />
              ))}
            </div>
          </aside>
          <div className="canvas-wrap">
            <div
              className="canvas-zoom-surface"
              style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}
            >
              <div
                className="canvas-stage"
                style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  transform: `scale(${zoom})`,
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  onPointerDown={pointerDown}
                  onClick={clickCanvas}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerUp}
                  onPointerCancel={pointerUp}
                />
                {textDraft && (
                  <textarea
                    className="canvas-text-input"
                    autoFocus
                    aria-label="Annotation text"
                    value={textDraft.value}
                    style={{ left: textDraft.x, top: textDraft.y }}
                    onChange={(event) =>
                      setTextDraft((current) =>
                        current ? { ...current, value: event.target.value } : current,
                      )
                    }
                    onBlur={commitText}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        commitText();
                      }
                      if (event.key === 'Escape') setTextDraft(undefined);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
