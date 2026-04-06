-- Learning Management Service — Database Initialization
-- This script runs automatically on the first start of the PostgreSQL container.

-- Item: simple key-value items (used as a generic table if needed).
CREATE TABLE IF NOT EXISTS item (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL DEFAULT 'step',
    parent_id INTEGER REFERENCES item(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    attributes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
