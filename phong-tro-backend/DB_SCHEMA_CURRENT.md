# Database Schema Current

Schema duoi day duoc xuat tu database PostgreSQL hien tai cua du an tai thoi diem `2026-05-05`.

## Summary

| Table | Estimated rows |
| --- | ---: |
| `assets` | 0 |
| `contract_service_fees` | 0 |
| `contracts` | 2 |
| `incidents` | 0 |
| `invoice_service_fees` | 0 |
| `invoices` | 0 |
| `notifications` | 0 |
| `payments` | 0 |
| `rooms` | 0 |
| `service_fees` | 0 |
| `tenants` | 0 |
| `users` | 3 |
| `utility_readings` | 0 |

## assets

| Column | Type | Nullable | Key | Reference | Default |
| --- | --- | --- | --- | --- | --- |
| `asset_id` | `integer` | No | `PK` |  | `nextval('assets_asset_id_seq'::regclass)` |
| `room_id` | `integer` | Yes |  | `rooms.room_id` |  |
| `name` | `character varying` | No |  |  |  |
| `quantity` | `integer` | No |  |  | `1` |
| `status` | `asset_status` | No |  |  | `'OK'::asset_status` |
| `note` | `text` | Yes |  |  |  |
| `created_at` | `timestamp with time zone` | No |  |  | `now()` |
| `updated_at` | `timestamp with time zone` | No |  |  | `now()` |

## contract_service_fees

| Column | Type | Nullable | Key | Reference | Default |
| --- | --- | --- | --- | --- | --- |
| `id` | `integer` | No | `PK` |  | `nextval('contract_service_fees_id_seq'::regclass)` |
| `contract_id` | `integer` | No |  | `contracts.contract_id` |  |
| `fee_id` | `integer` | No |  | `service_fees.fee_id` |  |
| `agreed_price` | `numeric` | No |  |  |  |

## contracts

| Column | Type | Nullable | Key | Reference | Default |
| --- | --- | --- | --- | --- | --- |
| `contract_id` | `integer` | No | `PK` |  | `nextval('contracts_contract_id_seq'::regclass)` |
| `room_id` | `integer` | No |  | `rooms.room_id` |  |
| `tenant_id` | `integer` | No |  | `tenants.tenant_id` |  |
| `created_by` | `integer` | No |  | `users.user_id` |  |
| `start_date` | `date` | No |  |  |  |
| `end_date` | `date` | Yes |  |  |  |
| `deposit` | `numeric` | No |  |  | `0` |
| `status` | `contract_status` | No |  |  | `'ACTIVE'::contract_status` |
| `created_at` | `timestamp without time zone` | No |  |  | `now()` |
| `updated_at` | `timestamp without time zone` | No |  |  | `now()` |
| `rent_price` | `numeric` | No |  |  | `0` |
| `notes` | `text` | Yes |  |  |  |

## incidents

| Column | Type | Nullable | Key | Reference | Default |
| --- | --- | --- | --- | --- | --- |
| `incident_id` | `integer` | No | `PK` |  | `nextval('incidents_incident_id_seq'::regclass)` |
| `room_id` | `integer` | No |  | `rooms.room_id` |  |
| `reported_by` | `integer` | No |  | `users.user_id` |  |
| `assigned_to` | `integer` | Yes |  | `users.user_id` |  |
| `title` | `character varying` | No |  |  |  |
| `status` | `incident_status` | No |  |  | `'PENDING'::incident_status` |
| `image_url` | `character varying` | Yes |  |  |  |
| `created_at` | `timestamp without time zone` | No |  |  | `now()` |
| `updated_at` | `timestamp without time zone` | No |  |  | `now()` |

## invoice_service_fees

| Column | Type | Nullable | Key | Reference | Default |
| --- | --- | --- | --- | --- | --- |
| `id` | `integer` | No | `PK` |  | `nextval('invoice_service_fees_id_seq'::regclass)` |
| `invoice_id` | `integer` | No |  | `invoices.invoice_id` |  |
| `fee_id` | `integer` | No |  | `service_fees.fee_id` |  |
| `amount` | `numeric` | No |  |  |  |

## invoices

| Column | Type | Nullable | Key | Reference | Default |
| --- | --- | --- | --- | --- | --- |
| `invoice_id` | `integer` | No | `PK` |  | `nextval('invoices_invoice_id_seq'::regclass)` |
| `contract_id` | `integer` | No |  | `contracts.contract_id` |  |
| `tenant_id` | `integer` | No |  | `tenants.tenant_id` |  |
| `billing_month` | `date` | No |  |  |  |
| `due_date` | `date` | No |  |  |  |
| `rent_amount` | `numeric` | No |  |  | `0` |
| `electricity_amount` | `numeric` | No |  |  | `0` |
| `water_amount` | `numeric` | No |  |  | `0` |
| `other_fees_amount` | `numeric` | No |  |  | `0` |
| `total_amount` | `numeric` | No |  |  |  |
| `status` | `invoice_status` | No |  |  | `'UNPAID'::invoice_status` |
| `created_by` | `integer` | No |  | `users.user_id` |  |
| `created_at` | `timestamp with time zone` | No |  |  | `now()` |

## notifications

| Column | Type | Nullable | Key | Reference | Default |
| --- | --- | --- | --- | --- | --- |
| `notification_id` | `integer` | No | `PK` |  | `nextval('notifications_notification_id_seq'::regclass)` |
| `user_id` | `integer` | No |  | `users.user_id` |  |
| `type` | `notification_type` | Yes |  |  |  |
| `title` | `character varying` | No |  |  |  |
| `message` | `text` | Yes |  |  |  |
| `reference_id` | `integer` | Yes |  |  |  |
| `reference_type` | `character varying` | Yes |  |  |  |
| `is_read` | `boolean` | No |  |  | `false` |
| `created_at` | `timestamp without time zone` | No |  |  | `now()` |
| `created_by` | `integer` | Yes |  | `users.user_id` |  |
| `updated_at` | `timestamp with time zone` | No |  |  | `now()` |

## payments

| Column | Type | Nullable | Key | Reference | Default |
| --- | --- | --- | --- | --- | --- |
| `payment_id` | `integer` | No | `PK` |  | `nextval('payments_payment_id_seq'::regclass)` |
| `invoice_id` | `integer` | No |  | `invoices.invoice_id` |  |
| `amount_paid` | `numeric` | No |  |  |  |
| `payment_method` | `payment_method` | No |  |  |  |
| `note` | `text` | Yes |  |  |  |
| `recorded_by` | `integer` | No |  | `users.user_id` |  |
| `paid_at` | `timestamp without time zone` | No |  |  | `now()` |

## rooms

| Column | Type | Nullable | Key | Reference | Default |
| --- | --- | --- | --- | --- | --- |
| `room_id` | `integer` | No | `PK` |  | `nextval('rooms_room_id_seq'::regclass)` |
| `room_number` | `character varying` | No |  |  |  |
| `floor` | `smallint` | Yes |  |  |  |
| `area` | `numeric` | No |  |  |  |
| `max_tenants` | `smallint` | No |  |  | `1` |
| `price` | `numeric` | No |  |  |  |
| `status` | `room_status` | No |  |  | `'AVAILABLE'::room_status` |
| `description` | `text` | Yes |  |  |  |
| `created_at` | `timestamp without time zone` | No |  |  | `now()` |
| `updated_at` | `timestamp without time zone` | No |  |  | `now()` |

## service_fees

| Column | Type | Nullable | Key | Reference | Default |
| --- | --- | --- | --- | --- | --- |
| `fee_id` | `integer` | No | `PK` |  | `nextval('service_fees_fee_id_seq'::regclass)` |
| `fee_name` | `character varying` | No |  |  |  |
| `description` | `text` | Yes |  |  |  |
| `unit_price` | `numeric` | No |  |  |  |
| `unit` | `character varying` | No |  |  |  |
| `fee_type` | `fee_type` | No |  |  |  |
| `is_active` | `boolean` | No |  |  | `true` |

## tenants

| Column | Type | Nullable | Key | Reference | Default |
| --- | --- | --- | --- | --- | --- |
| `tenant_id` | `integer` | No | `PK` |  | `nextval('tenants_tenant_id_seq'::regclass)` |
| `user_id` | `integer` | No |  | `users.user_id` |  |
| `phone` | `character varying` | Yes |  |  |  |
| `room_id` | `integer` | Yes |  | `rooms.room_id` |  |
| `created_at` | `timestamp with time zone` | No |  |  | `now()` |
| `updated_at` | `timestamp with time zone` | No |  |  | `now()` |

## users

| Column | Type | Nullable | Key | Reference | Default |
| --- | --- | --- | --- | --- | --- |
| `user_id` | `integer` | No | `PK` |  | `nextval('users_user_id_seq'::regclass)` |
| `username` | `character varying` | No |  |  |  |
| `full_name` | `character varying` | No |  |  |  |
| `email` | `character varying` | Yes |  |  |  |
| `phone` | `character varying` | Yes |  |  |  |
| `cccd` | `character varying` | Yes |  |  |  |
| `role` | `user_role` | No |  |  |  |
| `is_active` | `boolean` | No |  |  | `true` |
| `created_at` | `timestamp without time zone` | No |  |  | `now()` |
| `updated_at` | `timestamp without time zone` | No |  |  | `now()` |
| `password_hash` | `text` | No |  |  |  |

## utility_readings

| Column | Type | Nullable | Key | Reference | Default |
| --- | --- | --- | --- | --- | --- |
| `reading_id` | `integer` | No | `PK` |  | `nextval('utility_readings_reading_id_seq'::regclass)` |
| `room_id` | `integer` | No |  | `rooms.room_id` |  |
| `contract_id` | `integer` | No |  | `contracts.contract_id` |  |
| `billing_month` | `date` | No |  |  |  |
| `electricity_old` | `numeric` | No |  |  | `0` |
| `electricity_new` | `numeric` | No |  |  |  |
| `electricity_img` | `character varying` | Yes |  |  |  |
| `water_old` | `numeric` | No |  |  | `0` |
| `water_new` | `numeric` | No |  |  |  |
| `water_img` | `character varying` | Yes |  |  |  |
| `recorded_by` | `integer` | No |  | `users.user_id` |  |
| `recorded_at` | `timestamp without time zone` | No |  |  | `now()` |
