-- ============================================================
-- OSWAGO ELECTRICAL EQUIPMENT - Complete Schema
-- Version: 1.4
-- Date: 2026-09-24
-- ============================================================
-- Recreates the entire database from an empty project.
-- Run in Supabase SQL Editor.
--
-- Changelog from v1.3:
--   * businesses.subscription_started_at (date) - start of the
--     current subscription or trial period. Used by the admin
--     panel to display "X of Y days left".
--   * signup_atomic sets subscription_started_at on signup.
--   * signup_atomic trial window is +13 days so the customer
--     gets exactly 14 inclusive days of trial.
--
-- Changelog from v1.2:
--   * businesses.trial_ends_at (date)
--   * businesses.subscription_status (text, default 'trial')
--   * businesses.billing_contact_email (placeholder for reminders)
--   * businesses_subscription_status_check constraint
--   * payment_submissions table + indexes
--   * signup_atomic RPC (Boss + Business + Branch in one transaction)
--
-- Changelog from v1.1:
--   * businesses.quick_sale_enabled (boolean, default false)
--   * products_branch_name_lower_key unique index
--   * create_order_atomic updated: new_customer + payment blocks
--   * sum_realized_profit RPC (realized profit, VAT excluded)
--   * cancel_order_atomic RPC
--   * record_payment_atomic RPC
--   * receive_purchase_order_atomic RPC
--   * update_purchase_order_items_atomic RPC
--   * create_product_atomic RPC
--   * adjust_stock_atomic RPC
--   * confirm_order_atomic RPC
-- ============================================================


-- ============================================================
-- PART 1: CORE TABLES
-- ============================================================

-- ------------------------------------------------------------
-- 1.1 users
-- ------------------------------------------------------------
CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name varchar(255) NOT NULL,
    email varchar(255) NOT NULL UNIQUE,
    password_hash varchar(255) NOT NULL,
    phone varchar(20),
    role varchar(50) NOT NULL DEFAULT 'cashier',
    business_id uuid,
    branch_id uuid,
    account_code varchar(20),
    is_active boolean DEFAULT true,
    is_first_login boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_by uuid REFERENCES public.users(id),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    deleted_by uuid REFERENCES public.users(id),
    deletion_reason text
);

CREATE INDEX users_email_idx ON public.users(email);
CREATE INDEX users_business_idx ON public.users(business_id);
CREATE INDEX users_branch_idx ON public.users(branch_id);

-- ------------------------------------------------------------
-- 1.2 businesses
-- ------------------------------------------------------------
CREATE TABLE public.businesses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES public.users(id),
    name varchar(255) NOT NULL,
    shop_name varchar(255) NOT NULL,
    business_code varchar(20),
    location text,
    phone varchar(20),
    email varchar(255),
    currency varchar(10) DEFAULT 'TZS',
    tin varchar(50),
    vrn varchar(50),
    vat_enabled boolean DEFAULT false,
    vat_rate numeric DEFAULT 18,
    quick_sale_enabled boolean DEFAULT false,
    expense_categories jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    trial_ends_at date,
    subscription_started_at date,
    subscription_status text DEFAULT 'trial',
    billing_contact_email varchar(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE INDEX businesses_owner_idx ON public.businesses(owner_id);

ALTER TABLE public.businesses
    ADD CONSTRAINT businesses_subscription_status_check
    CHECK (subscription_status IN ('trial', 'active', 'expired', 'suspended'));

-- ------------------------------------------------------------
-- 1.3 branches
-- ------------------------------------------------------------
CREATE TABLE public.branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    location text,
    phone varchar(20),
    email varchar(255),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE INDEX branches_business_idx ON public.branches(business_id);

-- Back-references on users now that businesses/branches exist
ALTER TABLE public.users
ADD CONSTRAINT users_business_id_fkey
FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;

ALTER TABLE public.users
ADD CONSTRAINT users_branch_id_fkey
FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


-- ============================================================
-- PART 2: OPERATIONAL TABLES
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 categories
-- ------------------------------------------------------------
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name varchar(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    UNIQUE (branch_id, name)
);

CREATE INDEX categories_branch_idx ON public.categories(branch_id);

-- ------------------------------------------------------------
-- 2.2 suppliers
-- ------------------------------------------------------------
CREATE TABLE public.suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    contact_person varchar(255),
    phone varchar(20),
    email varchar(255),
    address text,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE INDEX suppliers_branch_idx ON public.suppliers(branch_id);

-- ------------------------------------------------------------
-- 2.3 products
-- ------------------------------------------------------------
CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    description text,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    sku varchar(100),
    cost_price numeric NOT NULL,
    selling_price numeric NOT NULL,
    stock_quantity integer DEFAULT 0,
    low_stock_threshold integer DEFAULT 5,
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    UNIQUE (branch_id, sku)
);

CREATE INDEX products_branch_idx ON public.products(branch_id);
CREATE INDEX products_category_idx ON public.products(category_id);
CREATE INDEX products_supplier_idx ON public.products(supplier_id);

-- ------------------------------------------------------------
-- 2.4 customers
-- ------------------------------------------------------------
CREATE TABLE public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    phone varchar(20) NOT NULL,
    email varchar(255),
    address text,
    notes text,
    total_orders integer DEFAULT 0,
    total_spent numeric DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    UNIQUE (branch_id, phone)
);

CREATE INDEX customers_branch_idx ON public.customers(branch_id);

-- ------------------------------------------------------------
-- 2.5 orders
-- ------------------------------------------------------------
CREATE TABLE public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    order_number varchar(50) NOT NULL,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    subtotal numeric NOT NULL,
    tax_amount numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    total_amount numeric NOT NULL,
    paid_amount numeric DEFAULT 0,
    order_status varchar(50) DEFAULT 'pending',
    payment_status varchar(50) DEFAULT 'unpaid',
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_by_name varchar(255),
    created_at timestamp without time zone DEFAULT now(),
    payment_recorded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    payment_recorded_by_name varchar(255),
    payment_recorded_at timestamp without time zone,
    payment_method varchar(50),
    confirmed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    confirmed_by_name varchar(255),
    confirmed_at timestamp without time zone,
    cancelled_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    cancelled_by_name varchar(255),
    cancelled_at timestamp without time zone,
    cancellation_reason text,
    delivered_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    delivered_by_name varchar(255),
    delivered_at timestamp without time zone,
    notes text,
    updated_at timestamp without time zone DEFAULT now(),
    UNIQUE (branch_id, order_number)
);

CREATE INDEX orders_branch_idx ON public.orders(branch_id);
CREATE INDEX orders_customer_idx ON public.orders(customer_id);
CREATE INDEX orders_status_idx ON public.orders(order_status);
CREATE INDEX orders_created_at_idx ON public.orders(created_at);

-- ------------------------------------------------------------
-- 2.6 order_items
-- ------------------------------------------------------------
CREATE TABLE public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    product_name varchar(255),
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    cost_price numeric NOT NULL,
    subtotal numeric NOT NULL
);

CREATE INDEX order_items_order_idx ON public.order_items(order_id);
CREATE INDEX order_items_product_idx ON public.order_items(product_id);

-- ------------------------------------------------------------
-- 2.7 payments
-- ------------------------------------------------------------
CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    amount numeric NOT NULL,
    method varchar(50) NOT NULL,
    reference_number varchar(255),
    status varchar(50) DEFAULT 'completed',
    payment_date timestamp without time zone DEFAULT now(),
    notes text,
    recorded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    recorded_by_name varchar(255),
    voided_at timestamp with time zone,
    voided_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    voided_by_name text,
    void_reason text
);

CREATE INDEX payments_branch_idx ON public.payments(branch_id);
CREATE INDEX payments_order_idx ON public.payments(order_id);
CREATE INDEX payments_date_idx ON public.payments(payment_date);

-- ------------------------------------------------------------
-- 2.8 expenses
-- ------------------------------------------------------------
CREATE TABLE public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    description text NOT NULL,
    amount numeric NOT NULL,
    category varchar(100),
    expense_date date DEFAULT CURRENT_DATE,
    payment_method varchar(50),
    receipt_image_url text,
    notes text,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_by_name varchar(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE INDEX expenses_branch_idx ON public.expenses(branch_id);
CREATE INDEX expenses_date_idx ON public.expenses(expense_date);

-- ------------------------------------------------------------
-- 2.9 purchase_orders
-- ------------------------------------------------------------
CREATE TABLE public.purchase_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    po_number varchar(50) NOT NULL,
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
    order_date date DEFAULT CURRENT_DATE,
    delivery_date date,
    total_amount numeric NOT NULL,
    status varchar(50) DEFAULT 'pending',
    notes text,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_by_name varchar(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    UNIQUE (branch_id, po_number)
);

CREATE INDEX purchase_orders_branch_idx ON public.purchase_orders(branch_id);
CREATE INDEX purchase_orders_supplier_idx ON public.purchase_orders(supplier_id);

-- ------------------------------------------------------------
-- 2.10 purchase_order_items
-- ------------------------------------------------------------
CREATE TABLE public.purchase_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    product_name varchar(255),
    quantity integer NOT NULL,
    cost_price numeric NOT NULL,
    subtotal numeric NOT NULL
);

CREATE INDEX po_items_po_idx ON public.purchase_order_items(purchase_order_id);
CREATE INDEX po_items_product_idx ON public.purchase_order_items(product_id);

-- ------------------------------------------------------------
-- 2.11 stock_movements
-- ------------------------------------------------------------
CREATE TABLE public.stock_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    quantity integer NOT NULL,
    movement_type text NOT NULL,
    reference_id uuid,
    reference_number text,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp without time zone DEFAULT now(),
    reason text
);

CREATE INDEX stock_movements_branch_idx ON public.stock_movements(branch_id);
CREATE INDEX stock_movements_product_idx ON public.stock_movements(product_id);

-- ------------------------------------------------------------
-- 2.12 activity_logs
-- ------------------------------------------------------------
CREATE TABLE public.activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    user_name varchar(255),
    action varchar(100) NOT NULL,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    order_number varchar(50),
    details jsonb,
    ip_address varchar(45),
    created_at timestamp without time zone DEFAULT now()
);

CREATE INDEX activity_logs_branch_idx ON public.activity_logs(branch_id);
CREATE INDEX activity_logs_user_idx ON public.activity_logs(user_id);
CREATE INDEX activity_logs_created_at_idx ON public.activity_logs(created_at);


-- ============================================================
-- PART 3: COMPOSITE INDEXES
-- ============================================================

CREATE INDEX orders_branch_created_idx
ON public.orders (branch_id, created_at DESC);

CREATE INDEX orders_branch_status_idx
ON public.orders (branch_id, order_status);

CREATE INDEX payments_branch_date_idx
ON public.payments (branch_id, payment_date DESC);

CREATE INDEX products_branch_active_idx
ON public.products (branch_id, is_active);

CREATE INDEX activity_logs_branch_created_idx
ON public.activity_logs (branch_id, created_at DESC);

-- Case-insensitive unique product name per branch.
-- Only enforced for active products, so soft-deleting a product
-- frees its name for reuse.
CREATE UNIQUE INDEX products_branch_name_lower_key
ON public.products (branch_id, LOWER(name))
WHERE is_active = true;

-- ------------------------------------------------------------
-- Performance indexes (v1.4)
-- Added for scale. Each one matches a query pattern the app
-- runs and that would otherwise table-scan on large data.
-- ------------------------------------------------------------

-- Orders filtered by payment status (unpaid, partial, paid)
CREATE INDEX orders_branch_payment_status_idx
ON public.orders (branch_id, payment_status);

-- Payments filtered by status (completed vs voided)
CREATE INDEX payments_branch_status_idx
ON public.payments (branch_id, status);

-- Top customers by spend, per branch
CREATE INDEX customers_branch_total_spent_idx
ON public.customers (branch_id, total_spent DESC);

-- Products filtered by category (only active products indexed)
CREATE INDEX products_branch_category_active_idx
ON public.products (branch_id, category_id)
WHERE is_active = true;

-- Audit log filtered by action
CREATE INDEX activity_logs_branch_action_created_idx
ON public.activity_logs (branch_id, action, created_at DESC);

-- ------------------------------------------------------------
-- Admin panel indexes (v1.4)
-- The admin metrics page and admin lists count and sort by
-- these columns. Keeps the admin view fast as client count grows.
-- ------------------------------------------------------------

-- Businesses: count and sort by activity and creation
CREATE INDEX businesses_is_active_idx
ON public.businesses (is_active);

CREATE INDEX businesses_created_at_idx
ON public.businesses (created_at DESC);

-- Users: filter by role and deletion status (Boss counts, staff counts)
CREATE INDEX users_role_deleted_idx
ON public.users (role, is_deleted);

-- Users: sort by creation date (customer list)
CREATE INDEX users_created_at_idx
ON public.users (created_at DESC);


-- ============================================================
-- PART 4: ACCOUNT CODES AND BUSINESS CODES
-- ============================================================

CREATE SEQUENCE users_account_code_seq START 1;
CREATE SEQUENCE businesses_business_code_seq START 1;

ALTER TABLE public.users
ALTER COLUMN account_code
SET DEFAULT 'USR-' || LPAD(nextval('users_account_code_seq')::text, 4, '0');

ALTER TABLE public.businesses
ALTER COLUMN business_code
SET DEFAULT 'BSN-' || LPAD(nextval('businesses_business_code_seq')::text, 4, '0');

ALTER TABLE public.users
ALTER COLUMN account_code SET NOT NULL;

ALTER TABLE public.businesses
ALTER COLUMN business_code SET NOT NULL;

CREATE UNIQUE INDEX users_account_code_key
ON public.users (account_code);

CREATE UNIQUE INDEX businesses_business_code_key
ON public.businesses (business_code);


-- ============================================================
-- PART 5: RPC FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- 5.1 create_order_atomic
-- Accepts optional new_customer and payment blocks.
-- Used by both the Advanced Order flow and Quick Sale.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_atomic(payload jsonb)
RETURNS orders
LANGUAGE plpgsql
AS $$
DECLARE
    v_branch_id uuid;
    v_customer_id uuid;
    v_created_by uuid;
    v_created_by_name varchar(255);
    v_notes text;
    v_subtotal numeric;
    v_tax_amount numeric;
    v_total_amount numeric;
    v_discount_amount numeric;
    v_items jsonb;
    v_payment jsonb;
    v_new_customer jsonb;
    v_new_customer_id uuid;
    v_order orders;
    v_order_number varchar(50);
    v_next_seq integer;
    v_branch_prefix varchar(10);
    v_item jsonb;
    v_payment_amount numeric;
    v_payment_status varchar(50);
BEGIN
    v_branch_id := (payload->>'branch_id')::uuid;
    v_customer_id := NULLIF(payload->>'customer_id', '')::uuid;
    v_created_by := (payload->>'created_by')::uuid;
    v_created_by_name := payload->>'created_by_name';
    v_notes := payload->>'notes';
    v_subtotal := (payload->>'subtotal')::numeric;
    v_tax_amount := COALESCE((payload->>'tax_amount')::numeric, 0);
    v_discount_amount := COALESCE((payload->>'discount_amount')::numeric, 0);
    v_total_amount := (payload->>'total_amount')::numeric;
    v_items := payload->'items';
    v_payment := NULLIF(payload->'payment', 'null'::jsonb);
    v_new_customer := NULLIF(payload->'new_customer', 'null'::jsonb);

    IF v_branch_id IS NULL THEN
        RAISE EXCEPTION 'branch_id is required';
    END IF;

    IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
        RAISE EXCEPTION 'At least one item is required';
    END IF;

    PERFORM 1 FROM branches WHERE id = v_branch_id FOR UPDATE;

    IF v_new_customer IS NOT NULL AND v_customer_id IS NULL THEN
        INSERT INTO customers (
            branch_id, name, phone, email, address, notes
        ) VALUES (
            v_branch_id,
            v_new_customer->>'name',
            v_new_customer->>'phone',
            COALESCE(v_new_customer->>'email', ''),
            COALESCE(v_new_customer->>'address', ''),
            COALESCE(v_new_customer->>'notes', '')
        )
        RETURNING id INTO v_new_customer_id;
        v_customer_id := v_new_customer_id;
    END IF;

    SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g'), 3))
    INTO v_branch_prefix
    FROM branches
    WHERE id = v_branch_id;

    IF v_branch_prefix IS NULL OR LENGTH(v_branch_prefix) = 0 THEN
        v_branch_prefix := 'BRN';
    END IF;

    SELECT COALESCE(MAX(
        CAST(NULLIF(REGEXP_REPLACE(order_number, '[^0-9]', '', 'g'), '') AS integer)
    ), 0) + 1
    INTO v_next_seq
    FROM orders
    WHERE branch_id = v_branch_id;

    v_order_number := v_branch_prefix || '-' || LPAD(v_next_seq::text, 6, '0');

    INSERT INTO orders (
        branch_id, order_number, customer_id,
        subtotal, tax_amount, discount_amount, total_amount,
        created_by, created_by_name, notes,
        order_status, payment_status, paid_amount
    ) VALUES (
        v_branch_id, v_order_number, v_customer_id,
        v_subtotal, v_tax_amount, v_discount_amount, v_total_amount,
        v_created_by, v_created_by_name, v_notes,
        'pending', 'unpaid', 0
    )
    RETURNING * INTO v_order;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        INSERT INTO order_items (
            order_id, product_id, product_name,
            quantity, unit_price, cost_price, subtotal
        ) VALUES (
            v_order.id,
            (v_item->>'product_id')::uuid,
            v_item->>'product_name',
            (v_item->>'quantity')::integer,
            (v_item->>'unit_price')::numeric,
            COALESCE((v_item->>'cost_price')::numeric, 0),
            (v_item->>'subtotal')::numeric
        );

        UPDATE products
        SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer,
            updated_at = now()
        WHERE id = (v_item->>'product_id')::uuid
          AND branch_id = v_branch_id
          AND stock_quantity >= (v_item->>'quantity')::integer;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Insufficient stock for product %', v_item->>'product_name';
        END IF;

        INSERT INTO stock_movements (
            branch_id, product_id, quantity, movement_type,
            reference_id, reference_number, created_by, reason
        ) VALUES (
            v_branch_id,
            (v_item->>'product_id')::uuid,
            -(v_item->>'quantity')::integer,
            'SALE',
            v_order.id,
            v_order_number,
            v_created_by,
            'Order created'
        );
    END LOOP;

    IF v_customer_id IS NOT NULL THEN
        UPDATE customers
        SET total_orders = total_orders + 1,
            total_spent = total_spent + v_total_amount,
            updated_at = now()
        WHERE id = v_customer_id AND branch_id = v_branch_id;
    END IF;

    IF v_payment IS NOT NULL THEN
        v_payment_amount := (v_payment->>'amount')::numeric;

        IF v_payment_amount IS NULL OR v_payment_amount <= 0 THEN
            RAISE EXCEPTION 'Payment amount must be positive';
        END IF;

        IF v_payment_amount > v_total_amount THEN
            RAISE EXCEPTION 'Payment amount cannot exceed order total';
        END IF;

        IF (v_payment->>'method') IS NULL OR (v_payment->>'method') = '' THEN
            RAISE EXCEPTION 'Payment method is required';
        END IF;

        INSERT INTO payments (
            branch_id, order_id, amount, method,
            reference_number, status,
            recorded_by, recorded_by_name, payment_date
        ) VALUES (
            v_branch_id,
            v_order.id,
            v_payment_amount,
            v_payment->>'method',
            NULLIF(v_payment->>'reference_number', ''),
            'completed',
            v_created_by,
            v_created_by_name,
            now()
        );

        IF v_payment_amount >= v_total_amount THEN
            v_payment_status := 'paid';
        ELSE
            v_payment_status := 'partial';
        END IF;

        UPDATE orders
        SET paid_amount = v_payment_amount,
            payment_status = v_payment_status,
            payment_recorded_by = v_created_by,
            payment_recorded_by_name = v_created_by_name,
            payment_recorded_at = now(),
            payment_method = v_payment->>'method',
            updated_at = now()
        WHERE id = v_order.id;

        SELECT * INTO v_order FROM orders WHERE id = v_order.id;
    END IF;

    RETURN v_order;
END;
$$;

-- ------------------------------------------------------------
-- 5.2 dashboard_summary
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_summary(
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    p_branch_id uuid
)
RETURNS TABLE(
    today_sales numeric,
    today_vat numeric,
    today_total_with_vat numeric,
    today_order_count bigint
)
LANGUAGE sql
AS $$
    SELECT
        COALESCE(SUM(subtotal), 0) AS today_sales,
        COALESCE(SUM(tax_amount), 0) AS today_vat,
        COALESCE(SUM(total_amount), 0) AS today_total_with_vat,
        COUNT(*) AS today_order_count
    FROM orders
    WHERE created_at >= start_date
      AND created_at <= end_date
      AND branch_id = p_branch_id
      AND order_status <> 'cancelled';
$$;

-- ------------------------------------------------------------
-- 5.3 outstanding_today
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.outstanding_today(
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    p_branch_id uuid
)
RETURNS TABLE(outstanding_total numeric, unpaid_order_count bigint)
LANGUAGE sql
AS $$
    SELECT
        COALESCE(SUM(total_amount - paid_amount), 0) AS outstanding_total,
        COUNT(*) AS unpaid_order_count
    FROM orders
    WHERE created_at >= start_date
      AND created_at <= end_date
      AND branch_id = p_branch_id
      AND order_status <> 'cancelled'
      AND payment_status <> 'paid';
$$;

-- ------------------------------------------------------------
-- 5.4 outstanding_summary
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.outstanding_summary(p_branch_id uuid)
RETURNS TABLE(outstanding_total numeric, unpaid_order_count bigint)
LANGUAGE sql
AS $$
    SELECT
        COALESCE(SUM(total_amount - paid_amount), 0) AS outstanding_total,
        COUNT(*) AS unpaid_order_count
    FROM orders
    WHERE branch_id = p_branch_id
      AND order_status <> 'cancelled'
      AND payment_status <> 'paid';
$$;

-- ------------------------------------------------------------
-- 5.5 sum_expenses
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sum_expenses(
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    p_branch_id uuid
)
RETURNS TABLE(total_expenses numeric, expense_count bigint)
LANGUAGE sql
AS $$
    SELECT
        COALESCE(SUM(amount), 0) AS total_expenses,
        COUNT(*) AS expense_count
    FROM expenses
    WHERE created_at >= start_date
      AND created_at <= end_date
      AND branch_id = p_branch_id;
$$;

-- ------------------------------------------------------------
-- 5.6 sum_monthly
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sum_monthly(
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    exclude_cancelled boolean DEFAULT true,
    p_branch_id uuid DEFAULT NULL
)
RETURNS TABLE(month_start timestamp with time zone, sum_subtotal numeric, order_count bigint)
LANGUAGE sql
AS $$
    SELECT
        DATE_TRUNC('month', created_at) AS month_start,
        COALESCE(SUM(subtotal), 0) AS sum_subtotal,
        COUNT(*) AS order_count
    FROM orders
    WHERE created_at >= start_date
      AND created_at <= end_date
      AND branch_id = p_branch_id
      AND (NOT exclude_cancelled OR order_status <> 'cancelled')
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month_start;
$$;

-- ------------------------------------------------------------
-- 5.7 sum_orders
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sum_orders(
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    exclude_cancelled boolean DEFAULT true,
    p_branch_id uuid DEFAULT NULL
)
RETURNS TABLE(
    sum_subtotal numeric,
    sum_tax numeric,
    sum_total numeric,
    order_count bigint,
    item_count bigint
)
LANGUAGE sql
AS $$
    WITH order_summary AS (
        SELECT
            COALESCE(SUM(subtotal), 0) AS s_subtotal,
            COALESCE(SUM(tax_amount), 0) AS s_tax,
            COALESCE(SUM(total_amount), 0) AS s_total,
            COUNT(*) AS o_count
        FROM orders
        WHERE created_at >= start_date
          AND created_at <= end_date
          AND branch_id = p_branch_id
          AND (NOT exclude_cancelled OR order_status <> 'cancelled')
    ),
    item_summary AS (
        SELECT COALESCE(SUM(oi.quantity), 0) AS i_count
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= start_date
          AND o.created_at <= end_date
          AND o.branch_id = p_branch_id
          AND (NOT exclude_cancelled OR o.order_status <> 'cancelled')
    )
    SELECT s_subtotal, s_tax, s_total, o_count, i_count
    FROM order_summary, item_summary;
$$;

-- ------------------------------------------------------------
-- 5.8 sum_payments
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sum_payments(
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    p_branch_id uuid
)
RETURNS TABLE(sum_amount numeric, payment_count bigint)
LANGUAGE sql
AS $$
    SELECT
        COALESCE(SUM(amount), 0) AS sum_amount,
        COUNT(*) AS payment_count
    FROM payments
    WHERE payment_date >= start_date
      AND payment_date <= end_date
      AND branch_id = p_branch_id
      AND (status IS NULL OR status <> 'voided');
$$;

-- ------------------------------------------------------------
-- 5.9 sum_payments_by_method
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sum_payments_by_method(
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    p_branch_id uuid
)
RETURNS TABLE(method text, order_id uuid, total_amount numeric)
LANGUAGE sql
AS $$
    SELECT
        method::text,
        order_id,
        COALESCE(SUM(amount), 0) AS total_amount
    FROM payments
    WHERE payment_date >= start_date
      AND payment_date <= end_date
      AND branch_id = p_branch_id
      AND (status IS NULL OR status <> 'voided')
    GROUP BY method, order_id;
$$;

-- ------------------------------------------------------------
-- 5.10 sum_product_sales
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sum_product_sales(
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    exclude_cancelled boolean DEFAULT true,
    p_branch_id uuid DEFAULT NULL
)
RETURNS TABLE(
    product_name text,
    total_quantity bigint,
    total_revenue numeric,
    total_cost numeric
)
LANGUAGE sql
AS $$
    SELECT
        oi.product_name::text,
        SUM(oi.quantity)::bigint,
        SUM(oi.subtotal)::numeric,
        SUM(oi.cost_price * oi.quantity)::numeric
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= start_date
      AND o.created_at <= end_date
      AND o.branch_id = p_branch_id
      AND (NOT exclude_cancelled OR o.order_status <> 'cancelled')
    GROUP BY oi.product_name
    ORDER BY SUM(oi.subtotal) DESC;
$$;

-- ------------------------------------------------------------
-- 5.11 sum_products_totals
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sum_products_totals(
    p_branch_id uuid,
    search_term text DEFAULT NULL,
    category_filter uuid DEFAULT NULL
)
RETURNS TABLE(
    total_inventory_value numeric,
    total_cost_value numeric,
    total_product_count bigint
)
LANGUAGE sql
AS $$
    SELECT
        COALESCE(SUM(selling_price * stock_quantity), 0) AS total_inventory_value,
        COALESCE(SUM(cost_price * stock_quantity), 0) AS total_cost_value,
        COUNT(*) AS total_product_count
    FROM products
    WHERE branch_id = p_branch_id
      AND is_active = true
      AND (
          search_term IS NULL
          OR name ILIKE '%' || search_term || '%'
          OR sku ILIKE '%' || search_term || '%'
          OR description ILIKE '%' || search_term || '%'
      )
      AND (category_filter IS NULL OR category_id = category_filter);
$$;

-- ------------------------------------------------------------
-- 5.12 sum_profit_orders
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sum_profit_orders(
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    exclude_cancelled boolean DEFAULT true,
    p_branch_id uuid DEFAULT NULL
)
RETURNS TABLE(total_revenue numeric, total_vat numeric, total_cost numeric)
LANGUAGE sql
AS $$
    SELECT
        COALESCE(SUM(o.subtotal), 0) AS total_revenue,
        COALESCE(SUM(o.tax_amount), 0) AS total_vat,
        COALESCE(SUM(oi.cost_price * oi.quantity), 0) AS total_cost
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.created_at >= start_date
      AND o.created_at <= end_date
      AND o.branch_id = p_branch_id
      AND (NOT exclude_cancelled OR o.order_status <> 'cancelled');
$$;

-- ------------------------------------------------------------
-- 5.13 sum_stock_movements
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sum_stock_movements(
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    p_branch_id uuid
)
RETURNS TABLE(product_name text, movement_type text, total_quantity bigint)
LANGUAGE sql
AS $$
    SELECT
        p.name::text AS product_name,
        sm.movement_type::text,
        SUM(sm.quantity)::bigint AS total_quantity
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    WHERE sm.created_at >= start_date
      AND sm.created_at <= end_date
      AND sm.branch_id = p_branch_id
    GROUP BY p.name, sm.movement_type
    ORDER BY p.name, sm.movement_type;
$$;

-- ------------------------------------------------------------
-- 5.14 sum_realized_profit
-- Realized profit: scaled by paid_amount / total_amount.
-- VAT is excluded from profit (business money only).
-- Cancelled orders are excluded.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sum_realized_profit(
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    exclude_cancelled boolean DEFAULT true,
    p_branch_id uuid DEFAULT NULL
)
RETURNS TABLE(
    total_profit numeric,
    total_revenue_paid numeric,
    total_cost_paid numeric,
    total_vat_paid numeric,
    order_count bigint
)
LANGUAGE sql
AS $$
    WITH order_profits AS (
        SELECT
            o.id,
            o.subtotal,
            COALESCE(o.discount_amount, 0) AS discount_amount,
            COALESCE(o.tax_amount, 0) AS tax_amount,
            o.total_amount,
            COALESCE(o.paid_amount, 0) AS paid_amount,
            COALESCE(SUM(oi.cost_price * oi.quantity), 0) AS cost_of_items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.created_at >= start_date
          AND o.created_at <= end_date
          AND o.branch_id = p_branch_id
          AND (NOT exclude_cancelled OR o.order_status <> 'cancelled')
        GROUP BY o.id, o.subtotal, o.discount_amount, o.tax_amount, o.total_amount, o.paid_amount
    )
    SELECT
        COALESCE(SUM(
            CASE
                WHEN total_amount > 0
                THEN (subtotal - discount_amount - cost_of_items) * LEAST(1, paid_amount / total_amount)
                ELSE 0
            END
        ), 0) AS total_profit,
        COALESCE(SUM(
            CASE
                WHEN total_amount > 0
                THEN (subtotal - discount_amount) * LEAST(1, paid_amount / total_amount)
                ELSE 0
            END
        ), 0) AS total_revenue_paid,
        COALESCE(SUM(
            CASE
                WHEN total_amount > 0
                THEN cost_of_items * LEAST(1, paid_amount / total_amount)
                ELSE 0
            END
        ), 0) AS total_cost_paid,
        COALESCE(SUM(
            CASE
                WHEN total_amount > 0
                THEN tax_amount * LEAST(1, paid_amount / total_amount)
                ELSE 0
            END
        ), 0) AS total_vat_paid,
        COUNT(*) AS order_count
    FROM order_profits;
$$;

-- ------------------------------------------------------------
-- 5.15 cancel_order_atomic
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_order_atomic(
    p_order_id uuid,
    p_branch_id uuid,
    p_user_id uuid,
    p_user_name varchar,
    p_reason text
)
RETURNS orders
LANGUAGE plpgsql
AS $$
DECLARE
    v_order orders;
    v_item record;
    v_old_stock integer;
    v_new_stock integer;
    v_paid_amount numeric;
BEGIN
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id AND branch_id = p_branch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found in this branch';
    END IF;

    IF v_order.order_status = 'cancelled' THEN
        RAISE EXCEPTION 'Order is already cancelled';
    END IF;

    v_paid_amount := COALESCE(v_order.paid_amount, 0);

    FOR v_item IN
        SELECT product_id, product_name, quantity
        FROM order_items
        WHERE order_id = p_order_id
    LOOP
        IF v_item.product_id IS NOT NULL THEN
            SELECT stock_quantity INTO v_old_stock
            FROM products
            WHERE id = v_item.product_id AND branch_id = p_branch_id
            FOR UPDATE;

            IF FOUND THEN
                v_new_stock := v_old_stock + v_item.quantity;

                UPDATE products
                SET stock_quantity = v_new_stock,
                    updated_at = now()
                WHERE id = v_item.product_id AND branch_id = p_branch_id;

                INSERT INTO stock_movements (
                    branch_id, product_id, quantity, movement_type,
                    reference_id, reference_number, created_by, reason
                ) VALUES (
                    p_branch_id,
                    v_item.product_id,
                    v_item.quantity,
                    'RETURN',
                    p_order_id,
                    v_order.order_number,
                    p_user_id,
                    p_reason
                );
            END IF;
        END IF;
    END LOOP;

    IF v_order.customer_id IS NOT NULL THEN
        UPDATE customers
        SET total_orders = GREATEST(0, total_orders - 1),
            total_spent = GREATEST(0, total_spent - v_order.total_amount),
            updated_at = now()
        WHERE id = v_order.customer_id AND branch_id = p_branch_id;
    END IF;

    IF v_paid_amount > 0 THEN
        UPDATE payments
        SET status = 'voided',
            voided_at = now(),
            voided_by = p_user_id,
            voided_by_name = p_user_name,
            void_reason = p_reason
        WHERE order_id = p_order_id
          AND branch_id = p_branch_id
          AND (status IS NULL OR status <> 'voided');
    END IF;

    UPDATE orders
    SET order_status = 'cancelled',
        cancelled_by = p_user_id,
        cancelled_by_name = p_user_name,
        cancelled_at = now(),
        cancellation_reason = p_reason,
        paid_amount = 0,
        payment_status = 'cancelled',
        updated_at = now()
    WHERE id = p_order_id AND branch_id = p_branch_id
    RETURNING * INTO v_order;

    INSERT INTO activity_logs (
        branch_id, user_id, user_name, action,
        order_id, order_number, details
    ) VALUES (
        p_branch_id, p_user_id, p_user_name, 'Order Cancelled',
        p_order_id, v_order.order_number,
        jsonb_build_object(
            'reason', p_reason,
            'stock_restored', true,
            'preserved_total', v_order.total_amount,
            'preserved_vat', v_order.tax_amount,
            'voided_paid', v_paid_amount
        )
    );

    RETURN v_order;
END;
$$;

-- ------------------------------------------------------------
-- 5.16 record_payment_atomic
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_payment_atomic(
    p_order_id uuid,
    p_branch_id uuid,
    p_amount numeric,
    p_method varchar,
    p_reference_number varchar,
    p_user_id uuid,
    p_user_name varchar
)
RETURNS orders
LANGUAGE plpgsql
AS $$
DECLARE
    v_order orders;
    v_previous_paid numeric;
    v_order_total numeric;
    v_remaining numeric;
    v_new_paid numeric;
    v_payment_status varchar;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive';
    END IF;

    IF p_method IS NULL OR p_method = '' THEN
        RAISE EXCEPTION 'Payment method is required';
    END IF;

    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id AND branch_id = p_branch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found in this branch';
    END IF;

    IF v_order.order_status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot record payment on a cancelled order';
    END IF;

    v_order_total := COALESCE(v_order.total_amount, 0);
    v_previous_paid := COALESCE(v_order.paid_amount, 0);
    v_remaining := v_order_total - v_previous_paid;

    IF p_amount > v_remaining + 0.01 THEN
        RAISE EXCEPTION 'Payment exceeds remaining balance of %', v_remaining;
    END IF;

    v_new_paid := v_previous_paid + p_amount;

    IF v_new_paid >= v_order_total THEN
        v_payment_status := 'paid';
    ELSE
        v_payment_status := 'partial';
    END IF;

    INSERT INTO payments (
        branch_id, order_id, amount, method,
        reference_number, status,
        recorded_by, recorded_by_name, payment_date
    ) VALUES (
        p_branch_id, p_order_id, p_amount, p_method,
        NULLIF(p_reference_number, ''), 'completed',
        p_user_id, p_user_name, now()
    );

    UPDATE orders
    SET paid_amount = v_new_paid,
        payment_status = v_payment_status,
        payment_method = COALESCE(v_order.payment_method, p_method),
        payment_recorded_by = p_user_id,
        payment_recorded_by_name = p_user_name,
        payment_recorded_at = now(),
        updated_at = now()
    WHERE id = p_order_id AND branch_id = p_branch_id
    RETURNING * INTO v_order;

    INSERT INTO activity_logs (
        branch_id, user_id, user_name, action,
        order_id, order_number, details
    ) VALUES (
        p_branch_id, p_user_id, p_user_name, 'Payment Recorded',
        p_order_id, v_order.order_number,
        jsonb_build_object(
            'amount', p_amount,
            'method', p_method,
            'payment_status', v_payment_status
        )
    );

    RETURN v_order;
END;
$$;

-- ------------------------------------------------------------
-- 5.17 receive_purchase_order_atomic
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.receive_purchase_order_atomic(
    p_po_id uuid,
    p_branch_id uuid,
    p_user_id uuid,
    p_user_name varchar
)
RETURNS purchase_orders
LANGUAGE plpgsql
AS $$
DECLARE
    v_po purchase_orders;
    v_item record;
    v_old_stock integer;
    v_new_stock integer;
BEGIN
    SELECT * INTO v_po
    FROM purchase_orders
    WHERE id = p_po_id AND branch_id = p_branch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order not found in this branch';
    END IF;

    IF v_po.status = 'received' THEN
        RAISE EXCEPTION 'Purchase order already received';
    END IF;

    IF v_po.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot receive a cancelled purchase order';
    END IF;

    FOR v_item IN
        SELECT product_id, product_name, quantity
        FROM purchase_order_items
        WHERE purchase_order_id = p_po_id
    LOOP
        IF v_item.product_id IS NOT NULL THEN
            SELECT stock_quantity INTO v_old_stock
            FROM products
            WHERE id = v_item.product_id AND branch_id = p_branch_id
            FOR UPDATE;

            IF FOUND THEN
                v_new_stock := v_old_stock + v_item.quantity;

                UPDATE products
                SET stock_quantity = v_new_stock,
                    updated_at = now()
                WHERE id = v_item.product_id AND branch_id = p_branch_id;

                INSERT INTO stock_movements (
                    branch_id, product_id, quantity, movement_type,
                    reference_id, reference_number, created_by, reason
                ) VALUES (
                    p_branch_id,
                    v_item.product_id,
                    v_item.quantity,
                    'PURCHASE',
                    p_po_id,
                    v_po.po_number,
                    p_user_id,
                    'Purchase order received'
                );
            END IF;
        END IF;
    END LOOP;

    UPDATE purchase_orders
    SET status = 'received',
        delivery_date = CURRENT_DATE,
        updated_at = now()
    WHERE id = p_po_id AND branch_id = p_branch_id
    RETURNING * INTO v_po;

    INSERT INTO activity_logs (
        branch_id, user_id, user_name, action,
        order_number, details
    ) VALUES (
        p_branch_id, p_user_id, p_user_name, 'Purchase Order Received',
        v_po.po_number,
        jsonb_build_object('supplier_id', v_po.supplier_id)
    );

    RETURN v_po;
END;
$$;

-- ------------------------------------------------------------
-- 5.18 update_purchase_order_items_atomic
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_purchase_order_items_atomic(
    p_po_id uuid,
    p_branch_id uuid,
    p_user_id uuid,
    p_user_name varchar,
    p_new_items jsonb
)
RETURNS purchase_orders
LANGUAGE plpgsql
AS $$
DECLARE
    v_po purchase_orders;
    v_item jsonb;
    v_old_qty integer;
    v_new_qty integer;
    v_delta integer;
    v_product record;
    v_product_name varchar;
    v_old_totals jsonb;
    v_new_totals jsonb;
    v_product_ids jsonb;
    v_product_id_str text;
    v_final_total numeric := 0;
BEGIN
    SELECT * INTO v_po
    FROM purchase_orders
    WHERE id = p_po_id AND branch_id = p_branch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order not found in this branch';
    END IF;

    IF v_po.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot update a cancelled purchase order';
    END IF;

    IF v_po.status = 'received' THEN
        SELECT jsonb_object_agg(product_id::text, total_qty)
        INTO v_old_totals
        FROM (
            SELECT product_id, SUM(quantity)::int AS total_qty
            FROM purchase_order_items
            WHERE purchase_order_id = p_po_id
              AND product_id IS NOT NULL
            GROUP BY product_id
        ) x;

        IF v_old_totals IS NULL THEN
            v_old_totals := '{}'::jsonb;
        END IF;

        SELECT jsonb_object_agg(product_id::text, total_qty)
        INTO v_new_totals
        FROM (
            SELECT
                (item->>'product_id')::uuid AS product_id,
                SUM((item->>'quantity')::int)::int AS total_qty
            FROM jsonb_array_elements(p_new_items) AS item
            WHERE item->>'product_id' IS NOT NULL
            GROUP BY (item->>'product_id')::uuid
        ) x;

        IF v_new_totals IS NULL THEN
            v_new_totals := '{}'::jsonb;
        END IF;

        SELECT jsonb_agg(DISTINCT key::text)
        INTO v_product_ids
        FROM (
            SELECT jsonb_object_keys(v_old_totals) AS key
            UNION
            SELECT jsonb_object_keys(v_new_totals) AS key
        ) t;

        IF v_product_ids IS NULL THEN
            v_product_ids := '[]'::jsonb;
        END IF;

        FOR v_product_id_str IN
            SELECT jsonb_array_elements_text(v_product_ids)
        LOOP
            v_old_qty := COALESCE((v_old_totals->>v_product_id_str)::int, 0);
            v_new_qty := COALESCE((v_new_totals->>v_product_id_str)::int, 0);
            v_delta := v_new_qty - v_old_qty;

            CONTINUE WHEN v_delta = 0;

            SELECT id, name, stock_quantity INTO v_product
            FROM products
            WHERE id = v_product_id_str::uuid AND branch_id = p_branch_id
            FOR UPDATE;

            IF NOT FOUND THEN
                CONTINUE;
            END IF;

            IF (v_product.stock_quantity + v_delta) < 0 THEN
                RAISE EXCEPTION 'Cannot reduce stock below zero for product %', v_product.name;
            END IF;

            UPDATE products
            SET stock_quantity = stock_quantity + v_delta,
                updated_at = now()
            WHERE id = v_product_id_str::uuid AND branch_id = p_branch_id;

            INSERT INTO stock_movements (
                branch_id, product_id, quantity, movement_type,
                reference_id, reference_number, created_by, reason
            ) VALUES (
                p_branch_id,
                v_product_id_str::uuid,
                v_delta,
                'ADJUSTMENT',
                p_po_id,
                v_po.po_number,
                p_user_id,
                CASE
                    WHEN v_delta > 0 THEN 'Purchase order edit: added ' || v_delta
                    ELSE 'Purchase order edit: removed ' || abs(v_delta)
                END
            );
        END LOOP;
    END IF;

    DELETE FROM purchase_order_items
    WHERE purchase_order_id = p_po_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_new_items)
    LOOP
        v_product_name := COALESCE(v_item->>'name', 'Product');

        INSERT INTO purchase_order_items (
            purchase_order_id, product_id, product_name,
            quantity, cost_price, subtotal
        ) VALUES (
            p_po_id,
            (v_item->>'product_id')::uuid,
            v_product_name,
            (v_item->>'quantity')::int,
            (v_item->>'cost_price')::numeric,
            (v_item->>'quantity')::int * (v_item->>'cost_price')::numeric
        );

        v_final_total := v_final_total
            + ((v_item->>'quantity')::int * (v_item->>'cost_price')::numeric);
    END LOOP;

    UPDATE purchase_orders
    SET total_amount = v_final_total,
        updated_at = now()
    WHERE id = p_po_id AND branch_id = p_branch_id
    RETURNING * INTO v_po;

    INSERT INTO activity_logs (
        branch_id, user_id, user_name, action,
        order_number, details
    ) VALUES (
        p_branch_id, p_user_id, p_user_name, 'Purchase Order Updated',
        v_po.po_number,
        jsonb_build_object(
            'status', v_po.status,
            'stock_adjusted', v_po.status = 'received',
            'supplier_id', v_po.supplier_id
        )
    );

    RETURN v_po;
END;
$$;

-- ------------------------------------------------------------
-- 5.19 create_product_atomic
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_product_atomic(
    p_branch_id uuid,
    p_user_id uuid,
    p_user_name varchar,
    p_name varchar,
    p_description text,
    p_category_id uuid,
    p_sku varchar,
    p_cost_price numeric,
    p_selling_price numeric,
    p_stock_quantity int,
    p_low_stock_threshold int,
    p_supplier_id uuid
)
RETURNS products
LANGUAGE plpgsql
AS $$
DECLARE
    v_product products;
BEGIN
    INSERT INTO products (
        branch_id, name, description, category_id, sku,
        cost_price, selling_price, stock_quantity,
        low_stock_threshold, supplier_id, is_active
    ) VALUES (
        p_branch_id, p_name, p_description, p_category_id, p_sku,
        p_cost_price, p_selling_price, COALESCE(p_stock_quantity, 0),
        COALESCE(p_low_stock_threshold, 5), p_supplier_id, true
    )
    RETURNING * INTO v_product;

    IF COALESCE(p_stock_quantity, 0) > 0 THEN
        INSERT INTO stock_movements (
            branch_id, product_id, quantity, movement_type,
            reference_id, reference_number, created_by, reason
        ) VALUES (
            p_branch_id,
            v_product.id,
            p_stock_quantity,
            'ADJUSTMENT',
            v_product.id,
            v_product.sku,
            p_user_id,
            'Initial stock'
        );
    END IF;

    INSERT INTO activity_logs (
        branch_id, user_id, user_name, action, details
    ) VALUES (
        p_branch_id, p_user_id, p_user_name, 'Product Created',
        jsonb_build_object('product_id', v_product.id, 'name', v_product.name)
    );

    RETURN v_product;
END;
$$;

-- ------------------------------------------------------------
-- 5.20 adjust_stock_atomic
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_stock_atomic(
    p_product_id uuid,
    p_branch_id uuid,
    p_user_id uuid,
    p_user_name varchar,
    p_quantity int,
    p_type varchar,
    p_reason text
)
RETURNS products
LANGUAGE plpgsql
AS $$
DECLARE
    v_product products;
    v_new_stock integer;
    v_movement_quantity integer;
BEGIN
    IF p_type NOT IN ('add', 'remove') THEN
        RAISE EXCEPTION 'Type must be "add" or "remove"';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;

    SELECT * INTO v_product
    FROM products
    WHERE id = p_product_id
      AND branch_id = p_branch_id
      AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    IF p_type = 'add' THEN
        v_new_stock := COALESCE(v_product.stock_quantity, 0) + p_quantity;
        v_movement_quantity := p_quantity;
    ELSE
        v_new_stock := COALESCE(v_product.stock_quantity, 0) - p_quantity;
        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Insufficient stock';
        END IF;
        v_movement_quantity := -p_quantity;
    END IF;

    UPDATE products
    SET stock_quantity = v_new_stock,
        updated_at = now()
    WHERE id = p_product_id AND branch_id = p_branch_id
    RETURNING * INTO v_product;

    INSERT INTO stock_movements (
        branch_id, product_id, quantity, movement_type,
        reference_id, reference_number, created_by, reason
    ) VALUES (
        p_branch_id, p_product_id, v_movement_quantity, 'ADJUSTMENT',
        p_product_id, v_product.sku, p_user_id, p_reason
    );

    INSERT INTO activity_logs (
        branch_id, user_id, user_name, action, details
    ) VALUES (
        p_branch_id, p_user_id, p_user_name, 'Stock Adjusted',
        jsonb_build_object(
            'product_id', p_product_id,
            'product_name', v_product.name,
            'type', p_type,
            'quantity', p_quantity,
            'reason', p_reason
        )
    );

    RETURN v_product;
END;
$$;

-- ------------------------------------------------------------
-- 5.21 confirm_order_atomic
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_order_atomic(
    p_order_id uuid,
    p_branch_id uuid,
    p_user_id uuid,
    p_user_name varchar
)
RETURNS orders
LANGUAGE plpgsql
AS $$
DECLARE
    v_order orders;
BEGIN
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id AND branch_id = p_branch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order.payment_status <> 'paid' THEN
        RAISE EXCEPTION 'Cannot confirm order. Payment is not completed.';
    END IF;

    IF v_order.order_status = 'confirmed' THEN
        RAISE EXCEPTION 'Order is already confirmed';
    END IF;

    UPDATE orders
    SET order_status = 'confirmed',
        confirmed_by = p_user_id,
        confirmed_by_name = p_user_name,
        confirmed_at = now(),
        updated_at = now()
    WHERE id = p_order_id AND branch_id = p_branch_id
    RETURNING * INTO v_order;

    INSERT INTO activity_logs (
        branch_id, user_id, user_name, action,
        order_id, order_number, details
    ) VALUES (
        p_branch_id, p_user_id, p_user_name, 'Order Confirmed',
        p_order_id, v_order.order_number,
        jsonb_build_object('confirmed_by', p_user_name)
    );

    RETURN v_order;
END;
$$;


-- ============================================================
-- PART 6: PLATFORM ADMIN
-- ============================================================

-- ------------------------------------------------------------
-- 6.1 platform_admins
-- ------------------------------------------------------------
CREATE TABLE public.platform_admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(255) NOT NULL UNIQUE,
    full_name varchar(255) NOT NULL,
    password_hash varchar(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamptz,
    last_login_ip varchar(45),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX platform_admins_email_idx
ON public.platform_admins (LOWER(email));

-- ------------------------------------------------------------
-- 6.2 admin_audit_logs
-- ------------------------------------------------------------
CREATE TABLE public.admin_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
    admin_email varchar(255),
    action varchar(100) NOT NULL,
    target_type varchar(50),
    target_id uuid,
    target_label varchar(255),
    reason text,
    details jsonb,
    ip_address varchar(45),
    user_agent text,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX admin_audit_logs_admin_idx
ON public.admin_audit_logs (admin_id, created_at DESC);

CREATE INDEX admin_audit_logs_target_idx
ON public.admin_audit_logs (target_type, target_id, created_at DESC);

CREATE INDEX admin_audit_logs_action_idx
ON public.admin_audit_logs (action, created_at DESC);

-- ------------------------------------------------------------
-- 6.3 impersonation_sessions
-- ------------------------------------------------------------
CREATE TABLE public.impersonation_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL REFERENCES public.platform_admins(id) ON DELETE CASCADE,
    admin_email varchar(255) NOT NULL,
    boss_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    boss_email varchar(255),
    boss_full_name varchar(255),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    business_name varchar(255),
    reason text NOT NULL,
    token_id uuid NOT NULL UNIQUE,
    started_at timestamptz DEFAULT now() NOT NULL,
    expires_at timestamptz NOT NULL,
    ended_at timestamptz,
    ended_by varchar(50),
    ip_address varchar(45)
);

CREATE INDEX impersonation_sessions_admin_idx
ON public.impersonation_sessions (admin_id, started_at DESC);

CREATE INDEX impersonation_sessions_active_idx
ON public.impersonation_sessions (token_id)
WHERE ended_at IS NULL;


-- ============================================================
-- PART 7: ROW LEVEL SECURITY
-- ============================================================

-- ------------------------------------------------------------
-- 7.1 Helper functions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role',
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.owns_business(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.businesses b
        JOIN public.users u ON u.id = b.owner_id
        WHERE b.id = target_business_id
          AND u.id = public.current_user_id()
          AND u.is_active = true
          AND u.is_deleted = false
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_branch(target_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.branches br
        WHERE br.id = target_branch_id
          AND (
              public.owns_business(br.business_id)
              OR EXISTS (
                  SELECT 1 FROM public.users u
                  WHERE u.id = public.current_user_id()
                    AND u.branch_id = target_branch_id
                    AND u.is_active = true
                    AND u.is_deleted = false
              )
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_business(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = target_business_id
          AND (
              public.owns_business(target_business_id)
              OR EXISTS (
                  SELECT 1
                  FROM public.users u
                  JOIN public.branches br ON br.id = u.branch_id
                  WHERE u.id = public.current_user_id()
                    AND br.business_id = target_business_id
                    AND u.is_active = true
                    AND u.is_deleted = false
              )
          )
    );
$$;

-- ------------------------------------------------------------
-- 7.2 Enable RLS
-- ------------------------------------------------------------
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 7.3 Policies
-- ------------------------------------------------------------
CREATE POLICY businesses_select ON public.businesses
FOR SELECT USING (
    public.is_service_role()
    OR public.owns_business(id)
    OR EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.branches br ON br.id = u.branch_id
        WHERE u.id = public.current_user_id()
          AND br.business_id = businesses.id
          AND u.is_active = true
          AND u.is_deleted = false
    )
);

CREATE POLICY businesses_write ON public.businesses
FOR ALL USING (
    public.is_service_role() OR public.owns_business(id)
) WITH CHECK (
    public.is_service_role() OR public.owns_business(id)
);

CREATE POLICY branches_select ON public.branches
FOR SELECT USING (
    public.is_service_role() OR public.can_access_branch(id)
);

CREATE POLICY branches_write ON public.branches
FOR ALL USING (
    public.is_service_role() OR public.owns_business(business_id)
) WITH CHECK (
    public.is_service_role() OR public.owns_business(business_id)
);

CREATE POLICY users_select ON public.users
FOR SELECT USING (
    public.is_service_role()
    OR id = public.current_user_id()
    OR public.owns_business(business_id)
    OR (branch_id IS NOT NULL AND public.can_access_branch(branch_id))
);

CREATE POLICY users_write ON public.users
FOR ALL USING (
    public.is_service_role()
    OR id = public.current_user_id()
    OR public.owns_business(business_id)
) WITH CHECK (
    public.is_service_role()
    OR id = public.current_user_id()
    OR public.owns_business(business_id)
);

CREATE POLICY categories_select ON public.categories
FOR SELECT USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY categories_write ON public.categories
FOR ALL USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
) WITH CHECK (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY products_select ON public.products
FOR SELECT USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY products_write ON public.products
FOR ALL USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
) WITH CHECK (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY customers_select ON public.customers
FOR SELECT USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY customers_write ON public.customers
FOR ALL USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
) WITH CHECK (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY orders_select ON public.orders
FOR SELECT USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY orders_write ON public.orders
FOR ALL USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
) WITH CHECK (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY order_items_select ON public.order_items
FOR SELECT USING (
    public.is_service_role()
    OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
          AND public.can_access_branch(o.branch_id)
    )
);

CREATE POLICY order_items_write ON public.order_items
FOR ALL USING (
    public.is_service_role()
    OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
          AND public.can_access_branch(o.branch_id)
    )
) WITH CHECK (
    public.is_service_role()
    OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
          AND public.can_access_branch(o.branch_id)
    )
);

CREATE POLICY payments_select ON public.payments
FOR SELECT USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY payments_write ON public.payments
FOR ALL USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
) WITH CHECK (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY expenses_select ON public.expenses
FOR SELECT USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY expenses_write ON public.expenses
FOR ALL USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
) WITH CHECK (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY suppliers_select ON public.suppliers
FOR SELECT USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY suppliers_write ON public.suppliers
FOR ALL USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
) WITH CHECK (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY purchase_orders_select ON public.purchase_orders
FOR SELECT USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY purchase_orders_write ON public.purchase_orders
FOR ALL USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
) WITH CHECK (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY purchase_order_items_select ON public.purchase_order_items
FOR SELECT USING (
    public.is_service_role()
    OR EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
          AND public.can_access_branch(po.branch_id)
    )
);

CREATE POLICY purchase_order_items_write ON public.purchase_order_items
FOR ALL USING (
    public.is_service_role()
    OR EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
          AND public.can_access_branch(po.branch_id)
    )
) WITH CHECK (
    public.is_service_role()
    OR EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
          AND public.can_access_branch(po.branch_id)
    )
);

CREATE POLICY stock_movements_select ON public.stock_movements
FOR SELECT USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY stock_movements_write ON public.stock_movements
FOR ALL USING (
    public.is_service_role() OR public.can_access_branch(branch_id)
) WITH CHECK (
    public.is_service_role() OR public.can_access_branch(branch_id)
);

CREATE POLICY activity_logs_select ON public.activity_logs
FOR SELECT USING (
    public.is_service_role()
    OR branch_id IS NOT NULL AND public.can_access_branch(branch_id)
    OR user_id = public.current_user_id()
);

CREATE POLICY activity_logs_write ON public.activity_logs
FOR ALL USING (
    public.is_service_role()
    OR branch_id IS NULL AND user_id = public.current_user_id()
    OR branch_id IS NOT NULL AND public.can_access_branch(branch_id)
) WITH CHECK (
    public.is_service_role()
    OR branch_id IS NULL AND user_id = public.current_user_id()
    OR branch_id IS NOT NULL AND public.can_access_branch(branch_id)
);

CREATE POLICY platform_admins_service_only ON public.platform_admins
FOR ALL USING (
    public.is_service_role()
) WITH CHECK (
    public.is_service_role()
);

CREATE POLICY admin_audit_logs_service_only ON public.admin_audit_logs
FOR ALL USING (
    public.is_service_role()
) WITH CHECK (
    public.is_service_role()
);

CREATE POLICY impersonation_sessions_service_only ON public.impersonation_sessions
FOR ALL USING (
    public.is_service_role()
) WITH CHECK (
    public.is_service_role()
);

CREATE POLICY payment_submissions_service_only ON public.payment_submissions
FOR ALL USING (
    public.is_service_role()
) WITH CHECK (
    public.is_service_role()
);


-- ============================================================
-- PART 8: SUBSCRIPTION TRIAL COLUMNS
-- ============================================================
-- The trial, subscription, and billing columns are declared
-- inline in the businesses table definition in Part 1. This
-- part is retained for reference so future rebuilds and
-- migrations can look here for the semantics.
--
-- Columns on businesses:
--   trial_ends_at              date, last full day of access
--   subscription_started_at    date, first day of the period
--   subscription_status        text, one of: trial, active,
--                              expired, suspended
--   billing_contact_email      varchar, placeholder for reminders
--
-- The businesses_subscription_status_check constraint is added
-- right after the businesses table in Part 1.
-- ============================================================


-- ============================================================
-- PART 9: payment_submissions
-- ============================================================
-- Every Boss-submitted claim of a payment, awaiting admin review.
-- The amount is computed from the plan on the backend, never
-- trusted from the client.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_submissions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    submitted_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
    submitted_by_name   varchar(255),

    method              text NOT NULL,
    amount              numeric NOT NULL,
    duration_months     integer NOT NULL,
    transaction_id      varchar(100) NOT NULL,

    status              text NOT NULL DEFAULT 'pending',
    rejection_reason    text,

    reviewed_by         uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
    reviewed_by_email   varchar(255),
    reviewed_at         timestamptz,

    created_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT payment_submissions_method_check
        CHECK (method IN ('mpesa', 'tigo_pesa', 'airtel_money', 'bank')),

    CONSTRAINT payment_submissions_status_check
        CHECK (status IN ('pending', 'approved', 'rejected')),

    CONSTRAINT payment_submissions_duration_check
        CHECK (duration_months IN (2, 6, 12)),

    CONSTRAINT payment_submissions_amount_check
        CHECK (amount > 0),

    CONSTRAINT payment_submissions_unique_txn
        UNIQUE (business_id, transaction_id)
);

CREATE INDEX IF NOT EXISTS payment_submissions_status_created_idx
    ON public.payment_submissions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_submissions_business_created_idx
    ON public.payment_submissions (business_id, created_at DESC);


-- ============================================================
-- PART 10: signup_atomic
-- ============================================================
-- Creates the Boss user, their first business, and that
-- business's first branch in a single Postgres transaction.
-- Replaces the three separate inserts the onboarding controller
-- used to do. If any step fails, everything rolls back.
--
-- v1.4 changes:
--   * Sets subscription_started_at on the new business.
--   * Uses +13 days for trial_ends_at so the customer gets
--     exactly 14 inclusive days of trial (signup day counts).
-- ============================================================

CREATE OR REPLACE FUNCTION public.signup_atomic(
    p_full_name      varchar,
    p_email          varchar,
    p_phone          varchar,
    p_password_hash  varchar,
    p_business_name  varchar,
    p_branch_name    varchar,
    p_location       text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_user       users;
    v_business   businesses;
    v_branch     branches;
BEGIN
    INSERT INTO users (
        full_name, email, phone, role, password_hash,
        is_first_login, is_active, business_id, branch_id
    ) VALUES (
        p_full_name,
        p_email,
        COALESCE(p_phone, ''),
        'boss',
        p_password_hash,
        false,
        true,
        NULL,
        NULL
    )
    RETURNING * INTO v_user;

    INSERT INTO businesses (
        owner_id, name, shop_name, location, phone, email,
        currency, vat_enabled, vat_rate,
        expense_categories,
        quick_sale_enabled,
        is_active,
        trial_ends_at,
        subscription_started_at,
        subscription_status
    ) VALUES (
        v_user.id,
        p_business_name,
        p_business_name,
        COALESCE(p_location, ''),
        COALESCE(p_phone, ''),
        p_email,
        'TZS',
        false,
        18,
        '["Rent","Salaries","Utilities","Transport","Supplies","Other"]'::jsonb,
        false,
        true,
        CURRENT_DATE + INTERVAL '13 days',
        CURRENT_DATE,
        'trial'
    )
    RETURNING * INTO v_business;

    INSERT INTO branches (
        business_id, name, location, phone, email
    ) VALUES (
        v_business.id,
        p_branch_name,
        COALESCE(v_business.location, ''),
        COALESCE(v_business.phone, ''),
        COALESCE(v_business.email, '')
    )
    RETURNING * INTO v_branch;

    RETURN jsonb_build_object(
        'user',     to_jsonb(v_user)     - 'password_hash',
        'business', to_jsonb(v_business),
        'branch',   to_jsonb(v_branch)
    );
END;
$$;


-- ============================================================
-- DONE
-- ============================================================
-- After running this on a fresh project:
--
-- 1. Update backend .env with the new SUPABASE_URL and keys.
--
-- 2. Sign up through /signup on the frontend to create your
--    Boss account, first business, and first branch in one
--    step. signup_atomic handles this in a single transaction
--    and sets trial_ends_at, subscription_started_at, and
--    subscription_status automatically.
--
-- 3. Manually insert your platform admin row (bcrypt hash):
--
--    INSERT INTO public.platform_admins
--        (email, full_name, password_hash, is_active)
--    VALUES
--        ('you@example.com', 'Platform Owner',
--         '$2a$12$REPLACE_WITH_REAL_HASH', true);
--
-- 4. Verify RLS is enabled on all tables:
--
--    SELECT tablename, rowsecurity
--    FROM pg_tables
--    WHERE schemaname = 'public'
--    ORDER BY tablename;
--
-- 5. Trial columns (trial_ends_at, subscription_started_at,
--    subscription_status, billing_contact_email) are declared
--    inline in Part 1. payment_submissions is in Part 9.
--    Both are part of the main schema, not separate migrations.
-- ============================================================
-- End of v1.4
-- ============================================================