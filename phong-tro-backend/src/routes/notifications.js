const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireAdmin, requireTenant } = require('../middleware/auth');
const { ensureUsersTable } = require('./_dbHelpers');
const { ensureInvoicesTable } = require('./invoices');

const router = express.Router();

async function ensureNotificationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      body TEXT,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const columnsResult = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'notifications'`
  );
  const columns = new Set(columnsResult.rows.map((row) => row.column_name));

  if (!columns.has('body')) {
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT`);
  }
  if (!columns.has('created_by')) {
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL`);
  }
  if (!columns.has('updated_at')) {
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  }
  if (columns.has('message')) {
    await pool.query(`ALTER TABLE notifications ALTER COLUMN message DROP NOT NULL`);
    await pool.query(`UPDATE notifications SET body = COALESCE(body, message) WHERE body IS NULL AND message IS NOT NULL`);
  }
  if (columns.has('type')) {
    await pool.query(`ALTER TABLE notifications ALTER COLUMN type DROP NOT NULL`);
  }

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`);
}

/** Cùng người nhận + tiêu đề + nội dung trong khoảng thời gian → coi là trùng. */
async function hasRecentDuplicateNotification(client, userId, title, body, hours = 24) {
  const r = await client.query(
    `SELECT 1
     FROM notifications
     WHERE user_id = $1
       AND title = $2
       AND COALESCE(body, '') = COALESCE($3, '')
       AND created_at > NOW() - ($4::int * INTERVAL '1 hour')
     LIMIT 1`,
    [userId, String(title).trim(), body ? String(body) : '', Number(hours) || 24]
  );
  return r.rowCount > 0;
}

/** Đã có thông báo nhắc (bất kỳ) gắn mã hóa đơn #id cho user này. */
async function hasInvoiceReminderNotification(client, userId, invoiceId) {
  const needle = `%#${Number(invoiceId)}%`;
  const r = await client.query(
    `SELECT 1
     FROM notifications
     WHERE user_id = $1
       AND (title LIKE $2 OR COALESCE(body, '') LIKE $2)
     LIMIT 1`,
    [userId, needle]
  );
  return r.rowCount > 0;
}

router.get('/tenant/notifications', requireAuth, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureNotificationsTable();

    const result = await pool.query(
      `SELECT notification_id, title, body, is_read, created_at, updated_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY notification_id DESC`,
      [req.auth.sub]
    );

    return res.json({ ok: true, notifications: result.rows });
  } catch (err) {
    console.error('List tenant notifications error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/tenant/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureNotificationsTable();

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid notification id' });
    }

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, updated_at = NOW()
       WHERE notification_id = $1 AND user_id = $2
       RETURNING notification_id`,
      [id, req.auth.sub]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'notification not found' });
    }

    return res.json({ ok: true, message: 'marked as read' });
  } catch (err) {
    console.error('Read notification error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Đánh dấu đã đọc toàn bộ thông báo của khách thuê đang đăng nhập (badge sidebar/chuông). */
router.post('/tenant/notifications/mark-all-read', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureNotificationsTable();

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, updated_at = NOW()
       WHERE user_id = $1 AND is_read = FALSE
       RETURNING notification_id`,
      [req.auth.sub]
    );

    return res.json({ ok: true, marked: result.rowCount });
  } catch (err) {
    console.error('Mark all tenant notifications read error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Đánh dấu đã đọc mọi thông báo gửi **cho tài khoản admin** (để badge sidebar/chuông về 0). */
router.post('/admin/notifications/mark-all-read', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureNotificationsTable();

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, updated_at = NOW()
       WHERE user_id = $1 AND is_read = FALSE
       RETURNING notification_id`,
      [req.auth.sub]
    );

    return res.json({ ok: true, marked: result.rowCount });
  } catch (err) {
    console.error('Mark all admin notifications read error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/admin/notifications', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureNotificationsTable();

    const mode = String(req.query.mode || 'sent').trim().toLowerCase();
    const adminId = req.auth.sub;

    if (mode === 'inbox') {
      const inbox = await pool.query(
        `SELECT
           n.notification_id,
           n.user_id,
           u.full_name,
           u.email,
           n.title,
           n.body,
           n.is_read,
           n.created_at,
           n.updated_at,
           1 AS recipient_count
         FROM notifications n
         LEFT JOIN users u ON u.user_id = n.user_id
         WHERE n.user_id = $1
         ORDER BY n.notification_id DESC`,
        [adminId]
      );
      return res.json({ ok: true, notifications: inbox.rows });
    }

    // sent: gom nhóm broadcast / gửi hàng loạt — admin không thấy N dòng giống nhau
    const result = await pool.query(
      `SELECT
         MIN(n.notification_id) AS notification_id,
         MIN(n.user_id) AS user_id,
         MAX(u.full_name) AS full_name,
         MAX(u.email) AS email,
         n.title,
         n.body,
         BOOL_OR(NOT n.is_read) AS is_read,
         MAX(n.created_at) AS created_at,
         MAX(n.updated_at) AS updated_at,
         COUNT(*)::int AS recipient_count,
         STRING_AGG(DISTINCT COALESCE(NULLIF(TRIM(u.full_name), ''), u.email, 'User #' || u.user_id::text), ', '
           ORDER BY COALESCE(NULLIF(TRIM(u.full_name), ''), u.email, 'User #' || u.user_id::text)) AS recipients_label
       FROM notifications n
       LEFT JOIN users u ON u.user_id = n.user_id
       WHERE n.created_by = $1
       GROUP BY n.title, COALESCE(n.body, ''), DATE_TRUNC('minute', n.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
       ORDER BY MAX(n.created_at) DESC`,
      [adminId]
    );

    return res.json({ ok: true, notifications: result.rows });
  } catch (err) {
    console.error('List admin notifications error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/** Admin xóa một thông báo (gỡ khỏi hộp thư người nhận tương ứng). */
router.delete('/admin/notifications/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureNotificationsTable();

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid notification id' });
    }

    const snap = await pool.query(
      `SELECT title, body, created_by, DATE_TRUNC('minute', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS sent_minute
       FROM notifications WHERE notification_id = $1`,
      [id]
    );
    if (snap.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'notification not found' });
    }
    const row = snap.rows[0];

    const result = await pool.query(
      `DELETE FROM notifications n
       WHERE n.title = $1
         AND COALESCE(n.body, '') = COALESCE($2, '')
         AND (
           ($3::int IS NOT NULL AND n.created_by = $3)
           OR n.notification_id = $4
         )
         AND DATE_TRUNC('minute', n.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $5
       RETURNING notification_id`,
      [row.title, row.body, row.created_by, id, row.sent_minute]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'notification not found' });
    }

    return res.json({ ok: true, message: 'notification deleted', deleted: result.rowCount });
  } catch (err) {
    console.error('Delete notification error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/notifications', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureUsersTable();
    await ensureNotificationsTable();

    const { title, body, user_id } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ ok: false, message: 'title is required' });
    }

    await client.query('BEGIN');

    const trimmedTitle = String(title).trim();
    const trimmedBody = body ? String(body) : null;

    if (user_id) {
      const uid = Number(user_id);
      if (await hasRecentDuplicateNotification(client, uid, trimmedTitle, trimmedBody)) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          ok: false,
          message: 'duplicate notification for this user within 24 hours',
        });
      }
      const result = await client.query(
        `INSERT INTO notifications (user_id, title, body, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING notification_id, user_id, title, body, is_read, created_at, updated_at`,
        [uid, trimmedTitle, trimmedBody, req.auth.sub]
      );
      await client.query('COMMIT');
      return res.status(201).json({ ok: true, notification: result.rows[0] });
    }

    // broadcast: insert a notification per active user (bỏ qua người đã có cùng nội dung 24h)
    const users = await client.query(`SELECT user_id FROM users WHERE is_active = TRUE`);
    let sent = 0;
    let skipped = 0;
    for (const u of users.rows) {
      if (await hasRecentDuplicateNotification(client, u.user_id, trimmedTitle, trimmedBody)) {
        skipped += 1;
        continue;
      }
      await client.query(
        `INSERT INTO notifications (user_id, title, body, created_by)
         VALUES ($1, $2, $3, $4)`,
        [u.user_id, trimmedTitle, trimmedBody, req.auth.sub]
      );
      sent += 1;
    }

    await client.query('COMMIT');
    return res.status(201).json({
      ok: true,
      message: 'broadcast sent',
      recipients: sent,
      skipped_duplicates: skipped,
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('Create notification error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

/**
 * Gửi thông báo cho khách: hóa đơn chưa thanh toán (i) quá hạn so với due_date,
 * hoặc (ii) đến hạn hôm nay / ngày mai (VN) — tránh spam: không gửi lại nếu đã có thông báo cùng hóa đơn trong 18h.
 */
router.post(
  '/admin/notifications/send-invoice-due-reminders',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const client = await pool.connect();
    try {
      await ensureUsersTable();
      await ensureNotificationsTable();
      await ensureInvoicesTable();

      const vnTodayExpr = `(timezone('Asia/Ho_Chi_Minh', now()))::date`;

      const list = await client.query(
        `SELECT
           i.invoice_id,
           i.due_date,
           i.total_amount,
           i.status,
           u.user_id,
           COALESCE(r.room_number::text, '') AS room_number,
           (i.due_date < ${vnTodayExpr}) AS is_overdue
         FROM invoices i
         JOIN tenants t ON t.tenant_id = i.tenant_id
         JOIN users u ON u.user_id = t.user_id
         LEFT JOIN contracts c ON c.contract_id = i.contract_id
         LEFT JOIN rooms r ON r.room_id = c.room_id
         WHERE UPPER(TRIM(i.status::text)) NOT IN ('PAID', 'CANCELLED')
           AND (
             i.due_date < ${vnTodayExpr}
             OR (
               i.due_date >= ${vnTodayExpr}
               AND i.due_date <= ${vnTodayExpr} + interval '1 day'
             )
           )
           AND NOT EXISTS (
             SELECT 1
             FROM notifications n
             WHERE n.user_id = u.user_id
               AND (
                 n.title LIKE '%#' || i.invoice_id::text || '%'
                 OR COALESCE(n.body, '') LIKE '%#' || i.invoice_id::text || '%'
               )
           )
         ORDER BY i.due_date ASC, i.invoice_id ASC`
      );

      let sent = 0;
      let skipped = 0;
      let overdue = 0;
      let dueSoon = 0;

      await client.query('BEGIN');
      for (const row of list.rows) {
        if (await hasInvoiceReminderNotification(client, row.user_id, row.invoice_id)) {
          skipped += 1;
          continue;
        }

        const due = row.due_date ? new Date(row.due_date).toLocaleDateString('vi-VN') : '—';
        const amt = Number(row.total_amount || 0).toLocaleString('vi-VN');
        const room = row.room_number ? `Phòng ${row.room_number}` : '—';
        const isOverdue = Boolean(row.is_overdue);
        if (isOverdue) overdue += 1;
        else dueSoon += 1;

        const title = isOverdue
          ? `[Quá hạn] Hóa đơn #${row.invoice_id}`
          : `[Sắp đến hạn] Hóa đơn #${row.invoice_id}`;
        const body = isOverdue
          ? `Hóa đơn #${row.invoice_id} (${room}) đã quá hạn thanh toán (hạn ${due}). Số tiền: ${amt}đ. Vui lòng thanh toán sớm tại mục Thanh toán trên ứng dụng.`
          : `Hóa đơn #${row.invoice_id} (${room}) sắp đến hạn thanh toán (hạn ${due}). Số tiền: ${amt}đ. Vui lòng hoàn tất thanh toán đúng hạn.`;

        await client.query(
          `INSERT INTO notifications (user_id, title, body, created_by)
           VALUES ($1, $2, $3, $4)`,
          [row.user_id, title, body, req.auth.sub]
        );
        sent += 1;
      }
      await client.query('COMMIT');

      return res.json({
        ok: true,
        sent,
        skipped_duplicates: skipped,
        eligible: list.rowCount,
        overdue,
        dueSoon,
        message:
          sent === 0
            ? skipped > 0
              ? 'Không gửi thêm — các hóa đơn này đã có thông báo nhắc trước đó.'
              : 'Không có hóa đơn cần nhắc.'
            : `Đã gửi ${sent} thông báo nhắc nợ${skipped > 0 ? ` (bỏ qua ${skipped} hóa đơn đã nhắc).` : '.'}`,
      });
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (e) {}
      console.error('send-invoice-due-reminders error:', err);
      return res.status(500).json({ ok: false, message: 'internal error' });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
