import type { Request, Response } from "express";

export async function notFoundMiddleware(req: Request, res: Response) {
    res.status(404).json({
    message: "The requested endpoint does not exist",
  });
}