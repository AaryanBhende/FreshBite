CREATE DATABASE IF NOT EXISTS freshbite_db;
USE freshbite_db;

CREATE TABLE IF NOT EXISTS menu_items (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(250) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    img VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    title VARCHAR(250) NOT NULL,
    category VARCHAR(50) DEFAULT 'None',
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    notes TEXT,
    completed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO menu_items (id, title, category, description, price, img) VALUES 
('cat-1', 'Avocado Harvest Toast', 'Vegetarian', 'Smashed avocado, poached egg, microgreens on sourdough.', 280.00, 'assets/images/Avocado-Egg-Toast.png'),
('cat-2', 'Signature Acai Bowl', 'Vegan', 'Organic acai, crunchy granola, seasonal berries, honey drizzle.', 320.00, 'assets/images/Acai-Bowl.png'),
('cat-3', 'Artisan Latte & Croissant', 'Vegetarian', 'Freshly brewed coffee paired with a buttery French croissant.', 220.00, 'assets/images/Latte-Croissant.png'),
('cat-4', 'Grilled Chicken Bowl', 'Gluten-Free', 'Marinated chicken breast, quinoa, kale, and lemon vinaigrette.', 350.00, 'assets/images/Chicken-Salad.png'),
('cat-5', 'Truffle Mushroom Flatbread', 'Vegetarian', 'Wild mushrooms, truffle oil, mozzarella, and fresh arugula on a crispy crust.', 340.00, 'assets/images/Mushroom-Flatbread.png'),
('cat-6', 'Smoked Salmon Bagel', 'None', 'Toasted whole-wheat bagel with cream cheese, capers, red onion, and premium smoked salmon.', 390.00, 'assets/images/Salmon-Bagel.png'),
('cat-7', 'Almond Butter & Banana Toast', 'Vegan', 'House-made almond butter, sliced bananas, chia seeds, and maple syrup on rustic rye.', 260.00, 'assets/images/Almond-Banana-Toast.png'),
('cat-8', 'Matcha Chia Seed Pudding', 'Vegan', 'Organic matcha infused chia pudding, topped with coconut flakes and fresh mango.', 290.00, 'assets/images/Matcha-Chia-Pudding.png'),
('cat-9', 'Mediterranean Hummus Wrap', 'Vegetarian', 'Creamy hummus, cucumber, kalamata olives, feta, and roasted peppers in a spinach tortilla.', 300.00, 'assets/images/Hummus-Wrap.png'),
('cat-10', 'Spicy Shakshuka', 'Vegetarian', 'Two poached eggs in a simmering spiced tomato and pepper sauce, served with warm pita.', 310.00, 'assets/images/Shakshuka.png'),
('cat-11', 'Sweet Potato & Black Bean Bowl', 'Gluten-Free', 'Roasted sweet potatoes, black beans, avocado, and brown rice with a zesty cilantro-lime dressing.', 330.00, 'assets/images/Sweet-Potato-Bowl.png'),
('cat-12', 'Brioche French Toast', 'Vegetarian', 'Thick-cut brioche soaked in vanilla custard, served with whipped cream and mixed berry compote.', 280.00, 'assets/images/French-Toast.png'),
('cat-13', 'Turkey Avocado Club', 'None', 'Smoked turkey breast, crisp bacon, avocado, lettuce, tomato, and garlic aioli on sourdough.', 360.00, 'assets/images/Turkey-Club.png'),
('cat-14', 'Iced Vanilla Oat Milk Matcha', 'Vegan', 'Premium ceremonial grade matcha whisked with creamy oat milk and a touch of vanilla syrup.', 240.00, 'assets/images/Iced-Matcha.png')
ON DUPLICATE KEY UPDATE id=id;