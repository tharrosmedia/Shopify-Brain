import { createOpenAI } from '@ai-sdk/openai';

export const xai = createOpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: process.env.XAI_API_KEY! });
export const XAI_MODEL = 'grok-build-0.1';
