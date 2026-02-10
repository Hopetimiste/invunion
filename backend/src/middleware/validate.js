import { ZodError } from 'zod';

/**
 * Middleware de validation Zod réutilisable
 * @param {z.ZodSchema} schema - Le schéma Zod à utiliser pour la validation
 * @returns {Function} - Middleware Express
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      // Valide et transforme req.body selon le schéma
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      // Si c'est une erreur Zod, on retourne un format d'erreur propre
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      // Sinon, on laisse passer l'erreur
      next(error);
    }
  };
}
