(function () {
  "use strict";

  const KEY = "storeInventory.v1";
  const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

  let state = load();
  let selectedId = null;
  let editingId = null;

  // ---------- Storage ----------
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return {
          products: Array.isArray(p.products) ? p.products : [],
          movements: Array.isArray(p.movements) ? p.movements : []
        };
      }
    } catch (e) { /* corrupt or unavailable storage: start fresh */ }
    return { products: [], movements: [] };
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { alert("Could not save data. Check browser storage settings."); }
  }

  // ---------- Helpers ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => new Date().toLocaleDateString("en-CA");
  const nowStamp = () => new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  const toInt = v => Math.max(0, Math.floor(Number(v) || 0));
  const toMoney = v => Math.round((Number(v) || 0) * 100) / 100;

  function statusOf(p) {
    if (p.qty <= 0) return "out";
    if (p.qty <= p.reorder) return "low";
    return "ok";
  }

  function setMsg(el, text, type) {
    el.textContent = text;
    el.className = "msg " + (type || "");
    if (text) setTimeout(() => { if (el.textContent === text) el.textContent = ""; }, 3000);
  }

  function addMovement(productId, type, change, qtyAfter, note) {
    state.movements.push({ id: uid(), productId, type, change, qtyAfter, note, createdAt: Date.now(), date: nowStamp() });
  }

  // ---------- Rendering ----------
  function renderStats() {
    let units = 0, value = 0, low = 0;
    state.products.forEach(p => {
      units += p.qty;
      value += p.qty * p.cost;
      if (statusOf(p) !== "ok") low++;
    });
    document.getElementById("statProducts").textContent = state.products.length;
    document.getElementById("statUnits").textContent = units;
    document.getElementById("statValue").textContent = money.format(value);
    document.getElementById("statLow").textContent = low;
  }

  function renderProductSelect() {
    const sel = document.getElementById("mProduct");
    const current = sel.value || selectedId || "";
    const sorted = [...state.products].sort((a, b) => a.name.localeCompare(b.name));
    sel.innerHTML = '<option value="">Select product…</option>' +
      sorted.map(p => `<option value="${esc(p.id)}">${esc(p.name)} (qty ${p.qty})</option>`).join("");
    if (current && state.products.some(p => p.id === current)) sel.value = current;
  }

  function renderProducts() {
    const q = document.getElementById("search").value.trim().toLowerCase();
    const filter = document.getElementById("filter").value;
    const body = document.getElementById("productBody");

    const list = state.products
      .filter(p => !q || [p.name, p.sku, p.category].some(v => (v || "").toLowerCase().includes(q)))
      .filter(p => filter === "all" || statusOf(p) !== "ok")
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!list.length) {
      body.innerHTML = `<tr><td colspan="5" class="empty">${state.products.length ? "No matching products." : "No products yet. Add one to get started."}</td></tr>`;
      return;
    }

    const badge = { ok: '<span class="badge ok">In stock</span>', low: '<span class="badge low">Low</span>', out: '<span class="badge out">Out</span>' };

    body.innerHTML = list.map(p => `
      <tr class="clickable ${p.id === selectedId ? "selected" : ""}" data-id="${esc(p.id)}">
        <td>${esc(p.name)}<div class="sub">${esc(p.category || "")}${p.sku ? " · " + esc(p.sku) : ""}</div></td>
        <td class="num">${p.qty}</td>
        <td class="num">${p.reorder}</td>
        <td class="num">${money.format(p.price)}</td>
        <td class="num">
          ${badge[statusOf(p)]}
          <button class="btn ghost small" data-edit="${esc(p.id)}" type="button">Edit</button>
          <button class="btn danger small" data-delete="${esc(p.id)}" type="button">Delete</button>
        </td>
      </tr>`).join("");
  }

  function renderLog() {
    const card = document.getElementById("logCard");
    const p = state.products.find(x => x.id === selectedId);
    if (!p) { card.hidden = true; return; }
    card.hidden = false;
    document.getElementById("logTitle").textContent = `History: ${p.name}`;

    const rows = state.movements
      .filter(m => m.productId === p.id)
      .sort((a, b) => b.createdAt - a.createdAt);

    const label = { in: '<span class="badge in">Stock in</span>', out: '<span class="badge out-mv">Stock out</span>', adjust: '<span class="badge adjust">Count</span>', create: '<span class="badge ok">Created</span>' };

    document.getElementById("logBody").innerHTML = rows.length
      ? rows.map(m => `<tr>
          <td>${esc(m.date)}</td>
          <td>${label[m.type] || esc(m.type)}</td>
          <td class="num">${m.change > 0 ? "+" : ""}${m.change}</td>
          <td class="num">${m.qtyAfter}</td>
          <td>${esc(m.note || "—")}</td>
        </tr>`).join("")
      : `<tr><td colspan="5" class="empty">No movements yet.</td></tr>`;
  }

  function renderAll() {
    renderStats();
    renderProductSelect();
    renderProducts();
    renderLog();
  }

  // ---------- Product form ----------
  const productForm = document.getElementById("productForm");

  function resetProductForm() {
    editingId = null;
    productForm.reset();
    document.getElementById("formTitle").textContent = "Add product";
    document.getElementById("saveBtn").textContent = "Add product";
    document.getElementById("cancelEdit").hidden = true;
    document.getElementById("pQty").disabled = false;
  }

  function startEdit(id) {
    const p = state.products.find(x => x.id === id);
    if (!p) return;
    editingId = id;
    document.getElementById("pSku").value = p.sku || "";
    document.getElementById("pName").value = p.name;
    document.getElementById("pCategory").value = p.category || "";
    document.getElementById("pCost").value = p.cost;
    document.getElementById("pPrice").value = p.price;
    document.getElementById("pQty").value = p.qty;
    document.getElementById("pQty").disabled = true; // quantity changes go through Stock movement
    document.getElementById("pReorder").value = p.reorder;
    document.getElementById("formTitle").textContent = "Edit product";
    document.getElementById("saveBtn").textContent = "Save changes";
    document.getElementById("cancelEdit").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  productForm.addEventListener("submit", e => {
    e.preventDefault();
    const msg = document.getElementById("productMsg");
    const name = document.getElementById("pName").value.trim();
    const sku = document.getElementById("pSku").value.trim();
    if (!name) return setMsg(msg, "Enter a product name.", "error");

    const dup = state.products.some(p =>
      p.id !== editingId && (p.name.toLowerCase() === name.toLowerCase() ||
      (sku && p.sku && p.sku.toLowerCase() === sku.toLowerCase())));
    if (dup) return setMsg(msg, "A product with this name or SKU already exists.", "error");

    const data = {
      sku,
      name,
      category: document.getElementById("pCategory").value.trim(),
      cost: toMoney(document.getElementById("pCost").value),
      price: toMoney(document.getElementById("pPrice").value),
      reorder: toInt(document.getElementById("pReorder").value)
    };

    if (editingId) {
      Object.assign(state.products.find(p => p.id === editingId), data);
      setMsg(msg, "Product updated.", "success");
    } else {
      const qty = toInt(document.getElementById("pQty").value);
      const product = { id: uid(), ...data, qty, createdAt: Date.now() };
      state.products.push(product);
      addMovement(product.id, "create", qty, qty, "Opening stock");
      selectedId = product.id;
      setMsg(msg, "Product added.", "success");
    }
    save();
    resetProductForm();
    renderAll();
  });

  document.getElementById("cancelEdit").addEventListener("click", resetProductForm);

  // ---------- Stock movement ----------
  document.getElementById("moveForm").addEventListener("submit", e => {
    e.preventDefault();
    const msg = document.getElementById("moveMsg");
    const id = document.getElementById("mProduct").value;
    const type = document.getElementById("mType").value;
    const qty = toInt(document.getElementById("mQty").value);
    const note = document.getElementById("mNote").value.trim();
    const p = state.products.find(x => x.id === id);

    if (!p) return setMsg(msg, "Select a product.", "error");
    if (type !== "adjust" && qty <= 0) return setMsg(msg, "Enter a quantity greater than zero.", "error");

    let change;
    if (type === "in") {
      change = qty;
    } else if (type === "out") {
      if (qty > p.qty) return setMsg(msg, `Only ${p.qty} in stock.`, "error");
      change = -qty;
    } else {
      change = qty - p.qty; // stocktake: set exact count
      if (change === 0) return setMsg(msg, "Count matches current stock. Nothing changed.", "error");
    }

    p.qty += change;
    addMovement(p.id, type, change, p.qty, note);
    save();
    selectedId = p.id;
    e.target.reset();
    setMsg(msg, "Movement saved.", "success");
    renderAll();
  });

  // ---------- Table actions ----------
  document.getElementById("productBody").addEventListener("click", e => {
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-delete]");
    if (edit) return startEdit(edit.dataset.edit);
    if (del) {
      const p = state.products.find(x => x.id === del.dataset.delete);
      if (!p || !confirm(`Delete "${p.name}" and its history?`)) return;
      state.products = state.products.filter(x => x.id !== p.id);
      state.movements = state.movements.filter(m => m.productId !== p.id);
      if (selectedId === p.id) selectedId = null;
      if (editingId === p.id) resetProductForm();
      save();
      renderAll();
      return;
    }
    const row = e.target.closest("tr[data-id]");
    if (row) { selectedId = row.dataset.id; renderAll(); }
  });

  document.getElementById("search").addEventListener("input", renderProducts);
  document.getElementById("filter").addEventListener("change", renderProducts);

  // ---------- CSV export ----------
  document.getElementById("exportBtn").addEventListener("click", () => {
    const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["SKU", "Name", "Category", "Cost", "Price", "Qty", "Reorder Level", "Stock Value", "Status"];
    const rows = state.products.map(p => [
      p.sku, p.name, p.category, p.cost.toFixed(2), p.price.toFixed(2), p.qty, p.reorder,
      (p.qty * p.cost).toFixed(2), statusOf(p)
    ].map(cell).join(","));
    const csv = [header.join(","), ...rows].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  renderAll();
})();
