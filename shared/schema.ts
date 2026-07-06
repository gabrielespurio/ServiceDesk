import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["admin", "resolver", "user"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["aberto", "em_andamento", "aguardando_usuario", "resolvido", "fechado"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["baixa", "media", "alta", "critica"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").default("aberto").notNull(),
  priority: ticketPriorityEnum("priority").default("media").notNull(),
  category: text("category").notNull(),
  creatorId: integer("creator_id").notNull(),
  assignedToId: integer("assigned_to_id"),
  queueId: integer("queue_id"),
  customFields: text("custom_fields"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fields: text("fields").notNull(), // JSON string representing the form structure
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const formsRelations = relations(forms, ({ many }) => ({
  submissions: many(tickets), // Let's assume forms relate to tickets for now
}));

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  userId: integer("user_id").notNull(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const serviceQueues = pgTable("service_queues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table for queue-teams many-to-many
export const queueTeams = pgTable("queue_teams", {
  id: serial("id").primaryKey(),
  queueId: integer("queue_id").notNull(),
  teamId: integer("team_id").notNull(),
});

// Junction table for queue-users many-to-many
export const queueUsers = pgTable("queue_users", {
  id: serial("id").primaryKey(),
  queueId: integer("queue_id").notNull(),
  userId: integer("user_id").notNull(),
});

export const serviceQueuesRelations = relations(serviceQueues, ({ many }) => ({
  queueTeams: many(queueTeams),
  queueUsers: many(queueUsers),
}));

export const queueTeamsRelations = relations(queueTeams, ({ one }) => ({
  queue: one(serviceQueues, {
    fields: [queueTeams.queueId],
    references: [serviceQueues.id],
  }),
  team: one(teams, {
    fields: [queueTeams.teamId],
    references: [teams.id],
  }),
}));

export const queueUsersRelations = relations(queueUsers, ({ one }) => ({
  queue: one(serviceQueues, {
    fields: [queueUsers.queueId],
    references: [serviceQueues.id],
  }),
  user: one(users, {
    fields: [queueUsers.userId],
    references: [users.id],
  }),
}));

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").default("America/Sao_Paulo").notNull(),
  rules: text("rules").notNull(), // JSON string: [{ day: 0-6, slots: [{ start: "HH:mm", end: "HH:mm" }] }]
  createdAt: timestamp("created_at").defaultNow(),
});

export const slaPolicies = pgTable("sla_policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  conditions: text("conditions").notNull(), // JSON string: { formId?: number, priority?: string, category?: string }
  responseTime: integer("response_time"), // in minutes
  resolutionTime: integer("resolution_time"), // in minutes
  isBusinessHours: boolean("is_business_hours").default(false).notNull(),
  scheduleId: integer("schedule_id"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const slaPoliciesRelations = relations(slaPolicies, ({ one }) => ({
  schedule: one(schedules, {
    fields: [slaPolicies.scheduleId],
    references: [schedules.id],
  }),
}));

export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true, createdAt: true });
export const insertSlaPolicySchema = createInsertSchema(slaPolicies).omit({ id: true, createdAt: true, updatedAt: true });

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type SlaPolicy = typeof slaPolicies.$inferSelect;
export type InsertSlaPolicy = z.infer<typeof insertSlaPolicySchema>;

// Schemas
export const insertFormSchema = createInsertSchema(forms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true });
export const insertServiceQueueSchema = createInsertSchema(serviceQueues).omit({ id: true, createdAt: true });

export type Form = typeof forms.$inferSelect;
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type ServiceQueue = typeof serviceQueues.$inferSelect;
export type InsertServiceQueue = z.infer<typeof insertServiceQueueSchema>;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ticketsCreated: many(tickets, { relationName: "creator" }),
  ticketsAssigned: many(tickets, { relationName: "assignee" }),
  messages: many(messages),
  teams: many(teamMembers),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  creator: one(users, {
    fields: [tickets.creatorId],
    references: [users.id],
    relationName: "creator",
  }),
  assignee: one(users, {
    fields: [tickets.assignedToId],
    references: [users.id],
    relationName: "assignee",
  }),
  queue: one(serviceQueues, {
    fields: [tickets.queueId],
    references: [serviceQueues.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  ticket: one(tickets, {
    fields: [messages.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const updateUserSchema = insertUserSchema.partial();
export const insertTicketSchema = createInsertSchema(tickets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export const triggers = pgTable("triggers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  event: text("event").notNull(), // e.g., 'ticket.created', 'ticket.updated'
  conditions: text("conditions").notNull(), // JSON string representing conditions
  actions: text("actions").notNull(), // JSON string representing actions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTriggerSchema = createInsertSchema(triggers).omit({ id: true, createdAt: true, updatedAt: true });
export type Trigger = typeof triggers.$inferSelect;
export type InsertTrigger = z.infer<typeof insertTriggerSchema>;

// Add Message Exports
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export const aiCategories = pgTable("ai_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Global Connections
export const aiConnections = pgTable("ai_connections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").default("api_rest").notNull(), // api_rest, etc.
  url: text("url").notNull(),
  method: text("method").default("GET").notNull(),
  authType: text("auth_type").default("none"), // none, bearer, basic
  authConfig: text("auth_config"), // JSON string with token, user, pass, etc.
  headers: text("headers"), // JSON string with array of {key, value}
  parameters: text("parameters"), // JSON string with array of query params {key, value}
  bodySchema: text("body_schema"), // JSON schema string for POST/PUT
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Assistants Module
export const aiAssistants = pgTable("ai_assistants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  description: text("description"),
  provider: text("provider").default("gemini"), // gemini, openai
  model: text("model").default("gemini-2.5-flash"), // gemini-2.5-flash, gpt-5-mini
  apiKey: text("api_key"),
  objective: text("objective"),
  personality: text("personality"),
  scope: text("scope").default("external").notNull(), // internal, external
  categoryId: integer("category_id"),
  enableLogs: boolean("enable_logs").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiKnowledgeBases = pgTable("ai_knowledge_bases", {
  id: serial("id").primaryKey(),
  assistantId: integer("assistant_id").notNull(),
  type: text("type").notNull(), // file, url, text, api
  content: text("content").notNull(), // filename, url, or raw text
  authType: text("auth_type").default("none"), // none, token, basic
  token: text("token"),
  user: text("user_name"),
  pass: text("password"),
  status: text("status").default("ready").notNull(), // indexing, ready, failed
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiChannels = pgTable("ai_channels", {
  id: serial("id").primaryKey(),
  assistantId: integer("assistant_id").notNull(),
  type: text("type").notNull(), // whatsapp, web, etc.
  config: text("config"), // JSON string
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiActions = pgTable("ai_actions", {
  id: serial("id").primaryKey(),
  assistantId: integer("assistant_id").notNull(),
  actionType: text("action_type").notNull(), // create_ticket, etc.
  config: text("config"), // JSON string
  active: boolean("active").default(true).notNull(),
});

export const aiLogs = pgTable("ai_logs", {
  id: serial("id").primaryKey(),
  assistantId: integer("assistant_id").notNull(),
  actionType: text("action_type").notNull(), // n8n_execution, ticket_created, transfer
  status: text("status").notNull(), // success, error, pending
  details: json("details"), // Technical payload and responses
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const aiAssistantsRelations = relations(aiAssistants, ({ many }) => ({
  knowledgeBases: many(aiKnowledgeBases),
  channels: many(aiChannels),
  actions: many(aiActions),
}));

export const aiKnowledgeBasesRelations = relations(aiKnowledgeBases, ({ one }) => ({
  assistant: one(aiAssistants, {
    fields: [aiKnowledgeBases.assistantId],
    references: [aiAssistants.id],
  }),
}));

export const aiChannelsRelations = relations(aiChannels, ({ one }) => ({
  assistant: one(aiAssistants, {
    fields: [aiChannels.assistantId],
    references: [aiAssistants.id],
  }),
}));

export const aiActionsRelations = relations(aiActions, ({ one }) => ({
  assistant: one(aiAssistants, {
    fields: [aiActions.assistantId],
    references: [aiAssistants.id],
  }),
}));

// Schemas for AI Module
export const insertAiAssistantSchema = createInsertSchema(aiAssistants).omit({ id: true, createdAt: true, updatedAt: true });
export type AiAssistant = typeof aiAssistants.$inferSelect;
export type InsertAiAssistant = z.infer<typeof insertAiAssistantSchema>;

export const insertAiKnowledgeBaseSchema = createInsertSchema(aiKnowledgeBases).omit({ id: true, createdAt: true });
export type AiKnowledgeBase = typeof aiKnowledgeBases.$inferSelect;
export type InsertAiKnowledgeBase = z.infer<typeof insertAiKnowledgeBaseSchema>;

export const insertAiChannelSchema = createInsertSchema(aiChannels).omit({ id: true, createdAt: true });
export type AiChannel = typeof aiChannels.$inferSelect;
export type InsertAiChannel = z.infer<typeof insertAiChannelSchema>;

export const insertAiActionSchema = createInsertSchema(aiActions).omit({ id: true });
export type AiAction = typeof aiActions.$inferSelect;
export type InsertAiAction = z.infer<typeof insertAiActionSchema>;

// WhatsApp Shared Connections
export const whatsappConnections = pgTable("whatsapp_connections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // evolution, meta
  config: text("config"), // JSON string
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWhatsappConnectionSchema = createInsertSchema(whatsappConnections).omit({ id: true, createdAt: true });
export type WhatsappConnection = typeof whatsappConnections.$inferSelect;
export type InsertWhatsappConnection = z.infer<typeof insertWhatsappConnectionSchema>;