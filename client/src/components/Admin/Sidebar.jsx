import React from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Users,
  LogOut,
  Activity,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "customers", label: "Customers", icon: Users },
  { id: "monitoring", label: "Monitoring", icon: Activity },
  { id: "logout", label: "Logout", icon: LogOut, danger: true },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  const { logout, user } = useAuthContext();
  const navigate = useNavigate();

  const handleClick = async (tab) => {
    if (tab.id === "logout") {
      try {
        await logout();
      } finally {
        navigate("/login");
      }
      return;
    }
    setActiveTab(tab.id);
  };

  const displayName =
    user?.name?.firstName || user?.name?.lastName
      ? `${user?.name?.firstName || ""} ${user?.name?.lastName || ""}`.trim()
      : user?.email || "Admin";
  const displayEmail = user?.email || "admin@example.com";

  return (
    <aside className="w-56 bg-[#283645] text-white p-4 hidden md:flex flex-col">
      {/* Profile */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
          {displayName.charAt(0)}
        </div>

        <div className="leading-tight truncate">
          <p className="font-semibold text-sm">{displayName}</p>
          <p className="text-xs text-white/70 truncate">{displayEmail}</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="space-y-2">
        {MENU_ITEMS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleClick(tab)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base transition
    ${
      tab.danger
        ? "text-red-300 hover:bg-red-500/20"
        : activeTab === tab.id
          ? "bg-white/15 font-semibold"
          : "hover:bg-white/10"
    }`}
          >
            <tab.icon size={20} />
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
