import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { ClientTargetService } from '../services/clientTarget.service';
import {
  CreateClientTargetSchema,
  UpdateClientTargetSchema,
  CreateCorrectionSchema,
  IdSchema,
} from '../schemas';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const service = new ClientTargetService();

const TargetAndCorrectionParamsSchema = z.object({
  id: z.string().uuid(),
  correctionId: z.string().uuid(),
});

// GET /api/client-targets — list all targets with balance for current user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const targets = await service.findAll(req.user!.id);
    res.json(targets);
  } catch (error) {
    next(error);
  }
});

// POST /api/client-targets — create a target
router.post(
  '/',
  requireAuth,
  validateBody(CreateClientTargetSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const target = await service.create(req.user!.id, req.body);
      res.status(201).json(target);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/client-targets/:id — update a target
router.put(
  '/:id',
  requireAuth,
  validateParams(IdSchema),
  validateBody(UpdateClientTargetSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const target = await service.update(req.params.id, req.user!.id, req.body);
      res.json(target);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/client-targets/:id — delete a target (cascades corrections)
router.delete(
  '/:id',
  requireAuth,
  validateParams(IdSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await service.delete(req.params.id, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/client-targets/:id/corrections — add a correction
router.post(
  '/:id/corrections',
  requireAuth,
  validateParams(IdSchema),
  validateBody(CreateCorrectionSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const correction = await service.addCorrection(req.params.id, req.user!.id, req.body);
      res.status(201).json(correction);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/client-targets/:id/corrections/:correctionId — delete a correction
router.delete(
  '/:id/corrections/:correctionId',
  requireAuth,
  validateParams(TargetAndCorrectionParamsSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await service.deleteCorrection(req.params.id, req.params.correctionId, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
