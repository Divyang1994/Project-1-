import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Download, Edit, ArrowLeft, Trash2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PODetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPO();
  }, [id]);

  const fetchPO = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/purchase-orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPO(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch PO:", err);
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API}/purchase-orders/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPO();
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const confirmMaterialReceipt = async () => {
    if (!window.confirm('Confirm that materials have been received in-house?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/purchase-orders/${id}/confirm-receipt`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Material receipt confirmed successfully!');
      fetchPO();
    } catch (err) {
      console.error("Failed to confirm material receipt:", err);
      alert("Failed to confirm material receipt");
    }
  };

  const downloadPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/purchase-orders/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${po.po_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Failed to download PDF");
    }
  };

  const deletePO = async () => {
    if (!window.confirm(`Are you sure you want to delete ${po.po_number}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/purchase-orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/purchase-orders');
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

  if (!po) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Purchase order not found</p>
          <Link to="/purchase-orders" className="text-primary hover:underline">
            Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link 
          to="/purchase-orders" 
          className="flex items-center gap-2 text-sm text-primary hover:underline mb-4"
          data-testid="back-to-pos"
        >
          <ArrowLeft size={16} />
          Back to Purchase Orders
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="font-heading font-bold text-4xl tracking-tight text-primary mb-2" data-testid="po-number">
            {po.po_number}
          </h1>
          <div className="flex items-center gap-3">
            {getStatusBadge(po.status)}
            <span className="text-sm text-muted-foreground">
              Created on {new Date(po.created_at).toLocaleDateString()} by {po.created_by}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadPDF}
            data-testid="download-pdf-button"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-sm hover:bg-primary/90"
          >
            <Download size={16} />
            Download PDF
          </button>
          <Link to={`/purchase-orders/${id}/edit`}>
            <button 
              data-testid="edit-po-button"
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-sm hover:bg-secondary/80"
            >
              <Edit size={16} />
              Edit
            </button>
          </Link>
          <button
            onClick={deletePO}
            data-testid="delete-po-button"
            className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive text-sm font-medium rounded-sm hover:bg-destructive/20"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border rounded-sm p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Vendor Information
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Vendor Name</p>
              <p className="font-medium" data-testid="vendor-name">{po.vendor_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Shipping Address</p>
              <p className="text-sm" data-testid="shipping-address">{po.shipping_address}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-sm p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Order Details
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Delivery Date</p>
              <p className="font-medium" data-testid="delivery-date">{po.delivery_date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment Terms</p>
              <p className="font-medium" data-testid="payment-terms">{po.payment_terms}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-sm p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Status Management
          </h3>
          <div className="space-y-2 mb-4">
            {['draft', 'sent', 'received', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => updateStatus(status)}
                disabled={updating || po.status === status}
                data-testid={`status-button-${status}`}
                className={`w-full px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                  po.status === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="pt-4 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Material Receipt
            </h4>
            {po.material_received ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-sm">
                <p className="text-sm text-green-800 font-medium mb-1">✓ Material Received</p>
                <p className="text-xs text-green-600">
                  {new Date(po.material_received_date).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <button
                onClick={confirmMaterialReceipt}
                data-testid="confirm-material-receipt-button"
                className="w-full px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-sm hover:bg-green-700"
              >
                Confirm Material Receipt
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm mb-6">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-heading font-semibold text-xl">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="items-table">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Product
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Tax Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Tax Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item, index) => (
                <tr key={index} className="border-b border-border" data-testid={`item-row-${index}`}>
                  <td className="px-6 py-4 text-sm">{index + 1}</td>
                  <td className="px-6 py-4 text-sm">{item.product_name}</td>
                  <td className="px-6 py-4 text-sm text-right font-mono">{item.quantity}</td>
                  <td className="px-6 py-4 text-sm text-right font-mono">₹{item.unit_price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-mono">{item.tax_rate}%</td>
                  <td className="px-6 py-4 text-sm text-right font-mono">₹{item.tax_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-mono font-medium">
                    ₹{item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono" data-testid="subtotal">₹{po.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (GST)</span>
                <span className="font-mono" data-testid="tax">₹{po.tax.toFixed(2)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="font-mono text-primary" data-testid="total">₹{po.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {po.notes && (
        <div className="bg-card border border-border rounded-sm p-6 mb-6">
          <h2 className="font-heading font-semibold text-xl mb-4">Notes</h2>
          <p className="text-sm whitespace-pre-wrap" data-testid="notes">{po.notes}</p>
        </div>
      )}

      {po.authorized_signatory && (
        <div className="bg-card border border-border rounded-sm p-6">
          <h2 className="font-heading font-semibold text-xl mb-4">Authorized Signatory</h2>
          <p className="text-sm font-medium" data-testid="authorized-signatory">{po.authorized_signatory}</p>
        </div>
      )}
    </div>
  );
}
