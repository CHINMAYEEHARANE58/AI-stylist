"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ClothingItem, OutfitSuggestion, ShoppingRecommendation } from "@/lib/types";

/* ── Auth slice ─────────────────────────────────────────── */
interface AuthState {
  user: { name: string; email: string; avatar?: string } | null;
  isAuthenticated: boolean;
  login: (name: string, email: string) => void;
  logout: () => void;
}

/* ── Wardrobe slice ─────────────────────────────────────── */
interface WardrobeState {
  favoriteIds: string[];
  selectedItemId: string | null;
  toggleFavorite: (id: string) => void;
  setSelectedItem: (id: string | null) => void;
}

/* ── Outfits slice ──────────────────────────────────────── */
interface OutfitsState {
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
    (set, get) => ({
      /* ── auth ── */
      user: { name: "Maya Kapoor", email: "maya@closetai.com" },
      isAuthenticated: true,
      login: (name, email) => set({ user: { name, email }, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),

      /* ── wardrobe ── */
      favoriteIds: ["item-1", "item-2"],
      selectedItemId: null,
      toggleFavorite: (id) =>
        set((s) => ({
          favoriteIds: s.favoriteIds.includes(id)
            ? s.favoriteIds.filter((i) => i !== id)
            : [...s.favoriteIds, id],
        })),
      setSelectedItem: (id) => set({ selectedItemId: id }),

      /* ── outfits ── */
      savedOutfitIds: ["outfit-1"],
      toggleSavedOutfit: (id) =>
        set((s) => ({
          savedOutfitIds: s.savedOutfitIds.includes(id)
            ? s.savedOutfitIds.filter((i) => i !== id)
            : [...s.savedOutfitIds, id],
        })),
      generatorOccasion: "",
      generatorWeather: "",
      generatorMood: "",
      setGeneratorField: (field, value) => set({ [`generator${field.charAt(0).toUpperCase() + field.slice(1)}`]: value }),

      /* ── shopping ── */
      wishlistIds: ["shop-1"],
      toggleWishlist: (id) =>
        set((s) => ({
          wishlistIds: s.wishlistIds.includes(id)
            ? s.wishlistIds.filter((i) => i !== id)
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
        favoriteIds: s.favoriteIds,
        savedOutfitIds: s.savedOutfitIds,
        wishlistIds: s.wishlistIds,
        wardrobeView: s.wardrobeView,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
    },
  ),
);

/* ── Convenience selectors ──────────────────────────────── */
export const selectFavorites = (s: AppState) => s.favoriteIds;
export const selectSavedOutfits = (s: AppState) => s.savedOutfitIds;
export const selectWishlist = (s: AppState) => s.wishlistIds;
export const selectUser = (s: AppState) => s.user;
