import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import LoginPage from "../pages/AuthPage/LoginPage";
import RegisterPage from "../pages/AuthPage/RegisterPage";
import ForgotPasswordPage from "../pages/AuthPage/ForgotPasswordPage";
import ChangePasswordPage from "../pages/AuthPage/ChangePasswordPage";
import HomePage from "../pages/HomePage/HomePage";
import OtpPage from "../pages/AuthPage/OtpPage";
import ViewProductPage from "../pages/ViewProductPage/ViewProductPage";
import ProfilePage from "../pages/ProfilePage/ProfilePage";
import CartPage from "../pages/CartPage/CartPage";
import CheckOutPage from "@/pages/CartPage/CheckOutPage/CheckOutPage.jsx";
// import OtpPage from "../pages/AuthPage/OtpPage";
import ResetPasswordPage from "../pages/AuthPage/ResetPasswordPage";
// import NotFoundPage from "../pages/NotFoundPage/NotFoundPage";
// import CategoryCard from "../components/HomePage/Category/CategoryCard";
import MyListing from "@/pages/ProfilePage/MyListing";
import AddProduct from "@/pages/ProfilePage/AddProduct.jsx";
import ListProducts from "@/pages/HomePage/ListPorducts.jsx";
import ProfileHistoryPage from "@/pages/ProfilePage/ProfileHistoryPage";
import ShopDetailPage from "../pages/ShopDetailPage/ShopDetailPage";
import AdminPage from "../pages/AdminPage/AdminPage";
import EditProduct from "../pages/ProfilePage/EditProdut";
function TitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    const pathTitleMap = {
      "/login": "Login | SecondHandLand",
      "/edit": "Edit |SecondHandLand",
      "/register": "Register | SecondHandLand",
      "/forgot-password": "Forgot Password | SecondHandLand",
      "/reset-password": "Reset Password | SecondHandLand",
      "/change-password": "Change Password | SecondHandLand",
      "/home": "Home | SecondHandLand",
      "/view-product": "View Product | SecondHandLand",
      "/cart": "Cart | SecondHandLand",
      "/checkout": "CheckOutPage | SecondHandLand",
      "/profile": "Profile | SecondHandLand",
      "/my-listing": "My Listing | SecondHandLand",
      "/my-listing/add-product": "Add Product | SecondHandLand",
      "/notfound": "Page Not Found | SecondHandLand",
      "/home/result": "Search Result | SecondHandLand",
      "/orders": "Orders | SecondHandLand",
    };

    document.title = pathTitleMap[location.pathname] || "SecondHandLand";
  }, [location]);

  return null;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <TitleUpdater />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/my-listing/edit/:id" element={<EditProduct />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/verify-otp" element={<OtpPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/product/:id" element={<ViewProductPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/checkout" element={<CheckOutPage />} />
        <Route path="/my-listing" element={<MyListing />} />
        <Route path="/my-listing/addproduct" element={<AddProduct />} />
        <Route path="/home/result" element={<ListProducts />} />s
        <Route path="/orders" element={<ProfileHistoryPage />} />
        <Route path="/detail-shop" element={<ShopDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
        {/*<Route path="*" element={<Navigate to="/notfound" replace />} />*/}
      </Routes>
    </BrowserRouter>
  );
}
