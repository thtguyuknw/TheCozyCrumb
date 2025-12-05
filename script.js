// =================================================================
// 1. GLOBAL DATA AND CONSTANTS
// =================================================================

// Define the menu items and their prices. IDs MUST MATCH the HTML 'value' or 'data-item-id'.
const menuItems = [
    // BREADS 
    { id: 'sourdough-loaf', name: 'Sourdough Loaf', price: 10.00 }, 
    { id: 'classic-rye', name: 'Classic Rye', price: 9.50 },        
    { id: 'ciabatta', name: 'Ciabatta', price: 5.00 },           

    // PASTRIES 
    { id: 'croissant', name: 'Butter Croissant', price: 3.50 }, 
    { id: 'almond', name: 'Almond Croissant', price: 4.50 }, 
    { id: 'cinnamon', name: 'Cinnamon Roll', price: 5.00 },      

    // CAKES/SPECIALTY 
    { id: 'small-tart', name: 'Small Fruit Tart', price: 25.00 },
    { id: 'cheesecake-slice', name: 'Cheesecake Slice', price: 7.00 },
    { id: 'mini-donuts', name: 'Mini Donuts (ea.)', price: 3.00 },
];

const TAX_RATE = 0.07; // 7% tax
const CART_STORAGE_KEY = 'cozyCrumbCart';


// =================================================================
// 2. CORE CART MANAGEMENT FUNCTIONS
// =================================================================

/**
 * Retrieves the cart data from LocalStorage as an Object.
 */
function getCartObject() {
    const cartJson = localStorage.getItem(CART_STORAGE_KEY);
    return cartJson ? JSON.parse(cartJson) : {};
}

/**
 * Retrieves the cart data from LocalStorage as an Array of items.
 */
function getCartArray() {
    const cartObject = getCartObject();
    return Object.values(cartObject); 
}

/**
 * Saves the current cart object to LocalStorage.
 */
function saveCart(cartObject) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartObject));
}

/**
 * Empties the cart in LocalStorage.
 */
function clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
}

/**
 * Finds item details by ID, handling variations for Signature Favorites.
 */
function getItemDetails(itemId) {
    let item = menuItems.find(i => i.id === itemId);
    
    if (!item) {
        // Handle common variations from Signature Favorites buttons (using display name as itemId)
        if (itemId === 'Sourdough Loaf (The Kraken)') {
            item = { id: 'sourdough-loaf', name: 'Sourdough Loaf (The Kraken)', price: 10.00 };
        } else if (itemId === 'Butter Croissant') {
            item = { id: 'croissant', name: 'Butter Croissant', price: 4.50 };
        } else if (itemId === 'NY Cheesecake Slice') {
             item = { id: 'cheesecake-slice', name: 'NY Cheesecake Slice', price: 7.00 };
        }
    }
    return item;
}

/**
 * Adds an item to the cart, combining duplicates, and updates the UI.
 */
function addToCart(itemId, qty, nameOverride = null, priceOverride = null) {
    if (qty <= 0) {
        alert("Quantity must be a positive number.");
        return;
    }
    
    const details = getItemDetails(itemId);
    
    const itemDetails = {
        id: details ? details.id : itemId, 
        name: nameOverride || (details ? details.name : itemId),
        price: priceOverride || (details ? details.price : 0)
    };
    
    if (!itemDetails.price || itemDetails.price <= 0) {
        console.error(`Missing or invalid price for item: ${itemDetails.name}`);
        alert("Error: Item price missing. Cannot add to cart.");
        return;
    }

    let cart = getCartObject();
    const storageKey = itemDetails.id; 
    
    if (cart[storageKey]) {
        cart[storageKey].qty += qty;
    } else {
        cart[storageKey] = {
            id: itemDetails.id,
            name: itemDetails.name,
            price: itemDetails.price,
            qty: qty
        };
    }

    saveCart(cart); 
    alert(`${qty} x ${itemDetails.name} added to cart!`);
    
    if (document.getElementById('cart-items-list')) {
        renderOrderCartPreview();
    }
    if (document.getElementById('checkout-cart-items')) {
        renderCart(getCartArray()); 
    }
}

/**
 * Removes an item completely from the cart in LocalStorage.
 */
function removeItemFromCart(itemId) {
    let cart = getCartObject();
    
    if (cart[itemId]) {
        delete cart[itemId];
        saveCart(cart);
        // Alert is removed to keep the process cleaner, but you can re-add it if needed
    }
}


// =================================================================
// 3. ORDER PAGE HANDLERS 
// =================================================================

/**
 * Handles clicks from the Delights section (select dropdowns)
 */
function handleDelightsAddToCart(button) {
    const itemDiv = button.closest('.delight-item');
    const select = itemDiv.querySelector('select');
    
    const qtyInput = itemDiv.querySelector('.product-qty'); 

    const itemId = select.value;
    let qty = parseInt(qtyInput.value);

    const selectedOption = select.options[select.selectedIndex];
    const itemDisplayName = selectedOption.textContent.split('(')[0].trim();
    const itemPrice = getItemDetails(itemId)?.price || parseFloat(selectedOption.dataset.price) || 0; 

    if (itemId === "none" || itemId === "" || itemPrice <= 0) {
        alert('Please select a valid item type.');
        return;
    }

    if (isNaN(qty) || qty <= 0) {
        alert("The quantity must be a positive number."); 
        return;
    }
    
    addToCart(itemId, qty, itemDisplayName, itemPrice);

    select.selectedIndex = 0;
    qtyInput.value = 0; 
}

/**
 * Handles clicks from the Signature Favorites section (individual product cards)
 */
function handleFavoritesAddToCart(button) {
    const itemId = button.dataset.name;
    const itemPrice = parseFloat(button.dataset.price);

    const itemControlsDiv = button.parentElement;
    const qtyInput = itemControlsDiv.querySelector('input[type="number"]');

    let qty = parseInt(qtyInput.value);

    if (isNaN(qty) || qty <= 0) {
        alert("The quantity must be a positive number.");
        return;
    }
    
    addToCart(itemId, qty, itemId, itemPrice);

    qtyInput.value = 0;
}


// =================================================================
// 4. ORDER PAGE CART DISPLAY LOGIC
// =================================================================

/**
 * Renders a simplified summary of the cart on the order page.
 */
function renderOrderCartPreview() {
    const cartArray = getCartArray(); 
    const cartPreview = document.getElementById('cart-items-list');
    const totalSpan = document.getElementById('cart-total'); 
    
    if (!cartPreview || !totalSpan) {
        return;
    }

    let subtotal = 0;
    let previewHTML = '';

    if (cartArray.length === 0) {
        previewHTML = '<p>Your cart is empty.</p>';
    } else {
        cartArray.forEach(item => {
            const itemTotal = item.price * item.qty;
            subtotal += itemTotal;
            previewHTML += `<p>${item.name} (${item.qty} x) - $${itemTotal.toFixed(2)}</p>`;
        });
    }

    cartPreview.innerHTML = previewHTML;
    totalSpan.textContent = `$${subtotal.toFixed(2)}`;
}


// =================================================================
// 5. CHECKOUT PAGE DYNAMIC RENDER & VALIDATION LOGIC
// =================================================================

function calculateTotals(cartData) {
    let subtotal = 0;
    cartData.forEach(item => {
        subtotal += item.price * item.qty;
    });

    const tax = subtotal * TAX_RATE;
    const grandTotal = subtotal + tax;

    document.getElementById('subtotal-cost').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax-cost').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('grand-total-cost').textContent = `$${grandTotal.toFixed(2)}`;
}

/**
 * Renders the full cart summary table on the checkout page.
 */
function renderCart(cartData) {
    const cartContainer = document.getElementById('checkout-cart-items'); 
    
    if (!cartContainer) return; 

    // Updated header to account for the new "Remove" button column
    let html = `
        <div class="header-row" style="grid-template-columns: 2fr 0.5fr 1fr 0.5fr;">
            <span>Item</span>
            <span>Qty</span>
            <span style="text-align: right;">Total</span>
            <span></span> </div>
    `;

    if (cartData.length === 0) {
        html += '<p style="grid-column: 1 / -1; margin-top: 10px;">Your cart is empty. Please return to the Order Now page.</p>';
    } else {
        cartData.forEach(item => {
            const itemTotal = item.price * item.qty;
            
            // HTML structure updated to include the Remove button
            html += `
                <div class="item-row" data-item-id="${item.id}" style="display: grid; grid-template-columns: 2fr 0.5fr 1fr 0.5fr; gap: 10px; padding: 8px 0; border-top: 1px dashed #555; align-items: center;">
                    <span>${item.name}</span>
                    <span>${item.qty}</span>
                    <span style="text-align: right;">$${itemTotal.toFixed(2)}</span>
                    <button class="remove-item-btn" data-item-id="${item.id}" style="
                        background: none; 
                        border: none; 
                        color: #a00; 
                        cursor: pointer; 
                        font-size: 1.2em; 
                        padding: 0;
                        margin-left: auto;">&times;</button>
                </div>
            `;
        });
    }
    
    cartContainer.innerHTML = html; 
    
    calculateTotals(cartData);
    checkFormValidity(cartData); 
    
    // CRUCIAL: Attach listeners to the newly created buttons after rendering
    setupRemoveButtonListeners(); 
}

/**
 * Checks if the cart is not empty AND if all required form fields are valid.
 */
function checkFormValidity(cartData) {
    const placeOrderBtn = document.getElementById('place-order-btn');
    const validationMessage = document.getElementById('validation-message');
    
    if (!placeOrderBtn) return;

    const requiredInputs = document.querySelectorAll('#pickup-details-form input[required], #pickup-details-form select[required], #payment-form input[required]');

    let isFormValid = true;
    let isCartNotEmpty = cartData.length > 0;

    requiredInputs.forEach(input => {
        if (!input.checkValidity()) {
            isFormValid = false;
        }
    });

    if (isFormValid && isCartNotEmpty) {
        placeOrderBtn.disabled = false;
        validationMessage.textContent = '';
    } else {
        placeOrderBtn.disabled = true;
        
        if (!isCartNotEmpty) {
            validationMessage.textContent = 'Your cart is empty. Please add items before placing the order.';
        } else if (!isFormValid) {
            validationMessage.textContent = 'Please fill out all required fields correctly.';
        }
    }
}

// =================================================================
// 6. EVENT LISTENERS SETUP
// =================================================================

/**
 * Handles the click event for removing an item.
 */
function handleRemoveItem(event) {
    const itemId = event.target.dataset.itemId;
    
    if (confirm(`Are you sure you want to remove this item?`)) {
        removeItemFromCart(itemId);
        // Re-render the cart immediately after removal
        renderCart(getCartArray()); 
    }
}

/**
 * Attaches listeners to the 'x' remove buttons in the cart table on the checkout page.
 */
function setupRemoveButtonListeners() {
    document.querySelectorAll('.remove-item-btn').forEach(button => {
        // Ensure no duplicate listeners by removing any existing ones
        button.removeEventListener('click', handleRemoveItem);
        
        button.addEventListener('click', handleRemoveItem);
    });
}

// =================================================================
// 7. INITIALIZATION (Runs on both order.html and checkout.html)
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Order Page Logic ---
    const orderPreviewContainer = document.getElementById('cart-items-list'); 

    if (orderPreviewContainer) {
        renderOrderCartPreview();

        document.querySelectorAll('.add-delight-to-cart-btn').forEach(button => {
            button.addEventListener('click', () => handleDelightsAddToCart(button));
        });

        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', () => handleFavoritesAddToCart(button));
        });
    }
    
    // --- Checkout Page Logic ---
    const checkoutContainer = document.getElementById('checkout-cart-items');

    if (checkoutContainer) {
        const placeOrderBtn = document.getElementById('place-order-btn');
        const requiredInputs = document.querySelectorAll('#pickup-details-form input[required], #pickup-details-form select[required], #payment-form input[required]');
        
        const initialCart = getCartArray();
        renderCart(initialCart); // renderCart now calls setupRemoveButtonListeners internally
        
        requiredInputs.forEach(input => {
            input.addEventListener('input', () => checkFormValidity(getCartArray()));
            input.addEventListener('change', () => checkFormValidity(getCartArray()));
        });
        
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener('click', (e) => {
                e.preventDefault(); 
                if (!placeOrderBtn.disabled) {
                    alert('Order Placed Successfully! We will send a confirmation email.');
                    clearCart(); 
                    setTimeout(() => {
                        window.location.href = 'index.html'; 
                    }, 500);
                }
            });
        }
    }
});