import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Edit, Trash2, X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    unit_price: "",
    unit_of_measure: "pcs"
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        ...formData,
        unit_price: parseFloat(formData.unit_price)
      };

      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, payload, { headers });
      } else {
        await axios.post(`${API}/products`, payload, { headers });
      }

      closeModal();
      fetchProducts();
    } catch (err) {
      console.error("Failed to save product:", err);
      alert("Failed to save product");
    }
  };

  const deleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProducts();
    } catch (err) {
      console.error("Failed to delete product:", err);
      alert("Failed to delete product");
    }
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku,
        description: product.description,
        unit_price: product.unit_price.toString(),
        unit_of_measure: product.unit_of_measure
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        sku: "",
        description: "",
        unit_price: "",
        unit_of_measure: "pcs"
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      description: "",
      unit_price: "",
      unit_of_measure: "pcs"
    });
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
          <h1 className="font-heading font-bold text-4xl tracking-tight text-primary mb-2" data-testid="products-title">
            Products
          </h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <button 
          onClick={() => openModal()}
          data-testid="add-product-button"
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-sm hover:bg-primary/90"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="bg-card border border-border rounded-sm p-12 text-center" data-testid="no-products-message">
          <p className="text-muted-foreground mb-4">No products yet</p>
          <button 
            onClick={() => openModal()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-sm hover:bg-primary/90"
          >
            Add Your First Product
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="products-table">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    UOM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr 
                    key={product.id} 
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                    data-testid={`product-row-${product.id}`}
                  >
                    <td className="px-6 py-4 font-mono text-sm">{product.sku}</td>
                    <td className="px-6 py-4 text-sm font-medium">{product.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                      {product.description}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">${product.unit_price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm uppercase">{product.unit_of_measure}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal(product)}
                          data-testid={`edit-product-${product.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id, product.name)}
                          data-testid={`delete-product-${product.id}`}
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
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" data-testid="product-modal">
          <div className="bg-card border border-border rounded-sm max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-heading font-semibold text-2xl">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>
              <button 
                onClick={closeModal} 
                data-testid="close-modal-button"
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} data-testid="product-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="product-name-input"
                    required
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SKU *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    data-testid="product-sku-input"
                    required
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter SKU"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Unit Price *</label>
                  <input
                    type="number"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    data-testid="product-price-input"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Unit of Measure *</label>
                  <select
                    value={formData.unit_of_measure}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    data-testid="product-uom-select"
                    required
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="lbs">Pounds (lbs)</option>
                    <option value="m">Meters (m)</option>
                    <option value="ft">Feet (ft)</option>
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    data-testid="product-description-input"
                    required
                    rows={3}
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    placeholder="Enter product description"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  data-testid="cancel-product-button"
                  className="px-6 py-2 bg-secondary text-secondary-foreground rounded-sm hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="save-product-button"
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-sm hover:bg-primary/90"
                >
                  {editingProduct ? "Update" : "Add"} Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
