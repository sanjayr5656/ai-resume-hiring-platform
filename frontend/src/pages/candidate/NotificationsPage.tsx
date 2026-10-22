import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button, Badge, Icon } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/notifications';
import type { AppNotification } from '../../types';

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkOne = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      toast('Could not mark notification read', 'error');
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
      toast('All notifications marked as read');
    } catch {
      toast('Failed to mark all as read', 'error');
    }
  };

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.readAt : true));

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 16px' }}>
      <PageHeader
        title="Notifications"
        text="Stay updated on your application status changes, shortlists, and matching role alerts."
        action={
          unreadCount > 0 ? (
            <Button variant="secondary" onClick={handleMarkAll}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          type="button"
          className={`chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          className={`chip ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ color: '#1a6b5e', marginBottom: '12px' }}>
            <Icon name="bell" size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '6px' }}>
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p style={{ color: '#666', fontSize: '14px', maxWidth: 420, margin: '0 auto' }}>
            You will receive instant alerts here whenever a recruiter reviews or updates your application status.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((n) => {
            const isUnread = !n.readAt;
            return (
              <Card
                key={n._id}
                style={{
                  padding: '16px 20px',
                  background: isUnread ? '#ffffff' : '#faf9f6',
                  borderLeft: isUnread ? '4px solid #1a6b5e' : '1px solid #e8e4dc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '15px', color: '#1a1a1a' }}>{n.title}</strong>
                    {isUnread && <Badge tone="coral">New</Badge>}
                  </div>
                  <p style={{ fontSize: '13px', color: '#555', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    {new Date(n.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {n.link && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (isUnread) handleMarkOne(n._id);
                        navigate(n.link!);
                      }}
                    >
                      View
                    </Button>
                  )}
                  {isUnread && (
                    <Button
                      variant="ghost"
                      onClick={() => handleMarkOne(n._id)}
                      ariaLabel="Mark as read"
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
