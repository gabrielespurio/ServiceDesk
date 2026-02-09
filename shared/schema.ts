import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
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
  category: text("category").notNull(), // e.g., Hardware, Software, Access
  creatorId: integer("creator_id").notNull(),
  assignedToId: integer("assigned_to_id"),
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
  type: text("type").notNull().default("team"), // 'team' or 'user'
  teamId: integer("team_id"),
  userId: integer("user_id"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceQueuesRelations = relations(serviceQueues, ({ one }) => ({
  team: one(teams, {
    fields: [serviceQueues.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [serviceQueues.userId],
    references: [users.id],
  }),
}));

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
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
