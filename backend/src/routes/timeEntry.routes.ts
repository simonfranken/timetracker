import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { TimeEntryService } from '../services/timeEntry.service';
import { CreateTimeEntrySchema, UpdateTimeEntrySchema, IdSchema, TimeEntryFiltersSchema } from '../schemas';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const timeEntryService = new TimeEntryService();

// GET /api/time-entries - List user's entries
router.get(
  '/',
  requireAuth,
  validateQuery(TimeEntryFiltersSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await timeEntryService.findAll(req.user!.id, req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/time-entries - Create entry manually
router.post(
  '/',
  requireAuth,
  validateBody(CreateTimeEntrySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const entry = await timeEntryService.create(req.user!.id, req.body);
      res.status(201).json(entry);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/time-entries/:id - Update entry
router.put(
  '/:id',
  requireAuth,
  validateParams(IdSchema),
  validateBody(UpdateTimeEntrySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const entry = await timeEntryService.update(req.params.id, req.user!.id, req.body);
      res.json(entry);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/time-entries/:id - Delete entry
router.delete(
  '/:id',
  requireAuth,
  validateParams(IdSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await timeEntryService.delete(req.params.id, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;