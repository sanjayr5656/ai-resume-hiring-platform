import { api } from './client';
import type { AssistantChatResponse } from '../types';

export async function chatCareerAssistant(
  message: string,
  history: Array<{ sender: 'user' | 'assistant'; text: string }> = []
): Promise<AssistantChatResponse> {
  const { data } = await api.post<AssistantChatResponse>('/api/assistant/chat', {
    message,
    history,
  });
  return data;
}
