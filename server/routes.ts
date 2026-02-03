import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
    const authMiddleware = require("passport").authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(200).json(user);
      });
    });
    authMiddleware(req, res, next);
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
      userId: (req.user as any).id,
      role: (req.user as any).role,
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
      title: "Cannot access VPN",
      description: "I am getting a connection error when trying to connect to the VPN.",
      category: "Network",
      priority: "high",
      status: "open",
      creatorId: user1.id,
      assignedToId: null,
    });
    
    console.log("Database seeded with initial users and tickets");
  }

  return httpServer;
}
