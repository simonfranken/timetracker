import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { TimerService } from '../services/timer.service';
import { StartTimerSchema, UpdateTimerSchema, StopTimerSchema } from '../schemas';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const timerService = new TimerService();

// GET /api/timer - Get current ongoing timer
router.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const timer = await timerService.getOngoingTimer(req.user!.id);
    res.json(timer);
  } catch (error) {
    next(error);
  }
});

// POST /api/timer/start - Start timer
router.post(
  '/start',
  requireAuth,
  validateBody(StartTimerSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const timer = await timerService.start(req.user!.id, req.body);
      res.status(201).json(timer);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/timer - Update ongoing timer
router.put(
  '/',
  requireAuth,
  validateBody(UpdateTimerSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const timer = await timerService.update(req.user!.id, req.body);
      res.json(timer);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/timer/stop - Stop timer
router.post(
  '/stop',
  requireAuth,
  validateBody(StopTimerSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const entry = await timerService.stop(req.user!.id, req.body);
      res.json(entry);
    } catch (error) {
      next(error);
    }
  }
);

export default router;