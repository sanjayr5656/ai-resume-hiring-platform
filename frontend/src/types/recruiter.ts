import type { Application } from './application';

export interface DuplicateGroupApplication {
  id: string;
  candidate: string;
  preview: string;
}

export interface DuplicateGroup {
  similarity: number;
  reason: string;
  applications: DuplicateGroupApplication[];
}

export interface DuplicatesResponse {
  threshold: number;
  groups: DuplicateGroup[];
}

export interface TopSummaryResponse {
  summary: string;
}

export interface SkillsExtractionResponse {
  requiredSkills: string[];
  niceToHaveSkills: string[];
}
