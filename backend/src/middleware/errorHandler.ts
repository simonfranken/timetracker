import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError";

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("Error:", err);

  // Handle operational AppErrors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.isOperational ? err.message : "Internal server error",
    });
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        res.status(409).json({ error: "Resource already exists" });
        return;
      case "P2025":
        res.status(404).json({ error: "Resource not found" });
        return;
      case "P2003":
        res
          .status(400)
          .json({ error: "Invalid reference to related resource" });
        return;
      default:
        res.status(500).json({ error: "Database error" });
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ error: "Invalid data format" });
    return;
  }

  // Legacy support for errors with statusCode property
  const statusCode = (err as ApiError).statusCode || 500;

  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal server error" : err.message,
  });
}

export function notFoundHandler(
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  res.status(404).json({ error: "Endpoint not found" });
}
