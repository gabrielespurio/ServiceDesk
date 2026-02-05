import { users, tickets, messages, forms, teams, teamMembers, type User, type InsertUser, type Ticket, type InsertTicket, type Message, type InsertMessage, type Form, type InsertForm, type Team, type InsertTeam, type TeamMember } from "@shared/schema";
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
  getTickets(filters?: { status?: string; priority?: string; assignedToMe?: string; userId?: number; role?: string }): Promise<(Ticket & { creator: User; assignee: User | null })[]>;
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

  async getTickets(filters?: { status?: string; priority?: string; assignedToMe?: string; userId?: number; role?: string }): Promise<(Ticket & { creator: User; assignee: User | null })[]> {
    let query = db.select({
      ticket: tickets,
      creator: users,
      assignee: { ...users, password: users.password }, // Alias for assignee, tricky in simple join, let's use query builder properly
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.creatorId, users.id));
    // Drizzle ORM complex join logic needs distinct aliases if joining users twice.
    // Simplified: fetch raw and map, or use db.query if schema relations are set up.
    // Using db.query is cleaner with relations.

    const whereConditions = [];
    if (filters?.status) whereConditions.push(eq(tickets.status, filters.status as any));
    if (filters?.priority) whereConditions.push(eq(tickets.priority, filters.priority as any));
    
    // Role based filtering
    if (filters?.role === "user" && filters.userId) {
       whereConditions.push(eq(tickets.creatorId, filters.userId));
    } else if (filters?.role === "resolver" && filters.assignedToMe === "true" && filters.userId) {
       whereConditions.push(eq(tickets.assignedToId, filters.userId));
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

  async getStats(): Promise<{ totalTickets: number; openTickets: number; resolvedTickets: number; avgResolutionTime: number }> {
    const allTickets = await db.select().from(tickets);
    const total = allTickets.length;
    const open = allTickets.filter(t => t.status === "aberto").length;
    const resolved = allTickets.filter(t => t.status === "resolvido").length;
    
    // Mock avg time for now
    return {
      totalTickets: total,
      openTickets: open,
      resolvedTickets: resolved,
      avgResolutionTime: 24, // hours
    };
  }
}

export const storage = new DatabaseStorage();
