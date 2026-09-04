"use client";

/**
 * Centralized API client for ClosetAI backend.
 * - Uses credentials (cookies) for all requests
 * - Handles 401 → auto refresh → retry once
 * - Consistent error shape
 * - Never hardcodes localhost — reads from NEXT_PUBLIC_API_URL
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// ── Types ──────────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiPaginatedResponse<T = unknown> {
  success: true;
  message: string;
  data: T[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Core fetch wrapper ─────────────────────────────────────────────────

let isRefreshing = false;

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  _retry = false,
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  // Auto-refresh on 401 (once)
  if (res.status === 401 && !_retry && !isRefreshing) {
    isRefreshing = true;
    try {
      const refreshed = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshed.ok) {
        isRefreshing = false;
        return apiFetch<T>(path, options, true);
      }
    } catch {
      // refresh failed, fall through
    } finally {
      isRefreshing = false;
    }
    // Refresh failed — dispatch event so auth state can clear
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("closetai:unauthorized"));
    }
  }

  if (!res.ok) {
    let body: ApiErrorResponse = { success: false, message: "Request failed" };
    try { body = await res.json() as ApiErrorResponse; } catch { /* noop */ }
    throw new ApiError(body.message ?? "Request failed", res.status, body.errors);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Upload helper (FormData, no Content-Type header) ──────────────────

async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData,
    // No Content-Type — browser sets multipart/form-data with boundary
  });
  if (!res.ok) {
    let body: ApiErrorResponse = { success: false, message: "Upload failed" };
    try { body = await res.json() as ApiErrorResponse; } catch { /* noop */ }
    throw new ApiError(body.message ?? "Upload failed", res.status);
  }
  return res.json() as Promise<T>;
}

// ── Auth ───────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name: string;
  profile: {
    firstName: string;
    lastName?: string;
    imageUrl?: string;
    bio?: string;
    location?: string;
    clothingSizes?: Record<string, string>;
  } | null;
}

export const authApi = {
  signup: (data: { name: string; email: string; password: string; aesthetics?: string[]; sizes?: string }) =>
    apiFetch<ApiSuccessResponse<{ user: AuthUser }>>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        profile: data.sizes ? { clothingSizes: { general: data.sizes } } : undefined,
      }),
    }),

  login: (data: { email: string; password: string }) =>
    apiFetch<ApiSuccessResponse<{ user: AuthUser }>>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () =>
    apiFetch<ApiSuccessResponse<null>>("/auth/logout", { method: "POST" }),

  me: () =>
    apiFetch<ApiSuccessResponse<{ user: AuthUser }>>("/auth/me"),

  refresh: () =>
    apiFetch<ApiSuccessResponse<{ user: AuthUser }>>("/auth/refresh", { method: "POST" }),

  forgotPassword: (email: string) =>
    apiFetch<ApiSuccessResponse<null>>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    apiFetch<ApiSuccessResponse<null>>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
};

// ── Wardrobe ──────────────────────────────────────────────────────────

export interface ClothingItemApi {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  subcategory?: string;
  colors: string[];
  pattern?: string;
  material?: string;
  seasons: string[];
  occasions: string[];
  aesthetics: string[];
  brand?: string;
  notes?: string;
  sleeveStyle?: string;
  favorite: boolean;
  archived: boolean;
  aiMetadata?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface WardrobeListParams {
  page?: number;
  perPage?: number;
  search?: string;
  category?: string;
  season?: string;
  occasion?: string;
  favorite?: boolean;
  archived?: boolean;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export const wardrobeApi = {
  list: (params: WardrobeListParams = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") q.set(k, String(v));
    });
    const qs = q.toString();
    return apiFetch<ApiPaginatedResponse<ClothingItemApi>>(`/wardrobe${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) =>
    apiFetch<ApiSuccessResponse<ClothingItemApi>>(`/wardrobe/${id}`),

  summary: () =>
    apiFetch<ApiSuccessResponse<{
      total: number;
      categories: Array<{ label: string; value: number }>;
      colors: Array<{ label: string; value: number }>;
    }>>("/wardrobe/summary"),

  create: (data: Partial<ClothingItemApi> & { imageFile?: File }) => {
    if (data.imageFile) {
      const fd = new FormData();
      fd.append("image", data.imageFile);
      const { imageFile: _, ...rest } = data;
      Object.entries(rest).forEach(([k, v]) => {
        if (v !== undefined) {
          fd.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
        }
      });
      return apiUpload<ApiSuccessResponse<ClothingItemApi>>("/wardrobe", fd);
    }
    return apiFetch<ApiSuccessResponse<ClothingItemApi>>("/wardrobe", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: Partial<ClothingItemApi>) =>
    apiFetch<ApiSuccessResponse<ClothingItemApi>>(`/wardrobe/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/wardrobe/${id}`, { method: "DELETE" }),

  toggleFavorite: (id: string) =>
    apiFetch<ApiSuccessResponse<ClothingItemApi>>(`/wardrobe/${id}/favorite`, { method: "POST" }),

  toggleArchive: (id: string) =>
    apiFetch<ApiSuccessResponse<ClothingItemApi>>(`/wardrobe/${id}/archive`, { method: "POST" }),

  analyzeImage: (imageFile: File) => {
    const fd = new FormData();
    fd.append("image", imageFile);
    return apiUpload<ApiSuccessResponse<{
      imageUrl: string;
      providerId?: string;
      analysis: {
        category: string;
        colors: string[];
        pattern: string;
        material?: string;
        seasons: string[];
        occasions: string[];
        aesthetics: string[];
        confidence: number;
      };
    }>>("/wardrobe/analyze-image", fd);
  },
};

// ── Outfits ───────────────────────────────────────────────────────────

export interface OutfitApi {
  id: string;
  title: string;
  occasion?: string;
  aesthetic?: string;
  season?: string;
  weather?: string;
  explanation?: string;
  favorite: boolean;
  source: string;
  createdAt: string;
  items: Array<{
    id: string;
    slot?: string;
    position: number;
    clothingItem: ClothingItemApi;
  }>;
}

export interface GeneratedOutfitApi {
  title: string;
  clothingItemIds: string[];
  clothingItems: ClothingItemApi[];
  occasion: string;
  aesthetic: string;
  season?: string;
  explanation: string;
  score: number;
}

export const outfitsApi = {
  generate: (data: {
    occasion?: string;
    weather?: string;
    mood?: string;
    season?: string;
    notes?: string;
    anchorItemId?: string;
  }) =>
    apiFetch<ApiSuccessResponse<{ outfits: GeneratedOutfitApi[]; provider: string }>>("/outfits/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  styleItem: (itemId: string) =>
    apiFetch<ApiSuccessResponse<{
      itemId: string;
      itemName: string;
      looks: Array<{
        aesthetic: string;
        clothingItemIds: string[];
        clothingItems: ClothingItemApi[];
        explanation: string;
        occasion: string;
      }>;
    }>>("/outfits/style-item", {
      method: "POST",
      body: JSON.stringify({ itemId }),
    }),

  save: (data: {
    title: string;
    clothingItemIds: string[];
    occasion?: string;
    aesthetic?: string;
    season?: string;
    explanation?: string;
    collection?: string;
    source?: "MANUAL" | "AI_GENERATED" | "INSPIRATION_MATCH";
  }) =>
    apiFetch<ApiSuccessResponse<OutfitApi>>("/outfits", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getSaved: (params: { page?: number; perPage?: number; collection?: string } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
    const qs = q.toString();
    return apiFetch<ApiPaginatedResponse<{ outfit: OutfitApi; collection?: string; createdAt: string; id: string }>>(`/outfits/saved${qs ? `?${qs}` : ""}`);
  },

  deleteSaved: (id: string) =>
    apiFetch<void>(`/outfits/saved/${id}`, { method: "DELETE" }),

  toggleFavorite: (outfitId: string) =>
    apiFetch<ApiSuccessResponse<OutfitApi>>(`/outfits/${outfitId}/favorite`, { method: "POST" }),

  getCollections: () =>
    apiFetch<ApiSuccessResponse<Array<{ name: string; count: number }>>>("/outfits/collections"),
};

// ── Profile ───────────────────────────────────────────────────────────

export interface UserProfileApi {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  profile: {
    firstName: string;
    lastName?: string;
    imageUrl?: string;
    bio?: string;
    location?: string;
    clothingSizes?: Record<string, string>;
  } | null;
  preferences: {
    preferredAesthetics: string[];
    favoriteColors: string[];
    stylePreferences: string[];
    appearance?: string;
    notificationPreferences?: Record<string, unknown>;
    privacyPreferences?: Record<string, unknown>;
  } | null;
  stats: { wardrobeItems: number; savedOutfits: number; outfitsGenerated: number };
}

export const profileApi = {
  get: () =>
    apiFetch<ApiSuccessResponse<UserProfileApi>>("/profile"),

  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    location?: string;
    clothingSizes?: Record<string, string>;
    imageFile?: File;
  }) => {
    if (data.imageFile) {
      const fd = new FormData();
      fd.append("image", data.imageFile);
      const { imageFile: _, ...rest } = data;
      Object.entries(rest).forEach(([k, v]) => {
        if (v !== undefined) fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
      });
      return apiUpload<ApiSuccessResponse<unknown>>("/profile/profile", fd);
    }
    const { imageFile: _, ...rest } = data;
    return apiFetch<ApiSuccessResponse<unknown>>("/profile/profile", {
      method: "PATCH",
      body: JSON.stringify(rest),
    });
  },

  updatePreferences: (data: {
    preferredAesthetics?: string[];
    favoriteColors?: string[];
    stylePreferences?: string[];
    appearance?: "light" | "dark" | "system";
    notificationPreferences?: Record<string, unknown>;
    privacyPreferences?: Record<string, unknown>;
  }) =>
    apiFetch<ApiSuccessResponse<unknown>>("/profile/preferences", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ── Insights & Notifications ──────────────────────────────────────────

export interface NotificationApi {
  id: string;
  type: "outfit" | "weather" | "sale" | "trend" | "system";
  title: string;
  message: string;
  read: boolean;
  time: string;
  createdAt: string;
}

export const insightsApi = {
  dashboard: () =>
    apiFetch<ApiSuccessResponse<{
      stats: { wardrobeItems: number; savedOutfits: number; unreadNotifications: number };
      recentWardrobeItems: ClothingItemApi[];
      recentSavedOutfits: Array<{ outfit: OutfitApi }>;
      notifications: NotificationApi[];
    }>>("/insights/dashboard"),

  wardrobe: () =>
    apiFetch<ApiSuccessResponse<{
      summary: { totalItems: number; favoriteItems: number; savedOutfits: number; outfitsGenerated: number };
      categories: Array<{ label: string; value: number }>;
      colors: Array<{ label: string; value: number }>;
      aesthetics: Array<{ label: string; value: number }>;
      occasions: Array<{ label: string; value: number }>;
      wardrobeGaps: Array<{ title: string; priority: string; reason: string }>;
    }>>("/insights/wardrobe"),

  trends: () =>
    apiFetch<ApiSuccessResponse<{
      trends: Array<{ title: string; matchScore: number; detail: string }>;
    }>>("/insights/trends"),

  notifications: (params: { page?: number; unreadOnly?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.unreadOnly) q.set("unreadOnly", "true");
    return apiFetch<ApiPaginatedResponse<NotificationApi>>(`/insights/notifications${q.toString() ? `?${q}` : ""}`);
  },

  markRead: (id: string) =>
    apiFetch<ApiSuccessResponse<unknown>>(`/insights/notifications/${id}/read`, { method: "PATCH" }),

  markAllRead: () =>
    apiFetch<ApiSuccessResponse<{ updated: number }>>("/insights/notifications/mark-all-read", { method: "POST" }),

  deleteNotification: (id: string) =>
    apiFetch<void>(`/insights/notifications/${id}`, { method: "DELETE" }),
};

// ── Inspiration / Pinterest ────────────────────────────────────────────

export interface InspirationAnalysisApi {
  inspirationId: string;
  imageUrl: string;
  analysis: {
    detectedStyle: string;
    colors: string[];
    categories: string[];
    aesthetics: string[];
    matchedItems: Array<{
      clothingItemId: string;
      score: number;
      reason: string;
      item?: ClothingItemApi;
    }>;
    missingCategories: string[];
    recreationSuggestion: {
      clothingItemIds: string[];
      explanation: string;
      overallScore: number;
    };
  };
}

export const inspirationApi = {
  analyze: (imageFileOrUrl: File | string) => {
    if (typeof imageFileOrUrl === "string") {
      return apiFetch<ApiSuccessResponse<InspirationAnalysisApi>>("/inspiration/analyze", {
        method: "POST",
        body: JSON.stringify({ imageUrl: imageFileOrUrl }),
      });
    }
    const fd = new FormData();
    fd.append("image", imageFileOrUrl);
    return apiUpload<ApiSuccessResponse<InspirationAnalysisApi>>("/inspiration/analyze", fd);
  },

  getSaved: (page = 1) =>
    apiFetch<ApiPaginatedResponse<{ id: string; imageUrl: string; createdAt: string }>>(`/inspiration?page=${page}`),

  delete: (id: string) =>
    apiFetch<void>(`/inspiration/${id}`, { method: "DELETE" }),
};

// ── Stylist Chat ──────────────────────────────────────────────────────

export const stylistApi = {
  chat: (message: string, history: Array<{ role: "user" | "assistant"; content: string }> = []) =>
    apiFetch<ApiSuccessResponse<{ reply: string; suggestions: string[]; provider: string }>>("/stylist/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),
};

// ── Shopping ──────────────────────────────────────────────────────────

export interface ShoppingItemApi {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount?: number;
  brand: string;
  category: string;
  similarity: number;
  imageUrl: string;
  wishlisted: boolean;
}

export const shoppingApi = {
  list: (params: { search?: string; category?: string; page?: number } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
    return apiFetch<ApiPaginatedResponse<ShoppingItemApi>>(`/shopping${q.toString() ? `?${q}` : ""}`);
  },

  compare: (id: string) =>
    apiFetch<ApiSuccessResponse<{
      product: { id: string; title: string; brand: string; imageUrl: string };
      comparisons: Array<{ store: string; price: number; discount: number; rating: number; availability: string; url: string }>;
    }>>(`/shopping/compare/${id}`),

  addToWishlist: (catalogItemId: string) =>
    apiFetch<ApiSuccessResponse<unknown>>("/shopping/wishlist", {
      method: "POST",
      body: JSON.stringify({ catalogItemId }),
    }),

  removeFromWishlist: (catalogItemId: string) =>
    apiFetch<void>("/shopping/wishlist", {
      method: "DELETE",
      body: JSON.stringify({ catalogItemId }),
    }),

  getWishlist: () =>
    apiFetch<ApiSuccessResponse<unknown[]>>("/shopping/wishlist"),
};
