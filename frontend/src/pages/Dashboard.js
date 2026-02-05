import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FileText, Package, Users, TrendingUp, Plus } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPOs: 0,
    draftPOs: 0,
    sentPOs: 0,
    totalVendors: 0,
    totalProducts: 0
  });
  const [recentPOs, setRecentPOs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [posRes, vendorsRes, productsRes] = await Promise.all([
        axios.get(`${API}/purchase-orders`, { headers }),
        axios.get(`${API}/vendors`, { headers }),
        axios.get(`${API}/products`, { headers })
      ]);

      const pos = posRes.data;
      setStats({
        totalPOs: pos.length,
        draftPOs: pos.filter(po => po.status === 'draft').length,
        sentPOs: pos.filter(po => po.status === 'sent').length,
        totalVendors: vendorsRes.data.length,
        totalProducts: productsRes.data.length
      });

      setRecentPOs(pos.slice(0, 5));
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Total POs", value: stats.totalPOs, icon: FileText, color: "text-primary" },
    { label: "Draft", value: stats.draftPOs, icon: FileText, color: "text-muted-foreground" },
    { label: "Sent", value: stats.sentPOs, icon: TrendingUp, color: "text-primary" },
    { label: "Vendors", value: stats.totalVendors, icon: Users, color: "text-primary" },
    { label: "Products", value: stats.totalProducts, icon: Package, color: "text-primary" }
  ];

  const getStatusBadge = (status) => {
    return (
      <span className={`status-badge status-${status}`} data-testid={`status-${status}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading font-bold text-4xl tracking-tight text-primary mb-2" data-testid="dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Overview of your purchase order operations</p>
        </div>
        <Link to="/purchase-orders/new">
          <button 
            data-testid="create-po-button"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-sm hover:bg-primary/90"
          >
            <Plus size={18} />
            New Purchase Order
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              data-testid={`stat-card-${stat.label.toLowerCase().replace(' ', '-')}`}
              className="bg-card border border-border rounded-sm p-6 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={stat.color} size={24} />
              </div>
              <div>
                <p className="text-3xl font-heading font-bold text-foreground mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-sm">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 className="font-heading font-semibold text-xl" data-testid="recent-pos-title">Recent Purchase Orders</h2>
          <Link to="/purchase-orders" className="text-sm text-primary hover:underline" data-testid="view-all-pos">
            View All
          </Link>
        </div>
        
        {recentPOs.length === 0 ? (
          <div className="p-12 text-center" data-testid="no-pos-message">
            <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No purchase orders yet</p>
            <Link to="/purchase-orders/new">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-sm hover:bg-primary/90">
                Create Your First PO
              </button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="recent-pos-table">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    PO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentPOs.map((po) => (
                  <tr 
                    key={po.id} 
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                    data-testid={`po-row-${po.po_number}`}
                  >
                    <td className="px-6 py-4">
                      <Link to={`/purchase-orders/${po.id}`} className="font-mono text-sm text-primary hover:underline">
                        {po.po_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm">{po.vendor_name}</td>
                    <td className="px-6 py-4 font-mono text-sm">₹{po.total.toFixed(2)}</td>
                    <td className="px-6 py-4">{getStatusBadge(po.status)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(po.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
