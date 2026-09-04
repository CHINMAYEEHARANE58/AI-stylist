import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';

export async function chat(req: Request, res: Response): Promise<void> {
  const { message } = req.body as { message: string };

  const replies: Record<string, string> = {
    default: 'Choose the camel blazer, ivory blouse, relaxed denim, and cream sneakers.',
    color: 'Your strongest palette is ivory, black, camel, denim blue, and gold.',
    work: 'Pair your camel blazer with the black tailored skirt and ivory blouse for a polished office look.',
  };

  const key = message?.toLowerCase().includes('color')
    ? 'color'
    : message?.toLowerCase().includes('work') || message?.toLowerCase().includes('office')
      ? 'work'
      : 'default';

  ApiResponse.success(res, {
    query: message,
    reply: replies[key],
    suggestions: [
      'What should I wear today?',
      'Style this shirt for work.',
      'Create a brunch outfit.',
      'Suggest colors that match my blazer.',
    ],
  });
}

export async function getEventStyling(req: Request, res: Response): Promise<void> {
  const event = typeof req.query['event'] === 'string' ? req.query['event'] : 'general';
  ApiResponse.success(res, {
    event,
    outfitIdea: 'Black tailored skirt, ivory satin blouse, gold layered necklace.',
    tips: ['Opt for a refined silhouette.', 'Use metallic accessories to elevate the look.'],
  });
}
