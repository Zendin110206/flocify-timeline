import type { LucideIcon } from "lucide-react";
import {
  Circle,
  Eraser,
  Hand,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  StickyNote,
  Type,
} from "lucide-react";
import type { Tool } from "./types";

export const STORAGE_KEY = "flocify-whiteboard-v1";
export const HISTORY_LIMIT = 60;

export const GRID_SIZE = 80;
export const MIN_SCALE = 0.3;
export const MAX_SCALE = 3.2;

export const TEXT_PADDING = 12;
export const LINE_HEIGHT_RATIO = 1.4;
export const FONT_FAMILY =
  "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";

export const STROKE_COLORS = [
  "#0f172a",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
];

export const FILL_COLORS = [
  "#ffffff",
  "#fef3c7",
  "#dcfce7",
  "#dbeafe",
  "#fee2e2",
  "#e0e7ff",
  "#f3e8ff",
  "#e2e8f0",
];

export const STROKE_WIDTHS = [2, 4, 6, 10];
export const FONT_SIZES = [16, 20, 24, 30, 36];

export const DEFAULT_TEXT_SIZE = { width: 220, height: 52 };
export const DEFAULT_STICKY_SIZE = { width: 260, height: 190 };

export type ToolItem = {
  id: Tool;
  label: string;
  shortcut: string;
  icon: LucideIcon;
};

export const TOOL_ITEMS: ToolItem[] = [
  { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { id: "hand", label: "Hand", shortcut: "H", icon: Hand },
  { id: "pen", label: "Pen", shortcut: "P", icon: Pencil },
  { id: "line", label: "Line", shortcut: "L", icon: Minus },
  { id: "rect", label: "Rect", shortcut: "R", icon: Square },
  { id: "ellipse", label: "Ellipse", shortcut: "O", icon: Circle },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "sticky", label: "Sticky", shortcut: "S", icon: StickyNote },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: Eraser },
];
