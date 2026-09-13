-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Master Food Database (per 100g or 100ml)
CREATE TABLE IF NOT EXISTS foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode VARCHAR(64) UNIQUE,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    calories_per_100g NUMERIC(6, 2) NOT NULL DEFAULT 0,
    protein_per_100g NUMERIC(6, 2) NOT NULL DEFAULT 0,
    carbs_per_100g NUMERIC(6, 2) NOT NULL DEFAULT 0,
    fat_per_100g NUMERIC(6, 2) NOT NULL DEFAULT 0,
    serving_unit VARCHAR(32) NOT NULL DEFAULT 'g', -- 'g', 'ml', 'piece'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Physical Inventory / Stock
CREATE TABLE IF NOT EXISTS pantry_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    quantity_remaining NUMERIC(8, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(32) NOT NULL DEFAULT 'g',
    purchase_date DATE DEFAULT CURRENT_DATE,
    expiration_date DATE,
    low_stock_threshold NUMERIC(8, 2) DEFAULT 200,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Recipes & Meal Prep Definitions
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    servings INT NOT NULL DEFAULT 1,
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Recipe Ingredients (Join Table with Ratios)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES foods(id) ON DELETE RESTRICT,
    amount NUMERIC(8, 2) NOT NULL, -- in grams/ml/pieces
    unit VARCHAR(32) NOT NULL DEFAULT 'g'
);

-- 5. Indexes for Fast Queries
CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode);
CREATE INDEX IF NOT EXISTS idx_pantry_food_id ON pantry_items(food_id);
CREATE INDEX IF NOT EXISTS idx_pantry_exp_date ON pantry_items(expiration_date);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);