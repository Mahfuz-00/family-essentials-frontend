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
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  addRequestOpen: boolean;
  openAddRequest: () => void;
  closeAddRequest: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  addRequestOpen: false,
  openAddRequest: () => set({ addRequestOpen: true }),
  closeAddRequest: () => set({ addRequestOpen: false }),
  sidebarCollapsed: localStorage.getItem('sidebar_collapsed') === 'true',
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      localStorage.setItem('sidebar_collapsed', String(next));
      return { sidebarCollapsed: next };
    }),
  setSidebarCollapsed: (collapsed: boolean) => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },
}));
