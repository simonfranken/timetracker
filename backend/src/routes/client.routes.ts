import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { ClientService } from '../services/client.service';
import { CreateClientSchema, UpdateClientSchema, IdSchema } from '../schemas';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const clientService = new ClientService();

// GET /api/clients - List user's clients
router.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const clients = await clientService.findAll(req.user!.id);
    res.json(clients);
  } catch (error) {
    next(error);
  }
});

// POST /api/clients - Create client
router.post(
  '/',
  requireAuth,
  validateBody(CreateClientSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const client = await clientService.create(req.user!.id, req.body);
      res.status(201).json(client);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/clients/:id - Update client
router.put(
  '/:id',
  requireAuth,
  validateParams(IdSchema),
  validateBody(UpdateClientSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const client = await clientService.update(req.params.id, req.user!.id, req.body);
      res.json(client);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/clients/:id - Delete client
router.delete(
  '/:id',
  requireAuth,
  validateParams(IdSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await clientService.delete(req.params.id, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;