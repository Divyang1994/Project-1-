import { useState } from "react";
import { X, Check } from "lucide-react";

export const ItemReceiptModal = ({ item, itemIndex, poId, onClose, onConfirm }) => {
  const [quantityReceived, setQuantityReceived] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const pendingQuantity = item.quantity - (item.quantity_received || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const qty = parseFloat(quantityReceived);
    if (isNaN(qty) || qty <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    if (qty > pendingQuantity) {
      setError(`Cannot receive more than pending quantity (${pendingQuantity})`);
      return;
    }

    if (!receivedBy.trim()) {
      setError("Please enter received by name");
      return;
    }

    onConfirm({
      item_index: itemIndex,
      quantity_received: qty,
      received_by: receivedBy,
      notes: notes
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" data-testid="receipt-modal">
      <div className="bg-card border border-border rounded-sm max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-heading font-semibold text-2xl">Confirm Material Receipt</h2>
          <button 
            onClick={onClose}
            data-testid="close-receipt-modal"
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-muted/50 rounded-sm">
          <h3 className="font-medium mb-2">{item.product_name}</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Ordered</p>
              <p className="font-mono font-bold">{item.quantity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Received</p>
              <p className="font-mono font-bold text-green-600">{item.quantity_received || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="font-mono font-bold text-orange-600">{pendingQuantity}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} data-testid="receipt-form">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Quantity Received * (Max: {pendingQuantity})
              </label>
              <input
                type="number"
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(e.target.value)}
                data-testid="quantity-received-input"
                required
                min="0.01"
                max={pendingQuantity}
                step="0.01"
                className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter quantity received"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Received By *</label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                data-testid="received-by-input"
                required
                className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter name of person receiving"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="receipt-notes-input"
                rows={3}
                className="w-full px-4 py-2.5 bg-background border border-input rounded-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                placeholder="Add any notes about this delivery..."
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-sm" data-testid="receipt-error">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              data-testid="cancel-receipt"
              className="px-6 py-2 bg-secondary text-secondary-foreground rounded-sm hover:bg-secondary/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="submit-receipt"
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-sm hover:bg-primary/90"
            >
              <Check size={18} />
              Confirm Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
