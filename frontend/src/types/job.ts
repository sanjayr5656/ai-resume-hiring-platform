export interface JobWeights {
  skills: number;
  projects: number;
  certifications: number;
  experience: number;
}

export interface Job {
  _id: string;
  recruiterId: string;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  minExperience: number;
  weights: JobWeights;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobPayload {
  title: string;
  description: string;
  requiredSkills: string[];
  niceToHaveSkills?: string[];
  minExperience?: number;
  weights: JobWeights;
}

export interface UpdateJobPayload extends Partial<CreateJobPayload> {
  status?: 'open' | 'closed';
}
