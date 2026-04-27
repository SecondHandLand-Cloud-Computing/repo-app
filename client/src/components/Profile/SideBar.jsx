import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { User, List, Heart, Bell, LogOut, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();

  const navigate = useNavigate();

  const menuItems = [
    {
      id: "profile",
      label: "Profile",
      path: "/profile",
      icon: User,
    },
    {
      id: "listing",
      label: "My Listing",
      path: "/my-listing",
      icon: List,
    },
    {
      id: "orders",
      label: "Order History",
      path: "/orders",
      icon: CreditCard,
    },
    {
      id: "wishlist",
      label: "WishList",
      path: "/wishlist",
      icon: Heart,
    },
    {
      id: "notification",
      label: "Notification",
      path: "/notification",
      icon: Bell,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-white py-8 px-6 border-r border-gray-200">
      <ul className="space-y-20 text-gray-700 font-medium text-xl font-roboto">
        {menuItems.map((item) => (
          <li key={item.id}>
            <NavLink
              to={item.path}
              onClick={() => window.scrollTo(0, 0)}
              className={({ isActive }) => {
                const isActiveLink =
                  isActive ||
                  (item.activeIncludes &&
                    item.activeIncludes.some((path) => location.pathname.startsWith(path)));

                return `flex items-center gap-3 transition-colors ${
                  isActiveLink
                    ? "text-green-600 pl-4 border-l-4 border-green-600"
                    : "hover:text-green-600 pl-4 border-l-4 border-transparent"
                }`;
              }}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <hr className="my-10 border-gray-200" />

      <ul>
        <li>
          <button
            onClick={() => {
              localStorage.removeItem("accessToken");
              navigate("/login");
            }}
            className="w-full flex  items-center gap-3 text-xl text-red-600 hover:bg-red-50 pl-5 rounded-md transition"
          >
            <LogOut size={20} /> Log out
          </button>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;
