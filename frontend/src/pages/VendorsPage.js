import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Edit, Trash2, X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: ""
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/vendors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVendors(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingVendor) {
        await axios.put(`${API}/vendors/${editingVendor.id}`, formData, { headers });
      } else {
        await axios.post(`${API}/vendors`, formData, { headers });
      }

      closeModal();
      fetchVendors();
    } catch (err) {
      console.error("Failed to save vendor:", err);
      alert("Failed to save vendor");
    }
  };

  const deleteVendor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/vendors/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchVendors();
    } catch (err) {
      console.error("Failed to delete vendor:", err);
      alert("Failed to delete vendor");
    }
  };

  const openModal = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name,
        contact_person: vendor.contact_person,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address
      });
    } else {
      setEditingVendor(null);
      setFormData({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: ""
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingVendor(null);
    setFormData({
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: ""
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
          <h1 className="font-heading font-bold text-4xl tracking-tight text-primary mb-2" data-testid="vendors-title">
            Vendors
          </h1>
          <p className="text-muted-foreground">Manage your supplier information</p>
        </div>
        <button 
          onClick={() => openModal()}
          data-testid="add-vendor-button"
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-sm hover:bg-primary/90"
        >
          <Plus size={18} />
          Add Vendor
        </button>
      </div>

      {vendors.length === 0 ? (
        <div className="bg-card border border-border rounded-sm p-12 text-center" data-testid="no-vendors-message">
          <p className="text-muted-foreground mb-4">No vendors yet</p>
          <button 
            onClick={() => openModal()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-sm hover:bg-primary/90"
          >
            Add Your First Vendor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="vendors-grid">
          {vendors.map((vendor) => (
            <div 
              key={vendor.id} 
              className="bg-card border border-border rounded-sm p-6 hover:shadow-sm transition-shadow"
              data-testid={`vendor-card-${vendor.id}`}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-heading font-semibold text-lg text-foreground">{vendor.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(vendor)}
                    data-testid={`edit-vendor-${vendor.id}`}
                    className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => deleteVendor(vendor.id, vendor.name)}
                    data-testid={`delete-vendor-${vendor.id}`}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Contact Person</p>
                  <p>{vendor.contact_person}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="truncate">{vendor.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p>{vendor.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-xs">{vendor.address}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" data-testid="vendor-modal">
          <div className="bg-card border border-border rounded-sm max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-heading font-semibold text-2xl">
                {editingVendor ? "Edit Vendor" : "Add Vendor"}
              </h2>
              <button 
                onClick={closeModal} 
                data-testid="close-modal-button"
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} data-testid="vendor-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Vendor Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="vendor-name-input"
                    required
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter vendor name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Person *</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    data-testid="contact-person-input"
                    required
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter contact person"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="vendor-email-input"
                    required
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="vendor-phone-input"
                    required
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Address *</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    data-testid="vendor-address-input"
                    required
                    rows={3}
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    placeholder="Enter full address"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  data-testid="cancel-vendor-button"
                  className="px-6 py-2 bg-secondary text-secondary-foreground rounded-sm hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="save-vendor-button"
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-sm hover:bg-primary/90"
                >
                  {editingVendor ? "Update" : "Add"} Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
