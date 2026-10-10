import type { StructureTag } from '../tags/structure-tags.schema.js';
import type { Structure } from './structures.schema.js';

export type StructureView = Structure & { tags: StructureTag[] };
