import { generatedOutfits } from '../data/mockData';

interface GenerateOutfitsInput {
  occasion?: string;
  weather?: string;
  anchorItem?: string;
  mood?: string;
  notes?: string;
}

interface AiTags {
  clothingType: string;
  colors: string[];
  patterns: string[];
  aesthetic: string;
  formality: string;
}

interface PinterestRecreation {
  similarity: number;
  matchedItems: string[];
  missingPieces: string[];
}

interface ShoppingReason {
  reason: string;
  category: string;
}

export async function generateOutfits(input: GenerateOutfitsInput): Promise<typeof generatedOutfits> {
  const { occasion, weather, anchorItem } = input;
  return generatedOutfits.map((outfit) => ({
    ...outfit,
    notes: `${outfit.notes} Generated for ${occasion ?? 'versatile styling'}${weather ? ` in ${weather}` : ''}${anchorItem ? ` using ${anchorItem}` : ''}.`,
  }));
}

export async function tagWardrobeItem(itemName: string): Promise<AiTags> {
  return {
    clothingType: itemName?.toLowerCase().includes('skirt') ? 'Skirt' : 'Top',
    colors: ['Ivory', 'Black'],
    patterns: ['Solid'],
    aesthetic: 'Quiet luxury',
    formality: 'Elegant',
  };
}

export async function recreatePinterestLook(): Promise<PinterestRecreation> {
  return {
    similarity: 87,
    matchedItems: ['Ivory Satin Blouse', 'Black Tailored Skirt', 'Cream Sneakers'],
    missingPieces: ['Beige trench coat', 'Structured tote bag'],
  };
}

export async function recommendShoppingAdditions(): Promise<ShoppingReason[]> {
  return [
    { reason: 'You need neutral sneakers for stronger cross-occasion outfit compatibility.', category: 'Shoes' },
    { reason: 'A structured ivory base layer will boost Pinterest recreation accuracy.', category: 'Top' },
  ];
}
