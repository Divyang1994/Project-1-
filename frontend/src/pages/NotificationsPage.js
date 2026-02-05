import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Bell, Check, RefreshCw } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setLoading(false);
    }
  };

  const checkPendingPOs = async () => {
    setChecking(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/notifications/check-pending-pos`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.notifications_created > 0) {
        alert(`${response.data.notifications_created} new notifications created!`);
        fetchNotifications();
      } else {
        alert('No new pending POs found.');
      }
    } catch (err) {
      console.error("Failed to check pending POs:", err);
      alert("Failed to check pending POs");
    } finally {
      setChecking(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const confirmMaterialReceipt = async (poId, notificationId) => {
    if (!window.confirm('Confirm that materials have been received in-house?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/purchase-orders/${poId}/confirm-receipt`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await markAsRead(notificationId);
      alert('Material receipt confirmed successfully!');
      navigate(`/purchase-orders/${poId}`);
    } catch (err) {
      console.error("Failed to confirm material receipt:", err);
      alert("Failed to confirm material receipt");
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading font-bold text-4xl tracking-tight text-primary mb-2" data-testid="notifications-title">
            Notifications
          </h1>
          <p className="text-muted-foreground">Material receipt pending alerts for purchase orders</p>
        </div>
        <button 
          onClick={checkPendingPOs}
          disabled={checking}
          data-testid="check-pending-button"
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-sm hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw size={18} className={checking ? "animate-spin" : ""} />
          {checking ? "Checking..." : "Check Pending POs"}
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-card border border-border rounded-sm p-12 text-center" data-testid="no-notifications">
          <Bell size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No notifications</p>
          <p className="text-sm text-muted-foreground">
            Click "Check Pending POs" to scan for purchase orders older than 10 days
          </p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="notifications-list">
          {notifications.map((notification) => (
            <div 
              key={notification.id}
              data-testid={`notification-${notification.id}`}
              className={`bg-card border rounded-sm p-6 ${
                notification.is_read 
                  ? 'border-border opacity-60' 
                  : 'border-primary/30 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Bell size={20} className={notification.is_read ? "text-muted-foreground" : "text-primary"} />
                    <span className="font-mono text-sm font-semibold text-primary">
                      {notification.po_number}
                    </span>
                    {!notification.is_read && (
                      <span className="px-2 py-1 text-xs font-bold uppercase bg-primary/10 text-primary rounded-sm">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-3">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/purchase-orders/${notification.po_id}`)}
                    data-testid={`view-po-${notification.id}`}
                    className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-sm hover:bg-secondary/80"
                  >
                    View PO
                  </button>
                  <button
                    onClick={() => confirmMaterialReceipt(notification.po_id, notification.id)}
                    data-testid={`confirm-receipt-${notification.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90"
                  >
                    <Check size={16} />
                    Confirm Receipt
                  </button>
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      data-testid={`mark-read-${notification.id}`}
                      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-muted/50 border border-border rounded-sm p-6">
        <h3 className="font-heading font-semibold text-lg mb-3">Automatic Notification System</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• The system automatically checks for purchase orders older than 10 days</p>
          <p>• Notifications are created for POs where materials haven't been confirmed as received</p>
          <p>• Click "Check Pending POs" button to manually trigger the check</p>
          <p>• Once you confirm material receipt, the notification will be marked as resolved</p>
          <p className="mt-4 text-xs italic">
            Tip: Set up a daily cron job to call the check-pending-pos endpoint automatically
          </p>
        </div>
      </div>
    </div>
  );
}
