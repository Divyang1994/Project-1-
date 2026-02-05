import { Outlet, Link, useLocation } from "react-router-dom";
import { FileText, Package, Users, LayoutDashboard, LogOut, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Layout = ({ user, onLogout }) => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    fetchUnreadCount();
    // Poll for unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(response.data.unread_count);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };
  
  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/purchase-orders", label: "Purchase Orders", icon: FileText },
    { path: "/vendors", label: "Vendors", icon: Users },
    { path: "/products", label: "Products", icon: Package },
    { path: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
  ];

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="font-heading font-bold text-xl text-primary" data-testid="app-title">PO Manager</h1>
          <p className="text-xs text-muted-foreground mt-1">Factory Operations</p>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors relative ${
                      active
                        ? "bg-primary text-primary-foreground border-l-4 border-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-destructive text-destructive-foreground rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-sm bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.username}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            data-testid="logout-button"
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-sm transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
