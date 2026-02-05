import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, Save } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CreatePurchaseOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    vendor_id: "",
    vendor_name: "",
    delivery_date: "",
    payment_terms: "Net 30",
    shipping_address: "",
    notes: "",
    authorized_signatory: "",
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [vendorsRes, productsRes] = await Promise.all([
        axios.get(`${API}/vendors`, { headers }),
        axios.get(`${API}/products`, { headers })
      ]);

      setVendors(vendorsRes.data);
      setProducts(productsRes.data);

      if (isEdit) {
        const poRes = await axios.get(`${API}/purchase-orders/${id}`, { headers });
        const po = poRes.data;
        setFormData({
          vendor_id: po.vendor_id,
          vendor_name: po.vendor_name,
          delivery_date: po.delivery_date,
          payment_terms: po.payment_terms,
          shipping_address: po.shipping_address,
          notes: po.notes,
          authorized_signatory: po.authorized_signatory || "",
          items: po.items,
          subtotal: po.subtotal,
          tax: po.tax,
          total: po.total
        });
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setLoading(false);
    }
  };

  const handleVendorChange = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      setFormData({
        ...formData,
        vendor_id: vendorId,
        vendor_name: vendor.name,
        shipping_address: vendor.address
      });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { product_id: "", product_name: "", quantity: 1, unit_price: 0, tax_rate: 18, tax_amount: 0, total: 0 }
      ]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    
    if (field === "product_id") {
      const product = products.find(p => p.id === value);
      if (product) {
        const itemSubtotal = product.unit_price * newItems[index].quantity;
        const taxAmount = itemSubtotal * (product.tax_rate / 100);
        newItems[index] = {
          ...newItems[index],
          product_id: value,
          product_name: product.name,
          unit_price: product.unit_price,
          tax_rate: product.tax_rate,
          tax_amount: taxAmount,
          total: itemSubtotal + taxAmount
        };
      }
    } else if (field === "quantity") {
      newItems[index].quantity = parseFloat(value) || 0;
      const itemSubtotal = newItems[index].quantity * newItems[index].unit_price;
      newItems[index].tax_amount = itemSubtotal * (newItems[index].tax_rate / 100);
      newItems[index].total = itemSubtotal + newItems[index].tax_amount;
    } else if (field === "unit_price") {
      newItems[index].unit_price = parseFloat(value) || 0;
      const itemSubtotal = newItems[index].quantity * newItems[index].unit_price;
      newItems[index].tax_amount = itemSubtotal * (newItems[index].tax_rate / 100);
      newItems[index].total = itemSubtotal + newItems[index].tax_amount;
    } else if (field === "tax_rate") {
      newItems[index].tax_rate = parseFloat(value) || 0;
      const itemSubtotal = newItems[index].quantity * newItems[index].unit_price;
      newItems[index].tax_amount = itemSubtotal * (newItems[index].tax_rate / 100);
      newItems[index].total = itemSubtotal + newItems[index].tax_amount;
    }

    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems);
  };

  const calculateTotals = (items) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = subtotal + tax;
    setFormData(prev => ({ ...prev, subtotal, tax, total }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vendor_id) {
      alert("Please select a vendor");
      return;
    }

    if (formData.items.length === 0) {
      alert("Please add at least one item");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (isEdit) {
        await axios.put(`${API}/purchase-orders/${id}`, formData, { headers });
      } else {
        await axios.post(`${API}/purchase-orders`, formData, { headers });
      }

      navigate('/purchase-orders');
    } catch (err) {
      console.error("Failed to save PO:", err);
      alert("Failed to save purchase order");
      setSaving(false);
    }
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
      <div className="mb-8">
        <h1 className="font-heading font-bold text-4xl tracking-tight text-primary mb-2" data-testid="create-po-title">
          {isEdit ? "Edit Purchase Order" : "Create Purchase Order"}
        </h1>
        <p className="text-muted-foreground">Fill in the details below</p>
      </div>

      <form onSubmit={handleSubmit} data-testid="po-form">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-sm p-6">
              <h2 className="font-heading font-semibold text-xl mb-4">Vendor Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Vendor *</label>
                  <select
                    value={formData.vendor_id}
                    onChange={(e) => handleVendorChange(e.target.value)}
                    data-testid="vendor-select"
                    required
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select a vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Delivery Date *</label>
                  <input
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                    data-testid="delivery-date-input"
                    required
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Terms *</label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    data-testid="payment-terms-select"
                    required
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Net 90">Net 90</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="COD">COD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Shipping Address *</label>
                  <input
                    type="text"
                    value={formData.shipping_address}
                    onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                    data-testid="shipping-address-input"
                    required
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter shipping address"
                  />
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading font-semibold text-xl">Line Items</h2>
                <button
                  type="button"
                  onClick={addItem}
                  data-testid="add-item-button"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-sm hover:bg-primary/90"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="no-items-message">
                  No items added yet. Click "Add Item" to start.
                </div>
              ) : (
                <div className="space-y-4" data-testid="items-list">
                  {formData.items.map((item, index) => (
                    <div key={index} className="border border-border rounded-sm p-4" data-testid={`item-${index}`}>
                      <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-12 md:col-span-4">
                          <label className="block text-xs font-medium mb-1">Product</label>
                          <select
                            value={item.product_id}
                            onChange={(e) => updateItem(index, "product_id", e.target.value)}
                            data-testid={`product-select-${index}`}
                            required
                            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">Select product</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - ₹{product.unit_price} ({product.tax_rate}% tax)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <label className="block text-xs font-medium mb-1">Quantity</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                            data-testid={`quantity-input-${index}`}
                            required
                            min="1"
                            step="1"
                            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <label className="block text-xs font-medium mb-1">Unit Price</label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                            data-testid={`unit-price-input-${index}`}
                            required
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-1">
                          <label className="block text-xs font-medium mb-1">Tax %</label>
                          <input
                            type="number"
                            value={item.tax_rate}
                            onChange={(e) => updateItem(index, "tax_rate", e.target.value)}
                            data-testid={`tax-rate-input-${index}`}
                            required
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="col-span-7 md:col-span-2">
                          <label className="block text-xs font-medium mb-1">Total</label>
                          <input
                            type="text"
                            value={`₹${item.total.toFixed(2)}`}
                            readOnly
                            data-testid={`item-total-${index}`}
                            className="w-full px-3 py-2 text-sm bg-muted border border-input rounded-sm font-mono"
                          />
                        </div>
                        <div className="col-span-5 md:col-span-1">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            data-testid={`remove-item-${index}`}
                            className="w-full p-2 text-destructive hover:bg-destructive/10 rounded-sm transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-sm p-6">
              <h2 className="font-heading font-semibold text-xl mb-4">Additional Information</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Authorized Signatory</label>
                <input
                  type="text"
                  value={formData.authorized_signatory}
                  onChange={(e) => setFormData({ ...formData, authorized_signatory: e.target.value })}
                  data-testid="authorized-signatory-input"
                  className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter name of authorized person"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="notes-textarea"
                  rows={4}
                  className="w-full px-4 py-3 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Add any additional notes or instructions..."
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-sm p-6 sticky top-8">
              <h2 className="font-heading font-semibold text-xl mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-mono font-medium" data-testid="subtotal-display">
                    ₹{formData.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tax (GST)</span>
                  <span className="font-mono font-medium" data-testid="tax-display">
                    ₹{formData.tax.toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="font-heading font-semibold text-lg">Total</span>
                  <span className="font-mono font-bold text-2xl text-primary" data-testid="total-display">
                    ₹{formData.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={saving}
                  data-testid="save-po-button"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  {saving ? "Saving..." : (isEdit ? "Update Purchase Order" : "Create Purchase Order")}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/purchase-orders')}
                  data-testid="cancel-button"
                  className="w-full px-6 py-3 bg-secondary text-secondary-foreground font-medium rounded-sm hover:bg-secondary/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
