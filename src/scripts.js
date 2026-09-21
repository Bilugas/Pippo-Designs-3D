const whatsappNumber = "5511987550497";
const productsUrl = "products.json";
const projetosUrl = "projetos.json";
const cartStorageKey = "pippoDesigns3dCart";
const embeddedProducts = Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : null;
const embeddedProjetos = Array.isArray(window.PROJETOS_DATA) ? window.PROJETOS_DATA : null;
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

async function loadProjetosData() {
    if (embeddedProjetos) {
        return embeddedProjetos;
    }

    const response = await fetch(projetosUrl);

    if (!response.ok) {
        throw new Error(`Falha ao carregar ${projetosUrl}`);
    }

    return response.json();
}

function humanizeSlug(value) {
    if (!value) {
        return "";
    }

    const text = String(value).replace(/[-_]+/g, " ").trim();

    return text.charAt(0).toUpperCase() + text.slice(1);
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
    setupHeroCarousel();
    setupReveal();
    setupProjectsCatalog();
    setupCatalogLooseItems();
    setupCart();
    setupContactForm();
    setupFaq();
    setupLightbox();
    setupGlobalCartBadge();
    setupProductDetail();
    setupProjetoDetail();
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

        const params = new URLSearchParams(window.location.search);
        const hasUrlFilter = [
            applyUrlFilter(params.get("categoria"), categoryFilter, filters, "category"),
            applyUrlFilter(params.get("tipo"), typeFilter, filters, "type"),
        ].some(Boolean);

        if (hasUrlFilter) {
            requestAnimationFrame(() => categoryFilter.closest(".shop-toolbar")?.scrollIntoView({ block: "start" }));
        }

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

function renderProductCard(product, action = "cart", options = {}) {
    const addLabel = options.addLabel || (action === "cart" ? "Adicionar" : "Comprar");
    const seal = String(product.selo || "").trim();
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
                ${escapeHtml(addLabel)}
            </button>
        `;

    return `
        <article class="shop-card ${product.destaque ? "featured" : ""}" data-product-card>
            <div class="product-media ${escapeHtml(placeholderClasses)}" data-lightbox data-lightbox-src="${escapeHtml(image)}" data-lightbox-name="${escapeHtml(product.nome)}">
                ${product.destaque ? '<span class="featured-badge"><i class="fa-solid fa-star"></i> Destaque</span>' : ""}
                ${seal ? `<span class="selo selo--${escapeHtml(createDomId(seal))}">${escapeHtml(seal)}</span>` : ""}
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

const HOME_PRODUCTS_LIMIT = 6;

async function setupFeaturedProducts() {
    const grid = document.querySelector("[data-featured-products]");

    if (!grid) {
        return;
    }

    try {
        const data = await loadProductsData();
        const homeProducts = data
            .filter((product) => product.ativo !== false)
            .sort((first, second) => {
                const featuredOrder = Number(Boolean(second.destaque)) - Number(Boolean(first.destaque));

                return featuredOrder !== 0
                    ? featuredOrder
                    : Number(Boolean(second.selo)) - Number(Boolean(first.selo));
            })
            .slice(0, HOME_PRODUCTS_LIMIT);

        if (!homeProducts.length) {
            grid.innerHTML = `
                <article class="shop-card product-empty">
                    <div class="product-symbol"><i class="fa-solid fa-star"></i></div>
                    <h2>Nenhum produto ativo</h2>
                    <p>Cadastre produtos no products.json.</p>
                </article>
            `;
            return;
        }

        grid.innerHTML = homeProducts.map((product) => renderProductCard(product, "cart", { addLabel: "Adicionar" })).join("");
        requestAnimationFrame(() => grid.classList.add("product-grid-loaded"));
        grid.addEventListener("error", (event) => {
            if (event.target.matches(".product-media img")) {
                event.target.classList.add("is-missing");
            }
        }, true);
        grid.addEventListener("click", (event) => {
            const button = event.target.closest("[data-add-cart]");

            if (button) {
                addProductToStoredCart(button);
            }
        });
    } catch (error) {
        grid.innerHTML = `
            <article class="shop-card product-error">
                <div class="product-symbol"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Produtos indisponíveis</h2>
                <p>Confira se o arquivo products.json está disponível pelo servidor local.</p>
            </article>
        `;
        console.error(error);
    }
}

function addProductToStoredCart(button) {
    const id = button.dataset.id || button.dataset.name;
    const name = button.dataset.name;
    const card = button.closest("[data-product-card]");
    const variationSelect = card ? card.querySelector("[data-product-variation]") : null;
    const variation = variationSelect ? variationSelect.value : "";
    const cartId = variation ? `${id}::${variation}` : id;
    const displayName = variation ? `${name} - ${variation}` : name;

    try {
        const saved = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
        const cart = new Map(Array.isArray(saved) ? saved.map((item) => [item.id, item]) : []);
        const current = cart.get(cartId) || {
            id: cartId,
            productId: id,
            name: displayName,
            price: Number(button.dataset.price),
            sku: button.dataset.sku || id,
            variation,
            note: "",
            quantity: 0,
        };

        current.quantity += 1;
        cart.set(cartId, current);
        localStorage.setItem(cartStorageKey, JSON.stringify(Array.from(cart.values())));
        window.dispatchEvent(new Event("pippo-cart-updated"));
        showToast("Produto adicionado", `${displayName} no carrinho (${current.quantity} ${current.quantity === 1 ? "unidade" : "unidades"}).`);
    } catch {
        // ignora erros do localStorage
        return;
    }

    const originalHtml = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-check"></i> Adicionado!';
    button.disabled = true;

    setTimeout(() => {
        button.innerHTML = originalHtml;
        button.disabled = false;
    }, 1800);
}

function setupHeroCarousel() {
    const carousel = document.querySelector("[data-carousel]");

    if (!carousel) {
        return;
    }

    const track = carousel.querySelector("[data-carousel-track]");
    const slides = Array.from(track.children);
    const dots = Array.from(carousel.querySelectorAll("[data-carousel-dot]"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let index = 0;
    let timer = null;

    function updateDots() {
        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle("active", dotIndex === index);
            dot.setAttribute("aria-current", dotIndex === index ? "true" : "false");
        });
    }

    function goTo(target, smooth = true) {
        index = (target + slides.length) % slides.length;
        track.scrollTo({ left: index * track.clientWidth, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
        updateDots();
    }

    function stop() {
        clearInterval(timer);
        timer = null;
    }

    function start() {
        if (reduceMotion || timer || document.hidden) {
            return;
        }

        timer = setInterval(() => goTo(index + 1), 4000);
    }

    track.addEventListener("scroll", () => {
        const current = Math.round(track.scrollLeft / track.clientWidth);

        if (current !== index && current >= 0 && current < slides.length) {
            index = current;
            updateDots();
        }
    }, { passive: true });

    carousel.querySelector("[data-carousel-prev]").addEventListener("click", () => {
        goTo(index - 1);
        stop();
        start();
    });

    carousel.querySelector("[data-carousel-next]").addEventListener("click", () => {
        goTo(index + 1);
        stop();
        start();
    });

    dots.forEach((dot, dotIndex) => {
        dot.addEventListener("click", () => {
            goTo(dotIndex);
            stop();
            start();
        });
    });

    ["mouseenter", "focusin", "touchstart"].forEach((eventName) => carousel.addEventListener(eventName, stop, { passive: true }));
    ["mouseleave", "focusout", "touchend"].forEach((eventName) => carousel.addEventListener(eventName, start, { passive: true }));
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    window.addEventListener("resize", () => goTo(index, false));

    updateDots();
    start();
}

function setupReveal() {
    const items = document.querySelectorAll("[data-reveal]");

    if (!items.length) {
        return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
        items.forEach((item) => item.classList.add("is-visible"));
        return;
    }

    document.documentElement.classList.add("js-reveal");

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });

    items.forEach((item) => observer.observe(item));
}

function applyUrlFilter(rawValue, select, filters, key) {
    if (!rawValue) {
        return false;
    }

    const wanted = createDomId(rawValue);
    const option = Array.from(select.options).find((item) => item.value && createDomId(item.value) === wanted);

    if (!option) {
        return false;
    }

    select.value = option.value;
    filters[key] = option.value;

    return true;
}

async function setupRelatedProducts(current) {
    const section = document.querySelector("[data-related-section]");
    const grid = document.querySelector("[data-related-grid]");

    if (!section || !grid) {
        return;
    }

    try {
        const data = await loadProductsData();
        const affinity = (product) => (current
            ? Number(getProductCategory(product) === getProductCategory(current)) * 2 + Number(getProductType(product) === getProductType(current))
            : 0);
        const picks = data
            .filter((product) => product.ativo !== false && (!current || product.id !== current.id))
            .map((product, index) => ({ product, index, score: affinity(product) }))
            .sort((first, second) => second.score - first.score || first.index - second.index)
            .slice(0, 4)
            .map((item) => item.product);

        if (!picks.length) {
            return;
        }

        grid.innerHTML = picks.map((product) => renderProductCard(product, "cart")).join("");
        grid.classList.add("product-grid-loaded");
        grid.addEventListener("error", (event) => {
            if (event.target.matches(".product-media img")) {
                event.target.classList.add("is-missing");
            }
        }, true);
        grid.addEventListener("click", (event) => {
            const button = event.target.closest("[data-add-cart]");

            if (button) {
                addProductToStoredCart(button);
            }
        });
        section.hidden = false;
    } catch (error) {
        console.error(error);
    }
}

function getProjetoStartingPrice(projeto) {
    const prices = [];

    (projeto.kits || []).forEach((kit) => {
        if (kit.ativo !== false && typeof kit.preco === "number") {
            prices.push(kit.preco);
        }
    });

    (projeto.itens || []).forEach((item) => {
        if (item.avulso && item.ativo !== false && typeof item.preco === "number") {
            prices.push(item.preco);
        }
    });

    return prices.length ? Math.min(...prices) : null;
}

function renderProjetoCard(projeto) {
    const image = normalizeImagePath(projeto.capa);
    const placeholderClasses = `product-placeholder-${createDomId(projeto.categoria || "kit")}`;
    const startingPrice = getProjetoStartingPrice(projeto);

    return `
        <article class="shop-card project-card ${projeto.destaque ? "featured" : ""}">
            <div class="product-media ${escapeHtml(placeholderClasses)}">
                ${projeto.destaque ? '<span class="featured-badge"><i class="fa-solid fa-star"></i> Destaque</span>' : ""}
                <img src="${escapeHtml(image)}" alt="${escapeHtml(projeto.titulo)}" loading="lazy">
                <div class="product-image-fallback" aria-hidden="true"><i class="fa-solid fa-boxes-stacked"></i></div>
            </div>
            <div class="product-info">
                <div class="product-meta">
                    <span class="product-tag">${escapeHtml(humanizeSlug(projeto.categoria))}</span>
                </div>
                <h2>${escapeHtml(projeto.titulo)}</h2>
                <p>${escapeHtml(projeto.resumo || "")}</p>
                <div class="product-footer">
                    <strong class="product-price">${startingPrice != null ? `A partir de ${formatMoney(startingPrice)}` : "Consulte"}</strong>
                    <a class="btn primary" href="projeto.html?id=${encodeURIComponent(projeto.id)}">
                        <i class="fa-solid fa-sliders"></i> Montar kit
                    </a>
                </div>
            </div>
        </article>
    `;
}

async function setupProjectsCatalog() {
    const grid = document.querySelector("[data-projects-grid]");

    if (!grid) {
        return;
    }

    try {
        const data = await loadProjetosData();
        const projetos = data.filter((projeto) => projeto.ativo !== false);

        if (!projetos.length) {
            grid.innerHTML = `
                <article class="shop-card product-empty">
                    <div class="product-symbol"><i class="fa-solid fa-boxes-stacked"></i></div>
                    <h2>Nenhum kit disponível</h2>
                    <p>Em breve novos kits por aqui.</p>
                </article>
            `;
            return;
        }

        grid.innerHTML = projetos.map((projeto) => renderProjetoCard(projeto)).join("");
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
                <h2>Kits indisponíveis</h2>
                <p>Confira se o arquivo projetos.json está disponível pelo servidor local.</p>
            </article>
        `;
        console.error(error);
    }
}

async function setupCatalogLooseItems() {
    const grid = document.querySelector("[data-catalog-items-grid]");

    if (!grid) {
        return;
    }

    try {
        const data = await loadProjetosData();
        const items = data
            .filter((projeto) => projeto.ativo !== false)
            .flatMap((projeto) => (Array.isArray(projeto.itens) ? projeto.itens : [])
                .filter((item) => item.avulso && item.ativo !== false && item.preco != null)
                .map((item) => ({ ...item, projetoId: projeto.id })));

        if (!items.length) {
            grid.innerHTML = `
                <article class="shop-card product-empty">
                    <div class="product-symbol"><i class="fa-solid fa-boxes-stacked"></i></div>
                    <h2>Nenhum item disponível</h2>
                    <p>Em breve novas peças por aqui.</p>
                </article>
            `;
            return;
        }

        grid.innerHTML = items.map((item) => renderLooseItemCard(item)).join("");
        requestAnimationFrame(() => grid.classList.add("product-grid-loaded"));

        grid.addEventListener("click", (event) => {
            const button = event.target.closest("[data-loose-add-cart]");

            if (!button) {
                return;
            }

            const card = button.closest("[data-loose-item]");
            const item = items.find((i) => i.id === card.dataset.itemId);

            if (!item) {
                return;
            }

            const variationSelect = card.querySelector("[data-loose-variation]");
            const variation = variationSelect ? variationSelect.value : "";
            const cartId = variation ? `${item.projetoId}-${item.id}::${variation}` : `${item.projetoId}-${item.id}`;
            const displayName = variation ? `${item.nome} - ${variation}` : item.nome;

            const current = addLineToCartStorage(cartId, () => ({
                id: cartId,
                productId: item.id,
                name: displayName,
                price: item.preco,
                sku: item.id,
                variation,
                note: "",
                quantity: 0,
            }));

            if (current) {
                showToast("Produto adicionado", `${displayName} no carrinho (${current.quantity} ${current.quantity === 1 ? "unidade" : "unidades"}).`);
            }
        });

        grid.addEventListener("error", (event) => {
            if (event.target.matches(".product-media img")) {
                event.target.classList.add("is-missing");
            }
        }, true);
    } catch (error) {
        grid.innerHTML = `
            <article class="shop-card product-error">
                <div class="product-symbol"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Itens indisponíveis</h2>
                <p>Confira se o arquivo projetos.json está disponível pelo servidor local.</p>
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
    window.addEventListener("pippo-cart-updated", update);
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

        setupRelatedProducts(product);

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

function addLineToCartStorage(cartId, lineFactory) {
    try {
        const saved = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
        const cart = new Map(Array.isArray(saved) ? saved.map((item) => [item.id, item]) : []);
        const current = cart.get(cartId) || lineFactory();

        current.quantity += 1;
        cart.set(cartId, current);
        localStorage.setItem(cartStorageKey, JSON.stringify(Array.from(cart.values())));

        return current;
    } catch {
        return null;
    }
}

function formatEscolhaLabel(tipo) {
    const labels = {
        fruta: "frutas",
        legume: "legumes",
    };

    return labels[tipo] || tipo;
}

function buildKitVariationSummary(projeto, kit, selections) {
    return kit.escolhas.map((escolha, index) => {
        if (escolha.de === "variacoes") {
            const target = projeto.itens.find((item) => item.id === escolha.tipo);
            const variationId = selections[index];
            const variation = target && Array.isArray(target.variacoes)
                ? target.variacoes.find((v) => v.id === variationId)
                : null;
            const label = target ? target.nome : "Variação";

            return variation ? `${label}: ${variation.nome} (${variation.cor})` : `${label}: -`;
        }

        const picked = selections[index];
        const parts = [];

        if (picked instanceof Map) {
            picked.forEach((qty, itemId) => {
                if (qty > 0) {
                    const item = projeto.itens.find((i) => i.id === itemId);
                    parts.push(`${item ? item.nome : itemId} x${qty}`);
                }
            });
        }

        return `${formatEscolhaLabel(escolha.tipo)}: ${parts.join(", ") || "-"}`;
    }).join(" | ");
}

function buildKitWhatsAppMessage(projeto, kit, selections) {
    const variation = buildKitVariationSummary(projeto, kit, selections);
    const lines = variation.split(" | ").map((line) => `- ${line}`).join("\n");

    return `Olá, Pippo Designs 3D! Quero comprar ou orçar este kit:\n\n${kit.nome} (${projeto.titulo})\nPreço: ${formatMoney(kit.preco)}\nConfiguração:\n${lines}`;
}

function renderLooseItemCard(item) {
    const image = normalizeImagePath(item.imagem);
    const hasVariations = Array.isArray(item.variacoes) && item.variacoes.length;
    const variationControl = hasVariations ? `
        <div class="product-variation-field">
            <label for="loose-variation-${escapeHtml(createDomId(item.id))}">Cor</label>
            <select id="loose-variation-${escapeHtml(createDomId(item.id))}" data-loose-variation>
                ${item.variacoes.map((v) => `<option value="${escapeHtml(v.nome)}">${escapeHtml(v.nome)} (${escapeHtml(v.cor)})</option>`).join("")}
            </select>
        </div>
    ` : "";

    return `
        <article class="shop-card" data-loose-item data-item-id="${escapeHtml(item.id)}">
            <div class="product-media">
                <img src="${escapeHtml(image)}" alt="${escapeHtml(item.nome)}" loading="lazy">
                <div class="product-image-fallback" aria-hidden="true"><i class="fa-solid fa-cube"></i></div>
            </div>
            <div class="product-info">
                <h2>${escapeHtml(item.nome)}</h2>
                ${item.obs ? `<p>${escapeHtml(item.obs)}</p>` : ""}
                ${item.descricao ? `<p>${escapeHtml(item.descricao)}</p>` : ""}
                ${variationControl}
                <div class="product-footer">
                    <strong class="product-price">${formatMoney(item.preco)}</strong>
                    <button class="btn primary" type="button" data-loose-add-cart>
                        <i class="fa-solid fa-cart-plus"></i> Adicionar
                    </button>
                </div>
            </div>
        </article>
    `;
}

async function setupProjetoDetail() {
    const detail = document.querySelector("[data-project-detail]");

    if (!detail) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const projetoId = params.get("id");

    if (!projetoId) {
        detail.innerHTML = `
            <article class="shop-card product-error">
                <div class="product-symbol"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Kit não encontrado</h2>
                <p>Nenhum kit foi especificado na URL.</p>
                <a class="btn secondary" href="loja.html" style="margin-top: 8px">Ver loja</a>
            </article>
        `;
        return;
    }

    try {
        const data = await loadProjetosData();
        const projeto = data.find((p) => p.id === projetoId);

        if (!projeto) {
            detail.innerHTML = `
                <article class="shop-card product-error">
                    <div class="product-symbol"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <h2>Kit não encontrado</h2>
                    <p>O kit <strong>${escapeHtml(projetoId)}</strong> não existe no catálogo.</p>
                    <a class="btn secondary" href="loja.html" style="margin-top: 8px">Ver loja</a>
                </article>
            `;
            return;
        }

        document.title = `${projeto.titulo} - Pippo Designs 3D`;

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = `${projeto.titulo} — ${projeto.resumo || "Produto impresso em 3D"} — Pippo Designs 3D.`;
        }

        const images = Array.isArray(projeto.imagens) && projeto.imagens.length
            ? projeto.imagens
            : [projeto.capa].filter(Boolean);
        const placeholderClasses = `product-placeholder-${createDomId(projeto.categoria || "kit")}`;
        const startingPrice = getProjetoStartingPrice(projeto);
        const looseItems = projeto.itens.filter((item) => item.avulso && item.ativo !== false && item.preco != null);

        detail.innerHTML = `
            <div class="project-gallery">
                <div class="project-gallery-main product-detail-media ${escapeHtml(placeholderClasses)}">
                    <img data-gallery-image src="${escapeHtml(normalizeImagePath(images[0]))}" alt="${escapeHtml(projeto.titulo)}">
                    <div class="product-image-fallback" aria-hidden="true"><i class="fa-solid fa-cube"></i></div>
                </div>
                ${images.length > 1 ? `
                <div class="project-gallery-thumbs" data-gallery-thumbs>
                    ${images.map((img, index) => `
                        <button type="button" class="project-thumb${index === 0 ? " active" : ""}" data-gallery-thumb data-src="${escapeHtml(normalizeImagePath(img))}">
                            <img src="${escapeHtml(normalizeImagePath(img))}" alt="Foto ${index + 1} de ${escapeHtml(projeto.titulo)}">
                        </button>
                    `).join("")}
                </div>` : ""}
            </div>
            <div class="project-info">
                <div class="product-meta">
                    ${projeto.categoria ? `<span class="product-tag">${escapeHtml(humanizeSlug(projeto.categoria))}</span>` : ""}
                    ${projeto.material ? `<span class="product-tag type">${escapeHtml(projeto.material)}</span>` : ""}
                    ${projeto.publico ? `<span class="product-tag">${escapeHtml(projeto.publico)}</span>` : ""}
                </div>
                <h1 class="project-title">${escapeHtml(projeto.titulo)}</h1>
                <div class="project-cta">
                    ${startingPrice !== null ? `<strong class="product-detail-price">A partir de ${formatMoney(startingPrice)}</strong>` : ""}
                    <a class="btn primary" href="#kit-builder"><i class="fa-solid fa-sliders"></i> Montar kit</a>
                </div>
                <p class="project-summary">${escapeHtml(projeto.resumo || "")}</p>
                ${projeto.detalhes ? `<p class="project-details-text">${escapeHtml(projeto.detalhes)}</p>` : ""}
            </div>

            <section class="kit-builder" id="kit-builder" aria-labelledby="kit-builder-title">
                <h2 id="kit-builder-title">Monte seu kit</h2>
                <div class="kit-options" data-kit-options role="tablist"></div>
                <div class="kit-config" data-kit-config></div>
                <div class="kit-summary">
                    <div class="kit-summary-progress" data-kit-progress></div>
                    <div class="kit-summary-actions">
                        <strong class="kit-summary-price" data-kit-price></strong>
                        <button class="btn primary" type="button" data-kit-add-cart disabled>
                            <i class="fa-solid fa-cart-plus"></i> Adicionar ao carrinho
                        </button>
                        <a class="btn secondary is-disabled" data-kit-whatsapp href="#" target="_blank" rel="noreferrer">
                            <i class="fa-brands fa-whatsapp"></i> Comprar pelo WhatsApp
                        </a>
                    </div>
                </div>
            </section>

            ${looseItems.length ? `
            <section class="loose-items" aria-labelledby="loose-items-title">
                <h2 id="loose-items-title">Compre peças avulsas</h2>
                <div class="product-grid loose-items-grid" data-loose-items-grid></div>
            </section>` : ""}

            <a class="text-link back-link" href="loja.html">
                <i class="fa-solid fa-arrow-left"></i> Voltar para a loja
            </a>
        `;

        setupRelatedProducts(null);

        const mainImg = detail.querySelector("[data-gallery-image]");

        if (mainImg) {
            mainImg.addEventListener("error", () => mainImg.classList.add("is-missing"));
        }

        const thumbsWrap = detail.querySelector("[data-gallery-thumbs]");

        if (thumbsWrap && mainImg) {
            thumbsWrap.addEventListener("click", (event) => {
                const thumb = event.target.closest("[data-gallery-thumb]");

                if (!thumb) {
                    return;
                }

                thumbsWrap.querySelectorAll(".project-thumb").forEach((el) => el.classList.remove("active"));
                thumb.classList.add("active");
                mainImg.classList.remove("is-missing");
                mainImg.src = thumb.dataset.src;
            });
        }

        const kits = Array.isArray(projeto.kits) ? projeto.kits.filter((kit) => kit.ativo !== false) : [];
        const kitOptions = detail.querySelector("[data-kit-options]");
        const kitConfig = detail.querySelector("[data-kit-config]");
        const kitProgress = detail.querySelector("[data-kit-progress]");
        const kitPrice = detail.querySelector("[data-kit-price]");
        const kitAddBtn = detail.querySelector("[data-kit-add-cart]");
        const kitWhatsappLink = detail.querySelector("[data-kit-whatsapp]");

        let selectedKitId = kits.length ? kits[0].id : null;
        let selections = {};

        function getEscolhaCandidates(escolha) {
            if (escolha.de === "variacoes") {
                const target = projeto.itens.find((item) => item.id === escolha.tipo);

                return {
                    kind: "variacoes",
                    target,
                    options: target && Array.isArray(target.variacoes) ? target.variacoes : [],
                };
            }

            return {
                kind: "quantidade",
                options: projeto.itens.filter((item) => item.tipo === escolha.tipo && item.ativo !== false && item.avulso),
            };
        }

        function getEscolhaCount(index, escolha) {
            const picked = selections[index];

            if (escolha.de === "variacoes") {
                return picked ? 1 : 0;
            }

            if (!(picked instanceof Map)) {
                return 0;
            }

            let total = 0;
            picked.forEach((qty) => { total += qty; });

            return total;
        }

        function isKitComplete(kit) {
            return kit.escolhas.every((escolha, index) => getEscolhaCount(index, escolha) >= escolha.quantidade);
        }

        function renderKitOptions() {
            kitOptions.innerHTML = kits.map((kit) => `
                <button type="button" class="kit-option${kit.id === selectedKitId ? " active" : ""}" data-kit-option data-kit-id="${escapeHtml(kit.id)}">
                    <span class="kit-option-name">${escapeHtml(kit.nome)}</span>
                    <span class="kit-option-price">${formatMoney(kit.preco)}</span>
                    <span class="kit-option-desc">${escapeHtml(kit.descricao || "")}</span>
                </button>
            `).join("");
        }

        function renderKitConfig() {
            const kit = kits.find((k) => k.id === selectedKitId);

            if (!kit) {
                kitConfig.innerHTML = '<p class="empty-cart">Nenhum kit disponível no momento.</p>';
                kitPrice.textContent = "";
                kitProgress.textContent = "";
                kitAddBtn.disabled = true;
                kitWhatsappLink.classList.add("is-disabled");
                kitWhatsappLink.href = "#";
                return;
            }

            const staticInclusos = (kit.inclusos || [])
                .filter((id) => !kit.escolhas.some((escolha) => escolha.de === "variacoes" && escolha.tipo === id))
                .map((id) => projeto.itens.find((item) => item.id === id))
                .filter(Boolean);

            kitConfig.innerHTML = `
                ${kit.escolhas.map((escolha, index) => {
                    const info = getEscolhaCandidates(escolha);
                    const count = getEscolhaCount(index, escolha);

                    if (info.kind === "variacoes") {
                        const selectedVariationId = selections[index];

                        return `
                            <div class="escolha-group">
                                <div class="escolha-header">
                                    <h3>${info.target ? escapeHtml(info.target.nome) : "Variação"}: escolha a cor</h3>
                                    <span class="escolha-progress">${count}/${escolha.quantidade}</span>
                                </div>
                                ${info.target && info.target.descricao ? `<p class="escolha-desc">${escapeHtml(info.target.descricao)}</p>` : ""}
                                <div class="variation-options" role="radiogroup">
                                    ${info.options.map((v) => `
                                        <label class="variation-option${selectedVariationId === v.id ? " active" : ""}">
                                            <input type="radio" name="escolha-${index}" value="${escapeHtml(v.id)}" data-escolha-variation data-escolha-index="${index}" ${selectedVariationId === v.id ? "checked" : ""}>
                                            <span>${escapeHtml(v.nome)} (${escapeHtml(v.cor)})</span>
                                        </label>
                                    `).join("")}
                                </div>
                            </div>
                        `;
                    }

                    const remaining = escolha.quantidade - count;
                    const picked = selections[index];

                    return `
                        <div class="escolha-group">
                            <div class="escolha-header">
                                <h3>Escolha ${escolha.quantidade} ${escapeHtml(formatEscolhaLabel(escolha.tipo))}</h3>
                                <span class="escolha-progress">${count}/${escolha.quantidade}</span>
                            </div>
                            <div class="escolha-items">
                                ${info.options.map((item) => {
                                    const qty = picked instanceof Map ? (picked.get(item.id) || 0) : 0;
                                    const image = normalizeImagePath(item.imagem);

                                    return `
                                        <div class="escolha-item">
                                            <div class="escolha-item-media">
                                                <img src="${escapeHtml(image)}" alt="${escapeHtml(item.nome)}">
                                                <div class="product-image-fallback" aria-hidden="true"><i class="fa-solid fa-cube"></i></div>
                                            </div>
                                            <div class="escolha-item-info">
                                                <strong>${escapeHtml(item.nome)}</strong>
                                                ${item.obs ? `<span class="escolha-item-obs">${escapeHtml(item.obs)}</span>` : ""}
                                            </div>
                                            <div class="cart-actions escolha-item-stepper">
                                                <button type="button" data-escolha-decrease data-escolha-index="${index}" data-item-id="${escapeHtml(item.id)}" ${qty <= 0 ? "disabled" : ""}><i class="fa-solid fa-minus"></i></button>
                                                <strong>${qty}</strong>
                                                <button type="button" data-escolha-increase data-escolha-index="${index}" data-item-id="${escapeHtml(item.id)}" ${remaining <= 0 ? "disabled" : ""}><i class="fa-solid fa-plus"></i></button>
                                            </div>
                                        </div>
                                    `;
                                }).join("")}
                            </div>
                        </div>
                    `;
                }).join("")}
                ${staticInclusos.length ? `<p class="kit-inclusos"><i class="fa-solid fa-circle-check"></i> Inclui: ${staticInclusos.map((item) => escapeHtml(item.nome)).join(", ")}</p>` : ""}
            `;

            const complete = isKitComplete(kit);
            const totalChosen = kit.escolhas.reduce((sum, escolha, index) => sum + Math.min(getEscolhaCount(index, escolha), escolha.quantidade), 0);
            const totalNeeded = kit.escolhas.reduce((sum, escolha) => sum + escolha.quantidade, 0);

            kitPrice.textContent = formatMoney(kit.preco);
            kitProgress.textContent = complete ? "Kit completo!" : `Escolhidos ${totalChosen} de ${totalNeeded}`;
            kitAddBtn.disabled = !complete;

            if (complete) {
                kitWhatsappLink.href = buildWhatsAppUrl(buildKitWhatsAppMessage(projeto, kit, selections));
                kitWhatsappLink.classList.remove("is-disabled");
            } else {
                kitWhatsappLink.href = "#";
                kitWhatsappLink.classList.add("is-disabled");
            }
        }

        function selectKit(kitId) {
            selectedKitId = kitId;
            selections = {};
            renderKitOptions();
            renderKitConfig();
        }

        if (kits.length) {
            kitOptions.addEventListener("click", (event) => {
                const button = event.target.closest("[data-kit-option]");

                if (!button) {
                    return;
                }

                selectKit(button.dataset.kitId);
            });

            kitConfig.addEventListener("click", (event) => {
                const increaseBtn = event.target.closest("[data-escolha-increase]");
                const decreaseBtn = event.target.closest("[data-escolha-decrease]");
                const button = increaseBtn || decreaseBtn;

                if (!button) {
                    return;
                }

                const index = Number(button.dataset.escolhaIndex);
                const itemId = button.dataset.itemId;
                const kit = kits.find((k) => k.id === selectedKitId);
                const escolha = kit.escolhas[index];

                if (!(selections[index] instanceof Map)) {
                    selections[index] = new Map();
                }

                const map = selections[index];
                const current = map.get(itemId) || 0;
                const total = getEscolhaCount(index, escolha);

                if (increaseBtn && total < escolha.quantidade) {
                    map.set(itemId, current + 1);
                } else if (decreaseBtn && current > 0) {
                    const next = current - 1;

                    if (next <= 0) {
                        map.delete(itemId);
                    } else {
                        map.set(itemId, next);
                    }
                }

                renderKitConfig();
            });

            kitConfig.addEventListener("change", (event) => {
                const input = event.target.closest("[data-escolha-variation]");

                if (!input) {
                    return;
                }

                selections[Number(input.dataset.escolhaIndex)] = input.value;
                renderKitConfig();
            });

            if (kitAddBtn) {
                kitAddBtn.addEventListener("click", () => {
                    const kit = kits.find((k) => k.id === selectedKitId);

                    if (!kit || !isKitComplete(kit)) {
                        return;
                    }

                    const variation = buildKitVariationSummary(projeto, kit, selections);
                    const cartId = `${kit.id}::${createDomId(variation)}`;
                    const displayName = `${kit.nome} - ${variation}`;

                    const current = addLineToCartStorage(cartId, () => ({
                        id: cartId,
                        productId: kit.id,
                        name: displayName,
                        price: kit.preco,
                        sku: kit.id,
                        variation,
                        note: "",
                        quantity: 0,
                    }));

                    if (current) {
                        showToast("Produto adicionado", `${kit.nome} no carrinho (${current.quantity} ${current.quantity === 1 ? "unidade" : "unidades"}).`);
                    }

                    kitAddBtn.innerHTML = '<i class="fa-solid fa-check"></i> Adicionado!';
                    kitAddBtn.disabled = true;

                    setTimeout(() => {
                        kitAddBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Adicionar ao carrinho';
                        kitAddBtn.disabled = !isKitComplete(kit);
                    }, 2200);
                });
            }

            renderKitOptions();
            renderKitConfig();
        } else {
            kitConfig.innerHTML = '<p class="empty-cart">Nenhum kit disponível no momento.</p>';
        }

        const looseGrid = detail.querySelector("[data-loose-items-grid]");

        if (looseGrid) {
            looseGrid.innerHTML = looseItems.map((item) => renderLooseItemCard(item)).join("");

            looseGrid.addEventListener("click", (event) => {
                const button = event.target.closest("[data-loose-add-cart]");

                if (!button) {
                    return;
                }

                const card = button.closest("[data-loose-item]");
                const item = looseItems.find((i) => i.id === card.dataset.itemId);

                if (!item) {
                    return;
                }

                const variationSelect = card.querySelector("[data-loose-variation]");
                const variation = variationSelect ? variationSelect.value : "";
                const cartId = variation ? `${projeto.id}-${item.id}::${variation}` : `${projeto.id}-${item.id}`;
                const displayName = variation ? `${item.nome} - ${variation}` : item.nome;

                const current = addLineToCartStorage(cartId, () => ({
                    id: cartId,
                    productId: item.id,
                    name: displayName,
                    price: item.preco,
                    sku: item.id,
                    variation,
                    note: "",
                    quantity: 0,
                }));

                if (current) {
                    showToast("Produto adicionado", `${displayName} no carrinho (${current.quantity} ${current.quantity === 1 ? "unidade" : "unidades"}).`);
                }
            });

            looseGrid.addEventListener("error", (event) => {
                if (event.target.matches(".product-media img")) {
                    event.target.classList.add("is-missing");
                }
            }, true);
        }
    } catch (error) {
        detail.innerHTML = `
            <article class="shop-card product-error">
                <div class="product-symbol"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Erro ao carregar kit</h2>
                <p>Confira se o arquivo projetos.json está disponível pelo servidor local.</p>
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
