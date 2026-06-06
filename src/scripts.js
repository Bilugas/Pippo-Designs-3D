const whatsappNumber = "5511987550497";
const productsUrl = "products.json";
const cartStorageKey = "pippoDesigns3dCart";
const embeddedProducts = Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : null;
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

async function loadProductsData() {
    if (embeddedProducts) {
        return embeddedProducts;
    }

    const response = await fetch(productsUrl);

    if (!response.ok) {
        throw new Error(`Falha ao carregar ${productsUrl}`);
    }

    return response.json();
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
    setupLightbox();
    setupGlobalCartBadge();
    setupProductDetail();
    setupActiveNav();
    setupScrollToTop();
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
        const data = await loadProductsData();
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
        grid.classList.remove("product-grid-loaded");
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
    grid.classList.remove("product-grid-loaded");
    grid.innerHTML = filteredProducts.map((product) => renderProductCard(product, action)).join("");
    requestAnimationFrame(() => grid.classList.add("product-grid-loaded"));
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
            <div class="product-media ${escapeHtml(placeholderClasses)}" data-lightbox data-lightbox-src="${escapeHtml(image)}" data-lightbox-name="${escapeHtml(product.nome)}">
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
                <a class="product-detail-link" href="produto.html?id=${escapeHtml(product.id)}">
                    <i class="fa-solid fa-circle-info"></i> Detalhes
                </a>
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
        const data = await loadProductsData();
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
        requestAnimationFrame(() => grid.classList.add("product-grid-loaded"));
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

let toastTimeout;

function getToast() {
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

function showToast(title, description) {
    const toast = getToast();
    toast.querySelector("[data-toast-title]").textContent = title;
    toast.querySelector("[data-toast-description]").textContent = description;
    toast.classList.add("active");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("active"), 3200);
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
        showToast("Produto adicionado", `${displayName} no carrinho (${current.quantity} ${current.quantity === 1 ? "unidade" : "unidades"}).`);
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

}

function setupContactForm() {
    const form = document.querySelector("[data-contact-form]");

    if (!form) {
        return;
    }

    function getOrCreateError(field) {
        let err = field.parentElement.querySelector(".field-error");

        if (!err) {
            err = document.createElement("span");
            err.className = "field-error";
            err.setAttribute("role", "alert");
            field.after(err);
        }

        return err;
    }

    function validateField(field) {
        const err = getOrCreateError(field);
        let message = "";
        const value = field.value.trim();

        if (field.name === "contactName" && !value) {
            message = "Por favor, informe seu nome.";
        } else if (field.name === "contactPhone" && value) {
            const digits = value.replace(/\D/g, "");

            if (digits.length < 10 || digits.length > 11) {
                message = "Telefone inválido. Use (11) 99999-9999.";
            }
        } else if (field.name === "contactMessage") {
            if (!value) {
                message = "Descreva seu projeto.";
            } else if (value.length < 10) {
                message = "Mensagem muito curta (mínimo 10 caracteres).";
            }
        }

        err.textContent = message;
        field.classList.toggle("is-invalid", !!message);
        field.classList.toggle("is-valid", !message && value.length > 0);

        return !message;
    }

    form.querySelectorAll("input, textarea").forEach((field) => {
        field.addEventListener("blur", () => validateField(field));
        field.addEventListener("input", () => {
            if (field.classList.contains("is-invalid")) {
                validateField(field);
            }
        });
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const fields = [...form.querySelectorAll("input, textarea")];
        const allValid = fields.map(validateField).every(Boolean);

        if (!allValid) {
            const firstInvalid = form.querySelector(".is-invalid");

            if (firstInvalid) {
                firstInvalid.focus();
            }

            return;
        }

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

function setupLightbox() {
    let lightbox = null;

    function getLightbox() {
        if (lightbox) {
            return lightbox;
        }

        lightbox = document.createElement("div");
        lightbox.className = "lightbox-overlay";
        lightbox.setAttribute("role", "dialog");
        lightbox.setAttribute("aria-modal", "true");
        lightbox.setAttribute("aria-label", "Imagem ampliada do produto");
        lightbox.innerHTML = `
            <button class="lightbox-close" type="button" aria-label="Fechar">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <div class="lightbox-content">
                <img class="lightbox-img" src="" alt="">
                <p class="lightbox-caption"></p>
            </div>
        `;
        document.body.appendChild(lightbox);

        lightbox.addEventListener("click", (event) => {
            if (event.target === lightbox || event.target.closest(".lightbox-close")) {
                closeLightbox();
            }
        });

        return lightbox;
    }

    function openLightbox(src, name) {
        const lb = getLightbox();
        const img = lb.querySelector(".lightbox-img");
        const caption = lb.querySelector(".lightbox-caption");

        img.src = src;
        img.alt = name;
        caption.textContent = name;
        lb.classList.add("active");
        document.body.classList.add("lightbox-open");
        lb.querySelector(".lightbox-close").focus();
    }

    function closeLightbox() {
        if (lightbox) {
            lightbox.classList.remove("active");
            document.body.classList.remove("lightbox-open");
        }
    }

    document.addEventListener("click", (event) => {
        const trigger = event.target.closest("[data-lightbox]");

        if (!trigger) {
            return;
        }

        const img = trigger.querySelector("img");

        if (img && img.classList.contains("is-missing")) {
            return;
        }

        const src = trigger.dataset.lightboxSrc;
        const name = trigger.dataset.lightboxName || "";

        if (src) {
            openLightbox(src, name);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && lightbox && lightbox.classList.contains("active")) {
            closeLightbox();
        }
    });
}

function setupGlobalCartBadge() {
    if (document.querySelector("[data-cart-items]")) {
        return;
    }

    function getCount() {
        try {
            const saved = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");

            if (!Array.isArray(saved)) {
                return 0;
            }

            return saved.reduce((sum, item) => sum + (item.quantity || 0), 0);
        } catch {
            return 0;
        }
    }

    const badge = document.createElement("a");
    badge.className = "global-cart-badge";
    badge.href = "loja.html#cart-panel";
    badge.setAttribute("aria-label", "Ver carrinho na loja");
    badge.innerHTML = `
        <i class="fa-solid fa-cart-shopping"></i>
        <span class="global-cart-count"></span>
    `;
    document.body.appendChild(badge);

    const countEl = badge.querySelector(".global-cart-count");

    function update() {
        const count = getCount();
        badge.hidden = count === 0;
        countEl.textContent = `${count} ${count === 1 ? "item" : "itens"}`;
    }

    update();
    window.addEventListener("storage", update);
}

async function setupProductDetail() {
    const detail = document.querySelector("[data-product-detail]");

    if (!detail) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const productId = params.get("id");

    if (!productId) {
        detail.innerHTML = `
            <article class="shop-card product-error">
                <div class="product-symbol"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Produto não encontrado</h2>
                <p>Nenhum produto foi especificado na URL.</p>
                <a class="btn secondary" href="loja.html" style="margin-top: 8px">Ver loja</a>
            </article>
        `;
        return;
    }

    try {
        const data = await loadProductsData();
        const product = data.find((p) => p.id === productId);

        if (!product) {
            detail.innerHTML = `
                <article class="shop-card product-error">
                    <div class="product-symbol"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <h2>Produto não encontrado</h2>
                    <p>O produto <strong>${escapeHtml(productId)}</strong> não existe no catálogo.</p>
                    <a class="btn secondary" href="loja.html" style="margin-top: 8px">Ver loja</a>
                </article>
            `;
            return;
        }

        document.title = `${product.nome} - Pippo Designs 3D`;

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = `${product.nome} — ${product.categoria || product.linha || "Produto impresso em 3D"} — Pippo Designs 3D.`;
        }

        const image = normalizeImagePath(product.imagem);
        const placeholderClasses = getProductPlaceholderClasses(product);
        const iconClass = getProductIconClass(product);
        const category = getProductCategory(product);
        const type = getProductType(product);
        const hasVariations = Array.isArray(product.variacoes) && product.variacoes.length;
        const buyMessage = `Olá, Pippo Designs 3D! Quero comprar ou orçar este produto:\n\n${product.nome}\nSKU: ${product.sku || product.id}\nPreço: ${formatMoney(product.preco)}`;

        detail.innerHTML = `
            <div class="product-detail-media ${escapeHtml(placeholderClasses)}">
                ${product.destaque ? '<span class="featured-badge"><i class="fa-solid fa-star"></i> Destaque</span>' : ""}
                <img src="${escapeHtml(image)}" alt="${escapeHtml(product.nome)}">
                <div class="product-image-fallback" aria-hidden="true"><i class="fa-solid ${escapeHtml(iconClass)}"></i></div>
            </div>
            <div class="product-detail-info">
                <div class="product-meta">
                    <span class="product-tag">${escapeHtml(category)}</span>
                    <span class="product-tag type">${escapeHtml(type)}</span>
                </div>
                <h1 class="product-detail-name">${escapeHtml(product.nome)}</h1>
                <strong class="product-detail-price">${formatMoney(product.preco)}</strong>
                <p class="product-detail-desc">${escapeHtml(product.categoria || product.linha || "Produto impresso em 3D")}</p>
                ${hasVariations ? `
                <div class="product-variation-field">
                    <label for="detail-variation">Variação</label>
                    <select id="detail-variation" data-detail-variation>
                        ${product.variacoes.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}
                    </select>
                </div>` : ""}
                <span class="product-sku">${escapeHtml(product.sku || product.id)}</span>
                <div class="product-detail-actions">
                    <button class="btn primary" type="button" data-detail-add-cart>
                        <i class="fa-solid fa-cart-plus"></i> Adicionar ao carrinho
                    </button>
                    <a class="btn secondary" href="${escapeHtml(buildWhatsAppUrl(buyMessage))}" target="_blank" rel="noreferrer">
                        <i class="fa-brands fa-whatsapp"></i> Comprar pelo WhatsApp
                    </a>
                    <button class="btn secondary" type="button" data-share-btn>
                        <i class="fa-solid fa-share-nodes"></i> Compartilhar
                    </button>
                </div>
                <a class="text-link" href="loja.html">
                    <i class="fa-solid fa-arrow-left"></i> Voltar para a loja
                </a>
            </div>
        `;

        const img = detail.querySelector("img");

        if (img) {
            img.addEventListener("error", () => img.classList.add("is-missing"));
        }

        const addCartBtn = detail.querySelector("[data-detail-add-cart]");

        if (addCartBtn) {
            addCartBtn.addEventListener("click", () => {
                const variationSelect = detail.querySelector("[data-detail-variation]");
                const variation = variationSelect ? variationSelect.value : "";
                const cartId = variation ? `${product.id}::${variation}` : product.id;
                const displayName = variation ? `${product.nome} - ${variation}` : product.nome;

                try {
                    const saved = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
                    const cart = new Map(Array.isArray(saved) ? saved.map((item) => [item.id, item]) : []);
                    const current = cart.get(cartId) || {
                        id: cartId,
                        productId: product.id,
                        name: displayName,
                        price: product.preco,
                        sku: product.sku || product.id,
                        variation,
                        note: "",
                        quantity: 0,
                    };

                    current.quantity += 1;
                    cart.set(cartId, current);
                    localStorage.setItem(cartStorageKey, JSON.stringify(Array.from(cart.values())));

                    showToast("Produto adicionado", `${displayName} no carrinho (${current.quantity} ${current.quantity === 1 ? "unidade" : "unidades"}).`);

                    addCartBtn.innerHTML = '<i class="fa-solid fa-check"></i> Adicionado!';
                    addCartBtn.disabled = true;

                    setTimeout(() => {
                        addCartBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Adicionar ao carrinho';
                        addCartBtn.disabled = false;
                    }, 2200);
                } catch {
                    // ignore localStorage errors
                }
            });
        }

        const shareBtn = detail.querySelector("[data-share-btn]");
        if (shareBtn) {
            shareBtn.addEventListener("click", () => {
                const url = window.location.href;
                if (navigator.share) {
                    navigator.share({ title: product.nome, url }).catch(() => {});
                } else {
                    navigator.clipboard.writeText(url).then(() => {
                        shareBtn.innerHTML = '<i class="fa-solid fa-check"></i> Link copiado!';
                        setTimeout(() => {
                            shareBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Compartilhar';
                        }, 2000);
                    }).catch(() => {});
                }
            });
        }

    } catch (error) {
        detail.innerHTML = `
            <article class="shop-card product-error">
                <div class="product-symbol"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Erro ao carregar produto</h2>
                <p>Confira se o arquivo products.json está disponível pelo servidor local.</p>
                <a class="btn secondary" href="loja.html" style="margin-top: 8px">Ver loja</a>
            </article>
        `;
        console.error(error);
    }
}

function setupActiveNav() {
    const filename = window.location.pathname.split("/").pop() || "index.html";
    const effectiveFile = filename === "produto.html" ? "loja.html" : filename;

    document.querySelectorAll(".menu a[href]").forEach((link) => {
        const href = link.getAttribute("href");
        const linkFile = href.split("?")[0].split("#")[0];
        if (linkFile === effectiveFile || (effectiveFile === "" && linkFile === "index.html")) {
            link.classList.add("active");
        }
    });
}

function setupScrollToTop() {
    const btn = document.createElement("button");
    btn.className = "scroll-to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Voltar ao topo da página");
    btn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
    btn.hidden = true;
    document.body.appendChild(btn);

    window.addEventListener("scroll", () => {
        btn.hidden = window.scrollY < 320;
    }, { passive: true });

    btn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}
