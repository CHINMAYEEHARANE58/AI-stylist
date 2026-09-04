import { Router } from 'express';
import adminRoutes     from './adminRoutes';
import authRoutes      from './authRoutes';
import insightsRoutes  from './insightsRoutes';
import outfitRoutes    from './outfitRoutes';
import pinterestRoutes from './pinterestRoutes';
import profileRoutes   from './profileRoutes';
import shoppingRoutes  from './shoppingRoutes';
import stylistRoutes   from './stylistRoutes';
import wardrobeRoutes  from './wardrobeRoutes';
import { isDatabaseConnected } from '../config/db';

const router = Router();

// ── Health check ──────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    success:   true,
    service:   'ClosetAI API',
    version:   'v1',
    status:    'healthy',
    db:        isDatabaseConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  });
});

// ── Feature routes ────────────────────────────────────────────────────
router.use('/auth',       authRoutes);
router.use('/wardrobe',   wardrobeRoutes);
router.use('/outfits',    outfitRoutes);
router.use('/stylist',    stylistRoutes);
router.use('/inspiration', pinterestRoutes);
router.use('/shopping',   shoppingRoutes);
router.use('/insights',   insightsRoutes);
router.use('/profile',    profileRoutes);
router.use('/admin',      adminRoutes);

export default router;
