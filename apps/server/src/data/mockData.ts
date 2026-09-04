export const wardrobeItems = [
  {
    id: 'item-1', name: 'Ivory Satin Blouse', category: 'tops',
    image: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600',
    color: 'Ivory', brand: 'ClosetAI Edit', style: 'Elegant',
    season: 'All season', occasion: 'Office', pattern: 'Solid', fabric: 'Satin', favorite: true,
  },
  {
    id: 'item-2', name: 'Black Tailored Skirt', category: 'skirts',
    image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600',
    color: 'Black', brand: 'Aure Studio', style: 'Classic',
    season: 'All season', occasion: 'Date night', pattern: 'Solid', fabric: 'Wool blend', favorite: true,
  },
  {
    id: 'item-3', name: 'Camel Structured Blazer', category: 'blazers',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600',
    color: 'Camel', brand: 'Maison Mode', style: 'Minimal',
    season: 'Autumn', occasion: 'Office', pattern: 'Solid', fabric: 'Twill',
  },
  {
    id: 'item-4', name: 'Vintage Blue Denim', category: 'jeans',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600',
    color: 'Blue', brand: 'North Thread', style: 'Casual',
    season: 'All season', occasion: 'Brunch', pattern: 'Solid', fabric: 'Denim',
  },
  {
    id: 'item-5', name: 'Cream Leather Sneakers', category: 'sneakers',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
    color: 'Cream', brand: 'Forma', style: 'Streetwear',
    season: 'All season', occasion: 'Vacation', pattern: 'Solid', fabric: 'Leather',
  },
];

export const generatedOutfits = [
  {
    id: 'outfit-1', title: 'Gallery Brunch', mood: 'Soft minimal', occasion: 'Brunch',
    weather: '24°C sunny', items: ['Ivory Satin Blouse', 'Vintage Blue Denim', 'Cream Leather Sneakers'],
    accent: 'Gold Layered Necklace', notes: 'Balanced textures with a polished casual silhouette.', score: 94,
  },
  {
    id: 'outfit-2', title: 'Rainy Office Reset', mood: 'Quiet luxury', occasion: 'Office',
    weather: '18°C light rain', items: ['Camel Structured Blazer', 'Black Tailored Skirt', 'Ivory Satin Blouse'],
    accent: 'Gold Layered Necklace', notes: 'Sharp tailoring softened with light neutrals.', score: 91,
  },
  {
    id: 'outfit-3', title: 'Evening Edit', mood: 'Elegant', occasion: 'Date night',
    weather: '21°C clear', items: ['Black Tailored Skirt', 'Ivory Satin Blouse'],
    accent: 'Gold Layered Necklace', notes: 'High contrast and a luminous neckline.', score: 97,
  },
];

export const shoppingSuggestions = [
  {
    id: 'shop-1', title: 'Neutral Leather Sneakers', price: 4299, originalPrice: 5499,
    rating: 4.7, brand: 'Zara', store: 'Zara', similarity: 96, category: 'shoes',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', url: '#',
  },
  {
    id: 'shop-2', title: 'Relaxed Linen Trousers', price: 2599, originalPrice: 3199,
    rating: 4.5, brand: 'H&M', store: 'H&M', similarity: 88, category: 'trousers',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4e26?w=600', url: '#',
  },
  {
    id: 'shop-3', title: 'Structured Ivory Tank', price: 1899, originalPrice: 2399,
    rating: 4.4, brand: 'Myntra Luxe', store: 'Myntra', similarity: 84, category: 'tops',
    image: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600', url: '#',
  },
];
