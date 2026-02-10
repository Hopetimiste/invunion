import { z } from 'zod';

/**
 * Schéma de validation pour la création d'un tenant
 */
export const signupTenantSchema = z.object({
  companyName: z
    .string()
    .min(1, { message: 'Le nom de l\'entreprise est requis' })
    .max(100, { message: 'Le nom de l\'entreprise ne doit pas dépasser 100 caractères' })
    .trim(),
  firstName: z
    .string()
    .max(50, { message: 'Le prénom ne doit pas dépasser 50 caractères' })
    .trim()
    .optional()
    .or(z.literal('')),
});
