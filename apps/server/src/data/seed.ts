/**
 * Development seed script — creates realistic test data.
 * Only runs when NODE_ENV is development.
 * NEVER wipes production data.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const env = process.env['NODE_ENV'] ?? 'development';
if (env !== 'development') {
  console.error('❌  Seed script only runs in NODE_ENV=development.');
  process.exit(1);
}

async function main() {
  console.info('🌱  Seeding development database...');

  // ── Dev user ───────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('development-seed-only', 12);

  const user = await prisma.user.upsert({
    where: { email: 'phase1.seed@closetai.test' },
    create: {
      email:        'phase1.seed@closetai.test',
      passwordHash,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          firstName: 'Maya',
          lastName:  'Kapoor',
          bio:       'Minimal aesthetics. Polished wardrobe.',
          location:  'Mumbai, India',
          clothingSizes: { tops: 'XS-S', bottoms: '26', shoes: '38' },
        },
      },
      preferences: {
        create: {
          preferredAesthetics: ['Quiet luxury', 'Minimal classic', 'Street polish'],
          favoriteColors: ['Ivory', 'Black', 'Camel', 'Gold'],
          stylePreferences: ['Tailored', 'Neutral-forward', 'Comfortable'],
          appearance: 'system',
        },
      },
      wardrobe: { create: { name: 'My Wardrobe' } },
    },
    update: {},
    include: { wardrobe: true },
  });

  const wardrobeId = user.wardrobe?.id;
  if (!wardrobeId) { throw new Error('Wardrobe not created'); }

  // ── Wardrobe items ─────────────────────────────────────────────────
  const clothingItems = [
    {
      name: 'Ivory Satin Blouse', category: 'tops',
      imageUrl: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&q=80',
      colors: ['Ivory'], pattern: 'Solid', material: 'Satin', sleeveStyle: 'Long sleeve',
      seasons: ['All season'], occasions: ['Office', 'Date night'], aesthetics: ['Elegant', 'Quiet luxury'],
      brand: 'ClosetAI Edit', favorite: true,
    },
    {
      name: 'Black Tailored Skirt', category: 'skirts',
      imageUrl: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&q=80',
      colors: ['Black'], pattern: 'Solid', material: 'Wool blend',
      seasons: ['All season'], occasions: ['Office', 'Date night'], aesthetics: ['Classic', 'Elegant'],
      brand: 'Aure Studio', favorite: true,
    },
    {
      name: 'Camel Structured Blazer', category: 'blazers',
      imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80',
      colors: ['Camel'], pattern: 'Solid', material: 'Twill',
      seasons: ['Autumn', 'Spring'], occasions: ['Office', 'Travel'], aesthetics: ['Minimal', 'Classic'],
      brand: 'Maison Mode',
    },
    {
      name: 'Vintage Blue Denim', category: 'jeans',
      imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80',
      colors: ['Blue'], pattern: 'Solid', material: 'Denim',
      seasons: ['All season'], occasions: ['Casual', 'Brunch'], aesthetics: ['Casual', 'Streetwear'],
      brand: 'North Thread',
    },
    {
      name: 'Cream Leather Sneakers', category: 'sneakers',
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
      colors: ['Cream'], pattern: 'Solid', material: 'Leather',
      seasons: ['All season'], occasions: ['Casual', 'Vacation', 'Brunch'], aesthetics: ['Casual', 'Streetwear'],
      brand: 'Forma',
    },
    {
      name: 'Gold Layered Necklace', category: 'accessories',
      imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80',
      colors: ['Gold'], pattern: 'Solid', material: 'Metal',
      seasons: ['All season'], occasions: ['Party', 'Date night', 'Office'], aesthetics: ['Elegant', 'Quiet luxury'],
      brand: 'Atelier Nine',
    },
    {
      name: 'White Linen Shirt', category: 'shirts',
      imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80',
      colors: ['White'], pattern: 'Solid', material: 'Linen', sleeveStyle: 'Long sleeve',
      seasons: ['Summer', 'Spring'], occasions: ['Casual', 'Travel', 'Brunch'], aesthetics: ['Minimal', 'Classic'],
      brand: 'COS',
    },
    {
      name: 'Chocolate Trench Coat', category: 'outerwear',
      imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
      colors: ['Chocolate'], pattern: 'Solid', material: 'Cotton blend',
      seasons: ['Autumn', 'Spring'], occasions: ['Travel', 'Office', 'Casual'], aesthetics: ['Quiet luxury', 'Classic'],
      brand: 'Toteme Edit',
    },
  ];

  const createdItems: Array<{ id: string }> = [];
  for (const item of clothingItems) {
    const created = await prisma.clothingItem.upsert({
      where: { id: `seed-${user.id}-${item.name.replace(/\s+/g, '-').toLowerCase()}` },
      create: {
        id: `seed-${user.id}-${item.name.replace(/\s+/g, '-').toLowerCase()}`,
        userId: user.id,
        wardrobeId,
        ...item,
      },
      update: {},
    });
    createdItems.push(created);
  }

  // Illustrative catalog records only. No merchant, price, availability, or buy link
  // is invented. Production never serves isSample products.
  const sampleProducts = [
    { key: 'neutral-loafers', name: 'Neutral loafers (sample)', category: 'shoes', imageUrl: '/shopping-1.svg',
      attributes: { colors: ['Ivory', 'Camel'], aesthetics: ['Quiet luxury', 'Minimal classic'], occasions: ['Office', 'Brunch'] } },
    { key: 'linen-trousers', name: 'Relaxed linen trousers (sample)', category: 'bottoms', imageUrl: '/shopping-2.svg',
      attributes: { colors: ['Ivory'], aesthetics: ['Minimal classic'], occasions: ['Office', 'Vacation'] } },
    { key: 'everyday-tote', name: 'Everyday tote (sample)', category: 'accessories', imageUrl: '/shopping-3.svg',
      attributes: { colors: ['Camel'], aesthetics: ['Quiet luxury'], occasions: ['Office', 'Travel'] } },
    { key: 'summer-dress', name: 'Summer dress (sample)', category: 'dresses', imageUrl: '/shopping-1.svg',
      attributes: { colors: ['Ivory'], aesthetics: ['Minimal classic'], occasions: ['Brunch', 'Vacation'] } },
    { key: 'tailored-shorts', name: 'Tailored shorts (sample)', category: 'bottoms', imageUrl: '/shopping-2.svg',
      attributes: { colors: ['Black'], aesthetics: ['Street polish'], occasions: ['Casual', 'Travel'] } },
    { key: 'lightweight-cardigan', name: 'Lightweight cardigan (sample)', category: 'outerwear', imageUrl: '/shopping-3.svg',
      attributes: { colors: ['Ivory'], aesthetics: ['Quiet luxury'], occasions: ['Office', 'Travel'] } },
  ];
  for (const sample of sampleProducts) {
    await prisma.product.upsert({
      where: { source_sourceProductId: { source: 'development-sample', sourceProductId: sample.key } },
      create: { source: 'development-sample', sourceProductId: sample.key, name: sample.name,
        category: sample.category, imageUrl: sample.imageUrl, attributes: sample.attributes, isSample: true },
      update: { name: sample.name, category: sample.category, imageUrl: sample.imageUrl,
        attributes: sample.attributes, isSample: true },
    });
  }

  // ── Seed notifications ────────────────────────────────────────────
  const notifCount = await prisma.notification.count({ where: { userId: user.id } });
  if (notifCount === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: user.id, type: 'OUTFIT',  title: 'Today\'s outfit ready', message: 'Daily outfit ready: rainy-day office look with your camel blazer.', readAt: null },
        { userId: user.id, type: 'WEATHER', title: 'Weather alert', message: 'Weather alert: carry lightweight outerwear for evening showers today.', readAt: null },
        { userId: user.id, type: 'SALE',    title: 'Shopping catalog demo', message: 'Sample shopping products are available for preview; no live retailer offers are configured.', readAt: null },
        { userId: user.id, type: 'TREND',   title: 'Trend update', message: 'Ivory layers and gold accents match your 3 most-saved looks this week.', readAt: new Date() },
        { userId: user.id, type: 'SYSTEM',  title: 'Welcome to ClosetAI', message: 'Your wardrobe is set up. Generate your first outfit to get started!', readAt: new Date() },
      ],
    });
  }

  // Correct an older development fixture that asserted an unverified sale.
  await prisma.notification.updateMany({
    where: { userId: user.id, type: 'SALE', title: 'Sale alert',
      message: 'Neutral sneakers dropped 18% on Ajio — matches your wardrobe gap.' },
    data: { title: 'Shopping catalog demo',
      message: 'Sample shopping products are available for preview; no live retailer offers are configured.' },
  });

  console.info(`✅  Seed complete.`);
  console.info(`    Test user: phase1.seed@closetai.test`);
  console.info('    Password: development seed only (not a production account)');
  console.info(`    Items: ${createdItems.length} wardrobe items`);
  console.info(`    Catalog: ${sampleProducts.length} labeled sample products (no live offers)`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
