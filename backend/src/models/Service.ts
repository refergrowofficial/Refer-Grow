import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const serviceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    // Price for purchasing the service.
    price: { type: Number, required: true, min: 0 },

    // Business Volume (BV) for this service purchase.
    businessVolume: { type: Number, required: true, min: 0 },

    // Legacy fields kept for backward compatibility with older data.
    // New code should use businessVolume/status.
    bv: { type: Number, required: false, min: 0 },

    // Active/inactive status (use this instead of deleting to “disable”).
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },

    // Legacy boolean (kept for older data).
    isActive: { type: Boolean, default: undefined },
  },
  { timestamps: true }
);

serviceSchema.pre("validate", function syncLegacyFields() {
  const doc = this as unknown as {
    businessVolume?: number;
    bv?: number;
    status?: "active" | "inactive";
    isActive?: boolean;
  };

  if (doc.businessVolume == null && doc.bv != null) {
    doc.businessVolume = doc.bv;
  }

  if (!doc.status && typeof doc.isActive === "boolean") {
    doc.status = doc.isActive ? "active" : "inactive";
  }

  // Keep legacy fields in sync for mixed environments.
  if (doc.businessVolume != null) {
    doc.bv = doc.businessVolume;
  }
  if (doc.status) {
    doc.isActive = doc.status === "active";
  }
});

export type Service = InferSchemaType<typeof serviceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ServiceModel: Model<Service> =
  (mongoose.models.Service as Model<Service>) || mongoose.model<Service>("Service", serviceSchema);
