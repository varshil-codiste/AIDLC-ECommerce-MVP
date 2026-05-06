import type { LlmTool } from '../../types/orchestrator.types';

export const NOTIFICATION_WRITE_TOOLS = new Set(['notification_mark_all_read']);

export const NOTIFICATION_TOOLS: LlmTool[] = [
  {
    name: 'notification_list',
    description: 'Retrieve the merchant\'s in-app notification inbox with unread count.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max notifications to return (default 20, max 50).' },
      },
    },
  },
  {
    name: 'notification_mark_all_read',
    description: 'Mark all unread notifications as read for the current merchant.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];
