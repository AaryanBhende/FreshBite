document.addEventListener('DOMContentLoaded', () => {
    const catalogDishes = [
        { id: 'cat-1', title: 'Avocado Harvest Toast', category: 'Vegetarian', description: 'Smashed avocado, poached egg, microgreens on sourdough.', price: 280, img: 'assets/images/Avocado-Egg-Toast.png' },
        { id: 'cat-2', title: 'Signature Acai Bowl', category: 'Vegan', description: 'Organic acai, crunchy granola, seasonal berries, honey drizzle.', price: 320, img: 'assets/images/Acai-Bowl.png' },
        { id: 'cat-3', title: 'Artisan Latte & Croissant', category: 'Vegetarian', description: 'Freshly brewed coffee paired with a buttery French croissant.', price: 220, img: 'assets/images/Latte-Croissant.png' },
        { id: 'cat-4', title: 'Grilled Chicken Bowl', category: 'Gluten-Free', description: 'Marinated chicken breast, quinoa, kale, and lemon vinaigrette.', price: 350, img: 'assets/images/Chicken-Salad.png' },
        { id: 'cat-5', title: 'Truffle Mushroom Flatbread', category: 'Vegetarian', description: 'Wild mushrooms, truffle oil, mozzarella, and fresh arugula on a crispy crust.', price: 340, img: 'assets/images/Mushroom-Flatbread.png' },
        { id: 'cat-6', title: 'Smoked Salmon Bagel', category: 'None', description: 'Toasted whole-wheat bagel with cream cheese, capers, red onion, and premium smoked salmon.', price: 390, img: 'assets/images/Salmon-Bagel.png' },
        { id: 'cat-7', title: 'Almond Butter & Banana Toast', category: 'Vegan', description: 'House-made almond butter, sliced bananas, chia seeds, and maple syrup on rustic rye.', price: 260, img: 'assets/images/Almond-Banana-Toast.png' },
        { id: 'cat-8', title: 'Matcha Chia Seed Pudding', category: 'Vegan', description: 'Organic matcha infused chia pudding, topped with coconut flakes and fresh mango.', price: 290, img: 'assets/images/Matcha-Chia-Pudding.png' },
        { id: 'cat-9', title: 'Mediterranean Hummus Wrap', category: 'Vegetarian', description: 'Creamy hummus, cucumber, kalamata olives, feta, and roasted peppers in a spinach tortilla.', price: 300, img: 'assets/images/Hummus-Wrap.png' },
        { id: 'cat-10', title: 'Spicy Shakshuka', category: 'Vegetarian', description: 'Two poached eggs in a simmering spiced tomato and pepper sauce, served with warm pita.', price: 310, img: 'assets/images/Shakshuka.png' },
        { id: 'cat-11', title: 'Sweet Potato & Black Bean Bowl', category: 'Gluten-Free', description: 'Roasted sweet potatoes, black beans, avocado, and brown rice with a zesty cilantro-lime dressing.', price: 330, img: 'assets/images/Sweet-Potato-Bowl.png' },
        { id: 'cat-12', title: 'Brioche French Toast', category: 'Vegetarian', description: 'Thick-cut brioche soaked in vanilla custard, served with whipped cream and mixed berry compote.', price: 280, img: 'assets/images/French-Toast.png' },
        { id: 'cat-13', title: 'Turkey Avocado Club', category: 'None', description: 'Smoked turkey breast, crisp bacon, avocado, lettuce, tomato, and garlic aioli on sourdough.', price: 360, img: 'assets/images/Turkey-Club.png' },
        { id: 'cat-14', title: 'Iced Vanilla Oat Milk Matcha', category: 'Vegan', description: 'Premium ceremonial grade matcha whisked with creamy oat milk and a touch of vanilla syrup.', price: 240, img: 'assets/images/Iced-Matcha.png' }

    ];

    const dishCatalog = {
        'Avocado Harvest Toast': { category: 'Vegetarian', price: 280 },
        'Signature Acai Bowl': { category: 'Vegan', price: 320 },
        'Artisan Latte & Croissant': { category: 'Vegetarian', price: 220 },
        'Grilled Chicken Bowl': { category: 'Gluten-Free', price: 350 },
        'Truffle Mushroom Flatbread': { category: 'Vegetarian', price: 340 },
        'Smoked Salmon Bagel': { category: 'None', price: 390 },
        'Almond Butter & Banana Toast': { category: 'Vegan', price: 260 },
        'Matcha Chia Seed Pudding': { category: 'Vegan', price: 290 },
        'Mediterranean Hummus Wrap': { category: 'Vegetarian', price: 300 },
        'Spicy Shakshuka': { category: 'Vegetarian', price: 310 },
        'Sweet Potato & Black Bean Bowl': { category: 'Gluten-Free', price: 330 },
        'Brioche French Toast': { category: 'Vegetarian', price: 280 },
        'Turkey Avocado Club': { category: 'None', price: 360 },
        'Iced Vanilla Oat Milk Matcha': { category: 'Vegan', price: 240 }

    };

    let userOrders = [];
    let activeCategory = 'All';
    let searchQuery = '';
    let pendingDeleteId = null;

    let currentSelectedPrice = 0;
    let currentSelectedCategory = 'None';

    const catalogGrid = document.getElementById('catalogGrid');
    const ordersList = document.getElementById('ordersList');
    const orderForm = document.getElementById('orderForm');
    const formTitle = document.getElementById('formTitle');
    const formFeedback = document.getElementById('formFeedback');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const searchInput = document.getElementById('searchInput');
    const categoryFilters = document.getElementById('categoryFilters');
    const deleteModal = document.getElementById('deleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const itemNameInput = document.getElementById('itemName');
    const displayCategory = document.getElementById('displayCategory');
    const displayPrice = document.getElementById('displayPrice');

    function loadOrders() {
        const stored = localStorage.getItem('freshbite_user_orders');
        if (stored) {
            userOrders = JSON.parse(stored);
        }
        renderOrders();
    }

    function saveOrders() {
        localStorage.setItem('freshbite_user_orders', JSON.stringify(userOrders));
    }

    function renderCatalog() {
        catalogGrid.innerHTML = '';
        const filtered = catalogDishes.filter(item => {
            const matchesCat = activeCategory === 'All' || item.category === activeCategory;
            const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  item.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesSearch;
        });

        if (filtered.length === 0) {
            catalogGrid.innerHTML = `<p class="no-items">No dishes match your search/filter.</p>`;
            return;
        }

        filtered.forEach(dish => {
            const card = document.createElement('article');
            card.className = 'catalog-card';
            card.innerHTML = `
                <div class="card-image-wrap">
                    <img src="${dish.img}" alt="${dish.title}">
                    <span class="card-price">₹${dish.price}</span>
                </div>
                <div class="card-body">
                    <div class="card-header">
                        <h3>${dish.title}</h3>
                        <span class="category-tag">${dish.category}</span>
                    </div>
                    <p class="card-desc">${dish.description}</p>
                    <div class="card-footer">
                        <button class="btn-primary" onclick="selectDishForOrder('${dish.id}')">+ Add to Order</button>
                    </div>
                </div>
            `;
            catalogGrid.appendChild(card);
        });
    }

    function renderOrders() {
        ordersList.innerHTML = '';
        if (userOrders.length === 0) {
            ordersList.innerHTML = `<p class="no-items" style="font-size:0.85rem; color:#777;">Your cart is empty. Click "+ Add to Order" on any menu item above or add via the form.</p>`;
            return;
        }

        const ol = document.createElement('ol');
        ol.className = 'summary-ol';

        let totalBill = 0;

        userOrders.forEach(order => {
            const itemTotal = order.price * order.quantity;
            totalBill += itemTotal;

            const li = document.createElement('li');
            li.className = `summary-li ${order.completed ? 'completed' : ''}`;
            li.innerHTML = `
                <p class="order-item-title">${order.title} <span class="category-tag">${order.category}</span></p>
                <div class="order-item-meta">
                    Price: <strong>₹${order.price}</strong> | Qty: <strong>${order.quantity}</strong> | Item Total: <strong>₹${itemTotal}</strong><br>
                    ${order.notes ? `<em>Custom Note: ${order.notes}</em>` : '<em>Custom Note: None</em>'}
                </div>
                <div class="order-item-controls">
                    <label>
                        <input type="checkbox" ${order.completed ? 'checked' : ''} onchange="toggleOrderComplete('${order.id}')"> Complete
                    </label>
                    <div>
                        <button class="btn-secondary" onclick="startEditOrder('${order.id}')">Edit</button>
                        <button class="btn-danger" onclick="promptDeleteOrder('${order.id}')">Delete</button>
                    </div>
                </div>
            `;
            ol.appendChild(li);
        });

        ordersList.appendChild(ol);

        const totalContainer = document.createElement('div');
        totalContainer.className = 'total-bill-container';
        totalContainer.innerHTML = `<span>Total Bill:</span> <span>₹${totalBill}</span>`;
        ordersList.appendChild(totalContainer);
    }

    // Auto update sidebar details on user typing/selecting dish
    itemNameInput.addEventListener('input', (e) => {
        const selectedName = e.target.value.trim();
        if (dishCatalog[selectedName]) {
            currentSelectedPrice = dishCatalog[selectedName].price;
            currentSelectedCategory = dishCatalog[selectedName].category;
        } else {
            currentSelectedPrice = 0;
            currentSelectedCategory = 'None';
        }
        displayCategory.textContent = currentSelectedCategory;
        displayPrice.textContent = `₹${currentSelectedPrice}`;
    });

    // Handle "+ Add to Order" from grid cards
    window.selectDishForOrder = function(dishId) {
        const dish = catalogDishes.find(d => d.id === dishId);
        if (!dish) return;

        resetForm();
        itemNameInput.value = dish.title;
        currentSelectedPrice = dish.price;
        currentSelectedCategory = dish.category;

        displayCategory.textContent = currentSelectedCategory;
        displayPrice.textContent = `₹${currentSelectedPrice}`;

        document.getElementById('itemQuantity').value = 1;

        window.scrollTo({
            top: orderForm.offsetTop - 80,
            behavior: 'smooth'
        });
    };

    // Sidebar Form Submission
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        formFeedback.classList.add('hidden');
        formFeedback.innerHTML = '';

        const id = document.getElementById('orderId').value;
        const name = itemNameInput.value.trim();
        const quantity = parseInt(document.getElementById('itemQuantity').value);
        const notes = document.getElementById('itemNotes').value.trim();
        const errors = [];

        // Error Validation
        if (!name) {
            errors.push('Please select or enter a valid dish name.');
        } else if (!dishCatalog[name] && currentSelectedPrice === 0) {
            errors.push('Please select a valid dish from the menu.');
        }

        if (isNaN(quantity) || quantity < 1) {
            errors.push('Quantity must be at least 1.');
        }

        if (errors.length > 0) {
            formFeedback.innerHTML = errors.join('<br>');
            formFeedback.classList.remove('hidden');
            return;
        }

        if (id) {
            const index = userOrders.findIndex(item => item.id === id);
            if (index !== -1) {
                userOrders[index] = {
                    ...userOrders[index],
                    title: name,
                    category: currentSelectedCategory,
                    price: currentSelectedPrice,
                    quantity,
                    notes
                };
            }
        } else {
            const newOrder = {
                id: 'order-' + Date.now(),
                title: name,
                category: currentSelectedCategory,
                price: currentSelectedPrice,
                quantity,
                notes,
                completed: false
            };
            userOrders.unshift(newOrder);
        }

        saveOrders();
        resetForm();
        renderOrders();
    });

    window.toggleOrderComplete = function(id) {
        const order = userOrders.find(o => o.id === id);
        if (order) {
            order.completed = !order.completed;
            saveOrders();
            renderOrders();
        }
    };

    window.startEditOrder = function(id) {
        const item = userOrders.find(i => i.id === id);
        if (!item) return;

        document.getElementById('orderId').value = item.id;
        itemNameInput.value = item.title;
        document.getElementById('itemQuantity').value = item.quantity;
        document.getElementById('itemNotes').value = item.notes;

        currentSelectedPrice = item.price;
        currentSelectedCategory = item.category || 'None';

        displayCategory.textContent = currentSelectedCategory;
        displayPrice.textContent = `₹${currentSelectedPrice}`;

        formTitle.textContent = 'Edit Order / Dish';
        document.getElementById('submitBtn').textContent = 'Update Item';
        cancelEditBtn.classList.remove('hidden');

        window.scrollTo({
            top: orderForm.offsetTop - 80,
            behavior: 'smooth'
        });
    };

    cancelEditBtn.addEventListener('click', resetForm);

    function resetForm() {
        orderForm.reset();
        document.getElementById('orderId').value = '';
        currentSelectedPrice = 0;
        currentSelectedCategory = 'None';
        displayCategory.textContent = 'None';
        displayPrice.textContent = '₹0';
        formTitle.textContent = 'Add Custom Dish / Order';
        document.getElementById('submitBtn').textContent = 'Add to Order';
        cancelEditBtn.classList.add('hidden');
        formFeedback.classList.add('hidden');
    }

    window.promptDeleteOrder = function(id) {
        pendingDeleteId = id;
        deleteModal.classList.remove('hidden');
    };

    confirmDeleteBtn.addEventListener('click', () => {
        if (pendingDeleteId) {
            userOrders = userOrders.filter(o => o.id !== pendingDeleteId);
            saveOrders();
            renderOrders();
            pendingDeleteId = null;
        }
        deleteModal.classList.add('hidden');
    });

    cancelDeleteBtn.addEventListener('click', () => {
        pendingDeleteId = null;
        deleteModal.classList.add('hidden');
    });

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderCatalog();
    });

    categoryFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            activeCategory = e.target.getAttribute('data-category');
            renderCatalog();
        }
    });

    renderCatalog();
    loadOrders();
});