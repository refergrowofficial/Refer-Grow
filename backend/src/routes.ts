import type { Express, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { signAuthToken, verifyAuthToken } from "@/lib/jwt";
import { hashPassword, verifyPassword } from "@/lib/password";
import { generateUniqueReferralCode } from "@/lib/referral";
import { findBinaryPlacement } from "@/lib/binaryPlacement";
import { distributeBusinessVolumeWithSession } from "@/lib/bvDistribution";
import { buildReferralTree } from "@/lib/referralTree";
import { getBusinessOpportunityEmailContent } from "@/lib/businessOpportunity";
import { sendEmail } from "@/lib/email";

import { UserModel, type UserRole } from "@/models/User";
import { ServiceModel } from "@/models/Service";
import { PurchaseModel } from "@/models/Purchase";
import { IncomeModel } from "@/models/Income";
import { DistributionRuleModel } from "@/models/DistributionRule";
import { IncomeLogModel } from "@/models/IncomeLog";

type AuthContext = { userId: string; role: UserRole; email: string };

function getTokenFromReq(req: Request) {
  const cookieToken = (req.cookies?.token as string | undefined) ?? undefined;
  const header = req.header("authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7) : undefined;
  return cookieToken ?? bearer;
}

async function requireAuth(req: Request): Promise<AuthContext> {
  const token = getTokenFromReq(req);
  if (!token) throw new Error("Unauthorized");

  const payload = await verifyAuthToken(token);
  const role = payload.role as UserRole;
  const email = payload.email as string;

  if (!payload.sub || !role || !email) throw new Error("Unauthorized");
  return { userId: payload.sub, role, email };
}

async function requireRole(req: Request, role: UserRole): Promise<AuthContext> {
  const ctx = await requireAuth(req);
  if (ctx.role !== role) throw new Error("Forbidden");
  return ctx;
}

function setAuthCookie(res: Response, token: string) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7 * 1000,
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie("token", { path: "/" });
}

const DUMMY_PASSWORD_HASH = "$2b$12$npwxPAElS4BfdU.iS5LIFuqi0v31VhieuIsoP1t9cMORH152MK/3i";

export function registerRoutes(app: Express) {
  // Auth
  app.post("/api/auth/register", async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      acceptedTerms: z.literal(true),
      referralCode: z
        .string()
        .optional()
        .transform((v) => (typeof v === "string" ? v.trim() : v))
        .transform((v) => (v ? v : undefined)),
    });

    try {
      const body = schema.parse(req.body);
      await connectToDatabase();

      const existing = await UserModel.findOne({ email: body.email.toLowerCase() }).select("_id");
      if (existing) return res.status(409).json({ error: "Email already in use" });

      let parentId: mongoose.Types.ObjectId | null = null;
      let position: "left" | "right" | null = null;

      if (body.referralCode) {
        const sponsor = await UserModel.findOne({ referralCode: body.referralCode }).select("_id");
        if (!sponsor) return res.status(400).json({ error: "Invalid referral code" });

        const placement = await findBinaryPlacement({ sponsorId: sponsor._id });
        parentId = placement.parentId;
        position = placement.position;
      }

      const passwordHash = await hashPassword(body.password);
      const referralCode = await generateUniqueReferralCode();

      const user = await UserModel.create({
        name: body.name,
        email: body.email,
        passwordHash,
        role: "user",
        referralCode,
        parent: parentId,
        position,
      });

      // Best-effort email.
      try {
        const content = getBusinessOpportunityEmailContent();
        await sendEmail({ to: user.email, subject: content.subject, text: content.text });
      } catch {
        // ignore
      }

      const token = await signAuthToken({ sub: user._id.toString(), role: user.role, email: user.email });
      setAuthCookie(res, token);

      return res.status(201).json({
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          referralCode: user.referralCode,
          parentUserId: user.parent?.toString() ?? null,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bad request";
      return res.status(400).json({ error: msg });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

    try {
      const body = schema.parse(req.body);
      await connectToDatabase();

      const user = await UserModel.findOne({ email: body.email.toLowerCase() });
      if (!user) {
        await verifyPassword(body.password, DUMMY_PASSWORD_HASH);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const ok = await verifyPassword(body.password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      const token = await signAuthToken({ sub: user._id.toString(), role: user.role, email: user.email });
      setAuthCookie(res, token);

      return res.json({
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          referralCode: user.referralCode,
          parentUserId: user.parent?.toString() ?? null,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bad request";
      return res.status(400).json({ error: msg });
    }
  });

  app.post("/api/auth/logout", (_req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
  });

  // Me
  app.get("/api/me", async (req, res) => {
    try {
      const ctx = await requireAuth(req);
      await connectToDatabase();

      const user = await UserModel.findById(ctx.userId);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      return res.json({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          referralCode: user.referralCode,
          parentUserId: user.parent?.toString() ?? null,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unauthorized";
      const status = msg === "Unauthorized" ? 401 : 400;
      return res.status(status).json({ error: msg });
    }
  });

  // Public services
  app.get("/api/services", async (_req, res) => {
    await connectToDatabase();
    const services = await ServiceModel.find({ status: "active" }).sort({ createdAt: -1 });
    res.json({ services });
  });

  // Purchases
  app.get("/api/purchases", async (req, res) => {
    try {
      const ctx = await requireAuth(req);
      await connectToDatabase();

      const purchases = await PurchaseModel.find({ user: ctx.userId }).populate("service").sort({ createdAt: -1 }).limit(50);
      return res.json({ purchases });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unauthorized";
      const status = msg === "Unauthorized" ? 401 : 400;
      return res.status(status).json({ error: msg });
    }
  });

  app.post("/api/purchases", async (req, res) => {
    const schema = z.object({ serviceId: z.string().min(1) });

    try {
      const ctx = await requireAuth(req);
      const body = schema.parse(req.body);
      await connectToDatabase();

      const session = await mongoose.startSession();
      try {
        const result = await session.withTransaction(async () => {
          const [purchase] = await PurchaseModel.create(
            [
              {
                user: new mongoose.Types.ObjectId(ctx.userId),
                service: new mongoose.Types.ObjectId(body.serviceId),
                bv: 0,
              },
            ],
            { session }
          );

          const distribution = await distributeBusinessVolumeWithSession({
            userId: ctx.userId,
            serviceId: body.serviceId,
            purchaseId: purchase._id.toString(),
            session,
          });

          await PurchaseModel.updateOne({ _id: purchase._id }, { $set: { bv: distribution.bv } }, { session });

          return {
            purchaseId: purchase._id.toString(),
            bv: distribution.bv,
            logsCreated: distribution.logsCreated,
            levelsPaid: distribution.levelsPaid,
          };
        });

        return res.status(201).json({ ok: true, ...result });
      } finally {
        session.endSession();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bad request";
      const status = msg === "Unauthorized" ? 401 : 400;
      return res.status(status).json({ error: msg });
    }
  });

  // Income
  app.get("/api/income", async (req, res) => {
    try {
      const ctx = await requireAuth(req);
      await connectToDatabase();

      const incomes = await IncomeModel.find({ toUser: ctx.userId })
        .populate("fromUser", "email referralCode")
        .populate("purchase")
        .sort({ createdAt: -1 })
        .limit(100);

      return res.json({ incomes });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unauthorized";
      const status = msg === "Unauthorized" ? 401 : 400;
      return res.status(status).json({ error: msg });
    }
  });

  // Referrals
  app.get("/api/referrals", async (req, res) => {
    try {
      const ctx = await requireAuth(req);
      const depthParam = Number(req.query.depth ?? "3");
      const maxDepth = Math.min(Math.max(depthParam, 1), 10);

      const tree = await buildReferralTree({ rootUserId: ctx.userId, depth: maxDepth });
      return res.json({ tree, maxDepth });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unauthorized";
      const status = msg === "Unauthorized" ? 401 : 400;
      return res.status(status).json({ error: msg });
    }
  });

  // Business opportunity request
  app.post("/api/business-opportunity/request", async (req, res) => {
    const schema = z.object({ email: z.string().email() });

    try {
      const body = schema.parse(req.body);
      const content = getBusinessOpportunityEmailContent();
      const result = await sendEmail({ to: body.email, subject: content.subject, text: content.text });
      return res.json({ ok: true, emailed: result.sent });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bad request";
      return res.status(400).json({ error: msg });
    }
  });

  // Admin setup
  app.post("/api/admin/setup", async (req, res) => {
    const schema = z.object({
      secret: z.string().min(1),
      name: z.string().min(1).optional(),
      email: z.string().email(),
      password: z.string().min(8),
    });

    try {
      const body = schema.parse(req.body);

      if (!env.ADMIN_SETUP_SECRET) return res.status(500).json({ error: "ADMIN_SETUP_SECRET not configured" });
      if (body.secret !== env.ADMIN_SETUP_SECRET) return res.status(403).json({ error: "Forbidden" });

      await connectToDatabase();

      const existingAdmin = await UserModel.exists({ role: "admin" });
      if (existingAdmin) return res.status(409).json({ error: "Admin already exists" });

      const existingEmail = await UserModel.exists({ email: body.email.toLowerCase() });
      if (existingEmail) return res.status(409).json({ error: "Email already in use" });

      const passwordHash = await hashPassword(body.password);
      const referralCode = await generateUniqueReferralCode();

      const admin = await UserModel.create({
        name: body.name ?? "Admin",
        email: body.email,
        passwordHash,
        role: "admin",
        referralCode,
        parent: null,
        position: null,
      });

      return res.json({
        admin: {
          id: admin._id.toString(),
          email: admin.email,
          role: admin.role,
          referralCode: admin.referralCode,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bad request";
      return res.status(400).json({ error: msg });
    }
  });

  // Admin services
  app.get("/api/admin/services", async (req, res) => {
    try {
      await requireRole(req, "admin");
      await connectToDatabase();
      const services = await ServiceModel.find({}).sort({ createdAt: -1 });
      return res.json({ services });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Forbidden";
      const status = msg === "Forbidden" ? 403 : 400;
      return res.status(status).json({ error: msg });
    }
  });

  app.post("/api/admin/services", async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      price: z.number().finite().min(0),
      businessVolume: z.number().finite().min(0),
      status: z.enum(["active", "inactive"]).optional(),
    });

    try {
      await requireRole(req, "admin");
      const body = schema.parse(req.body);
      await connectToDatabase();

      const service = await ServiceModel.create({
        name: body.name,
        price: body.price,
        businessVolume: body.businessVolume,
        status: body.status ?? "active",
      });

      return res.status(201).json({ service });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bad request";
      const status = msg === "Forbidden" ? 403 : 400;
      return res.status(status).json({ error: msg });
    }
  });

  app.put("/api/admin/services/:id", async (req, res) => {
    const schema = z
      .object({
        name: z.string().min(1).optional(),
        price: z.number().finite().min(0).optional(),
        businessVolume: z.number().finite().min(0).optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
      .refine((v) => Object.keys(v).length > 0, "No fields to update");

    try {
      await requireRole(req, "admin");
      const body = schema.parse(req.body);
      await connectToDatabase();

      const service = await ServiceModel.findByIdAndUpdate(req.params.id, body, { new: true });
      if (!service) return res.status(404).json({ error: "Not found" });
      return res.json({ service });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bad request";
      const status = msg === "Forbidden" ? 403 : 400;
      return res.status(status).json({ error: msg });
    }
  });

  // Admin rules (DistributionRule)
  app.get("/api/admin/rules", async (req, res) => {
    try {
      await requireRole(req, "admin");
      await connectToDatabase();

      const activeRule = await DistributionRuleModel.findOne({ isActive: true }).sort({ createdAt: -1 });
      const recentRules = await DistributionRuleModel.find({}).sort({ createdAt: -1 }).limit(10);

      return res.json({ activeRule, recentRules });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Forbidden";
      const status = msg === "Forbidden" ? 403 : 400;
      return res.status(status).json({ error: msg });
    }
  });

  app.post("/api/admin/rules", async (req, res) => {
    const schema = z.object({
      basePercentage: z
        .number()
        .finite()
        .min(0)
        .transform((v) => (v > 1 ? v / 100 : v))
        .refine((v) => v >= 0 && v <= 1, "basePercentage must be between 0 and 1"),
      decayEnabled: z.boolean(),
      isActive: z.boolean().optional(),
    });

    try {
      await requireRole(req, "admin");
      await connectToDatabase();

      const body = schema.parse(req.body);
      const isActive = body.isActive ?? true;
      if (isActive) await DistributionRuleModel.updateMany({ isActive: true }, { $set: { isActive: false } });

      const rule = await DistributionRuleModel.create({
        basePercentage: body.basePercentage,
        decayEnabled: body.decayEnabled,
        isActive,
      });

      return res.status(201).json({ rule });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bad request";
      const status = msg === "Forbidden" ? 403 : 400;
      return res.status(status).json({ error: msg });
    }
  });

  app.put("/api/admin/rules/:id", async (req, res) => {
    const schema = z
      .object({
        basePercentage: z
          .number()
          .finite()
          .min(0)
          .optional()
          .transform((v) => (v == null ? v : v > 1 ? v / 100 : v))
          .refine((v) => v == null || (v >= 0 && v <= 1), "basePercentage must be between 0 and 1"),
        decayEnabled: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
      .refine((v) => Object.keys(v).length > 0, "No fields to update");

    try {
      await requireRole(req, "admin");
      await connectToDatabase();

      const body = schema.parse(req.body);
      if (body.isActive === true) await DistributionRuleModel.updateMany({ isActive: true }, { $set: { isActive: false } });

      const rule = await DistributionRuleModel.findByIdAndUpdate(req.params.id, body, { new: true });
      if (!rule) return res.status(404).json({ error: "Not found" });

      return res.json({ rule });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bad request";
      const status = msg === "Forbidden" ? 403 : 400;
      return res.status(status).json({ error: msg });
    }
  });

  // Admin dashboard
  app.get("/api/admin/dashboard", async (req, res) => {
    try {
      await requireRole(req, "admin");
      await connectToDatabase();

      const [totalUsers, activeServices] = await Promise.all([
        UserModel.estimatedDocumentCount(),
        ServiceModel.countDocuments({ $or: [{ status: "active" }, { status: { $exists: false }, isActive: true }] }),
      ]);

      const bvAgg = await PurchaseModel.aggregate<{ _id: null; totalBVGenerated: number }>([
        { $group: { _id: null, totalBVGenerated: { $sum: { $ifNull: ["$bv", 0] } } } },
      ]);
      const totalBVGenerated = bvAgg[0]?.totalBVGenerated ?? 0;

      const incomeAgg = await IncomeLogModel.aggregate<{ _id: null; totalIncomeDistributed: number }>([
        { $group: { _id: null, totalIncomeDistributed: { $sum: { $ifNull: ["$incomeAmount", 0] } } } },
      ]);
      const totalIncomeDistributed = incomeAgg[0]?.totalIncomeDistributed ?? 0;

      return res.json({ totalUsers, totalBVGenerated, totalIncomeDistributed, activeServices });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Forbidden";
      const status = msg === "Forbidden" ? 403 : 400;
      return res.status(status).json({ error: msg });
    }
  });

  // Fallback error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const msg = err instanceof Error ? err.message : "Server error";
    res.status(500).json({ error: msg });
  });
}
