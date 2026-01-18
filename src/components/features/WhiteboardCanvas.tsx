// src/components/features/WhiteboardCanvas.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  ImageDown,
  Info,
  Pencil,
  Printer,
  Redo2,
  RefreshCcw,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";
import {
  DEFAULT_STICKY_SIZE,
  DEFAULT_TEXT_SIZE,
  FILL_COLORS,
  FONT_FAMILY,
  FONT_SIZES,
  LINE_HEIGHT_RATIO,
  MAX_SCALE,
  MIN_SCALE,
  STROKE_COLORS,
  STROKE_WIDTHS,
  STORAGE_KEY,
  TOOL_ITEMS,
} from "./whiteboard/constants";
import { boardReducer } from "./whiteboard/reducer";
import { renderBoard } from "./whiteboard/render";
import type {
  EditingState,
  Point,
  Shape,
  StickyShape,
  StoredBoard,
  TextShape,
  Tool,
  Viewport,
} from "./whiteboard/types";
import {
  clamp,
  distance,
  distanceToSegment,
  generateId,
  getBoardBounds,
  getShapeBounds,
  measureTextBlock,
  measureStickyHeight,
  normalizeRect,
  screenToWorld,
  translateShape,
  worldToScreen,
} from "./whiteboard/utils";

/**
 * WhiteboardCanvas — ready-to-use whiteboard (Miro-lite)
 * FIXES:
 * 1) TS error align: event handlers typed for HTMLCanvasElement (not HTMLDivElement)
 * 2) Drawing disappearing / object stuck 0: prevent shapesRef overwrite on requestRender changes
 */

function safeParseBoard(raw: string): StoredBoard | null {
  try {
    const parsed = JSON.parse(raw) as StoredBoard;
    if (!parsed || parsed.version !== 1) return null;
    if (!Array.isArray(parsed.shapes)) return null;
    if (!parsed.viewport || typeof parsed.viewport.scale !== "number")
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function WhiteboardCanvas({
  className,
}: {
  className?: string;
}) {
  const dialog = useDialog();

  const initialStoredBoard = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? safeParseBoard(saved) : null;
    } catch {
      return null;
    }
  }, []);

  const [board, dispatch] = useReducer(
    boardReducer,
    initialStoredBoard?.shapes ?? [],
    (shapes) => ({ shapes, past: [], future: [] }),
  );

  const [viewport, setViewport] = useState<Viewport>(() => ({
    offsetX: initialStoredBoard?.viewport?.offsetX ?? 0,
    offsetY: initialStoredBoard?.viewport?.offsetY ?? 0,
    scale: initialStoredBoard?.viewport?.scale ?? 1,
  }));

  const [tool, setTool] = useState<Tool>("select");
  const [strokeColor, setStrokeColor] = useState(STROKE_COLORS[0]);
  const [fillColor, setFillColor] = useState(FILL_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(STROKE_WIDTHS[0]);
  const [fontSize, setFontSize] = useState(FONT_SIZES[2]);
  const [showGrid, setShowGrid] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() =>
    initialStoredBoard?.updatedAt
      ? new Date(initialStoredBoard.updatedAt)
      : null,
  );
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const shapesRef = useRef<Shape[]>(board.shapes);
  const viewportRef = useRef<Viewport>(viewport);

  // interaction refs
  const drawRef = useRef<{ id: string; tool: Tool; start: Point } | null>(null);
  const dragRef = useRef<{ id: string; last: Point } | null>(null);
  const panRef = useRef<{ start: Point; origin: Viewport } | null>(null);
  const eraseRef = useRef<{ last: Point } | null>(null);

  // draft commit bookkeeping
  const draftSnapshotRef = useRef<Shape[] | null>(null);
  const hasChangeRef = useRef(false);

  // editing snapshot (cancel restore)
  const editingSnapshotRef = useRef<Shape[] | null>(null);

  // render RAF
  const rafRef = useRef<number | null>(null);

  const effectiveTool = isSpaceDown ? "hand" : tool;
  const canUndo = board.past.length > 0;
  const canRedo = board.future.length > 0;

  const resetTransientState = useCallback(() => {
    setIsSpaceDown(false);
    setIsPanning(false);
    panRef.current = null;
  }, []);

  const requestRender = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

      renderBoard(ctx, shapesRef.current, viewportRef.current, {
        width: canvasSize.width,
        height: canvasSize.height,
        showGrid,
        selectedId,
        hoverId,
        dpr,
      });
    });
  }, [canvasSize.height, canvasSize.width, hoverId, selectedId, showGrid]);

  /**
   * ✅ FIX #2:
   * Sinkronisasi refs TIDAK boleh tergantung requestRender.
   * Kalau requestRender berubah (selected/hover/grid berubah), jangan overwrite shapesRef dari board.shapes.
   */
  useEffect(() => {
    shapesRef.current = board.shapes;
  }, [board.shapes]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // render ulang saat data/visual berubah
  useEffect(() => {
    requestRender();
  }, [requestRender, board.shapes, viewport, hoverId, selectedId, showGrid]);

  useEffect(() => {
    const handleBlur = () => resetTransientState();
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") resetTransientState();
    };
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [resetTransientState]);

  const setShapesImmediate = useCallback(
    (nextShapes: Shape[]) => {
      shapesRef.current = nextShapes;
      requestRender();
    },
    [requestRender],
  );

  const beginDraft = useCallback(() => {
    if (!draftSnapshotRef.current) {
      draftSnapshotRef.current = shapesRef.current;
      hasChangeRef.current = false;
    }
  }, []);

  const markDraftChange = useCallback(() => {
    if (draftSnapshotRef.current) hasChangeRef.current = true;
  }, []);

  const commitDraft = useCallback(
    (nextShapes?: Shape[]) => {
      const before = draftSnapshotRef.current;
      if (!before) return;
      const didChange = hasChangeRef.current;
      draftSnapshotRef.current = null;
      hasChangeRef.current = false;
      if (!didChange) return;

      const finalShapes = nextShapes ?? shapesRef.current;
      shapesRef.current = finalShapes;
      dispatch({ type: "commit", shapes: finalShapes, before });
      requestRender();
    },
    [requestRender],
  );

  const getScreenPoint = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    },
    [],
  );

  const getWorldPoint = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const screen = getScreenPoint(event);
      return screenToWorld(screen, viewportRef.current);
    },
    [getScreenPoint],
  );

  const findShapeAt = useCallback((point: Point) => {
    const vp = viewportRef.current;
    const tolerance = 8 / vp.scale;

    for (let i = shapesRef.current.length - 1; i >= 0; i -= 1) {
      const shape = shapesRef.current[i];

      if (shape.type === "pen") {
        if (shape.points.length === 1) {
          if (distance(shape.points[0], point) <= tolerance) return shape;
          continue;
        }
        for (let p = 1; p < shape.points.length; p += 1) {
          const dist = distanceToSegment(
            point,
            shape.points[p - 1],
            shape.points[p],
          );
          if (dist <= tolerance) return shape;
        }
        continue;
      }

      if (shape.type === "line") {
        const dist = distanceToSegment(
          point,
          { x: shape.x1, y: shape.y1 },
          { x: shape.x2, y: shape.y2 },
        );
        if (dist <= tolerance) return shape;
        continue;
      }

      const b = getShapeBounds(shape);

      // Quick bounds
      const inside =
        point.x >= b.x - tolerance &&
        point.x <= b.x + b.width + tolerance &&
        point.y >= b.y - tolerance &&
        point.y <= b.y + b.height + tolerance;

      if (!inside) continue;

      // Better ellipse hit feel (optional)
      if (shape.type === "ellipse") {
        const rx = Math.max(1, Math.abs(shape.width) / 2);
        const ry = Math.max(1, Math.abs(shape.height) / 2);
        const cx = shape.x + shape.width / 2;
        const cy = shape.y + shape.height / 2;
        const nx = (point.x - cx) / rx;
        const ny = (point.y - cy) / ry;
        if (nx * nx + ny * ny <= 1.15) return shape;
        continue;
      }

      return shape;
    }
    return null;
  }, []);

  const eraseAtPoint = useCallback(
    (point: Point) => {
      const hit = findShapeAt(point);
      if (!hit) return;

      const nextShapes = shapesRef.current.filter((s) => s.id !== hit.id);
      if (nextShapes.length === shapesRef.current.length) return;

      setShapesImmediate(nextShapes);
      markDraftChange();
      if (selectedId === hit.id) setSelectedId(null);
      if (hoverId === hit.id) setHoverId(null);
    },
    [findShapeAt, hoverId, markDraftChange, selectedId, setShapesImmediate],
  );

  const eraseAlong = useCallback(
    (from: Point, to: Point) => {
      const vp = viewportRef.current;
      const step = Math.max(2 / vp.scale, 1.2); // constant-ish in screen pixels
      const total = distance(from, to);
      if (total <= step) {
        eraseAtPoint(to);
        return;
      }
      const steps = Math.ceil(total / step);
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        eraseAtPoint({
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        });
      }
    },
    [eraseAtPoint],
  );

  const openTextEditor = useCallback((shape: TextShape | StickyShape) => {
    if (!editingSnapshotRef.current)
      editingSnapshotRef.current = shapesRef.current;

    setSelectedId(shape.id);
    setEditing({
      id: shape.id,
      value: shape.text,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      fontSize: shape.fontSize,
      type: shape.type,
    });

    // focus next tick
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const commitEditing = useCallback(
    (mode: "commit" | "cancel") => {
      if (!editing) return;
      const before = editingSnapshotRef.current ?? shapesRef.current;
      editingSnapshotRef.current = null;

      if (mode === "cancel") {
        setShapesImmediate(before);
        setEditing(null);
        return;
      }

      const trimmed = editing.value.trim();
      if (!trimmed) {
        // remove empty text objects
        const nextShapes = before.filter((s) => s.id !== editing.id);
        const isSame =
          nextShapes.length === before.length &&
          nextShapes.every((shape, index) => shape === before[index]);
        if (isSame) {
          setShapesImmediate(nextShapes);
          setEditing(null);
          setSelectedId(null);
          return;
        }
        shapesRef.current = nextShapes;
        dispatch({ type: "commit", shapes: nextShapes, before });
        requestRender();
        setEditing(null);
        setSelectedId(null);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d") ?? null;

      const nextShapes = shapesRef.current.map((shape) => {
        if (shape.id !== editing.id) return shape;

        if (shape.type === "text") {
          if (ctx) {
            const metrics = measureTextBlock(
              ctx,
              editing.value,
              editing.fontSize,
            );
            return {
              ...shape,
              text: editing.value,
              fontSize: editing.fontSize,
              width: metrics.width,
              height: metrics.height,
            };
          }
          return {
            ...shape,
            text: editing.value,
            fontSize: editing.fontSize,
            width: DEFAULT_TEXT_SIZE.width,
            height: DEFAULT_TEXT_SIZE.height,
          };
        }

        if (shape.type === "sticky") {
          if (ctx) {
            const desiredHeight = Math.max(
              shape.height,
              measureStickyHeight(
                ctx,
                editing.value,
                shape.width,
                editing.fontSize,
              ),
            );
            return {
              ...shape,
              text: editing.value,
              fontSize: editing.fontSize,
              height: desiredHeight,
            };
          }
          return { ...shape, text: editing.value, fontSize: editing.fontSize };
        }

        return shape;
      });

      // Commit as one history action
      shapesRef.current = nextShapes;
      dispatch({ type: "commit", shapes: nextShapes, before });
      requestRender();
      setEditing(null);
    },
    [editing, requestRender, setShapesImmediate],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const before = shapesRef.current;
    const nextShapes = before.filter((s) => s.id !== selectedId);
    if (nextShapes.length === before.length) {
      setSelectedId(null);
      return;
    }
    shapesRef.current = nextShapes;
    dispatch({ type: "commit", shapes: nextShapes, before });
    requestRender();
    setSelectedId(null);
  }, [requestRender, selectedId]);

  const handleUndo = useCallback(() => {
    if (board.past.length === 0) return;
    dispatch({ type: "undo" });
    setSelectedId(null);
    setHoverId(null);
  }, [board.past.length]);

  const handleRedo = useCallback(() => {
    if (board.future.length === 0) return;
    dispatch({ type: "redo" });
    setSelectedId(null);
    setHoverId(null);
  }, [board.future.length]);

  const handleClear = useCallback(async () => {
    if (shapesRef.current.length === 0) {
      await dialog.alert({
        title: "Tidak Ada Objek",
        message: "Board masih kosong.",
      });
      return;
    }
    const confirmed = await dialog.confirm({
      title: "Bersihkan Board",
      message: "Semua objek akan dihapus.",
      confirmText: "Hapus Semua",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!confirmed) return;
    const before = shapesRef.current;
    shapesRef.current = [];
    dispatch({ type: "commit", shapes: [], before });
    requestRender();
    setSelectedId(null);
    setHoverId(null);
  }, [dialog, requestRender]);

  const zoomLabel = useMemo(
    () => `${Math.round(viewport.scale * 100)}%`,
    [viewport.scale],
  );

  const zoomAt = useCallback((screenPoint: Point, nextScale: number) => {
    setViewport((prev) => {
      const worldPoint = screenToWorld(screenPoint, prev);
      const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      return {
        scale,
        offsetX: screenPoint.x / scale - worldPoint.x,
        offsetY: screenPoint.y / scale - worldPoint.y,
      };
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    const center = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    zoomAt(center, viewportRef.current.scale * 1.1);
  }, [canvasSize.height, canvasSize.width, zoomAt]);

  const handleZoomOut = useCallback(() => {
    const center = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    zoomAt(center, viewportRef.current.scale / 1.1);
  }, [canvasSize.height, canvasSize.width, zoomAt]);

  const resetView = useCallback(() => {
    setViewport({ offsetX: 0, offsetY: 0, scale: 1 });
  }, []);

  const fitToContent = useCallback(() => {
    const bounds = getBoardBounds(shapesRef.current);
    if (!bounds) {
      resetView();
      return;
    }
    const margin = 80; // screen px margin
    const w = Math.max(1, canvasSize.width - margin * 2);
    const h = Math.max(1, canvasSize.height - margin * 2);
    const scale = clamp(
      Math.min(w / bounds.width, h / bounds.height),
      MIN_SCALE,
      MAX_SCALE,
    );

    // center bounds in viewport
    const centerWorld = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
    const centerScreen = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    const offsetX = centerScreen.x / scale - centerWorld.x;
    const offsetY = centerScreen.y / scale - centerWorld.y;

    setViewport({ scale, offsetX, offsetY });
  }, [canvasSize.height, canvasSize.width, resetView]);

  const toolShortcuts = useMemo<Record<string, Tool>>(
    () => ({
      v: "select",
      h: "hand",
      p: "pen",
      l: "line",
      r: "rect",
      o: "ellipse",
      t: "text",
      s: "sticky",
      e: "eraser",
    }),
    [],
  );

  // Resize observer -> set canvasSize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setCanvasSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      });
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setCanvasSize({
        width: Math.max(1, Math.floor(width)),
        height: Math.max(1, Math.floor(height)),
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Apply DPR sizing when size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return;
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(canvasSize.width * dpr);
    canvas.height = Math.floor(canvasSize.height * dpr);
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    requestRender();
  }, [canvasSize.height, canvasSize.width, requestRender]);

  // Autosave (debounced)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const payload: StoredBoard = {
        version: 1,
        shapes: board.shapes,
        viewport,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setLastSavedAt(new Date(payload.updatedAt));
      } catch {
        // Ignore storage failures (quota/private mode)
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [board.shapes, viewport]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // while editing, only allow escape/commit handled by textarea
      if (editing) return;

      if (event.key === " ") {
        event.preventDefault();
        setIsSpaceDown(true);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
        return;
      }

      const shortcut = toolShortcuts[event.key.toLowerCase()];
      if (shortcut) {
        event.preventDefault();
        setTool(shortcut);
        return;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === " ") setIsSpaceDown(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [deleteSelected, editing, handleRedo, handleUndo, toolShortcuts]);

  const handleExport = useCallback(
    async (format: "png" | "pdf") => {
      if (shapesRef.current.length === 0) {
        await dialog.alert({
          title: "Belum Ada Konten",
          message: "Tambahkan objek sebelum export.",
        });
        return;
      }
      const bounds = getBoardBounds(shapesRef.current);
      if (!bounds) return;

      const margin = 40;
      const width = Math.ceil(bounds.width + margin * 2);
      const height = Math.ceil(bounds.height + margin * 2);

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = Math.max(1, width);
      exportCanvas.height = Math.max(1, height);

      const ctx = exportCanvas.getContext("2d");
      if (!ctx) return;

      // background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      const exportViewport: Viewport = {
        offsetX: -bounds.x + margin,
        offsetY: -bounds.y + margin,
        scale: 1,
      };

      renderBoard(ctx, shapesRef.current, exportViewport, {
        width: exportCanvas.width,
        height: exportCanvas.height,
        showGrid: false,
        clear: false,
        dpr: 1,
      });

      const dataUrl = exportCanvas.toDataURL("image/png");

      if (format === "png") {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
        link.click();
        return;
      }

      // "PDF" via print (reliable without extra deps)
      const printWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!printWindow) return;
      printWindow.document.write(
        `<!doctype html><html><head><title>Whiteboard Export</title>
<style>
  body{margin:0;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;}
</style>
</head><body></body></html>`,
      );
      printWindow.document.close();
      const img = printWindow.document.createElement("img");
      img.src = dataUrl;
      img.alt = "Whiteboard Export";
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
      printWindow.document.body.appendChild(img);
    },
    [dialog],
  );

  const cursor = useMemo(() => {
    if (editing) return "text";
    if (effectiveTool === "hand") return isPanning ? "grabbing" : "grab";
    if (effectiveTool === "select") return "default";
    if (effectiveTool === "eraser") return "crosshair";
    return "crosshair";
  }, [editing, effectiveTool, isPanning]);

  const editingStyle = useMemo(() => {
    if (!editing) return null;
    const screen = worldToScreen({ x: editing.x, y: editing.y }, viewport);

    // Keep editor readable on extreme zoom out
    const scaledFont = clamp(editing.fontSize * viewport.scale, 12, 48);

    return {
      left: screen.x,
      top: screen.y,
      width: Math.max(90, editing.width * viewport.scale),
      height: Math.max(40, editing.height * viewport.scale),
      fontSize: scaledFont,
      lineHeight: LINE_HEIGHT_RATIO,
      fontFamily: FONT_FAMILY,
    } as React.CSSProperties;
  }, [editing, viewport]);

  const savedLabel = useMemo(() => {
    if (!lastSavedAt) return "Belum";
    return lastSavedAt.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lastSavedAt]);

  const iconButtonClass =
    "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";
  const actionButtonClass =
    "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";
  const panelTitleClass =
    "text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

  const finalizeInteraction = useCallback(() => {
    let nextShapes = shapesRef.current;

    // Remove tiny accidental shapes
    if (drawRef.current) {
      const { id } = drawRef.current;
      const shape = shapesRef.current.find((s) => s.id === id);

      const minWorld = 2 / viewportRef.current.scale;

      if (shape?.type === "line") {
        const len = distance(
          { x: shape.x1, y: shape.y1 },
          { x: shape.x2, y: shape.y2 },
        );
        if (len < minWorld)
          nextShapes = shapesRef.current.filter((s) => s.id !== id);
      }
      if (shape?.type === "rect" || shape?.type === "ellipse") {
        if (
          Math.abs(shape.width) < minWorld ||
          Math.abs(shape.height) < minWorld
        ) {
          nextShapes = shapesRef.current.filter((s) => s.id !== id);
        }
      }
      if (shape?.type === "pen" && shape.points.length < 2) {
        nextShapes = shapesRef.current.filter((s) => s.id !== id);
      }

      drawRef.current = null;
    }

    dragRef.current = null;
    eraseRef.current = null;

    if (nextShapes !== shapesRef.current) setShapesImmediate(nextShapes);
    commitDraft(nextShapes);
  }, [commitDraft, setShapesImmediate]);

  /**
   * ✅ FIX #1 (TS align error):
   * event handlers harus HTMLCanvasElement karena dipasang di <canvas />
   */
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (editing) return;

      // only left button for drawing/select
      if (event.button === 2) return;
      if (event.isPrimary === false) return;
      if (event.button !== 0 && event.button !== 1) return;

      const screenPoint = getScreenPoint(event);
      const worldPoint = screenToWorld(screenPoint, viewportRef.current);

      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture failures
      }

      // Hand tool or middle button pan
      if (effectiveTool === "hand" || event.button === 1) {
        panRef.current = { start: screenPoint, origin: viewportRef.current };
        setIsPanning(true);
        return;
      }

      if (effectiveTool === "select") {
        const hit = findShapeAt(worldPoint);
        if (hit) {
          setSelectedId(hit.id);
          beginDraft();
          dragRef.current = { id: hit.id, last: worldPoint };
          return;
        }
        setSelectedId(null);
        setHoverId(null);
        return;
      }

      if (effectiveTool === "eraser") {
        beginDraft();
        eraseAtPoint(worldPoint);
        eraseRef.current = { last: worldPoint };
        return;
      }

      const baseShape = {
        id: generateId("shape"),
        stroke: strokeColor,
        fill: fillColor,
        strokeWidth,
      };

      if (effectiveTool === "text" || effectiveTool === "sticky") {
        const shape =
          effectiveTool === "text"
            ? ({
                ...baseShape,
                type: "text",
                x: worldPoint.x,
                y: worldPoint.y,
                width: DEFAULT_TEXT_SIZE.width,
                height: DEFAULT_TEXT_SIZE.height,
                text: "",
                fontSize,
              } as TextShape)
            : ({
                ...baseShape,
                type: "sticky",
                x: worldPoint.x,
                y: worldPoint.y,
                width: DEFAULT_STICKY_SIZE.width,
                height: DEFAULT_STICKY_SIZE.height,
                text: "",
                fontSize,
              } as StickyShape);

        editingSnapshotRef.current = shapesRef.current;
        setShapesImmediate([...shapesRef.current, shape]);
        openTextEditor(shape);
        return;
      }

      beginDraft();

      let newShape: Shape;
      if (effectiveTool === "pen") {
        newShape = { ...baseShape, type: "pen", points: [worldPoint] };
      } else if (effectiveTool === "line") {
        newShape = {
          ...baseShape,
          type: "line",
          x1: worldPoint.x,
          y1: worldPoint.y,
          x2: worldPoint.x,
          y2: worldPoint.y,
        };
      } else if (effectiveTool === "rect") {
        newShape = {
          ...baseShape,
          type: "rect",
          x: worldPoint.x,
          y: worldPoint.y,
          width: 0,
          height: 0,
        };
      } else {
        newShape = {
          ...baseShape,
          type: "ellipse",
          x: worldPoint.x,
          y: worldPoint.y,
          width: 0,
          height: 0,
        };
      }

      setShapesImmediate([...shapesRef.current, newShape]);
      markDraftChange();

      drawRef.current = {
        id: newShape.id,
        tool: effectiveTool,
        start: worldPoint,
      };
      setSelectedId(newShape.id);
      setHoverId(null);
    },
    [
      beginDraft,
      editing,
      effectiveTool,
      eraseAtPoint,
      fillColor,
      findShapeAt,
      fontSize,
      getScreenPoint,
      markDraftChange,
      openTextEditor,
      setShapesImmediate,
      strokeColor,
      strokeWidth,
    ],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const screenPoint = getScreenPoint(event);
      const worldPoint = screenToWorld(screenPoint, viewportRef.current);

      // pan
      if (panRef.current) {
        const { start, origin } = panRef.current;
        const dx = (screenPoint.x - start.x) / origin.scale;
        const dy = (screenPoint.y - start.y) / origin.scale;
        setViewport({
          ...origin,
          offsetX: origin.offsetX + dx,
          offsetY: origin.offsetY + dy,
        });
        return;
      }

      // drag
      if (dragRef.current) {
        const { id, last } = dragRef.current;
        const dx = worldPoint.x - last.x;
        const dy = worldPoint.y - last.y;
        if (dx === 0 && dy === 0) return;
        dragRef.current = { id, last: worldPoint };
        const nextShapes = shapesRef.current.map((s) =>
          s.id === id ? translateShape(s, dx, dy) : s,
        );
        setShapesImmediate(nextShapes);
        markDraftChange();
        return;
      }

      // draw
      if (drawRef.current) {
        const { id, tool: drawingTool, start } = drawRef.current;
        const vp = viewportRef.current;
        const minDist = 1.5 / vp.scale; // constant-ish in screen px

        if (drawingTool === "pen") {
          const nextShapes = shapesRef.current.map((s) => {
            if (s.id !== id || s.type !== "pen") return s;
            const last = s.points[s.points.length - 1];
            if (distance(last, worldPoint) < minDist) return s;
            return { ...s, points: [...s.points, worldPoint] };
          });
          setShapesImmediate(nextShapes);
          markDraftChange();
          return;
        }

        if (drawingTool === "line") {
          const nextShapes = shapesRef.current.map((s) =>
            s.id === id && s.type === "line"
              ? { ...s, x2: worldPoint.x, y2: worldPoint.y }
              : s,
          );
          setShapesImmediate(nextShapes);
          markDraftChange();
          return;
        }

        if (drawingTool === "rect" || drawingTool === "ellipse") {
          const rect = normalizeRect(start, worldPoint);
          const nextShapes = shapesRef.current.map((s) =>
            s.id === id && (s.type === "rect" || s.type === "ellipse")
              ? { ...s, ...rect }
              : s,
          );
          setShapesImmediate(nextShapes);
          markDraftChange();
          return;
        }
      }

      // eraser (continuous)
      if (eraseRef.current) {
        const last = eraseRef.current.last;
        eraseAlong(last, worldPoint);
        eraseRef.current = { last: worldPoint };
        return;
      }

      // hover highlight for select tool (no active interactions)
      if (!editing && effectiveTool === "select") {
        const hit = findShapeAt(worldPoint);
        const nextHover = hit?.id ?? null;
        if (nextHover !== hoverId) setHoverId(nextHover);
      }
    },
    [
      editing,
      effectiveTool,
      eraseAlong,
      findShapeAt,
      getScreenPoint,
      hoverId,
      markDraftChange,
      setShapesImmediate,
    ],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      panRef.current = null;
      setIsPanning(false);
      finalizeInteraction();
    },
    [finalizeInteraction],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      panRef.current = null;
      setIsPanning(false);
      finalizeInteraction();
    },
    [finalizeInteraction],
  );

  const handlePointerLeave = useCallback(() => {
    panRef.current = null;
    setIsPanning(false);
    finalizeInteraction();
  }, [finalizeInteraction]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      if (editing) return;
      event.preventDefault();

      const screenPoint = getScreenPoint(event);

      // zoom with ctrl/cmd (trackpad pinch)
      if (event.ctrlKey || event.metaKey) {
        const zoom = Math.exp(-event.deltaY * 0.002);
        zoomAt(screenPoint, viewportRef.current.scale * zoom);
        return;
      }

      // pan with wheel/trackpad
      setViewport((prev) => ({
        ...prev,
        offsetX: prev.offsetX - event.deltaX / prev.scale,
        offsetY: prev.offsetY - event.deltaY / prev.scale,
      }));
    },
    [editing, getScreenPoint, zoomAt],
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (editing) return;
      const worldPoint = getWorldPoint(event);
      const hit = findShapeAt(worldPoint);
      if (hit && (hit.type === "text" || hit.type === "sticky"))
        openTextEditor(hit);
    },
    [editing, findShapeAt, getWorldPoint, openTextEditor],
  );

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-lg dark:border-slate-800 dark:bg-slate-900/80",
        className,
      )}
    >
      {/* TOP BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <Pencil size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Team Whiteboard
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Autosave lokal • Zoom & pan stabil • Export PNG/PDF
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={iconButtonClass}
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className={iconButtonClass}
          >
            <Redo2 size={16} />
          </button>

          <button
            type="button"
            onClick={fitToContent}
            className={actionButtonClass}
            title="Fit to content"
          >
            <RefreshCcw size={14} />
            Fit
          </button>

          <button
            type="button"
            onClick={handleClear}
            className={actionButtonClass}
          >
            <Trash2 size={14} />
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleExport("png")}
            className={actionButtonClass}
          >
            <ImageDown size={14} />
            PNG
          </button>

          <button
            type="button"
            onClick={() => handleExport("pdf")}
            className={actionButtonClass}
          >
            <Printer size={14} />
            PDF
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* TOOLBAR */}
        <aside className="flex w-16 flex-col items-center gap-2 border-r border-slate-200 bg-white/80 p-2 dark:border-slate-800 dark:bg-slate-900/60">
          {TOOL_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = tool === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTool(item.id)}
                title={`${item.label} (${item.shortcut})`}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-xl border transition",
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-md dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                )}
              >
                <Icon size={18} />
                {isActive && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </aside>

        {/* CANVAS */}
        <div className="relative flex-1">
          <div
            ref={containerRef}
            className="relative h-full w-full select-none bg-slate-50 dark:bg-slate-950"
          >
            <canvas
              ref={canvasRef}
              className="h-full w-full"
              style={{ cursor, touchAction: "none" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onPointerLeave={handlePointerLeave}
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              onContextMenu={(e) => e.preventDefault()}
            />

            {editing && editingStyle && (
              <textarea
                ref={textareaRef}
                value={editing.value}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, value: e.target.value } : prev,
                  )
                }
                onBlur={() => commitEditing("commit")}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    commitEditing("cancel");
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    commitEditing("commit");
                  }
                }}
                placeholder={
                  editing.type === "sticky" ? "Catatan..." : "Tulis teks..."
                }
                className="absolute z-10 resize-none rounded-lg border border-slate-300 bg-white/95 p-2 text-slate-900 shadow-lg outline-none focus:ring-2 focus:ring-indigo-300"
                style={editingStyle}
              />
            )}
          </div>

          {/* STATUS (bottom left) */}
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
            <div className="flex items-center gap-3">
              <span>Autosave: {savedLabel}</span>
              <span>Objek: {board.shapes.length}</span>
            </div>
          </div>

          {/* ZOOM (bottom right) */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-2 py-2 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
            <button
              type="button"
              onClick={handleZoomOut}
              className={iconButtonClass}
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="w-12 text-center font-semibold">{zoomLabel}</span>
            <button
              type="button"
              onClick={handleZoomIn}
              className={iconButtonClass}
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={resetView}
              className={iconButtonClass}
              title="Reset view"
            >
              <RefreshCcw size={14} />
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <aside className="w-64 border-l border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="space-y-5">
            <div>
              <p className={panelTitleClass}>Stroke</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {STROKE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setStrokeColor(color)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2",
                      strokeColor === color
                        ? "border-slate-900"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Stroke ${color}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className={panelTitleClass}>Fill</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {FILL_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFillColor(color)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2",
                      fillColor === color
                        ? "border-slate-900"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Fill ${color}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className={panelTitleClass}>Stroke Width</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {STROKE_WIDTHS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setStrokeWidth(w)}
                    className={cn(
                      "rounded-lg border px-3 py-1 text-xs font-semibold",
                      strokeWidth === w
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
                    )}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className={panelTitleClass}>Font Size</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFontSize(size)}
                    className={cn(
                      "rounded-lg border px-3 py-1 text-xs font-semibold",
                      fontSize === size
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
                    )}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGrid((prev) => !prev)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold",
                showGrid
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
              )}
            >
              <span>Grid</span>
              <span>{showGrid ? "Aktif" : "Mati"}</span>
            </button>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                <Info size={14} /> Shortcut utama
              </div>
              <div className="mt-2 space-y-1">
                <div>V Select, H Hand, P Pen, L Line</div>
                <div>R Rect, O Ellipse, T Text, S Sticky, E Eraser</div>
                <div>Ctrl+Z Undo, Ctrl+Shift+Z Redo</div>
                <div>Space = pan sementara • Pinch/ctrl-wheel = zoom</div>
                <div>Double click Text/Sticky untuk edit</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
