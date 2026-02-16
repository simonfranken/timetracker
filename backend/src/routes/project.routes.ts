import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { ProjectService } from '../services/project.service';
import { CreateProjectSchema, UpdateProjectSchema, IdSchema } from '../schemas';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const projectService = new ProjectService();

const QuerySchema = z.object({
  clientId: z.string().uuid().optional(),
});

// GET /api/projects - List user's projects
router.get(
  '/',
  requireAuth,
  validateQuery(QuerySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { clientId } = req.query as { clientId?: string };
      const projects = await projectService.findAll(req.user!.id, clientId);
      res.json(projects);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/projects - Create project
router.post(
  '/',
  requireAuth,
  validateBody(CreateProjectSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const project = await projectService.create(req.user!.id, req.body);
      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/projects/:id - Update project
router.put(
  '/:id',
  requireAuth,
  validateParams(IdSchema),
  validateBody(UpdateProjectSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const project = await projectService.update(req.params.id, req.user!.id, req.body);
      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/projects/:id - Delete project
router.delete(
  '/:id',
  requireAuth,
  validateParams(IdSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await projectService.delete(req.params.id, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;