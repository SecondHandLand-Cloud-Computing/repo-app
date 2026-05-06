import React from "react";
import { Trash2, Minus, Plus } from "lucide-react";
import PropTypes from "prop-types";

export default function CartItem({ item, onToggle, onRemove, onUpdateQuantity }) {
  return (
    <div className="py-6 border-b border-gray-100 last:border-0 flex flex-col sm:flex-row items-start gap-6 group">
      {/* Checkbox & Image */}
      <div className="flex items-start gap-4">
        <div className="pt-2">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => onToggle(item.id)}
            className="w-5 h-5 rounded border-gray-300 text-[#2f5d3f] focus:ring-[#2f5d3f] cursor-pointer"
          />
        </div>
        <img
          src={item.image}
          alt={item.name}
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg object-cover flex-shrink-0 border border-gray-100 shadow-sm"
        />
      </div>

      {/* Details */}
      <div className="flex-1 w-full flex flex-col min-h-[8rem] justify-between">
        <div>
          <div className="flex justify-between items-start gap-4 mb-1">
            <h3 className="text-lg font-medium text-gray-900 leading-tight">
              {item.name}
            </h3>
            <span className="text-xl font-bold text-gray-900 shrink-0">
              {item.price * item.quantity} pts
            </span>
          </div>
          
          <p className="text-sm text-gray-500 mb-2 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
          <div className="text-sm font-medium text-[#2f5d3f]">
            {item.price} pts <span className="text-gray-400 font-normal">/ item</span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between mt-auto">
          {/* Quantity controls */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-md border border-gray-200 p-1">
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="w-8 h-8 flex items-center justify-center rounded text-gray-600 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="w-10 text-center font-medium text-gray-900 text-sm">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              disabled={item.quantity >= (item.stock ?? 999)}
              className="w-8 h-8 flex items-center justify-center rounded text-gray-600 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            {item.stock != null && item.stock <= 5 && (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                Only {item.stock} left
              </span>
            )}
            
            <button
              onClick={() => onRemove(item.id)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Remove</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

CartItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    quantity: PropTypes.number.isRequired,
    stock: PropTypes.number,
    image: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
  }).isRequired,
  onToggle: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onUpdateQuantity: PropTypes.func.isRequired,
};
