import { z } from 'zod';
import { insertUserSchema, insertTicketSchema, insertMessageSchema, users, tickets, messages } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  forbidden: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: { 200: z.object({ message: z.string() }) },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  tickets: {
    list: {
      method: 'GET' as const,
      path: '/api/tickets',
      input: z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        assignedToMe: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof tickets.$inferSelect & { creator: typeof users.$inferSelect, assignee: typeof users.$inferSelect | null }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tickets',
      input: insertTicketSchema.omit({ creatorId: true, assignedToId: true }), // Backend handles creatorId
      responses: {
        201: z.custom<typeof tickets.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/tickets/:id',
      responses: {
        200: z.custom<typeof tickets.$inferSelect & { creator: typeof users.$inferSelect, assignee: typeof users.$inferSelect | null }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/tickets/:id',
      input: insertTicketSchema.partial().omit({ creatorId: true }),
      responses: {
        200: z.custom<typeof tickets.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  messages: {
    list: {
      method: 'GET' as const,
      path: '/api/tickets/:ticketId/messages',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect & { user: typeof users.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tickets/:ticketId/messages',
      input: insertMessageSchema.omit({ ticketId: true, userId: true }),
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  users: {
    listResolvers: {
      method: 'GET' as const,
      path: '/api/users/resolvers',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    stats: {
      method: 'GET' as const,
      path: '/api/admin/stats',
      responses: {
        200: z.object({
          totalTickets: z.number(),
          openTickets: z.number(),
          resolvedTickets: z.number(),
          avgResolutionTime: z.number(),
        }),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
