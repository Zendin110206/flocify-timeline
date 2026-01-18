export type Tool =
  | "select"
  | "hand"
  | "pen"
  | "line"
  | "rect"
  | "ellipse"
  | "text"
  | "sticky"
  | "eraser";

export type Point = { x: number; y: number };

export type ShapeType = "pen" | "line" | "rect" | "ellipse" | "text" | "sticky";

export type BaseShape = {
  id: string;
  type: ShapeType;
  stroke: string;
  fill: string;
  strokeWidth: number;
};

export type PenShape = BaseShape & {
  type: "pen";
  points: Point[];
};

export type LineShape = BaseShape & {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type RectShape = BaseShape & {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EllipseShape = BaseShape & {
  type: "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextShape = BaseShape & {
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  width: number;
  height: number;
};

export type StickyShape = BaseShape & {
  type: "sticky";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
};

export type Shape =
  | PenShape
  | LineShape
  | RectShape
  | EllipseShape
  | TextShape
  | StickyShape;

export type Viewport = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

export type EditingState = {
  id: string;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  type: "text" | "sticky";
};

export type StoredBoard = {
  version: 1;
  shapes: Shape[];
  viewport: Viewport;
  updatedAt: string;
};

export type RenderOptions = {
  width: number;
  height: number;
  showGrid: boolean;
  selectedId?: string | null;
  hoverId?: string | null;
  clear?: boolean;
  dpr?: number;
};

export type BoardState = {
  shapes: Shape[];
  past: Shape[][];
  future: Shape[][];
};

export type BoardAction =
  | { type: "replace"; shapes: Shape[] }
  | { type: "commit"; shapes: Shape[]; before: Shape[] }
  | { type: "undo" }
  | { type: "redo" };
