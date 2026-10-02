-- Finora PostgreSQL Schema & Row Level Security (RLS) Policies
-- Migration: 20261002000000_finora_schema_and_rls.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    primary_currency VARCHAR(3) NOT NULL DEFAULT 'ARS',
    timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    privacy_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Accounts
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('cash', 'bank', 'digital_wallet', 'savings', 'other')),
    currency VARCHAR(3) NOT NULL DEFAULT 'ARS',
    initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    color VARCHAR(20) DEFAULT '#5687F5',
    icon VARCHAR(30) DEFAULT 'Wallet',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id);

-- 3. Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    financial_group VARCHAR(30) NOT NULL CHECK (financial_group IN ('income', 'fixed_expense', 'variable_expense', 'ant_expense', 'savings_debt')),
    icon VARCHAR(40) NOT NULL DEFAULT 'Tag',
    color VARCHAR(20) NOT NULL DEFAULT '#60A5FA',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own categories" ON public.categories FOR ALL USING (auth.uid() = user_id);

-- 4. Installment Plans
CREATE TABLE IF NOT EXISTS public.installment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL CHECK (total_amount > 0),
    installments_count INTEGER NOT NULL CHECK (installments_count > 1),
    periodicity VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (periodicity IN ('monthly', 'biweekly')),
    first_due_date DATE NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own installment plans" ON public.installment_plans FOR ALL USING (auth.uid() = user_id);

-- 5. Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    category_id UUID REFERENCES public.categories(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'savings_deposit', 'savings_withdrawal', 'debt_payment', 'balance_adjustment')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'ARS',
    description TEXT NOT NULL,
    notes TEXT,
    payment_method VARCHAR(50),
    tags TEXT[] DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    idempotency_key UUID UNIQUE NOT NULL,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced',
    installment_plan_id UUID REFERENCES public.installment_plans(id) ON DELETE SET NULL,
    installment_number INTEGER,
    transfer_destination_account_id UUID REFERENCES public.accounts(id)
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);

-- 6. Installments
CREATE TABLE IF NOT EXISTS public.installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES public.installment_plans(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    total_installments INTEGER NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    paid_date TIMESTAMPTZ,
    paid_amount DECIMAL(15, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'upcoming', 'overdue', 'paid', 'cancelled')),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL
);

ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own installments" ON public.installments 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.installment_plans 
            WHERE public.installment_plans.id = public.installments.plan_id 
            AND public.installment_plans.user_id = auth.uid()
        )
    );

-- 7. Budgets
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    period_month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('general', 'category', 'group')),
    target_id UUID,
    limit_amount DECIMAL(15, 2) NOT NULL CHECK (limit_amount > 0),
    spent_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    alert_level_triggered INTEGER NOT NULL DEFAULT 0 CHECK (alert_level_triggered IN (0, 70, 90, 100)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);

-- 8. Savings Goals
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    target_date DATE,
    account_id UUID REFERENCES public.accounts(id),
    icon VARCHAR(30) NOT NULL DEFAULT 'PiggyBank',
    color VARCHAR(20) NOT NULL DEFAULT '#FB7185',
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own savings goals" ON public.savings_goals FOR ALL USING (auth.uid() = user_id);

-- 9. Debts
CREATE TABLE IF NOT EXISTS public.debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    creditor_name TEXT NOT NULL,
    description TEXT,
    original_amount DECIMAL(15, 2) NOT NULL CHECK (original_amount > 0),
    remaining_capital DECIMAL(15, 2) NOT NULL CHECK (remaining_capital >= 0),
    interest_rate DECIMAL(5, 2),
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own debts" ON public.debts FOR ALL USING (auth.uid() = user_id);

-- 10. Monthly Reports
CREATE TABLE IF NOT EXISTS public.monthly_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    month_period VARCHAR(7) NOT NULL,
    total_income DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_expense DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    fixed_expense DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    variable_expense DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ant_expense DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    savings_net DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    debt_repaid DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    report_data_json JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, month_period)
);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own monthly reports" ON public.monthly_reports FOR ALL USING (auth.uid() = user_id);

-- 11. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('success', 'warning', 'error', 'info')),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_occurred ON public.transactions(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_installments_plan ON public.installments(plan_id, status);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, period_month);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = FALSE;
