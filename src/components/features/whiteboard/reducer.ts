import { HISTORY_LIMIT } from "./constants";
import type { BoardAction, BoardState } from "./types";

export const boardReducer = (state: BoardState, action: BoardAction): BoardState => {
  switch (action.type) {
    case "replace":
      return { shapes: action.shapes, past: [], future: [] };

    case "commit": {
      const nextPast = [...state.past, action.before];
      const cappedPast =
        nextPast.length > HISTORY_LIMIT
          ? nextPast.slice(nextPast.length - HISTORY_LIMIT)
          : nextPast;
      return { shapes: action.shapes, past: cappedPast, future: [] };
    }

    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        shapes: previous,
        past: state.past.slice(0, -1),
        future: [state.shapes, ...state.future],
      };
    }

    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        shapes: next,
        past: [...state.past, state.shapes].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
      };
    }

    default:
      return state;
  }
};
