import { create } from 'zustand';

/**
 * Cross-screen UI intent.
 *
 * The shell's global "+ Add Request" button lives outside the requests page, so it
 * cannot reach that page's local state. Before this store the button was a bare
 * link: clicked from the requests page itself it was a same-route no-op, which is
 * exactly why "Add Request" appeared to do nothing.
 */
interface UiState {
  addRequestOpen: boolean;
  openAddRequest: () => void;
  closeAddRequest: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  addRequestOpen: false,
  openAddRequest: () => set({ addRequestOpen: true }),
  closeAddRequest: () => set({ addRequestOpen: false }),
}));
