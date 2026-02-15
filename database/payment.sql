-- 🏦 **SwiftNexus Payments Schema for NowPayments Integration**

-- Create payments table for tracking all cryptocurrency transactions
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id VARCHAR(100) UNIQUE NOT NULL,  -- NowPayments payment ID
    order_id VARCHAR(100) NOT NULL,           -- Internal order ID
    parent_payment_id VARCHAR(100),           -- For repeated deposits
    invoice_id VARCHAR(100),                  -- If using invoice flow
    
    -- Payment details
    amount DECIMAL(20,8) NOT NULL,             -- Original amount
    currency VARCHAR(10) NOT NULL,             -- Original currency (USD, EUR, etc.)
    pay_amount DECIMAL(20,8),                 -- Amount in crypto
    pay_currency VARCHAR(10) NOT NULL,        -- Crypto currency (BTC, ETH, USDT, etc.)
    actually_paid DECIMAL(20,8),              -- Actual amount paid
    actually_paid_at_fiat DECIMAL(20,8),      -- Actual amount in fiat
    
    -- Address and conversion
    pay_address TEXT NOT NULL,                 -- Deposit address for user
    payin_extra_id TEXT,                      -- Extra ID for certain currencies
    outcome_amount DECIMAL(20,8),              -- Amount after conversion
    outcome_currency VARCHAR(10),              -- Final currency after conversion
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'waiting',  -- waiting, confirming, finished, failed, expired, partially_paid
    payment_status VARCHAR(20),                -- NowPayments status
    error_message TEXT,
    
    -- Fees
    fee_currency VARCHAR(10),
    deposit_fee DECIMAL(20,8),
    withdrawal_fee DECIMAL(20,8),
    service_fee DECIMAL(20,8),
    
    -- Metadata
    order_description TEXT,
    purchase_id VARCHAR(100),
    ipn_callback_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_payments_user_id (user_id),
    INDEX idx_payments_status (status),
    INDEX idx_payments_payment_id (payment_id),
    INDEX idx_payments_order_id (order_id),
    INDEX idx_payments_created_at (created_at),
    INDEX idx_payments_currency (currency),
    INDEX idx_payments_pay_currency (pay_currency)
);

-- Create payment_notifications table for IPN webhook logs
CREATE TABLE IF NOT EXISTS payment_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id VARCHAR(100) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,    -- payment_status, withdrawal_status, etc.
    
    -- Notification data
    raw_payload JSONB NOT NULL,                -- Complete IPN payload
    signature VARCHAR(512),                   -- x-nowpayments-sig header
    signature_valid BOOLEAN DEFAULT false,    -- Whether signature was valid
    
    -- Processing status
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    error_message TEXT,
    
    -- Timestamps
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_payment_notifications_payment_id (payment_id),
    INDEX idx_payment_notifications_processed (processed),
    INDEX idx_payment_notifications_received_at (received_at)
);

-- Create payment_attempts table for tracking retry attempts
CREATE TABLE IF NOT EXISTS payment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id VARCHAR(100) NOT NULL,
    attempt_number INTEGER NOT NULL,
    
    -- Attempt details
    action VARCHAR(50) NOT NULL,              -- create, check_status, etc.
    request_data JSONB,
    response_data JSONB,
    status_code INTEGER,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_payment_attempts_payment_id (payment_id),
    INDEX idx_payment_attempts_created_at (created_at)
);

-- Create user_balances table for tracking user cryptocurrency balances
CREATE TABLE IF NOT EXISTS user_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL,
    balance DECIMAL(20,8) NOT NULL DEFAULT 0,
    locked_balance DECIMAL(20,8) NOT NULL DEFAULT 0,  -- For pending transactions
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE(user_id, currency),
    
    -- Indexes
    INDEX idx_user_balances_user_id (user_id),
    INDEX idx_user_balances_currency (currency)
);

-- Create balance_transactions table for all balance movements
CREATE TABLE IF NOT EXISTS balance_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id VARCHAR(100),                  -- Associated payment if any
    transaction_type VARCHAR(20) NOT NULL,     -- deposit, withdrawal, fee, etc.
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(20,8) NOT NULL,             -- Positive for credit, negative for debit
    balance_before DECIMAL(20,8),             -- Balance before transaction
    balance_after DECIMAL(20,8),              -- Balance after transaction
    
    -- Metadata
    description TEXT,
    reference_id VARCHAR(100),                -- External reference
    metadata JSONB,                           -- Additional data
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_balance_transactions_user_id (user_id),
    INDEX idx_balance_transactions_payment_id (payment_id),
    INDEX idx_balance_transactions_type (transaction_type),
    INDEX idx_balance_transactions_created_at (created_at)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_balances_updated_at BEFORE UPDATE ON user_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default user balances for existing users
INSERT INTO user_balances (user_id, currency, balance)
SELECT id, 'USD', 0 FROM users WHERE id NOT IN (SELECT user_id FROM user_balances WHERE currency = 'USD');

-- Insert default user balances for crypto currencies
INSERT INTO user_balances (user_id, currency, balance)
SELECT id, 'BTC', 0 FROM users WHERE id NOT IN (SELECT user_id FROM user_balances WHERE currency = 'BTC');

INSERT INTO user_balances (user_id, currency, balance)
SELECT id, 'ETH', 0 FROM users WHERE id NOT IN (SELECT user_id FROM user_balances WHERE currency = 'ETH');

INSERT INTO user_balances (user_id, currency, balance)
SELECT id, 'USDT', 0 FROM users WHERE id NOT IN (SELECT user_id FROM user_balances WHERE currency = 'USDT');

-- Create view for payment statistics
CREATE OR REPLACE VIEW payment_stats AS
SELECT 
    COUNT(*) as total_payments,
    COUNT(CASE WHEN status = 'finished' THEN 1 END) as completed_payments,
    COUNT(CASE WHEN status = 'waiting' OR status = 'confirming' THEN 1 END) as pending_payments,
    COUNT(CASE WHEN status = 'failed' OR status = 'expired' THEN 1 END) as failed_payments,
    COALESCE(SUM(CASE WHEN status = 'finished' THEN amount ELSE 0 END), 0) as total_amount_processed,
    COALESCE(SUM(CASE WHEN status = 'finished' THEN actually_paid ELSE 0 END), 0) as total_crypto_received,
    COALESCE(AVG(CASE WHEN status = 'finished' THEN actually_paid ELSE NULL END), 0) as avg_payment_amount,
    DATE_TRUNC('day', created_at) as date
FROM payments
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Create view for user payment summary
CREATE OR REPLACE VIEW user_payment_summary AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(p.id) as total_payments,
    COUNT(CASE WHEN p.status = 'finished' THEN 1 END) as completed_payments,
    COALESCE(SUM(CASE WHEN p.status = 'finished' THEN p.amount ELSE 0 END), 0) as total_deposited,
    COALESCE(ub.balance, 0) as current_balance,
    MAX(p.created_at) as last_payment_date
FROM users u
LEFT JOIN payments p ON u.id = p.user_id
LEFT JOIN user_balances ub ON u.id = ub.user_id AND ub.currency = 'USD'
GROUP BY u.id, u.email, ub.balance
ORDER BY total_deposited DESC;
