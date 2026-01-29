import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Search, Filter } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PurchaseOrdersList() {
  const [pos, setPOs] = useState([]);
  const [filteredPOs, setFilteredPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchPOs();
  }, []);

  useEffect(() => {
    filterPOs();
  }, [searchTerm, statusFilter, pos]);

  const fetchPOs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/purchase-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPOs(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch POs:", err);
      setLoading(false);
    }
  };

  const filterPOs = () => {
    let filtered = pos;

    if (statusFilter !== "all") {
      filtered = filtered.filter(po => po.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(po =>
        po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPOs(filtered);
  };

  const deletePO = async (id, poNumber) => {
    if (!window.confirm(`Are you sure you want to delete ${poNumber}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/purchase-orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPOs();
    } catch (err) {
      console.error("Failed to delete PO:", err);
      alert("Failed to delete purchase order");
    }
  };

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
          <h1 className="font-heading font-bold text-4xl tracking-tight text-primary mb-2" data-testid="pos-title">
            Purchase Orders
          </h1>
          <p className="text-muted-foreground">Manage all your purchase orders</p>
        </div>
        <Link to="/purchase-orders/new">
          <button 
            data-testid="create-new-po-button"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-sm hover:bg-primary/90"
          >
            <Plus size={18} />
            New Purchase Order
          </button>
        </Link>
      </div>

      <div className="bg-card border border-border rounded-sm mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search by PO number or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="search-input"
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              data-testid="status-filter"
              className="px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {filteredPOs.length === 0 ? (
          <div className="p-12 text-center" data-testid="no-pos-found">
            <p className="text-muted-foreground">No purchase orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="pos-table">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    PO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Delivery Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPOs.map((po) => (
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
                    <td className="px-6 py-4 text-sm">{po.delivery_date}</td>
                    <td className="px-6 py-4 font-mono text-sm">${po.total.toFixed(2)}</td>
                    <td className="px-6 py-4">{getStatusBadge(po.status)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(po.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/purchase-orders/${po.id}`)}
                          data-testid={`view-po-${po.po_number}`}
                          className="text-sm text-primary hover:underline"
                        >
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/purchase-orders/${po.id}/edit`)}
                          data-testid={`edit-po-${po.po_number}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deletePO(po.id, po.po_number)}
                          data-testid={`delete-po-${po.po_number}`}
                          className="text-sm text-destructive hover:underline"
                        >
                          Delete
                        </button>
                      </div>
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
