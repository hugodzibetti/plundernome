import type { SourceDefinition } from '../domain/catalog/types';
import { SOURCE_DEFINITIONS_PART1 } from './definitions-part1';
import { SOURCE_DEFINITIONS_PART2 } from './definitions-part2';
import { SOURCE_DEFINITIONS_PART3 } from './definitions-part3';
import { SOURCE_DEFINITIONS_PART4 } from './definitions-part4';

export const SOURCE_DEFINITIONS: SourceDefinition[] = [
  ...SOURCE_DEFINITIONS_PART1,
  ...SOURCE_DEFINITIONS_PART2,
  ...SOURCE_DEFINITIONS_PART3,
  ...SOURCE_DEFINITIONS_PART4,
];
