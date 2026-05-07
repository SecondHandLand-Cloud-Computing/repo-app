import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        priceAtOrder: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    subtotal: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["created", "processing", "confirmed", "shipping", "completed", "cancelled", "refunded"],
      default: "created",
    },
    shipping: {
      providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Provider",
      },
      pickupAddress: {
        type: String,
        required: true,
      },
      deliveryAddress: {
        type: String,
        required: true,
      },
      expectedDeliveryDate: {
        type: Date,
      },
      actualDeliveryDate: {
        type: Date,
      },
      fee: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
