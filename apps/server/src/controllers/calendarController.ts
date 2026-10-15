import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../utils/ApiResponse';
import { generateOutfitRecommendations } from './outfitController';

const zone = z.string().max(80).refine((value) => {
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return true; } catch { return false; }
}, 'Use an IANA time zone.');
const eventFields = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).nullable().optional(),
  location: z.string().trim().max(240).nullable().optional(),
  eventType: z.string().trim().max(80).nullable().optional(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  timeZone: zone,
  allDay: z.boolean().default(false),
  outfitId: z.string().cuid().nullable().optional(),
}).strict();
const createSchema = eventFields.refine((value) => new Date(value.endsAt) > new Date(value.startsAt),
  { path: ['endsAt'], message: 'Event end must be after its start.' });
const updateSchema = eventFields.partial().refine((value) => Object.keys(value).length > 0,
  'Provide at least one change.');
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional() }).strict();
const idSchema = z.object({ id: z.string().cuid() });

async function validateOutfit(userId: string, outfitId: string | null | undefined) {
  if (!outfitId) {return;}
  const outfit = await prisma.outfit.findFirst({ where: { id: outfitId, userId }, select: { id: true } });
  if (!outfit) {throw new AppError('Outfit not found in your account.', 404);}
}

export async function listEvents(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const input = listSchema.parse(req.query);
  const where = { userId, startsAt: { ...(input.from && { gte: new Date(input.from) }),
    ...(input.to && { lte: new Date(input.to) }) } };
  const [total, events] = await Promise.all([
    prisma.calendarEvent.count({ where }),
    prisma.calendarEvent.findMany({ where, orderBy: { startsAt: 'asc' },
      skip: (input.page - 1) * input.perPage, take: input.perPage }),
  ]);
  ApiResponse.paginated(res, events, { page: input.page, perPage: input.perPage,
    total, totalPages: Math.ceil(total / input.perPage) });
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const input = createSchema.parse(req.body);
  await validateOutfit(userId, input.outfitId);
  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.calendarEvent.create({ data: {
      ...input, userId, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt),
    } });
    await tx.notification.create({ data: { userId, type: 'OUTFIT', title: 'Event added',
      message: `${created.title} was added to your calendar.`, dedupeKey: `calendar-created:${created.id}` } });
    return created;
  });
  ApiResponse.created(res, event, 'Event added.');
}

export async function updateEvent(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = idSchema.parse(req.params);
  const input = updateSchema.parse(req.body);
  const existing = await prisma.calendarEvent.findFirst({ where: { id, userId } });
  if (!existing) {throw new AppError('Event not found.', 404);}
  const startsAt = input.startsAt ? new Date(input.startsAt) : existing.startsAt;
  const endsAt = input.endsAt ? new Date(input.endsAt) : existing.endsAt;
  if (endsAt <= startsAt) {throw new AppError('Event end must be after its start.', 422);}
  await validateOutfit(userId, input.outfitId);
  const event = await prisma.calendarEvent.update({ where: { id }, data: {
    ...input, startsAt, endsAt,
  } });
  ApiResponse.success(res, event, 'Event updated.');
}

export async function deleteEvent(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = idSchema.parse(req.params);
  const result = await prisma.calendarEvent.deleteMany({ where: { id, userId } });
  if (!result.count) {throw new AppError('Event not found.', 404);}
  ApiResponse.noContent(res);
}

export async function suggestEventOutfit(req: Request, res: Response): Promise<void> {
  const { id } = idSchema.parse(req.params);
  req.body = { eventId: id };
  await generateOutfitRecommendations(req, res);
}
