import { z } from 'zod';

const uniqueTags = (maxItems: number) => z.array(z.string().trim().min(1).max(60)).max(maxItems)
  .refine((values) => new Set(values.map((value) => value.toLocaleLowerCase())).size === values.length,
    'Use each preference only once.');
const currencyCodes = new Set(Intl.supportedValuesOf('currency'));
const budgetCurrency = z.string().trim().toUpperCase().refine((value) => currencyCodes.has(value),
  'Use an ISO 4217 currency code.');

export const stylePreferencePatchSchema = z.object({
  preferredAesthetics: uniqueTags(12).optional(),
  favoriteColors: uniqueTags(12).optional(),
  stylePreferences: uniqueTags(12).optional(),
  preferredCategories: z.array(z.enum(['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories']))
    .max(6).refine((values) => new Set(values).size === values.length).optional(),
  preferredOccasions: uniqueTags(12).optional(),
  fitPreferences: z.array(z.enum(['Regular', 'Relaxed', 'Tailored', 'Oversized', 'Slim', 'Fitted']))
    .max(6).refine((values) => new Set(values).size === values.length).optional(),
  preferredSeasons: z.array(z.enum(['Spring', 'Summer', 'Autumn', 'Winter', 'All season']))
    .max(5).refine((values) => new Set(values).size === values.length).optional(),
  styleDislikes: uniqueTags(12).optional(),
  budgetCurrency: budgetCurrency.nullable().optional(),
  budgetMax: z.number().finite().positive().max(99_999_999)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
      'Use at most two decimal places.').nullable().optional(),
  weatherCity: z.string().trim().min(2).max(120).nullable().optional(),
  notificationPreferences: z.object({ daily: z.boolean().optional(), weather: z.boolean().optional(),
    sale: z.boolean().optional(), trend: z.boolean().optional(), system: z.boolean().optional() }).strict().optional(),
  privacyPreferences: z.object({ p1: z.boolean().optional(), p2: z.boolean().optional(),
    p3: z.boolean().optional() }).strict().optional(),
  appearance: z.enum(['light', 'dark', 'system']).optional(),
}).strict().superRefine((value, ctx) => {
  if ((value.budgetMax !== undefined || value.budgetCurrency !== undefined) &&
    ((value.budgetMax === null || value.budgetMax === undefined) !==
      (value.budgetCurrency === null || value.budgetCurrency === undefined))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['budgetMax'],
      message: 'Set both budget amount and currency, or clear both.' });
  }
});

export type StylePreferencePatch = z.infer<typeof stylePreferencePatchSchema>;

export const resetStylePreferenceData = {
  preferredAesthetics: [] as string[], favoriteColors: [] as string[], stylePreferences: [] as string[], preferredCategories: [] as string[],
  preferredOccasions: [] as string[], fitPreferences: [] as string[], preferredSeasons: [] as string[], styleDislikes: [] as string[],
  budgetCurrency: null, budgetMax: null, weatherCity: null,
};
