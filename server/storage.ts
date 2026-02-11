import { users, tickets, messages, forms, teams, teamMembers, serviceQueues, queueTeams, queueUsers, type User, type InsertUser, type Ticket, type InsertTicket, type Message, type InsertMessage, type Form, type InsertForm, type Team, type InsertTeam, type TeamMember, type ServiceQueue, type InsertServiceQueue } from "@shared/schema";
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
    return newTicket;
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
}


export const storage = new DatabaseStorage();
