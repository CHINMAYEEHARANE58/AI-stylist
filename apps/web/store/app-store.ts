"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ClothingItemApi, AuthUser } from "@/lib/api-client";

/* ── Auth slice ─────────────────────────────────────────── */
interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  finishAuthCheck: (user: AuthUser | null) => void;
}

/* ── Wardrobe slice ─────────────────────────────────────── */
interface WardrobeState {
  /** Local optimistic favorite state — synced from server */
  favoriteIds: string[];
  selectedItemId: string | null;
  setFavoriteIds: (ids: string[]) => void;
  toggleFavoriteLocal: (id: string) => void;
  /** @deprecated Use the server mutation plus toggleFavoriteLocal. Kept for existing UI. */
  toggleFavorite: (id: string) => void;
  setSelectedItem: (id: string | null) => void;
}

/* ── Outfits slice ──────────────────────────────────────── */
interface OutfitsState {
  /** Transitional local state for existing mock outfit cards; server saves use TanStack Query. */
  savedOutfitIds: string[];
  toggleSavedOutfit: (id: string) => void;
  generatorOccasion: string;
  generatorWeather: string;
  generatorMood: string;
  setGeneratorField: (field: "occasion" | "weather" | "mood", value: string) => void;
}

/* ── Shopping slice ─────────────────────────────────────── */
interface ShoppingState {
  wishlistIds: string[];
  setWishlistIds: (ids: string[]) => void;
  toggleWishlistLocal: (id: string) => void;
  /** @deprecated Use the server mutation plus toggleWishlistLocal. Kept for existing UI. */
  toggleWishlist: (id: string) => void;
}

/* ── UI slice ───────────────────────────────────────────── */
interface UIState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  wardrobeView: "grid" | "list";
  setWardrobeView: (v: "grid" | "list") => void;
  activeFilters: string[];
  setActiveFilters: (filters: string[]) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

type AppState = AuthState & WardrobeState & OutfitsState & ShoppingState & UIState;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      /* ── auth ── */
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: (user) => set({ user, isAuthenticated: true, isLoading: false }),
      logout: () => set({ user: null, isAuthenticated: false, isLoading: false, favoriteIds: [], wishlistIds: [], savedOutfitIds: [] }),
      setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
      finishAuthCheck: (user) => set({ user, isAuthenticated: Boolean(user), isLoading: false }),

      /* ── wardrobe ── */
      favoriteIds: [],
      selectedItemId: null,
      setFavoriteIds: (ids) => set({ favoriteIds: ids }),
      toggleFavoriteLocal: (id) =>
        set((s) => ({
          favoriteIds: s.favoriteIds.includes(id)
            ? s.favoriteIds.filter((i) => i !== id)
            : [...s.favoriteIds, id],
        })),
      toggleFavorite: (id) =>
        set((s) => ({
          favoriteIds: s.favoriteIds.includes(id)
            ? s.favoriteIds.filter((favoriteId) => favoriteId !== id)
            : [...s.favoriteIds, id],
        })),
      setSelectedItem: (id) => set({ selectedItemId: id }),

      /* ── outfits ── */
      savedOutfitIds: [],
      toggleSavedOutfit: (id) =>
        set((s) => ({
          savedOutfitIds: s.savedOutfitIds.includes(id)
            ? s.savedOutfitIds.filter((savedId) => savedId !== id)
            : [...s.savedOutfitIds, id],
        })),
      generatorOccasion: "",
      generatorWeather: "",
      generatorMood: "",
      setGeneratorField: (field, value) =>
        set({ [`generator${field.charAt(0).toUpperCase() + field.slice(1)}`]: value }),

      /* ── shopping ── */
      wishlistIds: [],
      setWishlistIds: (ids) => set({ wishlistIds: ids }),
      toggleWishlistLocal: (id) =>
        set((s) => ({
          wishlistIds: s.wishlistIds.includes(id)
            ? s.wishlistIds.filter((i) => i !== id)
            : [...s.wishlistIds, id],
        })),
      toggleWishlist: (id) =>
        set((s) => ({
          wishlistIds: s.wishlistIds.includes(id)
            ? s.wishlistIds.filter((wishlistId) => wishlistId !== id)
            : [...s.wishlistIds, id],
        })),

      /* ── ui ── */
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      wardrobeView: "grid",
      setWardrobeView: (v) => set({ wardrobeView: v }),
      activeFilters: [],
      setActiveFilters: (filters) => set({ activeFilters: filters }),
      searchQuery: "",
      setSearchQuery: (q) => set({ searchQuery: q }),
    }),
    {
      name: "closetai-store",
      partialize: (s) => ({
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        wardrobeView: s.wardrobeView,
        favoriteIds: s.favoriteIds,
      }),
    },
  ),
);

/* ── Convenience selectors ──────────────────────────────── */
export const selectUser = (s: AppState) => s.user;
export const selectIsAuthenticated = (s: AppState) => s.isAuthenticated;
export const selectFavorites = (s: AppState) => s.favoriteIds;
export const selectWishlist = (s: AppState) => s.wishlistIds;

/* ── Unused ClothingItemApi type import kept for colocation ── */
export type { ClothingItemApi };
