import type { z } from 'zod';
import { createSessionFolderSchema } from './create-session-folder.dto.js';

export const updateSessionFolderSchema = createSessionFolderSchema.partial();

export type UpdateSessionFolderDto = z.infer<typeof updateSessionFolderSchema>;
