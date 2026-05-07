import React, { useState, useContext } from "react";
import { MapPin } from "lucide-react";
import { cartApi } from "../../api/authApi";
import { CartContext } from "../../context/CartContext";

export default function ProductInfo({ product, owner }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const { fetchCart } = useContext(CartContext);

  const isOutOfStock = product.quantity === 0;
  const isLowStock = product.quantity > 0 && product.quantity <= 3;

  const handleAddToCart = async () => {
    try {
      setLoading(true);
      await cartApi.addToCart(product._id.toString());

      setMessage({ type: "success", text: "Product added to cart!" }); // ✅ Hiển thị message
      fetchCart?.();

      // 3s sau tự ẩn
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error("Failed to add to cart:", err);
      setMessage({ type: "error", text: "Failed to add product to cart" });

      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 relative">
      <h1 className="text-3xl font-semibold">{product.name}</h1>
      <div className="text-2xl font-bold text-[#2f5d3f]">{product.price} Points</div>
      <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>

      {owner?.address && (
        <div className="flex items-center gap-2 text-gray-700">
          <MapPin size={18} />
          <span>{owner.address}</span>
        </div>
      )}

      <div className="text-sm text-gray-500">
        Category: <span className="font-medium">{product.categoryId?.name}</span>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col gap-3 mt-6">
        <div className="flex items-center gap-4 mb-2">
          <span className={`font-medium ${isOutOfStock ? 'text-red-500' : 'text-green-600'}`}>
            {isOutOfStock ? "Out of Stock" : `${product.quantity} items available`}
          </span>
          {isLowStock && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
              Low Stock
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleAddToCart}
            disabled={loading || isOutOfStock}
            className={`flex-1 border px-5 py-3 rounded-md transition-colors ${
              isOutOfStock
                ? "bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed"
                : "border-gray-400 hover:bg-gray-100 disabled:opacity-50"
            }`}
          >
            {loading ? "Adding..." : "Add To Cart"}
          </button>
          <button 
            disabled={isOutOfStock}
            className={`flex-1 px-5 py-3 rounded-md transition-colors ${
              isOutOfStock
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-[#7dac8c] text-white hover:bg-green-200"
            }`}
          >
            Buy Now
          </button>
        </div>

        {/* ✅ Thông báo */}
        {message && (
          <div
            className={`mt-2 p-3 rounded-md text-white font-medium ${
              message.type === "success" ? "bg-[#7dac9c]" : "bg-red-500"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
