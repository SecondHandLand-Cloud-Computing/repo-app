import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/HomePage/Header";
import Footer from "../../components/HomePage/Footer";
import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";
import CartItem from "../../components/HomePage/Cart/CartItem";
import { cartApi, orderApi } from "../../api/authApi";
import { CartContext } from "../../context/CartContext";

export default function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const navigate = useNavigate();

  // =======================
  // Fetch Cart
  // =======================
  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await cartApi.getCart();
      const products = Array.isArray(res.data.data?.products) ? res.data.data.products : [];

      const mappedItems = products
        .map((item) => {
          // API trả về: { _id, name, price, quantity (qty trong giỏ), stock, imagePublicUrl, seller, ... }
          if (!item || !item._id) return null;

          return {
            id: item._id,
            name: item.name || "No Name",
            description: item.description || "",
            price: item.price || 0,
            quantity: item.quantity || 1,   // số lượng trong giỏ
            stock: item.stock ?? 999,       // tồn kho thực tế
            seller: item.seller || {},
            image:
              item.imagePublicUrl ||
              (item.imagePublicId
                ? `https://res.cloudinary.com/do7o7ymyt/image/upload/${item.imagePublicId}`
                : "https://via.placeholder.com/136"),
            checked: false,
          };
        })
        .filter(Boolean);

      setCartItems(mappedItems);
    } catch (error) {
      console.error("❌ Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // =======================
  // Cart actions
  // =======================
  const removeItem = async (productId) => {
    try {
      await cartApi.removeOne(productId);
      setCartItems((prev) => prev.filter((item) => item.id !== productId));
    } catch (error) {
      console.error("❌ Failed to remove item:", error);
    }
  };

  const updateQuantity = async (productId, newQty) => {
    if (newQty < 1) return;
    try {
      await cartApi.updateQuantity(productId, newQty);
      setCartItems((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, quantity: newQty } : item))
      );
    } catch (error) {
      console.error("❌ Failed to update quantity:", error);
    }
  };

  const toggleItem = (productId) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, checked: !item.checked } : item))
    );
  };

  const toggleAll = () => {
    const allChecked = cartItems.every((item) => item.checked);
    setCartItems((prev) => prev.map((item) => ({ ...item, checked: !allChecked })));
  };

  const checkedItems = cartItems.filter((item) => item.checked);
  const totalPrice = checkedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // =======================
  // Handle Checkout
  // =======================
  const handleCheckout = async () => {
    if (checkedItems.length === 0) return;

    try {
      setCheckoutLoading(true);
      const response = await orderApi.createOrder({
        products: checkedItems.map((item) => ({
          id: item.id,
          createdBy: item.seller?._id,
          quantity: item.quantity,
        })),
        pickupAddress: checkedItems[0]?.seller?.address || "",
      });

      navigate("/checkout", { state: { listItem: response.data.data || [] } });
    } catch (error) {
      console.error("❌ Failed to create order:", error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // =======================
  // Render
  // =======================
  return (
    <CartContext.Provider value={{ cartItems, setCartItems, fetchCart }}>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <Header />

        <main className="flex-grow container mx-auto px-4 py-8 max-w-[1440px]">
          <Breadcrumb
            items={[
              { label: "Home", href: "/home", active: false },
              { label: "Shopping Cart", href: "/home/cart", active: true },
            ]}
          />

          {loading ? (
            <div className="text-center py-20 text-gray-500">
              <div className="w-8 h-8 border-4 border-[#2f5d3f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              Loading your cart...
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8 mt-6 items-start">
              {/* Cart Items */}
              <div className="flex-1 w-full bg-[#DFE9DD] rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#c2d1bd]">
                  <h1 className="font-semibold text-2xl sm:text-3xl text-gray-900 tracking-tight">
                    Shopping Cart
                  </h1>

                  {cartItems.length > 0 && (
                    <button
                      onClick={toggleAll}
                      className="text-sm sm:text-base font-medium text-[#2f5d3f] hover:text-[#1e3c28] hover:underline transition-colors"
                    >
                      {cartItems.every((i) => i.checked)
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {cartItems.length > 0 ? (
                    cartItems.map((item) => (
                      <CartItem
                        key={item.id}
                        item={item}
                        onToggle={toggleItem}
                        onRemove={removeItem}
                        onUpdateQuantity={updateQuantity}
                      />
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Your cart is empty</h3>
                      <p className="text-gray-500 mb-6">Looks like you haven't added anything yet.</p>
                      <button 
                        onClick={() => navigate('/home/search')}
                        className="text-[#2f5d3f] font-medium hover:underline"
                      >
                        Continue Shopping
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Checkout Section */}
              <div className="w-full lg:w-[380px] shrink-0 bg-[#DFE9DD] rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 lg:sticky lg:top-24">
                <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>
                
                <div className="space-y-4 text-gray-700">
                  <div className="flex justify-between">
                    <span>Selected items</span>
                    <span className="font-medium text-gray-900">{checkedItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">{totalPrice} pts</span>
                  </div>
                  <div className="pt-4 border-t border-[#c2d1bd] flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-[#2f5d3f]">{totalPrice} pts</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || checkedItems.length === 0}
                  className={`w-full py-4 px-6 flex items-center justify-center gap-2 font-medium transition-all rounded-xl ${
                    checkoutLoading || checkedItems.length === 0
                      ? "bg-[#c2d1bd] text-gray-500 cursor-not-allowed"
                      : "bg-[#2f5d3f] hover:bg-[#1e3c28] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  }`}
                >
                  {checkoutLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    "Proceed to Checkout"
                  )}
                </button>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </CartContext.Provider>
  );
}
