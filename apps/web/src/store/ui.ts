import { create } from 'zustand';
type Toast = { id: string; message: string; kind: 'success' | 'error' };
type UIState = {
  selectedScreenId?: string;
  annotationScreenId?: string;
  toast?: Toast;
  selectScreen: (id?: string) => void;
  openAnnotation: (id?: string) => void;
  notify: (message: string, kind?: Toast['kind']) => void;
};
export const useUI = create<UIState>((set) => ({
  selectScreen: (selectedScreenId) => set({ selectedScreenId }),
  openAnnotation: (annotationScreenId) => set({ annotationScreenId }),
  notify: (message, kind = 'success') => {
    const id = crypto.randomUUID();
    set({ toast: { id, message, kind } });
    window.setTimeout(
      () => set((state) => (state.toast?.id === id ? { toast: undefined } : {})),
      2800,
    );
  },
}));
