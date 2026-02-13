import { users, tickets, messages, forms, teams, teamMembers, serviceQueues, queueTeams, queueUsers, triggers, type User, type InsertUser, type Ticket, type InsertTicket, type Message, type InsertMessage, type Form, type InsertForm, type Team, type InsertTeam, type TeamMember, type ServiceQueue, type InsertServiceQueue, type Trigger, type InsertTrigger } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getResolvers(): Promise<User[]>;

  // Tickets
  getTickets(filters?: { status?: string; priority?: string; assignedToMe?: string; userId?: number; role?: string; queueId?: number }): Promise<(Ticket & { creator: User; assignee: User | null })[]>;
  getTicket(id: number): Promise<(Ticket & { creator: User; assignee: User | null }) | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<InsertTicket> & { assignedToId?: number | null }): Promise<Ticket | undefined>;

  // Messages
  getMessages(ticketId: number): Promise<(Message & { user: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Forms
  getForms(): Promise<Form[]>;
  getActiveForms(): Promise<Form[]>;
  createForm(form: InsertForm): Promise<Form>;
  deleteForm(id: number): Promise<boolean>;

  // Teams
  getTeams(): Promise<(Team & { members: (TeamMember & { user: User })[] })[]>;
  getTeam(id: number): Promise<(Team & { members: (TeamMember & { user: User })[] }) | undefined>;
  createTeam(team: InsertTeam, memberUserIds: number[]): Promise<Team>;
  updateTeam(id: number, updates: Partial<InsertTeam>, memberUserIds?: number[]): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;

  // Service Queues
  getServiceQueues(): Promise<(ServiceQueue & { teams: Team[]; users: User[] })[]>;
  createServiceQueue(queue: InsertServiceQueue, teamIds: number[], userIds: number[]): Promise<ServiceQueue>;
  updateServiceQueue(id: number, updates: Partial<InsertServiceQueue>, teamIds?: number[], userIds?: number[]): Promise<ServiceQueue | undefined>;
  deleteServiceQueue(id: number): Promise<boolean>;
  getQueuesWithStats(userId: number): Promise<(ServiceQueue & { ticketCount: number })[]>;

  // Stats
  getStats(): Promise<{ totalTickets: number; openTickets: number; resolvedTickets: number; avgResolutionTime: number }>;

  // Triggers
  getTriggers(): Promise<Trigger[]>;
  createTrigger(trigger: InsertTrigger): Promise<Trigger>;
  updateTrigger(id: number, updates: Partial<InsertTrigger>): Promise<Trigger | undefined>;
  deleteTrigger(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
    return !!deleted;
  }

  async getResolvers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, "resolver"));
  }

  async getTickets(filters?: { status?: string; priority?: string; assignedToMe?: string; userId?: number; role?: string; queueId?: number }): Promise<(Ticket & { creator: User; assignee: User | null })[]> {
    const whereConditions = [];
    if (filters?.status) whereConditions.push(eq(tickets.status, filters.status as any));
    if (filters?.priority) whereConditions.push(eq(tickets.priority, filters.priority as any));

    if (filters?.role === "user" && filters.userId) {
      whereConditions.push(eq(tickets.creatorId, filters.userId));
    } else if (filters?.role === "resolver" && filters.assignedToMe === "true" && filters.userId) {
      whereConditions.push(eq(tickets.assignedToId, filters.userId));
    }

    if (filters?.queueId) {
      whereConditions.push(eq(tickets.queueId, filters.queueId));
    }

    const results = await db.query.tickets.findMany({
      where: whereConditions.length ? and(...whereConditions) : undefined,
      with: {
        creator: true,
        assignee: true,
      },
      orderBy: [desc(tickets.createdAt)],
    });

    return results as (Ticket & { creator: User; assignee: User | null })[];
  }

  async getTicket(id: number): Promise<(Ticket & { creator: User; assignee: User | null }) | undefined> {
    const result = await db.query.tickets.findFirst({
      where: eq(tickets.id, id),
      with: {
        creator: true,
        assignee: true,
      },
    });
    return result as (Ticket & { creator: User; assignee: User | null }) | undefined;
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [newTicket] = await db.insert(tickets).values(ticket).returning();
    return this.processTriggers(newTicket, "ticket.created");
  }

  async processTriggers(ticket: Ticket, eventType: string): Promise<Ticket> {
    try {
      const allTriggers = await this.getTriggers();
      const activeTriggers = allTriggers.filter(t => t.active);

      if (activeTriggers.length === 0) return ticket;

      const formsList = await this.getForms();
      const ticketForm = formsList.find(f => f.name === ticket.category);
      const ticketFormId = ticketForm?.id.toString();

      let updates: Partial<InsertTicket> & { assignedToId?: number | null } = {};
      let hasUpdates = false;

      console.log(`[Triggers] Processing ${activeTriggers.length} active triggers for ticket #${ticket.id} (event: ${eventType}, category: ${ticket.category}, formId: ${ticketFormId})`);

      for (const trigger of activeTriggers) {
        let conditions = { all: [] as any[], any: [] as any[] };
        try {
          const parsed = JSON.parse(trigger.conditions);
          if (Array.isArray(parsed)) {
            conditions.all = parsed;
          } else {
            conditions.all = parsed.all || [];
            conditions.any = parsed.any || [];
          }
        } catch (e) {
          console.error(`[Triggers] Failed to parse conditions for trigger ${trigger.id}`, e);
          continue;
        }

        const compare = (actual: string | undefined, expected: string, operator: string): boolean => {
          if (!actual) return operator === "not_equals";
          if (operator === "not_equals") return actual !== expected;
          return actual === expected; // default: "equals"
        };

        const checkCondition = (c: any): boolean => {
          const operator = c.operator || "equals";

          // Ticket Event condition
          if (c.field === "ticket_event") {
            if (c.value === "created") return eventType === "ticket.created";
            if (c.value === "updated") return eventType === "ticket.updated";
            if (c.value === "any") return true; // Created or Updated
            return false;
          }

          // Form condition — compare form ID
          if (c.field === "form") {
            return compare(ticketFormId, c.value, operator);
          }

          // Priority condition
          if (c.field === "priority") {
            return compare(ticket.priority, c.value, operator);
          }

          // Status condition
          if (c.field === "status") {
            return compare(ticket.status, c.value, operator);
          }

          // Queue condition
          if (c.field === "queue") {
            return compare(ticket.queueId?.toString(), c.value, operator);
          }

          // Legacy: also support "ticket" field name for backward compat
          if (c.field === "ticket") {
            if (c.value === "created") return eventType === "ticket.created";
            if (c.value === "updated") return eventType === "ticket.updated";
            if (c.value === "created_updated" || c.value === "any") return true;
            return false;
          }

          console.warn(`[Triggers] Unknown condition field: ${c.field}`);
          return false;
        };

        const matchAll = conditions.all.length === 0 || conditions.all.every(checkCondition);
        const finalMatchAny = conditions.any.length > 0 ? conditions.any.some(checkCondition) : true;

        if (matchAll && finalMatchAny) {
          console.log(`[Triggers] ✓ Trigger "${trigger.name}" (ID: ${trigger.id}) MATCHED`);

          let actions: any[] = [];
          try {
            actions = JSON.parse(trigger.actions);
          } catch (e) {
            console.error(`[Triggers] Failed to parse actions for trigger ${trigger.id}`, e);
            continue;
          }

          for (const action of actions) {
            console.log(`[Triggers]   → Action: type="${action.type}", value="${action.value}"`);

            // Assign to Queue
            if (action.type === "assign_queue" || action.type === "action.assign_queue") {
              const queueId = parseInt(action.value, 10);
              if (!isNaN(queueId)) {
                updates.queueId = queueId;
                hasUpdates = true;
                console.log(`[Triggers]   ✓ Set queueId = ${queueId}`);
              }
            }

            // Assign to Resolver
            if (action.type === "assign_resolver") {
              const userId = parseInt(action.value, 10);
              if (!isNaN(userId)) {
                updates.assignedToId = userId;
                hasUpdates = true;
                console.log(`[Triggers]   ✓ Set assignedToId = ${userId}`);
              }
            }

            // Set Priority
            if (action.type === "set_priority") {
              const validPriorities = ["baixa", "media", "alta", "critica"];
              if (validPriorities.includes(action.value)) {
                updates.priority = action.value as any;
                hasUpdates = true;
                console.log(`[Triggers]   ✓ Set priority = ${action.value}`);
              }
            }

            // Set Status
            if (action.type === "set_status") {
              const validStatuses = ["aberto", "em_andamento", "aguardando_usuario", "resolvido", "fechado"];
              if (validStatuses.includes(action.value)) {
                updates.status = action.value as any;
                hasUpdates = true;
                console.log(`[Triggers]   ✓ Set status = ${action.value}`);
              }
            }
          }
        } else {
          console.log(`[Triggers] ✗ Trigger "${trigger.name}" (ID: ${trigger.id}) did not match`);
        }
      }

      if (hasUpdates) {
        // Validate queue exists before attempting update
        if (updates.queueId) {
          const queuesList = await db.select().from(serviceQueues).where(eq(serviceQueues.id, updates.queueId));
          if (queuesList.length === 0) {
            console.warn(`[Triggers] Queue ID ${updates.queueId} does not exist, skipping queue assignment`);
            delete updates.queueId;
            hasUpdates = Object.keys(updates).length > 0;
          }
        }
      }

      if (hasUpdates) {
        try {
          console.log(`[Triggers] Applying updates to ticket #${ticket.id}:`, JSON.stringify(updates));
          const [updatedTicket] = await db.update(tickets)
            .set(updates)
            .where(eq(tickets.id, ticket.id))
            .returning();
          return updatedTicket;
        } catch (updateError: any) {
          console.error(`[Triggers] Failed to apply updates to ticket #${ticket.id}:`, updateError.message || updateError);
          return ticket;
        }
      }

      return ticket;

    } catch (error) {
      console.error("[Triggers] Error processing triggers:", error);
      return ticket;
    }
  }

  async updateTicket(id: number, updates: Partial<InsertTicket> & { assignedToId?: number | null }): Promise<Ticket | undefined> {
    const [updatedTicket] = await db.update(tickets).set(updates).where(eq(tickets.id, id)).returning();
    return updatedTicket;
  }

  async getMessages(ticketId: number): Promise<(Message & { user: User })[]> {
    return db.query.messages.findMany({
      where: eq(messages.ticketId, ticketId),
      with: {
        user: true,
      },
      orderBy: [desc(messages.createdAt)],
    }) as Promise<(Message & { user: User })[]>;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getForms(): Promise<Form[]> {
    return db.select().from(forms).orderBy(desc(forms.createdAt));
  }

  async getActiveForms(): Promise<Form[]> {
    return db.select().from(forms).where(eq(forms.active, true)).orderBy(forms.name);
  }

  async createForm(form: InsertForm): Promise<Form> {
    const [newForm] = await db.insert(forms).values(form).returning();
    return newForm;
  }

  async deleteForm(id: number): Promise<boolean> {
    const result = await db.delete(forms).where(eq(forms.id, id)).returning();
    return result.length > 0;
  }

  async getTeams(): Promise<(Team & { members: (TeamMember & { user: User })[] })[]> {
    const results = await db.query.teams.findMany({
      with: {
        members: {
          with: {
            user: true,
          }
        }
      },
      orderBy: [desc(teams.createdAt)],
    });
    return results as (Team & { members: (TeamMember & { user: User })[] })[];
  }

  async getTeam(id: number): Promise<(Team & { members: (TeamMember & { user: User })[] }) | undefined> {
    const result = await db.query.teams.findFirst({
      where: eq(teams.id, id),
      with: {
        members: {
          with: {
            user: true,
          }
        }
      }
    });
    return result as (Team & { members: (TeamMember & { user: User })[] }) | undefined;
  }

  async createTeam(team: InsertTeam, memberUserIds: number[]): Promise<Team> {
    return await db.transaction(async (tx) => {
      const [newTeam] = await tx.insert(teams).values(team).returning();
      if (memberUserIds.length > 0) {
        await tx.insert(teamMembers).values(
          memberUserIds.map((userId) => ({
            teamId: newTeam.id,
            userId,
          }))
        );
      }
      return newTeam;
    });
  }

  async updateTeam(id: number, updates: Partial<InsertTeam>, memberUserIds?: number[]): Promise<Team | undefined> {
    return await db.transaction(async (tx) => {
      const [updatedTeam] = await tx.update(teams).set(updates).where(eq(teams.id, id)).returning();
      if (!updatedTeam) return undefined;

      if (memberUserIds !== undefined) {
        await tx.delete(teamMembers).where(eq(teamMembers.teamId, id));
        if (memberUserIds.length > 0) {
          await tx.insert(teamMembers).values(
            memberUserIds.map((userId) => ({
              teamId: id,
              userId,
            }))
          );
        }
      }
      return updatedTeam;
    });
  }

  async deleteTeam(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      await tx.delete(teamMembers).where(eq(teamMembers.teamId, id));
      const [deleted] = await tx.delete(teams).where(eq(teams.id, id)).returning();
      return !!deleted;
    });
  }

  async getServiceQueues(): Promise<(ServiceQueue & { teams: Team[]; users: User[] })[]> {
    try {
      const queues = await db.select().from(serviceQueues).orderBy(desc(serviceQueues.createdAt));

      const fullQueues = [];
      for (const q of queues) {
        try {
          const qTeams = await db
            .select({ team: teams })
            .from(queueTeams)
            .innerJoin(teams, eq(queueTeams.teamId, teams.id))
            .where(eq(queueTeams.queueId, q.id));

          const qUsers = await db
            .select({ user: users })
            .from(queueUsers)
            .innerJoin(users, eq(queueUsers.userId, users.id))
            .where(eq(queueUsers.queueId, q.id));

          fullQueues.push({
            ...q,
            teams: qTeams.map(t => t.team),
            users: qUsers.map(u => u.user)
          });
        } catch (itemError) {
          console.error(`Error fetching relations for queue ${q.id}:`, itemError);
          fullQueues.push({ ...q, teams: [], users: [] });
        }
      }

      console.log(`getServiceQueues: found ${queues.length} queues`);
      return fullQueues;
    } catch (error) {
      console.error("Critical error in getServiceQueues:", error);
      throw error;
    }
  }

  async createServiceQueue(queue: InsertServiceQueue, teamIds: number[], userIds: number[]): Promise<ServiceQueue> {
    return await db.transaction(async (tx) => {
      const [newQueue] = await tx.insert(serviceQueues).values(queue).returning();
      if (teamIds.length > 0) {
        await tx.insert(queueTeams).values(
          teamIds.map((teamId) => ({ queueId: newQueue.id, teamId }))
        );
      }
      if (userIds.length > 0) {
        await tx.insert(queueUsers).values(
          userIds.map((userId) => ({ queueId: newQueue.id, userId }))
        );
      }
      return newQueue;
    });
  }

  async updateServiceQueue(id: number, updates: Partial<InsertServiceQueue>, teamIds?: number[], userIds?: number[]): Promise<ServiceQueue | undefined> {
    return await db.transaction(async (tx) => {
      const [updated] = await tx.update(serviceQueues).set(updates).where(eq(serviceQueues.id, id)).returning();
      if (!updated) return undefined;

      if (teamIds !== undefined) {
        await tx.delete(queueTeams).where(eq(queueTeams.queueId, id));
        if (teamIds.length > 0) {
          await tx.insert(queueTeams).values(
            teamIds.map((teamId) => ({ queueId: id, teamId }))
          );
        }
      }
      if (userIds !== undefined) {
        await tx.delete(queueUsers).where(eq(queueUsers.queueId, id));
        if (userIds.length > 0) {
          await tx.insert(queueUsers).values(
            userIds.map((userId) => ({ queueId: id, userId }))
          );
        }
      }
      return updated;
    });
  }

  async deleteServiceQueue(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      await tx.delete(queueTeams).where(eq(queueTeams.queueId, id));
      await tx.delete(queueUsers).where(eq(queueUsers.queueId, id));
      const [deleted] = await tx.delete(serviceQueues).where(eq(serviceQueues.id, id)).returning();
      return !!deleted;
    });
  }

  async getStats(): Promise<{ totalTickets: number; openTickets: number; resolvedTickets: number; avgResolutionTime: number }> {
    const allTickets = await db.select().from(tickets);
    const total = allTickets.length;
    const open = allTickets.filter(t => t.status === "aberto").length;
    const resolved = allTickets.filter(t => t.status === "resolvido").length;

    return {
      totalTickets: total,
      openTickets: open,
      resolvedTickets: resolved,
      avgResolutionTime: 24, // hours
    };
  }

  async getQueuesWithStats(userId: number): Promise<(ServiceQueue & { ticketCount: number })[]> {
    const user = await this.getUser(userId);
    if (!user) {
      console.log(`getQueuesWithStats: user ${userId} not found`);
      return [];
    }

    console.log(`getQueuesWithStats: user ${user.username}, role ${user.role}`);

    // Get all queues
    const allQueues = await this.getServiceQueues();

    // Filter queues user has access to (if admin, see all; if resolver, see linked queues or teams)
    let filteredQueues = allQueues;
    const userRole = (user.role || "").toLowerCase();

    if (userRole !== 'admin') {
      // Get user's teams
      const userTeams = await db.select({ teamId: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.userId, userId));
      const teamIds = userTeams.map(t => t.teamId);

      filteredQueues = allQueues.filter(q =>
        (q.users || []).some(u => u.id === userId) ||
        (q.teams || []).some(t => teamIds.includes(t.id))
      );
      console.log(`getQueuesWithStats: filtered to ${filteredQueues.length} queues for non-admin (role: ${user.role})`);
    } else {
      console.log(`getQueuesWithStats: admin sees all ${allQueues.length} queues`);
    }

    // Get ticket counts for each queue
    const stats = [];
    console.log(`getQueuesWithStats: entering loop for ${filteredQueues.length} queues`);
    for (const q of filteredQueues) {
      console.log(`getQueuesWithStats: counting tickets for queue ${q.id} (${q.name})`);
      const qTickets = await db.select().from(tickets).where(eq(tickets.queueId, q.id));
      stats.push({
        ...q,
        ticketCount: qTickets.filter(t => t.status === 'aberto' || t.status === 'em_andamento').length
      });
      console.log(`getQueuesWithStats: done for queue ${q.id}`);
    }

    console.log(`getQueuesWithStats: returning ${stats.length} queues`);
    return stats;
  }


  // Triggers
  async getTriggers(): Promise<Trigger[]> {
    return db.select().from(triggers).orderBy(desc(triggers.createdAt));
  }

  async createTrigger(trigger: InsertTrigger): Promise<Trigger> {
    const [newTrigger] = await db.insert(triggers).values(trigger).returning();
    return newTrigger;
  }

  async updateTrigger(id: number, updates: Partial<InsertTrigger>): Promise<Trigger | undefined> {
    const [updatedTrigger] = await db.update(triggers).set(updates).where(eq(triggers.id, id)).returning();
    return updatedTrigger;
  }

  async deleteTrigger(id: number): Promise<boolean> {
    const [deleted] = await db.delete(triggers).where(eq(triggers.id, id)).returning();
    return !!deleted;
  }
}


export const storage = new DatabaseStorage();
