import mongoose from "mongoose";
import { UserModel } from "@/models/User";

export type BinaryPosition = "left" | "right";

function pickMissingPosition(existing: Set<string>): BinaryPosition | null {
  if (!existing.has("left")) return "left";
  if (!existing.has("right")) return "right";
  return null;
}

/**
 * Finds the next available binary placement under `sponsorId`.
 *
 * Order:
 * - Top to bottom (BFS)
 * - Left to right (check left slot before right slot)
 */
export async function findBinaryPlacement(options: {
  sponsorId: mongoose.Types.ObjectId;
  session?: mongoose.ClientSession;
}): Promise<{ parentId: mongoose.Types.ObjectId; position: BinaryPosition }> {
  const session = options.session;

  const queue: mongoose.Types.ObjectId[] = [options.sponsorId];
  const visited = new Set<string>();
  const MAX_VISITS = 200_000;

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const key = parentId.toString();
    if (visited.has(key)) continue;
    visited.add(key);

    if (visited.size > MAX_VISITS) {
      throw new Error("Binary placement search exceeded safe limit");
    }

    const children = await UserModel.find({ parent: parentId })
      .select("_id position createdAt")
      .sort({ createdAt: 1 })
      .lean()
      .session(session ?? null);

    const positions = new Set<string>();
    let leftChildId: mongoose.Types.ObjectId | null = null;
    let rightChildId: mongoose.Types.ObjectId | null = null;

    const unpositioned: Array<{ _id: mongoose.Types.ObjectId }> = [];

    for (const child of children) {
      const pos = (child as { position?: string | null }).position;
      if (!pos) {
        unpositioned.push({ _id: child._id as mongoose.Types.ObjectId });
        continue;
      }
      positions.add(pos);
      if (pos === "left") leftChildId = child._id as mongoose.Types.ObjectId;
      if (pos === "right") rightChildId = child._id as mongoose.Types.ObjectId;
    }

    // Backfill legacy children missing position: first becomes left, second becomes right.
    // This keeps placement deterministic and prevents accidentally adding a third child.
    if (!leftChildId && unpositioned.length > 0) {
      const target = unpositioned.shift()!;
      await UserModel.updateOne(
        { _id: target._id, position: null },
        { $set: { position: "left" } },
        session ? { session } : undefined
      );
      leftChildId = target._id;
      positions.add("left");
    }

    if (!rightChildId && unpositioned.length > 0) {
      const target = unpositioned.shift()!;
      await UserModel.updateOne(
        { _id: target._id, position: null },
        { $set: { position: "right" } },
        session ? { session } : undefined
      );
      rightChildId = target._id;
      positions.add("right");
    }

    const missing = pickMissingPosition(positions);
    if (missing) {
      return { parentId, position: missing };
    }

    // Queue children in left-to-right order.
    if (leftChildId) queue.push(leftChildId);
    if (rightChildId) queue.push(rightChildId);

    // If legacy data already has >2 children under one parent, keep traversing them
    // in created order so placement can still proceed deeper.
    for (const extra of unpositioned) {
      queue.push(extra._id);
    }
  }

  // Should be unreachable because sponsor always has an available spot eventually.
  throw new Error("Unable to find binary placement");
}
