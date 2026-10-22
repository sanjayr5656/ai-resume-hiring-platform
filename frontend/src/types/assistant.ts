import type { Job } from './job';

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  recommendedJobs?: Job[];
}

export interface AssistantChatResponse {
  reply: string;
  recommendedJobs: Job[];
  hasResume: boolean;
}
