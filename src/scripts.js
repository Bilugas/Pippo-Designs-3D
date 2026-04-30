const whatsappNumber = "5511987550497";
const productsUrl = "products.json";
const cartStorageKey = "pippoDesigns3dCart";
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});

const htmlEscapeMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

function toggleMenu() {
    const menu = document.querySelector(".menu");
    const button = document.querySelector(".menu-icon");

    if (!menu || !button) {
        return;
    }

    setMenuState(!menu.classList.contains("active"));
}

function setMenuState(isOpen) {
    const menu = document.querySelector(".menu");
    const button = document.querySelector(".menu-icon");
    const icon = button ? button.querySelector("i") : null;

    if (!menu || !button) {
        return;
    }

    menu.classList.toggle("active", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
    button.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    document.body.classList.toggle("menu-open", isOpen);

    if (icon) {
        icon.classList.toggle("fa-bars", !isOpen);
        icon.classList.toggle("fa-xmark", isOpen);
    }
}

function closeMenu() {
    setMenuState(false);
}

function formatMoney(value) {
    return moneyFormatter.format(Number(value) || 0);
}

function buildWhatsAppUrl(message) {
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => htmlEscapeMap[character]);
}

function normalizeImagePath(path) {
    if (!path) {
        return "";
    }

    return String(path).replace(/^\/+/, "");
}

function getProductType(product) {
    if (product.categoria === "Kit") {
        return "Kit";
    }

    return product.tipo || "Sem tipo";
}

function getProductCategory(product) {
    return product.linha || product.categoria || "Outros";
}

function getProductIconClass(product) {
    const searchText = getProductSearchText(product);

    if (searchText.includes("chaveiro")) {
        return "fa-key";
    }

    if (searchText.includes("kit") || searchText.includes("bundle")) {
        return "fa-box-open";
    }

    if (searchText.includes("sensorial") || searchText.includes("fidget")) {
        return "fa-hand";
    }

    if (searchText.includes("geek") || searchText.includes("personagem")) {
        return "fa-gamepad";
    }

    if (searchText.includes("colecionavel") || searchText.includes("display")) {
        return "fa-trophy";
    }

    return "fa-cube";
}

function getProductPlaceholderClasses(product) {
    return [
        getProductCategory(product),
        getProductType(product),
        product.categoria,
    ]
        .filter(Boolean)
        .map((value) => `product-placeholder-${createDomId(value)}`)
        .join(" ");
}

function normalizeSearch(value) {
    return String(value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function createDomId(value) {
    return normalizeSearch(value).replace(/[^a-z0-9_-]+/g, "-") || "item";
}

function getProductSearchText(product) {
    return normalizeSearch([
        product.nome,
        product.linha,
        product.categoria,
        product.tipo,
        product.sku,
        ...(Array.isArray(product.variacoes) ? product.variacoes : []),
    ].join(" "));
}

function sortCatalogProducts(products) {
    return products
        .filter((product) => product.ativo !== false)
        .sort((first, second) => {
            const featuredOrder = Number(Boolean(second.destaque)) - Number(Boolean(first.destaque));

            if (featuredOrder !== 0) {
                return featuredOrder;
            }

            return String(first.nome).localeCompare(String(second.nome), "pt-BR");
        });
}

document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.querySelector(".menu-icon");

    if (menuButton) {
        menuButton.addEventListener("click", toggleMenu);
    }

    document.querySelectorAll(".menu a").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    setupProductCatalog();
    setupFeaturedProducts();
    setupCart();
    setupContactForm();
    setupFaq();
});

async function setupProductCatalog() {
    const grid = document.querySelector("[data-products-grid]");
    const searchFilter = document.querySelector("[data-filter-search]");
    const categoryFilter = document.querySelector("[data-filter-category]");
    const typeFilter = document.querySelector("[data-filter-type]");
    const clearFilters = document.querySelector("[data-clear-filters]");
    const filterChips = document.querySelector("[data-filter-chips]");
    const productsCount = document.querySelector("[data-products-count]");

    if (!grid || !categoryFilter || !typeFilter || !productsCount) {
        return;
    }

    let products = [];
    const filters = {
        search: "",
        category: "",
        type: "",
    };

    try {
        const response = await fetch(productsUrl);

        if (!response.ok) {
            throw new Error(`Falha ao carregar ${productsUrl}`);
        }

        const data = await response.json();
        products = sortCatalogProducts(data);

        populateFilters(products, categoryFilter, typeFilter);
        populateFilterChips(products, filterChips);
        renderProducts(products, filters, grid, productsCount);
        updateFilterChipState(filterChips, filters);
    } catch (error) {
        productsCount.textContent = "Não foi possível carregar os produtos.";
        grid.innerHTML = `
            <article class="shop-card product-error">
                <div class="product-symbol"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Catálogo indisponível</h2>
                <p>Confira se o arquivo products.json está na raiz do projeto e abra a loja por um servidor local.</p>
            </article>
        `;
        console.error(error);
        return;
    }

    if (searchFilter) {
        searchFilter.addEventListener("input", () => {
            filters.search = normalizeSearch(searchFilter.value);
            renderProducts(products, filters, grid, productsCount);
        });
    }

    categoryFilter.addEventListener("change", () => {
        filters.category = categoryFilter.value;
        renderProducts(products, filters, grid, productsCount);
        updateFilterChipState(filterChips, filters);
    });

    typeFilter.addEventListener("change", () => {
        filters.type = typeFilter.value;
        renderProducts(products, filters, grid, productsCount);
        updateFilterChipState(filterChips, filters);
    });

    if (clearFilters) {
        clearFilters.addEventListener("click", () => {
            filters.search = "";
            filters.category = "";
            filters.type = "";
            if (searchFilter) {
                searchFilter.value = "";
            }
            categoryFilter.value = "";
            typeFilter.value = "";
            renderProducts(products, filters, grid, productsCount);
            updateFilterChipState(filterChips, filters);
        });
    }

    if (filterChips) {
        filterChips.addEventListener("click", (event) => {
            const chip = event.target.closest("[data-filter-chip]");

            if (!chip) {
                return;
            }

            const chipType = chip.dataset.filterChip;
            const value = chip.dataset.value || "";

            if (chipType === "all") {
                filters.category = "";
                filters.type = "";
            }

            if (chipType === "category") {
                filters.category = filters.category === value ? "" : value;
            }

            if (chipType === "type") {
                filters.type = filters.type === value ? "" : value;
            }

            categoryFilter.value = filters.category;
            typeFilter.value = filters.type;
            renderProducts(products, filters, grid, productsCount);
            updateFilterChipState(filterChips, filters);
        });
    }

    grid.addEventListener("error", (event) => {
        if (event.target.matches(".product-media img")) {
            event.target.classList.add("is-missing");
        }
    }, true);
}

function populateFilters(products, categoryFilter, typeFilter) {
    const categories = [...new Set(products.map(getProductCategory))].sort((first, second) => first.localeCompare(second, "pt-BR"));
    const types = [...new Set(products.map(getProductType))].sort((first, second) => first.localeCompare(second, "pt-BR"));

    categoryFilter.innerHTML = [
        '<option value="">Todas</option>',
        ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`),
    ].join("");

    typeFilter.innerHTML = [
        '<option value="">Todos</option>',
        ...types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`),
    ].join("");
}

function populateFilterChips(products, filterChips) {
    if (!filterChips) {
        return;
    }

    const categories = [...new Set(products.map(getProductCategory))].sort((first, second) => first.localeCompare(second, "pt-BR"));
    const types = [...new Set(products.map(getProductType))].sort((first, second) => first.localeCompare(second, "pt-BR"));
    const categoryButtons = categories.map((category) => `
        <button class="filter-chip" type="button" data-filter-chip="category" data-value="${escapeHtml(category)}">
            ${escapeHtml(category)}
        </button>
    `);
    const typeButtons = types.map((type) => `
        <button class="filter-chip" type="button" data-filter-chip="type" data-value="${escapeHtml(type)}">
            ${escapeHtml(type)}
        </button>
    `);

    filterChips.innerHTML = [
        '<button class="filter-chip all active" type="button" data-filter-chip="all"><i class="fa-solid fa-border-all"></i> Todos</button>',
        ...categoryButtons,
        ...typeButtons,
    ].join("");
}

function updateFilterChipState(filterChips, filters) {
    if (!filterChips) {
        return;
    }

    filterChips.querySelectorAll("[data-filter-chip]").forEach((chip) => {
        const chipType = chip.dataset.filterChip;
        const value = chip.dataset.value || "";
        const isActive = (chipType === "all" && !filters.category && !filters.type)
            || (chipType === "category" && filters.category === value)
            || (chipType === "type" && filters.type === value);

        chip.classList.toggle("active", isActive);
    });
}

function renderProducts(products, filters, grid, productsCount) {
    const filteredProducts = products.filter((product) => {
        const matchesSearch = !filters.search || getProductSearchText(product).includes(filters.search);
        const matchesCategory = !filters.category || getProductCategory(product) === filters.category;
        const matchesType = !filters.type || getProductType(product) === filters.type;

        return matchesSearch && matchesCategory && matchesType;
    });

    productsCount.textContent = `${filteredProducts.length} ${filteredProducts.length === 1 ? "produto encontrado" : "produtos encontrados"}`;

    if (!filteredProducts.length) {
        grid.innerHTML = `
            <article class="shop-card product-empty">
                <div class="product-symbol"><i class="fa-solid fa-magnifying-glass"></i></div>
                <h2>Nenhum produto encontrado</h2>
                <p>Tente limpar os filtros ou escolher outra combinação.</p>
            </article>
        `;
        return;
    }

    const action = grid.dataset.productAction || "cart";
    grid.innerHTML = filteredProducts.map((product) => renderProductCard(product, action)).join("");
}

function renderProductCard(product, action = "cart") {
    const category = getProductCategory(product);
    const type = getProductType(product);
    const image = normalizeImagePath(product.imagem);
    const placeholderClasses = getProductPlaceholderClasses(product);
    const iconClass = getProductIconClass(product);
    const variations = Array.isArray(product.variacoes) && product.variacoes.length
        ? `<p class="product-variations">Variações: ${product.variacoes.map(escapeHtml).join(", ")}</p>`
        : "";
    const variationControl = action === "cart" && Array.isArray(product.variacoes) && product.variacoes.length
        ? `
            <div class="product-variation-field">
                <label for="variation-${escapeHtml(createDomId(product.id))}">Variação</label>
                <select id="variation-${escapeHtml(createDomId(product.id))}" data-product-variation>
                    ${product.variacoes.map((variation) => `<option value="${escapeHtml(variation)}">${escapeHtml(variation)}</option>`).join("")}
                </select>
            </div>
        `
        : "";
    const buyMessage = `Olá, Pippo Designs 3D! Quero comprar ou orçar este produto:\n\n${product.nome}\nSKU: ${product.sku || product.id}\nPreço: ${formatMoney(product.preco)}`;
    const actionControl = action === "whatsapp"
        ? `
            <a class="btn primary" href="${buildWhatsAppUrl(buyMessage)}" target="_blank" rel="noreferrer">
                <i class="fa-brands fa-whatsapp"></i>
                Comprar
            </a>
        `
        : `
            <button
                class="btn primary"
                type="button"
                data-add-cart
                data-id="${escapeHtml(product.id)}"
                data-name="${escapeHtml(product.nome)}"
                data-price="${escapeHtml(product.preco)}"
                data-sku="${escapeHtml(product.sku || product.id)}"
            >
                <i class="fa-solid fa-cart-plus"></i>
                Comprar
            </button>
        `;

    return `
        <article class="shop-card ${product.destaque ? "featured" : ""}" data-product-card>
            <div class="product-media ${escapeHtml(placeholderClasses)}">
                ${product.destaque ? '<span class="featured-badge"><i class="fa-solid fa-star"></i> Destaque</span>' : ""}
                <img src="${escapeHtml(image)}" alt="${escapeHtml(product.nome)}" loading="lazy">
                <div class="product-image-fallback" aria-hidden="true"><i class="fa-solid ${escapeHtml(iconClass)}"></i></div>
            </div>
            <div class="product-info">
                <div class="product-meta">
                    <span class="product-tag">${escapeHtml(category)}</span>
                    <span class="product-tag type">${escapeHtml(type)}</span>
                </div>
                <h2>${escapeHtml(product.nome)}</h2>
                <p>${escapeHtml(product.categoria || product.linha || "Produto impresso em 3D")}</p>
                ${variations}
                ${variationControl}
                <span class="product-sku">${escapeHtml(product.sku || product.id)}</span>
                <div class="product-footer">
                    <strong class="product-price">${formatMoney(product.preco)}</strong>
                    ${actionControl}
                </div>
            </div>
        </article>
    `;
}

async function setupFeaturedProducts() {
    const grid = document.querySelector("[data-featured-products]");

    if (!grid) {
        return;
    }

    try {
        const response = await fetch(productsUrl);

        if (!response.ok) {
            throw new Error(`Falha ao carregar ${productsUrl}`);
        }

        const data = await response.json();
        const featuredProducts = sortCatalogProducts(data)
            .filter((product) => product.destaque)
            .slice(0, 6);

        if (!featuredProducts.length) {
            grid.innerHTML = `
                <article class="shop-card product-empty">
                    <div class="product-symbol"><i class="fa-solid fa-star"></i></div>
                    <h2>Nenhum destaque ativo</h2>
                    <p>Marque produtos com destaque = true no products.json.</p>
                </article>
            `;
            return;
        }

        grid.innerHTML = featuredProducts.map((product) => renderProductCard(product, "whatsapp")).join("");
        grid.addEventListener("error", (event) => {
            if (event.target.matches(".product-media img")) {
                event.target.classList.add("is-missing");
            }
        }, true);
    } catch (error) {
        grid.innerHTML = `
            <article class="shop-card product-error">
                <div class="product-symbol"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Destaques indisponíveis</h2>
                <p>Confira se o arquivo products.json está disponível pelo servidor local.</p>
            </article>
        `;
        console.error(error);
    }
}

function setupCart() {
    const cartItems = document.querySelector("[data-cart-items]");
    const cartCount = document.querySelector("[data-cart-count]");
    const cartTotal = document.querySelector("[data-cart-total]");
    const checkoutForm = document.querySelector("[data-checkout-form]");
    const clearCartButton = document.querySelector("[data-clear-cart]");
    const cartShortcut = document.querySelector("[data-cart-shortcut]");
    const cartShortcutCount = document.querySelector("[data-cart-shortcut-count]");
    const cartShortcutTotal = document.querySelector("[data-cart-shortcut-total]");
    let cartToastTimeout;

    if (!cartItems || !cartCount || !cartTotal) {
        return;
    }

    const cart = loadCart();

    function loadCart() {
        try {
            const savedCart = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");

            if (!Array.isArray(savedCart)) {
                return new Map();
            }

            return new Map(savedCart.map((item) => [item.id, item]));
        } catch {
            return new Map();
        }
    }

    function saveCart() {
        localStorage.setItem(cartStorageKey, JSON.stringify(Array.from(cart.values())));
    }

    function renderCart() {
        const items = Array.from(cart.values());
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

        cartCount.textContent = `${totalQuantity} ${totalQuantity === 1 ? "item" : "itens"}`;
        cartTotal.textContent = formatMoney(total);

        if (cartShortcut && cartShortcutCount && cartShortcutTotal) {
            cartShortcut.hidden = !totalQuantity;
            cartShortcutCount.textContent = `${totalQuantity} ${totalQuantity === 1 ? "item" : "itens"}`;
            cartShortcutTotal.textContent = formatMoney(total);
        }

        if (clearCartButton) {
            clearCartButton.disabled = !items.length;
        }

        if (!items.length) {
            cartItems.innerHTML = '<p class="empty-cart">Seu carrinho está vazio.</p>';
            return;
        }

        cartItems.innerHTML = items.map((item) => `
            <div class="cart-item">
                <div>
                    <h3>${escapeHtml(item.name)}</h3>
                    <p>${item.quantity} x ${formatMoney(item.price)}</p>
                    <p>${escapeHtml(item.sku)}</p>
                </div>
                <div class="cart-actions" aria-label="Alterar quantidade de ${escapeHtml(item.name)}">
                    <button type="button" data-decrease="${escapeHtml(item.id)}" aria-label="Diminuir quantidade"><i class="fa-solid fa-minus"></i></button>
                    <strong>${item.quantity}</strong>
                    <button type="button" data-increase="${escapeHtml(item.id)}" aria-label="Aumentar quantidade"><i class="fa-solid fa-plus"></i></button>
                </div>
                <div class="cart-note">
                    <label for="note-${escapeHtml(createDomId(item.id))}">Observação deste item</label>
                    <input id="note-${escapeHtml(createDomId(item.id))}" type="text" value="${escapeHtml(item.note || "")}" placeholder="Cor, acabamento ou detalhe específico" data-item-note="${escapeHtml(item.id)}">
                </div>
            </div>
        `).join("");
    }

    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-add-cart]");

        if (!button) {
            return;
        }

        const id = button.dataset.id || button.dataset.name;
        const name = button.dataset.name;
        const price = Number(button.dataset.price);
        const sku = button.dataset.sku || id;
        const card = button.closest("[data-product-card]");
        const variationSelect = card ? card.querySelector("[data-product-variation]") : null;
        const variation = variationSelect ? variationSelect.value : "";
        const cartId = variation ? `${id}::${variation}` : id;
        const displayName = variation ? `${name} - ${variation}` : name;
        const current = cart.get(cartId) || { id: cartId, productId: id, name: displayName, price, sku, variation, note: "", quantity: 0 };

        current.quantity += 1;
        cart.set(cartId, current);
        saveCart();
        renderCart();
        showCartToast(displayName, current.quantity);
    });

    cartItems.addEventListener("click", (event) => {
        const button = event.target.closest("button");

        if (!button) {
            return;
        }

        const increaseId = button.dataset.increase;
        const decreaseId = button.dataset.decrease;
        const id = increaseId || decreaseId;
        const item = cart.get(id);

        if (!item) {
            return;
        }

        item.quantity += increaseId ? 1 : -1;

        if (item.quantity <= 0) {
            cart.delete(id);
        } else {
            cart.set(id, item);
        }

        saveCart();
        renderCart();
    });

    cartItems.addEventListener("input", (event) => {
        const input = event.target.closest("[data-item-note]");

        if (!input) {
            return;
        }

        const item = cart.get(input.dataset.itemNote);

        if (!item) {
            return;
        }

        item.note = input.value;
        cart.set(item.id, item);
        saveCart();
    });

    if (clearCartButton) {
        clearCartButton.addEventListener("click", () => {
            cart.clear();
            saveCart();
            renderCart();
        });
    }

    if (checkoutForm) {
        checkoutForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const items = Array.from(cart.values());
            const formData = new FormData(checkoutForm);
            const customerName = formData.get("customerName");
            const details = formData.get("customerDetails");

            if (!items.length) {
                alert("Adicione pelo menos um produto ao carrinho.");
                return;
            }

            const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
            const productLines = items
                .map((item) => {
                    const note = item.note ? `\n  Observação: ${item.note}` : "";

                    return `- ${item.quantity}x ${item.name} (${item.sku}) - ${formatMoney(item.price)} cada${note}`;
                })
                .join("\n");
            const message = `Olá, Pippo Designs 3D! Meu nome é ${customerName}.\n\nQuero finalizar este pedido:\n${productLines}\n\nTotal estimado: ${formatMoney(total)}\n\nDetalhes: ${details || "Sem observações."}`;

            window.open(buildWhatsAppUrl(message), "_blank");
        });
    }

    renderCart();

    function showCartToast(productName, quantity) {
        const toast = getCartToast();
        const title = toast.querySelector("[data-toast-title]");
        const description = toast.querySelector("[data-toast-description]");

        title.textContent = "Produto adicionado";
        description.textContent = `${productName} no carrinho (${quantity} ${quantity === 1 ? "unidade" : "unidades"}).`;
        toast.classList.add("active");
        clearTimeout(cartToastTimeout);
        cartToastTimeout = setTimeout(() => {
            toast.classList.remove("active");
        }, 3200);
    }

    function getCartToast() {
        let toast = document.querySelector("[data-cart-toast]");

        if (toast) {
            return toast;
        }

        toast = document.createElement("div");
        toast.className = "cart-toast";
        toast.dataset.cartToast = "";
        toast.setAttribute("role", "status");
        toast.innerHTML = `
            <div>
                <strong data-toast-title>Produto adicionado</strong>
                <span data-toast-description>Item no carrinho.</span>
            </div>
            <a href="#cart-panel">Ver carrinho</a>
        `;
        document.body.appendChild(toast);

        return toast;
    }
}

function setupContactForm() {
    const form = document.querySelector("[data-contact-form]");

    if (!form) {
        return;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const name = formData.get("contactName");
        const phone = formData.get("contactPhone") || "Não informado";
        const project = formData.get("contactProject");
        const message = formData.get("contactMessage");
        const whatsappMessage = `Olá, Pippo Designs 3D! Meu nome é ${name}.\nTelefone: ${phone}\nTipo de projeto: ${project}\n\nMensagem: ${message}`;

        window.open(buildWhatsAppUrl(whatsappMessage), "_blank");
    });
}

function setupFaq() {
    const faqButtons = document.querySelectorAll(".faq-question");

    if (!faqButtons.length) {
        return;
    }

    faqButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const item = button.closest(".faq-item");

            if (!item) {
                return;
            }

            const isOpen = item.classList.toggle("active");
            button.setAttribute("aria-expanded", String(isOpen));
        });
    });
}
