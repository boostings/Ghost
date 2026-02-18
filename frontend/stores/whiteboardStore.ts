import { create } from 'zustand';
import type { WhiteboardResponse } from '../types';

interface WhiteboardState {
  whiteboards: WhiteboardResponse[];
  currentWhiteboard: WhiteboardResponse | null;
  isLoading: boolean;
}

interface WhiteboardActions {
  setWhiteboards: (whiteboards: WhiteboardResponse[]) => void;
  setCurrentWhiteboard: (whiteboard: WhiteboardResponse | null) => void;
  addWhiteboard: (whiteboard: WhiteboardResponse) => void;
  removeWhiteboard: (id: string) => void;
  updateWhiteboard: (whiteboard: WhiteboardResponse) => void;
  setLoading: (isLoading: boolean) => void;
  reset: () => void;
}

type WhiteboardStore = WhiteboardState & WhiteboardActions;

const initialState: WhiteboardState = {
  whiteboards: [],
  currentWhiteboard: null,
  isLoading: false,
};

export const useWhiteboardStore = create<WhiteboardStore>()((set) => ({
  ...initialState,

  setWhiteboards: (whiteboards: WhiteboardResponse[]) => {
    set({ whiteboards, isLoading: false });
  },

  setCurrentWhiteboard: (whiteboard: WhiteboardResponse | null) => {
    set({ currentWhiteboard: whiteboard });
  },

  addWhiteboard: (whiteboard: WhiteboardResponse) => {
    set((state) => ({
      whiteboards: [whiteboard, ...state.whiteboards],
    }));
  },

  removeWhiteboard: (id: string) => {
    set((state) => ({
      whiteboards: state.whiteboards.filter((wb) => wb.id !== id),
      currentWhiteboard:
        state.currentWhiteboard?.id === id ? null : state.currentWhiteboard,
    }));
  },

  updateWhiteboard: (whiteboard: WhiteboardResponse) => {
    set((state) => ({
      whiteboards: state.whiteboards.map((wb) =>
        wb.id === whiteboard.id ? whiteboard : wb
      ),
      currentWhiteboard:
        state.currentWhiteboard?.id === whiteboard.id
          ? whiteboard
          : state.currentWhiteboard,
    }));
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  reset: () => {
    set(initialState);
  },
}));
