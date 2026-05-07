import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    createdBy: {
      // FK
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    categoryId: {
      // FK
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    stock: {
      type: Number,
      min: 0,
      default: 1,
    },
    imagePublicId: { type: String, required: true },

    status: {
      type: String,
      enum: ["active", "pending", "rejected", "deleted"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
