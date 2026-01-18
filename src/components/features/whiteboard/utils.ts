import {
  FONT_FAMILY,
  LINE_HEIGHT_RATIO,
  TEXT_PADDING,
} from "./constants";
import type { Point, Shape, Viewport } from "./types";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const generateId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const distanceToSegment = (point: Point, a: Point, b: Point) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return distance(point, a);
  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy);
  const clamped = clamp(t, 0, 1);
  const proj = { x: a.x + clamped * dx, y: a.y + clamped * dy };
  return distance(point, proj);
};

export const normalizeRect = (start: Point, end: Point) => {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
};

// screen = (world + offset) * scale
export const screenToWorld = (screen: Point, viewport: Viewport): Point => ({
  x: screen.x / viewport.scale - viewport.offsetX,
  y: screen.y / viewport.scale - viewport.offsetY,
});

export const worldToScreen = (world: Point, viewport: Viewport): Point => ({
  x: (world.x + viewport.offsetX) * viewport.scale,
  y: (world.y + viewport.offsetY) * viewport.scale,
});

export const getShapeBounds = (shape: Shape) => {
  switch (shape.type) {
    case "pen": {
      if (shape.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
      let minX = shape.points[0].x;
      let minY = shape.points[0].y;
      let maxX = shape.points[0].x;
      let maxY = shape.points[0].y;
      for (const p of shape.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    case "line": {
      const minX = Math.min(shape.x1, shape.x2);
      const minY = Math.min(shape.y1, shape.y2);
      return {
        x: minX,
        y: minY,
        width: Math.abs(shape.x2 - shape.x1),
        height: Math.abs(shape.y2 - shape.y1),
      };
    }
    case "rect":
    case "ellipse":
    case "text":
    case "sticky":
      return {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      };
  }
};

export const getBoardBounds = (shapes: Shape[]) => {
  if (shapes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of shapes) {
    const b = getShapeBounds(s);
    const pad = Math.max(2, s.strokeWidth) * 0.8;
    minX = Math.min(minX, b.x - pad);
    minY = Math.min(minY, b.y - pad);
    maxX = Math.max(maxX, b.x + b.width + pad);
    maxY = Math.max(maxY, b.y + b.height + pad);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export const wrapTextLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) => {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.trim().length === 0) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width <= maxWidth) {
        line = testLine;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
};

export const measureTextBlock = (
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
) => {
  ctx.font = `${fontSize}px ${FONT_FAMILY}`;
  const lines = text.split("\n");
  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  let maxWidth = 1;
  for (const line of lines)
    maxWidth = Math.max(maxWidth, ctx.measureText(line).width);
  return {
    width: Math.max(1, maxWidth),
    height: Math.max(lineHeight, lines.length * lineHeight),
    lines,
    lineHeight,
  };
};

export const translateShape = (shape: Shape, dx: number, dy: number): Shape => {
  switch (shape.type) {
    case "pen":
      return {
        ...shape,
        points: shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      };
    case "line":
      return {
        ...shape,
        x1: shape.x1 + dx,
        y1: shape.y1 + dy,
        x2: shape.x2 + dx,
        y2: shape.y2 + dy,
      };
    case "rect":
    case "ellipse":
    case "text":
    case "sticky":
      return { ...shape, x: shape.x + dx, y: shape.y + dy };
  }
};

export const measureStickyHeight = (
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  fontSize: number,
) => {
  ctx.font = `${fontSize}px ${FONT_FAMILY}`;
  const maxWidth = Math.max(1, width - TEXT_PADDING * 2);
  const lines = wrapTextLines(ctx, text, maxWidth);
  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  return lines.length * lineHeight + TEXT_PADDING * 2;
};
