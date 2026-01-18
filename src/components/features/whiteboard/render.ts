import {
  FONT_FAMILY,
  GRID_SIZE,
  LINE_HEIGHT_RATIO,
  TEXT_PADDING,
} from "./constants";
import type { RenderOptions, Shape, Viewport } from "./types";
import { getShapeBounds, wrapTextLines } from "./utils";

const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape) => {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = shape.stroke;
  ctx.fillStyle = shape.fill;
  ctx.lineWidth = shape.strokeWidth;

  if (shape.type === "pen") {
    if (shape.points.length === 1) {
      const p = shape.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, shape.strokeWidth / 2), 0, Math.PI * 2);
      ctx.fillStyle = shape.stroke;
      ctx.fill();
      ctx.restore();
      return;
    }
    if (shape.points.length < 2) {
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(shape.points[0].x, shape.points[0].y);
    for (let i = 1; i < shape.points.length; i += 1) {
      ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (shape.type === "line") {
    ctx.beginPath();
    ctx.moveTo(shape.x1, shape.y1);
    ctx.lineTo(shape.x2, shape.y2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (shape.type === "rect") {
    if (shape.fill && shape.fill !== "transparent") {
      ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
    }
    if (shape.strokeWidth > 0) {
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    }
    ctx.restore();
    return;
  }

  if (shape.type === "ellipse") {
    const rx = Math.abs(shape.width) / 2;
    const ry = Math.abs(shape.height) / 2;
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (shape.fill && shape.fill !== "transparent") ctx.fill();
    if (shape.strokeWidth > 0) ctx.stroke();
    ctx.restore();
    return;
  }

  if (shape.type === "text") {
    ctx.font = `${shape.fontSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = shape.stroke;
    ctx.textBaseline = "top";
    const lineHeight = shape.fontSize * LINE_HEIGHT_RATIO;
    const lines = shape.text.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      ctx.fillText(lines[i], shape.x, shape.y + i * lineHeight);
    }
    ctx.restore();
    return;
  }

  if (shape.type === "sticky") {
    ctx.fillStyle = shape.fill;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.18)";
    ctx.lineWidth = 1;
    ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);

    ctx.font = `${shape.fontSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = shape.stroke;
    ctx.textBaseline = "top";
    const maxWidth = Math.max(1, shape.width - TEXT_PADDING * 2);
    const lines = wrapTextLines(ctx, shape.text, maxWidth);
    const lineHeight = shape.fontSize * LINE_HEIGHT_RATIO;
    for (let i = 0; i < lines.length; i += 1) {
      ctx.fillText(
        lines[i],
        shape.x + TEXT_PADDING,
        shape.y + TEXT_PADDING + i * lineHeight,
      );
    }
    ctx.restore();
  }
};

const drawSelection = (
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  scale: number,
) => {
  const padding = 6 / scale;
  ctx.save();
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 1 / scale;
  ctx.setLineDash([6 / scale, 4 / scale]);
  ctx.strokeRect(
    bounds.x - padding,
    bounds.y - padding,
    bounds.width + padding * 2,
    bounds.height + padding * 2,
  );
  ctx.restore();
};

const drawHover = (
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  scale: number,
) => {
  const padding = 5 / scale;
  ctx.save();
  ctx.strokeStyle = "rgba(37, 99, 235, 0.35)";
  ctx.lineWidth = 1 / scale;
  ctx.setLineDash([]);
  ctx.strokeRect(
    bounds.x - padding,
    bounds.y - padding,
    bounds.width + padding * 2,
    bounds.height + padding * 2,
  );
  ctx.restore();
};

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  width: number,
  height: number,
) => {
  const left = -viewport.offsetX;
  const top = -viewport.offsetY;
  const right = width / viewport.scale - viewport.offsetX;
  const bottom = height / viewport.scale - viewport.offsetY;
  const startX = Math.floor(left / GRID_SIZE) * GRID_SIZE;
  const startY = Math.floor(top / GRID_SIZE) * GRID_SIZE;

  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.30)";
  ctx.lineWidth = 1 / viewport.scale;
  ctx.beginPath();

  for (let x = startX; x <= right; x += GRID_SIZE) {
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
  }
  for (let y = startY; y <= bottom; y += GRID_SIZE) {
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
  }

  ctx.stroke();
  ctx.restore();
};

export const renderBoard = (
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  viewport: Viewport,
  options: RenderOptions,
) => {
  const dpr = options.dpr ?? 1;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (options.clear !== false) {
    ctx.clearRect(0, 0, options.width, options.height);
  }

  ctx.save();
  ctx.fillStyle = "rgba(248, 250, 252, 1)";
  ctx.fillRect(0, 0, options.width, options.height);
  ctx.restore();

  ctx.save();
  ctx.scale(viewport.scale, viewport.scale);
  ctx.translate(viewport.offsetX, viewport.offsetY);

  if (options.showGrid) drawGrid(ctx, viewport, options.width, options.height);

  for (const shape of shapes) drawShape(ctx, shape);

  if (options.hoverId) {
    const hover = shapes.find((s) => s.id === options.hoverId);
    if (hover) drawHover(ctx, getShapeBounds(hover), viewport.scale);
  }

  if (options.selectedId) {
    const selected = shapes.find((s) => s.id === options.selectedId);
    if (selected) drawSelection(ctx, getShapeBounds(selected), viewport.scale);
  }

  ctx.restore();
};
