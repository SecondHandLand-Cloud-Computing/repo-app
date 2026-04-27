import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Admin/Sidebar";
import Dashboard from "./Dashboard";
import Orders from "./Orders";
import Products from "./Products";
import Categories from "./Categories";
import Customers from "./Customers";
import AdminHeader from "@/components/Admin/AdminHeader";
import Monitoring from "./Monitoring";
import { useAuthContext } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/home");
    }
  }, [user]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "orders":
        return <Orders />;
      case "products":
        return <Products />;
      case "categories":
        return <Categories />;
      case "customers":
        return <Customers />;
      case "monitoring":
        return <Monitoring />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <AdminHeader />
      <div className="min-h-screen flex bg-[#F3F7ED]">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-8"> {renderContent()}</main>
      </div>
    </>
  );
}
