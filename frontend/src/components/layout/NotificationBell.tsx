import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Badge } from '../ui';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/notifications';
import type { AppNotification } from '../../types';

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchUnread = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Background poll failure is silent
    }
  };

  useEffect(() => {
    fetchUnread();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const handleToggle = () => {
    setOpen(!open);
    if (!open) {
      fetchUnread();
    }
  };

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.readAt) {
      try {
        await markNotificationRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }
    setOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        type="button"
        className="icon-btn topbar-action-btn"
        title="Notifications"
        aria-label="View notifications"
        onClick={handleToggle}
        style={{ position: 'relative' }}
      >
        <Icon name="bell" size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              background: '#e05c3a',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              minWidth: 16,
              height: 16,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #ffffff',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e8e4dc',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid #f0ede6',
              background: '#faf9f6',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '14px', color: '#1a1a1a' }}>Notifications</strong>
              {unreadCount > 0 && <Badge tone="coral">{unreadCount} new</Badge>}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  color: '#1a6b5e',
                  cursor: 'pointer',
                  fontWeight: 500,
                  padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                No notifications right now
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n._id}
                    onClick={() => handleItemClick(n)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f6f4f0',
                      background: isUnread ? 'rgba(26, 107, 94, 0.04)' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isUnread ? 'rgba(26, 107, 94, 0.08)' : '#faf9f6')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isUnread ? 'rgba(26, 107, 94, 0.04)' : '#ffffff')}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: isUnread ? '#e05c3a' : 'transparent',
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: isUnread ? 600 : 500, color: '#1a1a1a', marginBottom: '2px' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.4, marginBottom: '4px' }}>
                        {n.message}
                      </div>
                      <span style={{ fontSize: '11px', color: '#999' }}>
                        {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #f0ede6',
              background: '#faf9f6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/candidate/notifications');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#1a6b5e',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              View all
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/candidate/settings');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
