-- constraint_db.sql
-- Muc tieu:
-- 1) Tu dong cap nhat updated_at bang trigger
-- 2) Bo sung index cho cac cot join/filter pho bien
-- 3) Noi rang buoc email users (khong gioi han chi @gmail.com)

BEGIN;

-- =========================================================
-- 1) Trigger auto updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_rooms ON rooms;
CREATE TRIGGER trg_set_updated_at_rooms
BEFORE UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_users ON users;
CREATE TRIGGER trg_set_updated_at_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_contracts ON contracts;
CREATE TRIGGER trg_set_updated_at_contracts
BEFORE UPDATE ON contracts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 2) Index toi thieu cho join/filter
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_room_id ON contracts(room_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by ON payments(recorded_by);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);

CREATE INDEX IF NOT EXISTS idx_utility_readings_room_id ON utility_readings(room_id);
CREATE INDEX IF NOT EXISTS idx_utility_readings_contract_id ON utility_readings(contract_id);
CREATE INDEX IF NOT EXISTS idx_utility_readings_recorded_by ON utility_readings(recorded_by);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_incidents_room_id ON incidents(room_id);
CREATE INDEX IF NOT EXISTS idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);

-- =========================================================
-- 3) Noi rang buoc email users
-- =========================================================
-- Cu: chi cho phep @gmail.com
-- Moi: cho phep domain hop le bat ky
ALTER TABLE users
DROP CONSTRAINT IF EXISTS chk_users_email;

ALTER TABLE users
ADD CONSTRAINT chk_users_email
CHECK (
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

COMMIT;

-- Neu muon rollback thu cong:
-- ROLLBACK;
