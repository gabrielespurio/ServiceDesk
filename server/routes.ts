import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { handleHazapiWebhook } from "./hazapiWebhook";
import { api } from "@shared/routes";
import { insertSlaPolicySchema, insertScheduleSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import passport from "passport";
import { db } from "./db";
import { aiAssistants, aiChannels, aiActions, aiKnowledgeBases, aiLogs, whatsappConnections, insertWhatsappConnectionSchema, aiCategories, aiConnections } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
) {
  app.get("/api/ping", (_req, res) => {
    console.log("PING HANDLER HIT");
    res.json({ message: "pong" });
  });
  // Setup Authentication first
  setupAuth(app);


  // === AUTH ROUTES ===
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({ ...input, password: hashedPassword });

      // Auto login after register
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        res.status(201).json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, (req, res, next) => {
    // Passport handles the login logic configured in auth.ts
    // We just need to call authenticate
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });

      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.status(200).json(req.user);
  });

  // === TICKET ROUTES ===
  app.get(api.tickets.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    // Apply filters based on query and role
    const filters = {
      status: req.query.status as string,
      priority: req.query.priority as string,
      assignedToMe: req.query.assignedToMe as string,
      unassigned: req.query.unassigned as string,
      userId: (req.user as any).id,
      role: (req.user as any).role,
      queueId: req.query.queueId ? Number(req.query.queueId) : undefined,
    };

    const tickets = await storage.getTickets(filters);
    res.json(tickets);
  });

  app.post(api.tickets.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    try {
      const input = api.tickets.create.input.parse(req.body);
      const ticket = await storage.createTicket({
        ...input,
        creatorId: (req.user as any).id,
        assignedToId: null, // Default unassigned
      });
      res.status(201).json(ticket);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.tickets.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    const ticket = await storage.getTicket(Number(req.params.id));
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Basic permissions: Admin/Resolver can see all. User can see own.
    const user = req.user as any;
    if (user.role === 'user' && ticket.creatorId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(ticket);
  });

  app.patch(api.tickets.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    const updates = api.tickets.update.input.parse(req.body);
    const ticket = await storage.updateTicket(Number(req.params.id), updates);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    res.json(ticket);
  });

  // === MESSAGE ROUTES ===
  app.get(api.messages.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    const messages = await storage.getMessages(Number(req.params.ticketId));
    // Filter internal notes if user is not resolver/admin
    const user = req.user as any;
    if (user.role === 'user') {
      const filtered = messages.filter(m => !m.isInternal);
      return res.json(filtered);
    }
    res.json(messages);
  });

  app.post(api.messages.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    const input = api.messages.create.input.parse(req.body);
    const message = await storage.createMessage({
      ...input,
      ticketId: Number(req.params.ticketId),
      userId: (req.user as any).id,
    });
    res.status(201).json(message);
  });

  // Hazapi Proxy Webhook (Debouncer & Media Handler)
  app.post("/api/webhooks/hazapi/:assistantId", handleHazapiWebhook);

  // === USER ROUTES ===
  app.get(api.users.listResolvers.path, async (req, res) => {
    const resolvers = await storage.getResolvers();
    res.json(resolvers);
  });

  app.get(api.users.stats.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post(api.users.create.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      console.log("Creating user with body:", req.body);
      const input = api.users.create.input.parse(req.body);
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) {
        return res.status(400).json({ message: "Usuário já existe" });
      }
      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      console.log("User created successfully:", user);
      res.status(201).json(user);
    } catch (err) {
      console.error("Error creating user:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.patch(api.users.update.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const id = Number(req.params.id);
      const input = api.users.update.input.parse(req.body);

      if (input.password) {
        input.password = await bcrypt.hash(input.password, 10);
      }

      const user = await storage.updateUser(id, input);
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete(api.users.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const success = await storage.deleteUser(Number(req.params.id));
    if (!success) return res.status(404).json({ message: "Usuário não encontrado" });
    res.json({ message: "Usuário excluído com sucesso" });
  });

  // === FORM ROUTES ===
  app.get(api.forms.listActive.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const activeForms = await storage.getActiveForms();
    res.json(activeForms);
  });

  app.get(api.forms.list.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const forms = await storage.getForms();
    res.json(forms);
  });

  app.post(api.forms.create.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const input = api.forms.create.input.parse(req.body);
      const form = await storage.createForm(input);
      res.status(201).json(form);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.forms.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const success = await storage.deleteForm(Number(req.params.id));
    if (!success) return res.status(404).json({ message: "Form not found" });
    res.json({ message: "Form deleted successfully" });
  });

  // === TEAM ROUTES ===
  app.get(api.teams.list.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const teams = await storage.getTeams();
    res.json(teams);
  });

  app.post(api.teams.create.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const { memberUserIds, ...teamData } = api.teams.create.input.parse(req.body);
      const team = await storage.createTeam(teamData, memberUserIds);
      res.status(201).json(team);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.teams.update.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const id = Number(req.params.id);
      const { memberUserIds, ...teamData } = api.teams.update.input.parse(req.body);
      const team = await storage.updateTeam(id, teamData, memberUserIds);
      if (!team) return res.status(404).json({ message: "Team not found" });
      res.json(team);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.teams.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const success = await storage.deleteTeam(Number(req.params.id));
    if (!success) return res.status(404).json({ message: "Team not found" });
    res.json({ message: "Team deleted successfully" });
  });

  app.get("/api/queues", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const queues = await storage.getServiceQueues();
      res.json(queues);
    } catch (err: any) {
      console.error("Error fetching queues:", err);
      res.status(500).json({
        message: "Erro ao listar filas",
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });

  app.post("/api/queues", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      console.log("Creating queue with body:", JSON.stringify(req.body));
      const { teamIds = [], userIds = [], ...queueData } = req.body;
      const queue = await storage.createServiceQueue(queueData, teamIds, userIds);
      console.log("Created queue:", JSON.stringify(queue));
      res.status(201).json(queue);
    } catch (err: any) {
      console.error("Error creating queue:", err);
      res.status(500).json({
        message: "Erro ao criar fila",
        error: err.message,
        details: err.detail || err.hint || undefined
      });
    }
  });

  app.patch("/api/queues/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const { teamIds, userIds, ...queueData } = req.body;
      const queue = await storage.updateServiceQueue(Number(req.params.id), queueData, teamIds, userIds);
      if (!queue) return res.status(404).json({ message: "Fila não encontrada" });
      res.json(queue);
    } catch (err) {
      res.status(500).json({ message: "Erro ao atualizar fila" });
    }
  });

  app.delete("/api/queues/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const success = await storage.deleteServiceQueue(Number(req.params.id));
    if (!success) return res.status(404).json({ message: "Fila não encontrada" });
    res.json({ message: "Fila excluída com sucesso" });
  });

  app.get("/api/queues/my-queues", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("my-queues: Unauthorized");
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const user = req.user as any;
      console.log(`my-queues: fetching for user ${user.username} (ID: ${user.id}, role: ${user.role})`);
      const queues = await storage.getQueuesWithStats(user.id);
      console.log(`my-queues: returning ${queues.length} queues`);
      res.json(queues);
    } catch (err: any) {
      console.error("my-queues error:", err);
      res.status(500).json({ message: "Erro ao listar minhas filas", error: err.message });
    }
  });

  // === TRIGGERS ROUTES ===
  app.get("/api/triggers", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const triggers = await storage.getTriggers();
    res.json(triggers);
  });

  app.post("/api/triggers", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const input = api.triggers.create.input.parse(req.body);
      const trigger = await storage.createTrigger(input);
      res.status(201).json(trigger);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/triggers/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const id = Number(req.params.id);
      const input = api.triggers.update.input.parse(req.body);
      const trigger = await storage.updateTrigger(id, input);
      if (!trigger) return res.status(404).json({ message: "Trigger not found" });
      res.json(trigger);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/triggers/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const success = await storage.deleteTrigger(Number(req.params.id));
    if (!success) return res.status(404).json({ message: "Trigger not found" });
    res.json({ message: "Trigger deleted successfully" });
  });

  // === SLA ROUTES ===
  app.get(api.sla.list.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const policies = await storage.getSlaPolicies();
    res.json(policies);
  });

  app.post(api.sla.create.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const input = insertSlaPolicySchema.parse(req.body);
      const policy = await storage.createSlaPolicy(input);
      res.status(201).json(policy);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.sla.update.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const id = Number(req.params.id);
      const policy = await storage.updateSlaPolicy(id, req.body);
      if (!policy) return res.status(404).json({ message: "SLA Policy not found" });
      res.json(policy);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.sla.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const success = await storage.deleteSlaPolicy(Number(req.params.id));
    if (!success) return res.status(404).json({ message: "SLA Policy not found" });
    res.json({ message: "SLA Policy deleted successfully" });
  });

  // === SCHEDULE ROUTES ===
  app.get(api.schedules.list.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const schedules = await storage.getSchedules();
    res.json(schedules);
  });

  app.post(api.schedules.create.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const input = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule(input);
      res.status(201).json(schedule);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.schedules.update.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const id = Number(req.params.id);
      const schedule = await storage.updateSchedule(id, req.body);
      if (!schedule) return res.status(404).json({ message: "Schedule not found" });
      res.json(schedule);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.schedules.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const success = await storage.deleteSchedule(Number(req.params.id));
    if (!success) return res.status(404).json({ message: "Schedule not found" });
    res.json({ message: "Schedule deleted successfully" });
  });

  // === AI ASSISTANTS ROUTES ===
  app.get("/api/ai/assistants", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const assistants = await storage.getAiAssistants();
      res.json(assistants);
    } catch (err) {
      res.status(500).json({ message: "Error fetching assistants" });
    }
  });

  app.get("/api/ai/assistants/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const assistant = await storage.getAiAssistant(Number(req.params.id));
      if (!assistant) return res.status(404).json({ message: "Assistante não encontrado" });
      res.json(assistant);
    } catch (err) {
      res.status(500).json({ message: "Error fetching assistant" });
    }
  });

  // === WHATSAPP CONNECTIONS ROUTES ===
  app.get("/api/ai/whatsapp-connections", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const connections = await db.select().from(whatsappConnections).orderBy(desc(whatsappConnections.createdAt));
      res.json(connections);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/ai/whatsapp-connections", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const validated = insertWhatsappConnectionSchema.parse(req.body);
      const [connection] = await db.insert(whatsappConnections).values({
        name: validated.name,
        provider: validated.provider,
        config: validated.config || null,
        active: true
      }).returning();
      res.status(201).json(connection);
    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/ai/whatsapp-connections/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const updates: any = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.config !== undefined) updates.config = JSON.stringify(req.body.config);
      if (req.body.active !== undefined) updates.active = req.body.active;

      const [connection] = await db.update(whatsappConnections)
        .set(updates)
        .where(eq(whatsappConnections.id, Number(req.params.id)))
        .returning();
      if (!connection) return res.status(404).json({ message: "Connection not found" });
      res.json(connection);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/ai/whatsapp-connections/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      // Find any channel instances associated with this connection and delete them
      const channelsToDelete = await db.select().from(aiChannels).where(eq(aiChannels.type, "whatsapp"));
      for (const channel of channelsToDelete) {
        try {
          const configObj = channel.config ? JSON.parse(channel.config) : null;
          if (configObj && configObj.connectionId === Number(req.params.id)) {
            await db.delete(aiChannels).where(eq(aiChannels.id, channel.id));
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      const success = await db.delete(whatsappConnections)
        .where(eq(whatsappConnections.id, Number(req.params.id)))
        .returning();
      if (!success.length) return res.status(404).json({ message: "Connection not found" });
      res.json({ message: "Connection deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/ai/channels", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const channels = await db.select().from(aiChannels);
      res.json(channels);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/ai/channels/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const channel = await db.update(aiChannels)
        .set({ config: JSON.stringify(req.body.config) })
        .where(eq(aiChannels.id, Number(req.params.id)))
        .returning();
      if (!channel.length) return res.status(404).json({ message: "Channel not found" });
      res.json(channel[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/ai/channels", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const newChannel = await db.insert(aiChannels).values({
        assistantId: Number(req.body.assistantId),
        type: req.body.type,
        config: req.body.config ? JSON.stringify(req.body.config) : null,
        active: true
      }).returning();
      res.status(201).json(newChannel[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/ai/channels/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const success = await db.delete(aiChannels)
        .where(eq(aiChannels.id, Number(req.params.id)))
        .returning();
      if (!success.length) return res.status(404).json({ message: "Channel not found" });
      res.json({ message: "Channel deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/ai/logs", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const logs = await db.select().from(aiLogs).orderBy(desc(aiLogs.createdAt)).limit(100);
      res.json(logs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/ai/stats", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const assistants = await db.select().from(aiAssistants);
      const logs = await db.select().from(aiLogs);

      const activeAssistants = assistants.filter(a => a.active).length;
      const totalAssistants = assistants.length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayLogs = logs.filter(l => new Date(l.createdAt!) >= today);
      const totalChatsToday = todayLogs.filter(l => l.actionType === 'chat_response').length;
      const totalChatsAllTime = logs.filter(l => l.actionType === 'chat_response').length;
      
      const apiErrorCount = logs.filter(l => l.status === 'error').length;

      const totalChats = logs.filter(l => l.actionType === 'chat_response').length;
      const successChats = logs.filter(l => l.actionType === 'chat_response' && l.status === 'success').length;
      const autoResolutionRate = totalChats > 0 ? Math.round((successChats / totalChats) * 100) : 100;

      const dailyVolume: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        
        const dEnd = new Date(d);
        dEnd.setDate(dEnd.getDate() + 1);

        const count = logs.filter(l => {
          const cDate = new Date(l.createdAt!);
          return cDate >= d && cDate < dEnd && l.actionType === 'chat_response';
        }).length;

        const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        dailyVolume.push({ date: formattedDate, count });
      }

      const topAssistantsMap = new Map<number, number>();
      logs.forEach(l => {
        if (l.actionType === 'chat_response') {
          topAssistantsMap.set(l.assistantId, (topAssistantsMap.get(l.assistantId) || 0) + 1);
        }
      });

      const topAssistants = Array.from(topAssistantsMap.entries()).map(([id, count]) => {
        const assistant = assistants.find(a => a.id === id);
        return {
          name: assistant ? assistant.name : `Assistente #${id}`,
          count
        };
      }).sort((a, b) => b.count - a.count).slice(0, 5);

      res.json({
        activeAssistants,
        totalAssistants,
        totalChatsToday,
        totalChatsAllTime,
        apiErrorCount,
        autoResolutionRate,
        dailyVolume,
        topAssistants
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  async function setupN8nWorkflow(assistant: any, config: any, knowledgeBase?: any[]) {
    const { webhookUrl, authToken, outputConnectionId } = config;
    if (!webhookUrl || !authToken) {
      console.log("[N8N] Missing webhookUrl or authToken, skipping workflow creation.");
      return;
    }

    try {
      const urlObj = new URL(webhookUrl);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      
      // Parse webhook path
      let webhookPath = `helpdesk-agent-${assistant.id}`;
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length >= 3) {
        webhookPath = pathParts.slice(2).join('/');
      } else if (pathParts.length === 2 && pathParts[1] !== '') {
        webhookPath = pathParts[1];
      }

      // Determine model node type and model name
      const isGemini = assistant.provider === 'gemini';
      const modelNodeType = isGemini ? '@n8n/n8n-nodes-langchain.lmChatGoogleGemini' : '@n8n/n8n-nodes-langchain.lmChatOpenAi';
      let modelName = assistant.model || (isGemini ? 'gemini-2.5-flash' : 'gpt-4o-mini');
      if (modelName === 'gpt-5-mini' || modelName === 'gpt-5-turbo') modelName = 'gpt-4o-mini';
      if (modelName === 'gpt-5') modelName = 'gpt-4o';
      const credentialType = isGemini ? 'googleGeminiSdkApi' : 'openAiApi';

      // Check if assistant has a URL knowledge base
      let hasUrl = false;
      if (knowledgeBase && Array.isArray(knowledgeBase)) {
        hasUrl = knowledgeBase.some((kb: any) => kb.type === 'url');
      } else if (assistant.id) {
        const dbKbs = await db.select().from(aiKnowledgeBases).where(eq(aiKnowledgeBases.assistantId, assistant.id));
        hasUrl = dbKbs.some(kb => kb.type === 'url');
      }

      // Fetch API Tools connected to this assistant
      let dbTools: any[] = [];
      if (assistant.id) {
        const assistantActions = await db.select().from(aiActions).where(eq(aiActions.assistantId, assistant.id));
        const apiTools = assistantActions.filter((a: any) => a.actionType === "api_tool" && a.config).map((a: any) => {
          return typeof a.config === "string" ? JSON.parse(a.config) : a.config;
        });

        for (const t of apiTools) {
          if (t.connectionId) {
            const [tConn] = await db.select().from(aiConnections).where(eq(aiConnections.id, parseInt(t.connectionId)));
            if (tConn) dbTools.push(tConn);
          }
        }
      }

      // Fetch Output Connection
      let outputNode: any = null;
      let outputNodeName = "Respond to Webhook";
      if (outputConnectionId) {
        const [outConn] = await db.select().from(aiConnections).where(eq(aiConnections.id, parseInt(outputConnectionId)));
        if (outConn) {
          let headers: Record<string, string> = {};
          try { headers = outConn.headers ? JSON.parse(outConn.headers) : {}; } catch(e) {}
          if (outConn.authType === "token" && outConn.authConfig) {
            try {
              const authCfg = JSON.parse(outConn.authConfig);
              if (authCfg.token) headers["Authorization"] = `Bearer ${authCfg.token}`;
            } catch(e) {}
          }
          headers["X-Helpdesk-Integration"] = "Active";
          
          let bodyParameters: Record<string, string> = {};
          try {
            const params = outConn.parameters ? JSON.parse(outConn.parameters) : [];
            params.forEach((p: any) => {
               bodyParameters[p.name] = p.testValue || "";
            });
          } catch(e) {}

          let sendBodyParams: any = {
             sendBody: Object.keys(bodyParameters).length > 0,
             bodyParameters: {
               parameters: Object.entries(bodyParameters).map(([name, value]) => ({ name, value }))
             }
          };

          if (outConn.bodySchema) {
            let jsonBodyStr = outConn.bodySchema;
            // Converte sintaxe nativa {{param}} ou sintaxe pré-n8n {{ $json['param'] }} para sintaxe correta
            jsonBodyStr = jsonBodyStr.replace(/\{\{\s*mensagem\s*\}\}/gi, `{{ $json['output'] }}`);
            jsonBodyStr = jsonBodyStr.replace(/\{\{\s*\$json\['mensagem'\]\s*\}\}/gi, `{{ $json['output'] }}`);
            jsonBodyStr = jsonBodyStr.replace(/\{\{\s*\$json\["mensagem"\]\s*\}\}/gi, `{{ $json['output'] }}`);
            
            // A proxy limpa o webhook, então podemos usar um json bem mais simples
            const n8nPhoneExpr = `{{ $('Webhook').first().json.body?.telefone || $('Webhook').first().json.telefone || '' }}`;
            jsonBodyStr = jsonBodyStr.replace(/\{\{\s*telefone\s*\}\}/gi, n8nPhoneExpr);
            jsonBodyStr = jsonBodyStr.replace(/\{\{\s*\$json\['telefone'\]\s*\}\}/gi, n8nPhoneExpr);
            jsonBodyStr = jsonBodyStr.replace(/\{\{\s*\$json\["telefone"\]\s*\}\}/gi, n8nPhoneExpr);
            
            // Tratamento genérico apenas para os restantes
            jsonBodyStr = jsonBodyStr.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, param) => {
              if (param.toLowerCase() === 'mensagem' || param.toLowerCase() === 'telefone') return match;
              return `{{ $json['${param}'] }}`;
            });
            
            sendBodyParams = {
              sendBody: true,
              specifyBody: "json",
              jsonBody: jsonBodyStr.includes('{{') && !jsonBodyStr.startsWith('=') ? `=${jsonBodyStr}` : jsonBodyStr
            };
          }

          outputNodeName = `Enviar para ${outConn.name.substring(0, 10)}`;
          
          outputNode = {
            parameters: {
              method: outConn.method,
              url: outConn.url,
              sendHeaders: Object.keys(headers).length > 0,
              headerParameters: {
                parameters: Object.entries(headers).map(([name, value]) => ({ name, value }))
              },
              ...sendBodyParams,
              options: {}
            },
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.1,
            position: [720, 300],
            id: "output-node",
            name: outputNodeName
          };
        }
      }

      if (!outputNode) {
        outputNode = {
          parameters: {
            respondWith: "allIncomingData",
            options: {}
          },
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [720, 300],
          id: "respond-node",
          name: outputNodeName
        };
      }

      // Construct nodes
      const nodes: any[] = [
        {
          parameters: {
            httpMethod: "POST",
            path: webhookPath,
            responseMode: "onReceived",
            options: {}
          },
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [250, 300],
          id: "webhook-node",
          name: "Webhook"
        },
        {
          parameters: {
            text: "={{ JSON.stringify($json) }}",
            options: {
              systemMessage: `Nome do Agente: ${assistant.name}\nObjetivo: ${assistant.objective || ''}\nPersonalidade: ${assistant.personality || ''}`
            }
          },
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 1,
          position: [480, 300],
          id: "agent-node",
          name: "AI Agent"
        },
        {
          parameters: {
            modelName: modelName,
            options: {}
          },
          type: modelNodeType,
          typeVersion: 1,
          position: [480, 480],
          id: "model-node",
          name: isGemini ? "Google Gemini Chat Model" : "OpenAI Chat Model",
          credentials: {
            [credentialType]: {
              id: "",
              name: isGemini ? "Google Gemini API" : "OpenAI API"
            }
          }
        },
        outputNode
      ];

      const connections: any = {
        "Webhook": {
          "main": [
            [
              {
                "node": "AI Agent",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "AI Agent": {
          "main": [
            [
              {
                "node": outputNodeName,
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        [isGemini ? "Google Gemini Chat Model" : "OpenAI Chat Model"]: {
          "ai_languageModel": [
            [
              {
                "node": "AI Agent",
                "type": "ai_languageModel",
                "index": 0
              }
            ]
          ]
        }
      };

      if (hasUrl) {
        nodes.push({
          parameters: {},
          type: "@n8n/n8n-nodes-langchain.toolHttpRequest",
          typeVersion: 1,
          position: [480, 650],
          id: "http-tool",
          name: "Ler Pagina Web"
        });

        connections["Ler Pagina Web"] = {
          "ai_tool": [
            [
              {
                "node": "AI Agent",
                "type": "ai_tool",
                "index": 0
              }
            ]
          ]
        };
      }

      dbTools.forEach((tConn, idx) => {
        const tName = `Tool ${tConn.name.replace(/[^a-zA-Z0-9_-]/g, "")}`;
        
        let tHeaders: Record<string, string> = {};
        try { tHeaders = tConn.headers ? JSON.parse(tConn.headers) : {}; } catch(e) {}
        if (tConn.authType === "token" && tConn.authConfig) {
          try {
            const authCfg = JSON.parse(tConn.authConfig);
            if (authCfg.token) tHeaders["Authorization"] = `Bearer ${authCfg.token}`;
          } catch(e) {}
        }
        
        nodes.push({
          parameters: {
            name: tName.replace(/\s+/g, '_').substring(0, 30),
            description: tConn.description || `Permite consultar informações sobre ${tConn.name}`,
            toolDescription: tConn.description || `Permite consultar informações sobre ${tConn.name}`,
            method: tConn.method,
            url: tConn.url,
            sendHeaders: Object.keys(tHeaders).length > 0,
            headerParameters: {
              parameters: Object.entries(tHeaders).map(([name, value]) => ({ name, value }))
            }
          },
          type: "@n8n/n8n-nodes-langchain.toolHttpRequest",
          typeVersion: 1,
          position: [480, 750 + (idx * 100)],
          id: `http-tool-conn-${idx}`,
          name: tName.substring(0, 30)
        });

        if (!connections[tName.substring(0, 30)]) {
          connections[tName.substring(0, 30)] = {
            "ai_tool": [
              [
                {
                  "node": "AI Agent",
                  "type": "ai_tool",
                  "index": 0
                }
              ]
            ]
          };
        }
      });

      const workflowName = `[HelpDesk] Agente: ${assistant.name}`;
      const workflowData = {
        name: workflowName,
        nodes,
        connections,
        settings: {}
      };

      let existingId = config.workflowId; // Usa o ID salvo se existir
      
      if (!existingId) {
        // Fallback para buscar pelo nome
        console.log(`[N8N] Checking for existing workflows by name...`);
        const getResponse = await fetch(`${baseUrl}/api/v1/workflows`, {
          method: "GET",
          headers: {
            "X-N8N-API-KEY": authToken,
            "Accept": "application/json"
          }
        });
        
        if (getResponse.ok) {
          const data = await getResponse.json() as any;
          const workflows = data.data || [];
          const existing = workflows.find((w: any) => w.name === workflowName);
          if (existing) {
            existingId = existing.id;
          }
        }
      }

      let response;
      if (existingId) {
        console.log(`[N8N] Updating existing workflow ${existingId} at ${baseUrl}/api/v1/workflows/${existingId}`);
        response = await fetch(`${baseUrl}/api/v1/workflows/${existingId}`, {
          method: "PUT",
          headers: {
            "X-N8N-API-KEY": authToken,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(workflowData)
        });
      } else {
        console.log(`[N8N] Creating new workflow at ${baseUrl}/api/v1/workflows`);
        response = await fetch(`${baseUrl}/api/v1/workflows`, {
          method: "POST",
          headers: {
            "X-N8N-API-KEY": authToken,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(workflowData)
        });
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[N8N] API Error response: ${errText}`);
        throw new Error(`n8n API returned status ${response.status}: ${errText}`);
      }

      const resData = await response.json() as any;
      console.log(`[N8N] Workflow successfully ${existingId ? 'updated' : 'created'} in n8n! ID: ${resData.id}`);
      
      // Ativar o workflow
      try {
        console.log(`[N8N] Activating workflow ${resData.id}...`);
        await fetch(`${baseUrl}/api/v1/workflows/${resData.id}/activate`, {
          method: "POST",
          headers: {
            "X-N8N-API-KEY": authToken
          }
        });
      } catch (actErr) {
        console.error(`[N8N] Failed to activate workflow ${resData.id}:`, actErr);
      }
      
      return resData;
    } catch (error: any) {
      console.error("[N8N] Error creating workflow in n8n:", error.message);
      if (assistant.id) {
        try {
          await db.insert(aiLogs).values({
            assistantId: assistant.id,
            actionType: "n8n_execution",
            status: "error",
            details: { error: error.message, action: "create_workflow" }
          });
        } catch (logError) {
          console.error("Failed to write error log", logError);
        }
      }
      throw error;
    }
  }

  app.get("/api/ai/categories", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const categories = await db.select().from(aiCategories);
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/ai/categories", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: "Nome é obrigatório" });
      const [newCategory] = await db.insert(aiCategories).values({ name }).returning();
      res.status(201).json(newCategory);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- AI Connections (Ferramentas Globais) ---
  app.get("/api/ai/connections", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const connections = await db.select().from(aiConnections).orderBy(desc(aiConnections.id));
      res.json(connections);
    } catch (error) {
      console.error("Error fetching AI connections:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  async function resolveAuthHeaders(authType: string, authConfig: any): Promise<Record<string, string>> {
    const headers: Record<string, string> = { "Accept": "application/json" };
    if (!authType || authType === "none") return headers;

    if (authType === "token" && authConfig?.token) {
      headers["Authorization"] = authConfig.token.startsWith("Bearer") ? authConfig.token : `Bearer ${authConfig.token}`;
    } else if (authType === "basic" && authConfig?.user && authConfig?.pass) {
      headers["Authorization"] = `Basic ${Buffer.from(`${authConfig.user}:${authConfig.pass}`).toString('base64')}`;
    } else if (authType === "oauth2_password" && authConfig?.tokenUrl && authConfig?.user && authConfig?.pass) {
      try {
        const body = new URLSearchParams();
        body.append("grant_type", "password");
        body.append("username", authConfig.user);
        body.append("password", authConfig.pass);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const res = await fetch(authConfig.tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          if (data.access_token) {
            headers["Authorization"] = `Bearer ${data.access_token}`;
          }
        } else {
          console.error("Falha ao obter token oauth2_password. Status:", res.status);
        }
      } catch (err) {
        console.error("Erro ao resolver oauth2_password:", err);
      }
    }
    return headers;
  }

  app.post("/api/ai/connections/test", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const { url, method, authType, authConfig, headers, parameters, bodySchema } = req.body;
      
      if (!url) return res.status(400).json({ message: "URL inválida" });

      const reqHeaders = await resolveAuthHeaders(authType, authConfig);

      let testUrl = url;
      let body = undefined;

      if (method === "POST" || method === "PUT" || method === "PATCH") {
        reqHeaders["Content-Type"] = "application/json";
        
        const dummyPayload: any = {};
        if (parameters && parameters.length > 0) {
          for (const p of parameters) {
             dummyPayload[p.name] = p.testValue !== undefined && p.testValue !== "" 
                ? (p.type === "number" ? Number(p.testValue) : p.testValue) 
                : (p.type === "number" ? 123 : p.type === "boolean" ? true : "teste");
          }
        }

        if (bodySchema) {
          let customBody = bodySchema;
          for (const key in dummyPayload) {
            const val = dummyPayload[key];
            if (val !== undefined) {
              const exactMatchRegex = new RegExp(`"\\{\\{\\s*${key}\\s*\\}\\}"`, 'g');
              if (customBody.match(exactMatchRegex)) {
                 customBody = customBody.replace(exactMatchRegex, JSON.stringify(val));
              }
              const partialMatchRegex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
              const escapedVal = String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
              customBody = customBody.replace(partialMatchRegex, escapedVal);
            }
          }
          body = customBody;
        } else if (Object.keys(dummyPayload).length > 0) {
          body = JSON.stringify(dummyPayload);
        }
      } else {
        if (parameters && parameters.length > 0) {
          try {
            const urlObj = new URL(testUrl);
            for (const p of parameters) {
              urlObj.searchParams.append(p.name, p.testValue !== undefined && p.testValue !== "" 
                ? String(p.testValue) 
                : (p.type === "number" ? "123" : p.type === "boolean" ? "true" : "teste"));
            }
            testUrl = urlObj.toString();
          } catch(e) {
            console.error("Invalid URL format for testUrl:", testUrl);
          }
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const fetchRes = await fetch(testUrl, {
        method: method || "GET",
        headers: reqHeaders,
        body,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      let resBody;
      const textResponse = await fetchRes.text();
      try {
        resBody = JSON.parse(textResponse);
      } catch(e) {
        resBody = textResponse;
      }

      res.json({
        status: fetchRes.status,
        ok: fetchRes.ok,
        body: resBody
      });
    } catch (error: any) {
      console.error("Error testing AI connection:", error);
      res.status(500).json({ message: error.message || "Erro ao tentar conectar com a API." });
    }
  });

  app.post("/api/ai/connections", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const { name, description, type, url, method, authType, authConfig, headers, parameters, bodySchema } = req.body;
      const [newConn] = await db.insert(aiConnections).values({
        name, description, type, url, method, authType, 
        authConfig: authConfig ? JSON.stringify(authConfig) : null,
        headers: headers ? JSON.stringify(headers) : null,
        parameters: parameters ? JSON.stringify(parameters) : null,
        bodySchema: bodySchema ? bodySchema : null
      }).returning();
      res.status(201).json(newConn);
    } catch (error) {
      console.error("Error creating AI connection:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/ai/connections/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      const { name, description, type, url, method, authType, authConfig, headers, parameters, bodySchema } = req.body;
      const [updatedConn] = await db.update(aiConnections).set({
        name, description, type, url, method, authType, 
        authConfig: authConfig ? JSON.stringify(authConfig) : null,
        headers: headers ? JSON.stringify(headers) : null,
        parameters: parameters ? JSON.stringify(parameters) : null,
        bodySchema: bodySchema ? bodySchema : null,
        updatedAt: new Date()
      }).where(eq(aiConnections.id, id)).returning();
      if (!updatedConn) return res.status(404).json({ message: "Connection not found" });
      res.json(updatedConn);
    } catch (error) {
      console.error("Error updating AI connection:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/ai/connections/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      await db.delete(aiConnections).where(eq(aiConnections.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting AI connection:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/ai/assistants", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const { channels, actions, knowledgeBase, scope, categoryId, ...assistantData } = req.body;
      const assistant = await storage.createAiAssistant({
        ...assistantData,
        scope: scope || "external",
        categoryId: categoryId ? parseInt(categoryId, 10) : null
      });
      
      // Save relations if they exist
      if (channels && channels.length > 0) {
        await db.insert(aiChannels).values(channels.map((c: any) => {
          if (typeof c === 'string') {
            return {
              assistantId: assistant.id,
              type: c,
              active: true
            };
          }
          return {
            assistantId: assistant.id,
            type: c.type,
            config: c.config ? JSON.stringify(c.config) : null,
            active: true
          };
        }));
      }
      if (actions && actions.length > 0) {
        await db.insert(aiActions).values(actions.map((a: any) => {
          if (typeof a === 'string') {
            return {
              assistantId: assistant.id,
              actionType: a,
              active: true
            };
          }
          return {
            assistantId: assistant.id,
            actionType: a.type,
            config: a.config ? JSON.stringify(a.config) : null,
            active: true
          };
        }));

        // Trigger automatic n8n workflow creation if selected
        const n8nAction = actions.find((a: any) => a === 'n8n' || (a && a.type === 'n8n'));
        if (n8nAction && typeof n8nAction === 'object' && n8nAction.config) {
          try {
            const resData = await setupN8nWorkflow(assistant, n8nAction.config, knowledgeBase);
            if (resData && resData.id) {
              n8nAction.config.workflowId = resData.id;
              await db.update(aiActions).set({ config: JSON.stringify(n8nAction.config) })
                .where(and(eq(aiActions.assistantId, assistant.id), eq(aiActions.type, 'n8n')));
            }
          } catch (e) {
            console.error("Non-fatal: Failed to automatically setup n8n workflow", e);
          }
        }
      }
      if (knowledgeBase && knowledgeBase.length > 0) {
        await db.insert(aiKnowledgeBases).values(knowledgeBase.map((kb: any) => ({
          assistantId: assistant.id,
          type: kb.type,
          content: kb.content,
          authType: kb.authType || "none",
          token: kb.token || null,
          user: kb.user || null,
          pass: kb.pass || null,
          status: 'ready'
        })));
      }

      res.status(201).json(assistant);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/ai/assistants/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const assistantId = Number(req.params.id);
      const { channels, actions, knowledgeBase, ...assistantData } = req.body;
      
      const assistant = await storage.updateAiAssistant(assistantId, assistantData);
      if (!assistant) return res.status(404).json({ message: "Assistente não encontrado" });

      // Update channels relation if provided
      if (channels !== undefined) {
        await db.delete(aiChannels).where(eq(aiChannels.assistantId, assistantId));
        if (channels.length > 0) {
          await db.insert(aiChannels).values(channels.map((c: any) => {
            if (typeof c === 'string') {
              return {
                assistantId,
                type: c,
                active: true
              };
            }
            return {
              assistantId,
              type: c.type,
              config: c.config ? JSON.stringify(c.config) : null,
              active: true
            };
          }));
        }
      }

      // Update actions relation if provided
      if (actions !== undefined) {
        await db.delete(aiActions).where(eq(aiActions.assistantId, assistantId));
        if (actions.length > 0) {
          await db.insert(aiActions).values(actions.map((a: any) => {
            if (typeof a === 'string') {
              return {
                assistantId,
                actionType: a,
                active: true
              };
            }
            return {
              assistantId: assistant.id,
              actionType: a.type,
              config: a.config ? JSON.stringify(a.config) : null,
              active: true
            };
          }));

          // Trigger automatic n8n workflow creation/update if selected
          const n8nAction = actions.find((a: any) => a === 'n8n' || (a && a.type === 'n8n'));
          if (n8nAction && typeof n8nAction === 'object' && n8nAction.config) {
            try {
              const resData = await setupN8nWorkflow(assistant, n8nAction.config, knowledgeBase);
              if (resData && resData.id) {
                n8nAction.config.workflowId = resData.id;
                await db.update(aiActions).set({ config: JSON.stringify(n8nAction.config) })
                  .where(and(eq(aiActions.assistantId, assistant.id), eq(aiActions.type, 'n8n')));
              }
            } catch (e) {
              console.error("Non-fatal: Failed to automatically setup n8n workflow during update", e);
            }
          }
        }
      }

      res.json(assistant);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/ai/assistants/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const success = await storage.deleteAiAssistant(Number(req.params.id));
      if (!success) return res.status(404).json({ message: "Assistente não encontrado" });
      res.json({ message: "Assistente excluído com sucesso" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  async function executeApiTool(toolName: string, args: any, toolsConfig: any[]) {
    const tool = toolsConfig.find(t => t.name === toolName);
    if (!tool) return { error: `Tool ${toolName} not found` };
    try {
      let url = tool.endpoint;
      const headers = await resolveAuthHeaders(tool.authType, { token: tool.token, user: tool.user, pass: tool.pass, tokenUrl: tool.tokenUrl });
      
      const processedArgs = { ...args };

      if (tool.parameters) {
        for (const p of tool.parameters) {
          if (processedArgs[p.name] === undefined && p.testValue !== undefined && p.testValue !== "") {
            processedArgs[p.name] = p.type === "number" ? Number(p.testValue) : p.type === "boolean" ? (p.testValue === "true") : p.testValue;
          }
        }
      }

      // Replaces path variables like {id} or :id in the URL
      for (const key in processedArgs) {
        if (processedArgs[key] !== undefined) {
          const val = String(processedArgs[key]);
          // Replaces {key}
          const bracketRegex = new RegExp(`\\{${key}\\}`, "g");
          // Replaces :key (followed by / or end of string)
          const colonRegex = new RegExp(`:${key}(?=\\/|$)`, "g");
          
          if (url.match(bracketRegex) || url.match(colonRegex)) {
            url = url.replace(bracketRegex, val).replace(colonRegex, val);
            processedArgs[key] = undefined; // Mark as used
          }
        }
      }

      // Filter out undefined args
      const finalArgs: any = {};
      for (const key in processedArgs) {
        if (processedArgs[key] !== undefined) finalArgs[key] = processedArgs[key];
      }

      let body = undefined;
      const method = (tool.method || "GET").toUpperCase();
      if (method === "POST" || method === "PUT" || method === "PATCH") {
        headers["Content-Type"] = "application/json";
        if (tool.bodySchema) {
          let customBody = tool.bodySchema;
          for (const key in finalArgs) {
            const val = finalArgs[key];
            if (val !== undefined) {
              const exactMatchRegex = new RegExp(`"\\{\\{\\s*${key}\\s*\\}\\}"`, 'g');
              if (customBody.match(exactMatchRegex)) {
                 customBody = customBody.replace(exactMatchRegex, JSON.stringify(val));
              }
              const partialMatchRegex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
              const escapedVal = String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
              customBody = customBody.replace(partialMatchRegex, escapedVal);
            }
          }
          body = customBody;
        } else {
          body = JSON.stringify(finalArgs);
        }
      } else {
        const urlObj = new URL(url);
        for (const key in finalArgs) {
          urlObj.searchParams.append(key, String(finalArgs[key]));
        }
        url = urlObj.toString();
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { method, headers, body, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return { error: `API returned status ${res.status}` };
      const text = await res.text();
      try { return JSON.parse(text); } catch { return { response: text.substring(0, 500) }; }
    } catch (err: any) { return { error: err.message }; }
  }

  app.post("/api/ai/assistants/:id/chat", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const assistant = await storage.getAiAssistant(Number(req.params.id));
      if (!assistant) return res.status(404).json({ message: "Assistente não encontrado" });

      if (!assistant.apiKey) {
        return res.status(400).json({ message: "API Key não configurada. Configure a API Key nas configurações do assistente." });
      }

      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Conversa inválida" });
      }

      let aiResponseText = "";
      let tokens = 0;
      
      const apiToolsAction = (assistant as any).actions?.filter((a: any) => a.actionType === "api_tool" && a.config) || [];
      const parsedApiTools = [];
      for (const a of apiToolsAction) {
        let config = a.config;
        if (typeof config === "string") config = JSON.parse(config);
        
        if (config.connectionId) {
          const globalConn = await db.select().from(aiConnections).where(eq(aiConnections.id, config.connectionId)).limit(1);
          if (globalConn.length > 0) {
            const conn = globalConn[0];
            const authCfg = conn.authConfig ? JSON.parse(conn.authConfig) : {};
            parsedApiTools.push({
              name: conn.name.replace(/[^a-zA-Z0-9_-]/g, ""),
              description: conn.description || `Chamada para API ${conn.name}`,
              endpoint: conn.url,
              method: conn.method,
              authType: conn.authType,
              token: authCfg.token,
              user: authCfg.user,
              pass: authCfg.pass,
              tokenUrl: authCfg.tokenUrl,
              bodySchema: conn.bodySchema,
              parameters: conn.parameters ? JSON.parse(conn.parameters) : []
            });
          }
        } else {
          parsedApiTools.push(config);
        }
      }

      // --- DYNAMIC RAG CONTEXT (API FETCHING) ---
      let apiContextText = "";
      if (Array.isArray((assistant as any).knowledgeBases)) {
        for (const kb of (assistant as any).knowledgeBases as any[]) {
          if (kb.type === "api" && kb.content) {
            try {
              const headers: Record<string, string> = {
                "Accept": "application/json"
              };
              if (kb.authType === "token" && kb.token) {
                headers["Authorization"] = kb.token.startsWith("Bearer") ? kb.token : `Bearer ${kb.token}`;
              } else if (kb.authType === "basic" && kb.user && kb.pass) {
                const b64 = Buffer.from(`${kb.user}:${kb.pass}`).toString('base64');
                headers["Authorization"] = `Basic ${b64}`;
              }

              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

              const res = await fetch(kb.content, { headers, signal: controller.signal });
              clearTimeout(timeoutId);

              if (res.ok) {
                try {
                  const json = await res.json();
                  apiContextText += `\n\n--- DADOS EM TEMPO REAL DA API (${kb.content}) ---\n${JSON.stringify(json)}\n---\n`;
                } catch (e) {
                  console.warn(`[AI RAG] A API (${kb.content}) não retornou JSON válido. Retorno ignorado.`);
                }
              } else {
                console.warn(`[AI RAG] Failed to fetch KB API ${kb.content}: ${res.status}`);
              }
            } catch (err: any) {
              console.warn(`[AI RAG] Error fetching KB API ${kb.content}: ${err.message}`);
            }
          }
        }
      }

      const systemInstruction = `Nome do Assistente: ${assistant.name}\nObjetivo: ${assistant.objective || ""}\nPersonalidade: ${assistant.personality || ""}${apiContextText}`;

      if (assistant.provider === "gemini") {
        const geminiModel = assistant.model || "gemini-2.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${assistant.apiKey}`;
        
        // Map messages: client uses { role: 'user'|'assistant', text: string, file?: ... }
        // Gemini expects role: 'user'|'model'
        const contents = messages.map((m: any) => {
          const parts: any[] = [];
          if (m.file && m.file.dataBase64 && m.file.mimeType) {
            parts.push({
              inlineData: {
                mimeType: m.file.mimeType,
                data: m.file.dataBase64
              }
            });
          }
          parts.push({ text: m.text || "" });
          return {
            role: m.role === "assistant" ? "model" : "user",
            parts
          };
        });

        // systemInstruction já foi definido globalmente acima

        const tools = parsedApiTools.length > 0 ? [{
          functionDeclarations: parsedApiTools.map((t: any) => {
            const hasParams = t.parameters && t.parameters.length > 0;
            const requiredParams = (t.parameters || [])
              .filter((p: any) => p.required !== false && !p.testValue)
              .map((p: any) => p.name);
            
            const decl: any = {
              name: t.name,
              description: t.description
            };
            
            if (hasParams) {
              decl.parameters = {
                type: "OBJECT",
                properties: (t.parameters || []).reduce((acc: any, p: any) => {
                  acc[p.name] = { 
                    type: p.type === 'number' ? 'NUMBER' : p.type === 'boolean' ? 'BOOLEAN' : 'STRING', 
                    description: p.description + (p.testValue ? ` (Atenção: Sistema injetará '${p.testValue}' por padrão se não for especificado. Não pergunte ao usuário a menos que necessário)` : "") 
                  };
                  return acc;
                }, {}),
                ...(requiredParams.length > 0 ? { required: requiredParams } : {})
              };
            } else {
              decl.parameters = { type: "OBJECT", properties: {} };
            }
            return decl;
          })
        }] : undefined;

        tokens = 0;
        const apiResponse = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            tools
          })
        });

        if (!apiResponse.ok) {
          const errText = await apiResponse.text();
          console.error("Gemini API Error:", errText);
          
          if (assistant.enableLogs) {
            await db.insert(aiLogs).values({
              assistantId: assistant.id,
              actionType: "chat_response",
              status: "error",
              details: { error: errText, model: geminiModel }
            });
          }
          
          let errorMsg = apiResponse.statusText;
          if (apiResponse.status === 503) errorMsg = "Serviço Indisponível temporariamente";
          if (apiResponse.status === 429) errorMsg = "Limite de requisições excedido";
          if (apiResponse.status === 400) errorMsg = "Requisição inválida (verifique as ferramentas)";
          
          return res.status(502).json({ message: `Erro da API Gemini: ${errorMsg}` });
        }

        const data = await apiResponse.json() as any;
        
        let functionCall = data.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
        
        if (functionCall) {
          console.log(`[Gemini] Executing Tool: ${functionCall.name}`, functionCall.args);
          const result = await executeApiTool(functionCall.name, functionCall.args, parsedApiTools);
          contents.push(data.candidates[0].content);
          contents.push({
            role: "user",
            parts: [{ functionResponse: { name: functionCall.name, response: { result } } }]
          });
          const apiResponse2 = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: systemInstruction }] }, tools })
          });
          
          if (!apiResponse2.ok) {
            const errText2 = await apiResponse2.text();
            console.error("Gemini API Error (Tool Response):", errText2);
            let errorMsg = apiResponse2.statusText;
            if (apiResponse2.status === 503) errorMsg = "Serviço Indisponível temporariamente";
            if (apiResponse2.status === 429) errorMsg = "Limite de requisições excedido";
            if (apiResponse2.status === 400) errorMsg = "Requisição inválida (verifique as ferramentas)";
            return res.status(502).json({ message: `Erro da API Gemini: ${errorMsg}` });
          }

          const data2 = await apiResponse2.json() as any;
          aiResponseText = data2.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta da IA.";
          tokens = (data.usageMetadata?.totalTokenCount || 0) + (data2.usageMetadata?.totalTokenCount || 0);
        } else {
          aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta da IA.";
          tokens = data.usageMetadata?.totalTokenCount || 0;
        }

        if (assistant.enableLogs) {
          const lastMsg = messages[messages.length - 1];
          const fileMeta = lastMsg?.file ? { name: lastMsg.file.name, mimeType: lastMsg.file.mimeType } : undefined;
          await db.insert(aiLogs).values({
            assistantId: assistant.id,
            actionType: "chat_response",
            status: "success",
            details: { 
              model: geminiModel, 
              prompt: lastMsg?.text, 
              file: fileMeta,
              response: aiResponseText,
              tokens: tokens
            }
          });
        }
      } else if (assistant.provider === "openai" || !assistant.provider) {
        // OpenAI
        let openAiModel = assistant.model || "gpt-4o-mini";
        if (openAiModel === 'gpt-5-mini' || openAiModel === 'gpt-5-turbo') openAiModel = 'gpt-4o-mini';
        if (openAiModel === 'gpt-5') openAiModel = 'gpt-4o';
        const url = "https://api.openai.com/v1/chat/completions";
        
        // systemInstruction já foi definido globalmente acima
        
        const tools = parsedApiTools.length > 0 ? parsedApiTools.map((t: any) => {
          const hasParams = t.parameters && t.parameters.length > 0;
          const requiredParams = (t.parameters || [])
            .filter((p: any) => p.required !== false && !p.testValue)
            .map((p: any) => p.name);

          const decl: any = {
            type: "function",
            function: {
              name: t.name,
              description: t.description
            }
          };

          if (hasParams) {
            decl.function.parameters = {
              type: "object",
              properties: (t.parameters || []).reduce((acc: any, p: any) => {
                acc[p.name] = { 
                  type: p.type, 
                  description: p.description + (p.testValue ? ` (Valor padrão: ${p.testValue})` : "") 
                };
                return acc;
              }, {}),
              required: requiredParams
            };
          } else {
            decl.function.parameters = { type: "object", properties: {} };
          }
          
          return decl;
        }) : undefined;

        const messagesArray: any[] = [{ role: "system", content: systemInstruction }];
        for (const m of messages) {
          const role = m.role === "assistant" ? "assistant" : "user";
          let messageText = m.text || "";
          let contentArray: any = null;

          if (m.file && m.file.dataBase64 && m.file.mimeType) {
            if (m.file.mimeType.startsWith("image/")) {
              contentArray = [
                { type: "text", text: messageText },
                { type: "image_url", image_url: { url: `data:${m.file.mimeType};base64,${m.file.dataBase64}` } }
              ];
            } else if (m.file.mimeType.startsWith("audio/")) {
              try {
                const buffer = Buffer.from(m.file.dataBase64, 'base64');
                const blob = new Blob([buffer], { type: m.file.mimeType });
                const formData = new FormData();
                let ext = m.file.mimeType.includes("ogg") ? "ogg" : m.file.mimeType.includes("mp3") ? "mp3" : "wav";
                formData.append("file", blob, `audio.${ext}`);
                formData.append("model", "whisper-1");
                
                console.log("[OpenAI] Transcribing audio...");
                const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${assistant.apiKey}` },
                  body: formData as any
                });
                
                if (whisperRes.ok) {
                  const whisperData = await whisperRes.json() as any;
                  messageText = (messageText ? messageText + "\n" : "") + `[Áudio Transcrito]: ${whisperData.text}`;
                } else {
                  console.error("[OpenAI] Whisper API Error:", await whisperRes.text());
                  messageText = (messageText ? messageText + "\n" : "") + `[Falha ao transcrever o áudio do usuário]`;
                }
              } catch (e) {
                console.error("[OpenAI] Whisper Transcription Error:", e);
              }
            }
          }
          
          if (contentArray) {
            messagesArray.push({ role, content: contentArray });
          } else {
            messagesArray.push({ role, content: messageText });
          }
        }

        tokens = 0;
        const apiResponse = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${assistant.apiKey}` },
          body: JSON.stringify({ model: openAiModel, messages: messagesArray, tools })
        });

        if (!apiResponse.ok) {
          const errText = await apiResponse.text();
          console.error("OpenAI API Error:", errText);
          if (assistant.enableLogs) {
            await db.insert(aiLogs).values({ assistantId: assistant.id, actionType: "chat_response", status: "error", details: { error: errText, model: openAiModel } });
          }
          let errorMsg = apiResponse.statusText;
          if (apiResponse.status === 503) errorMsg = "Serviço Indisponível temporariamente";
          if (apiResponse.status === 429) errorMsg = "Limite de requisições excedido";
          if (apiResponse.status === 401) errorMsg = "Chave de API inválida";
          
          return res.status(502).json({ message: `Erro da API OpenAI: ${errorMsg}` });
        }

        const data = await apiResponse.json() as any;
        const responseMessage = data.choices[0].message;

        if (responseMessage.tool_calls) {
          console.log(`[OpenAI] Executing Tool Calls:`, responseMessage.tool_calls);
          messagesArray.push(responseMessage);
          for (const tc of responseMessage.tool_calls) {
            const args = JSON.parse(tc.function.arguments);
            const result = await executeApiTool(tc.function.name, args, parsedApiTools);
            messagesArray.push({
              role: "tool",
              tool_call_id: tc.id,
              name: tc.function.name,
              content: JSON.stringify(result)
            });
          }
          const apiResponse2 = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${assistant.apiKey}` },
            body: JSON.stringify({ model: openAiModel, messages: messagesArray, tools })
          });
          const data2 = await apiResponse2.json() as any;
          aiResponseText = data2.choices[0].message.content || "Sem resposta da IA.";
          tokens = (data.usage?.total_tokens || 0) + (data2.usage?.total_tokens || 0);
        } else {
          aiResponseText = responseMessage.content || "Sem resposta da IA.";
          tokens = data.usage?.total_tokens || 0;
        }

        if (assistant.enableLogs) {
          const lastMsg = messages[messages.length - 1];
          const fileMeta = lastMsg?.file ? { name: lastMsg.file.name, mimeType: lastMsg.file.mimeType } : undefined;
          await db.insert(aiLogs).values({
            assistantId: assistant.id,
            actionType: "chat_response",
            status: "success",
            details: { 
              model: openAiModel, 
              prompt: lastMsg?.text, 
              file: fileMeta,
              response: aiResponseText,
              tokens: tokens
            }
          });
        }
      } else if (assistant.provider === "anthropic") {
        // Anthropic Claude
        const claudeModel = assistant.model || "claude-3-5-sonnet-20240620";
        const url = "https://api.anthropic.com/v1/messages";
        
        // systemInstruction já foi definido globalmente acima
        
        const formattedMessages = messages.map((m: any) => {
          const role = m.role === "assistant" ? "assistant" : "user";
          if (m.file && m.file.dataBase64 && m.file.mimeType && m.file.mimeType.startsWith("image/")) {
            return {
              role,
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: m.file.mimeType,
                    data: m.file.dataBase64
                  }
                },
                { type: "text", text: m.text || "" }
              ]
            };
          }
          return { role, content: m.text || "" };
        });

        const apiResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": assistant.apiKey || "",
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: claudeModel,
            max_tokens: 1024,
            system: systemInstruction,
            messages: formattedMessages
          })
        });

        if (!apiResponse.ok) {
          const errText = await apiResponse.text();
          console.error("Anthropic API Error:", errText);
          
          if (assistant.enableLogs) {
            await db.insert(aiLogs).values({
              assistantId: assistant.id,
              actionType: "chat_response",
              status: "error",
              details: { error: errText, model: claudeModel }
            });
          }
          return res.status(502).json({ message: `Erro da API Anthropic: ${apiResponse.statusText}` });
        }

        const data = await apiResponse.json() as any;
        aiResponseText = data.content?.[0]?.text || "Sem resposta da IA.";
        tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

        if (assistant.enableLogs) {
          const lastMsg = messages[messages.length - 1];
          const fileMeta = lastMsg?.file ? { name: lastMsg.file.name, mimeType: lastMsg.file.mimeType } : undefined;
          await db.insert(aiLogs).values({
            assistantId: assistant.id,
            actionType: "chat_response",
            status: "success",
            details: { 
              model: claudeModel, 
              prompt: lastMsg?.text, 
              file: fileMeta,
              response: aiResponseText,
              tokens: tokens
            }
          });
        }
      }

      res.json({ text: aiResponseText });
    } catch (err: any) {
      console.error("Chat error:", err);
      res.status(500).json({ message: err.message || "Internal server error", stack: err.stack });
    }
  });

  // Seed Data if empty
  const users = await storage.getResolvers(); // Just a quick check
  if (users.length === 0) {
    const hashedPassword = await bcrypt.hash("password123", 10);

    await storage.createUser({
      username: "admin",
      password: hashedPassword,
      fullName: "System Admin",
      email: "admin@example.com",
      role: "admin"
    });

    await storage.createUser({
      username: "support",
      password: hashedPassword,
      fullName: "Support Agent",
      email: "support@example.com",
      role: "resolver"
    });

    const user1 = await storage.createUser({
      username: "user",
      password: hashedPassword,
      fullName: "John Doe",
      email: "john@example.com",
      role: "user"
    });

    // Create a sample ticket
    await storage.createTicket({
      title: "Não consigo acessar a VPN",
      description: "Estou recebendo um erro de conexão ao tentar conectar à VPN da empresa.",
      category: "Rede",
      priority: "alta",
      status: "aberto",
      creatorId: user1.id,
      assignedToId: null,
    });

    console.log("Banco de dados semeado com usuários e chamados iniciais");
  }

  return httpServer;
}
