import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export type UserRole = "admin" | "user";

export type BinaryPosition = "left" | "right";

const userSchema = new Schema(
  {
    // Display name for UI.
    name: { type: String, trim: true, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], required: true, default: "user" },

    // Unique code this user shares with new signups.
    referralCode: { type: String, required: true, unique: true, index: true },

    // The user who referred this user (nullable for root/admin accounts).
    parent: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

    // Binary placement position under `parent`.
    // - null when parent is null (root)
    // - each parent can have at most 1 left + 1 right child
    position: { type: String, enum: ["left", "right"], default: null, index: true },
  },
  { timestamps: true }
);

// Enforce the binary constraint: a given parent can have only one left child and one right child.
// Using a partial index keeps multiple root users (parent=null) from conflicting.
userSchema.index(
  { parent: 1, position: 1 },
  {
    unique: true,
    partialFilterExpression: { parent: { $type: "objectId" }, position: { $in: ["left", "right"] } },
  }
);

export type User = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserModel: Model<User> =
  (mongoose.models.User as Model<User>) || mongoose.model<User>("User", userSchema);
