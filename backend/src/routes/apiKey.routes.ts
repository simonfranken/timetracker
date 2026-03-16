import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { ApiKeyService } from '../services/apiKey.service';
import { CreateApiKeySchema, IdSchema } from '../schemas';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const apiKeyService = new ApiKeyService();

// GET /api-keys - List user's API keys
router.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const keys = await apiKeyService.list(req.user!.id);
    res.json(keys);
  } catch (error) {
    next(error);
  }
});

// POST /api-keys - Create a new API key
router.post(
  '/',
  requireAuth,
  validateBody(CreateApiKeySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const created = await apiKeyService.create(req.user!.id, req.body.name);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api-keys/:id - Revoke an API key
router.delete(
  '/:id',
  requireAuth,
  validateParams(IdSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await apiKeyService.delete(req.params.id, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
