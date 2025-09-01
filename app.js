// Safe runner
function safe(fn) {
  try {
    fn();
  } catch (e) {
    console.error(e);
  }
}

// Theme toggle & persistence
safe(function () {
  const root = document.documentElement;
  function set(mode) {
    root.setAttribute("data-theme", mode);
    localStorage.setItem("theme", mode);
    sync(mode);
  }
  function sync(mode) {
    const label =
      mode === "dark" ? "Dark" : mode === "light" ? "Light" : "Auto";
    ["themeToggle", "themeToggleMobile", "themeToggleSticky"].forEach((id) => {
      const b = document.getElementById(id);
      if (!b) return;
      b.setAttribute("aria-pressed", mode !== "auto");
      b.textContent = label;
    });
  }
  const saved = localStorage.getItem("theme") || "dark";
  set(saved);
  function cycle() {
    const c = localStorage.getItem("theme") || "auto";
    const n = c === "auto" ? "dark" : c === "dark" ? "light" : "auto";
    set(n);
  }
  ["themeToggle", "themeToggleMobile", "themeToggleSticky"].forEach((id) => {
    const el = document.getElementById(id);
    el && el.addEventListener("click", cycle);
  });
});

// Mobile drawer + ESC + body lock
safe(function () {
  const drawer = document.getElementById("mobile-nav");
  const toggle = document.querySelector(".menu-toggle");
  let open = false;
  function show() {
    drawer.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    open = true;
  }
  function hide() {
    drawer.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    open = false;
  }
  toggle && toggle.addEventListener("click", () => (open ? hide() : show()));
  drawer &&
    drawer.addEventListener("click", (e) => {
      if (e.target.matches("[data-drawer-close]")) hide();
    });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) hide();
  });
});

// Intersection reveal
safe(function () {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px" }
  );
  els.forEach((el) => io.observe(el));
});

// Booking wizard: chips for ASAP/Schedule, robust step toggle via classes
safe(function () {
  const form = document.getElementById("bookingForm");
  if (!form) return;

  const PRICES = {
    "Airport transfer": 40000,
    Intrastate: 60000,
    Interstate: 100000,
    "Uyo Half Day": 70000,
    "Uyo Full Day": 100000,
    "Wedding Full Day": 120000,
    Other: 60000,
  };
  const BASIS = {
    "Airport transfer": "ride",
    Intrastate: "ride",
    Interstate: "ride",
    "Uyo Half Day": "day",
    "Uyo Full Day": "day",
    "Wedding Full Day": "day",
    Other: "ride",
  };

  const steps = Array.from(document.querySelectorAll(".wizard-step"));
  const tabs = Array.from(document.querySelectorAll(".stepper .step"));
  const bar = document.getElementById("progressBar");
  const nextBtn = document.getElementById("nextStep");
  const prevBtn = document.getElementById("prevStep");
  const submitBtn = document.getElementById("submitBtn");

  function setProgress(i) {
    const p = ((i + 1) / steps.length) * 100;
    if (bar) bar.style.width = p + "%";
  }
  let current = steps.findIndex((s) => s.classList.contains("active"));
  if (current < 0) current = 0;

  function showStep(i) {
    steps.forEach((s, idx) => {
      s.classList.toggle("active", idx === i);
      s.hidden = idx !== i;
    });
    tabs.forEach((t, idx) => {
      t.classList.toggle("current", idx === i);
      t.setAttribute("aria-selected", idx === i ? "true" : "false");
    });
    prevBtn.disabled = i === 0;
    nextBtn.hidden = i === steps.length - 1;
    submitBtn.hidden = i !== steps.length - 1;
    i === steps.length - 1
      ? `${nextBtn.classList.add("hidden")}`
      : `${nextBtn.classList.remove("hidden")}`;
    i !== steps.length - 1
      ? `${submitBtn.classList.add("hidden")}`
      : `${submitBtn.classList.remove("hidden")}`;

    const firstInput = steps[i].querySelector("input,select,textarea,button");
    firstInput && firstInput.focus({ preventScroll: true });
    current = i;
    setProgress(i);
    // updateReview();
  }
  function validateStep(i) {
    const fields = steps[i].querySelectorAll("input,select,textarea");
    for (const el of fields) {
      if (el.hasAttribute("required") && !el.checkValidity()) {
        el.reportValidity();
        return false;
      }
    }
    return true;
  }
  nextBtn.addEventListener("click", () => {
    if (!validateStep(current)) return;
    showStep(Math.min(current + 1, steps.length - 1));
  });
  prevBtn.addEventListener("click", () => showStep(Math.max(current - 1, 0)));
  tabs.forEach((tab, idx) =>
    tab.addEventListener("click", () => {
      if (idx > current && !validateStep(current)) return;
      showStep(idx);
    })
  );
  form.addEventListener("keydown", (e) => {
    const t = e.target;
    if (e.key === "Enter" && t.tagName !== "TEXTAREA") {
      if (current < steps.length - 1) {
        e.preventDefault();
        if (validateStep(current)) showStep(current + 1);
      }
    }
  });

  // Swap
  const pickup = document.getElementById("pickup");
  const destination = document.getElementById("destination");
  document.getElementById("swap").addEventListener("click", () => {
    const a = pickup.value;
    pickup.value = destination.value;
    destination.value = a;
    // updateReview();
  });

  // Chip toggle for When
  const whenHidden = document.getElementById("when");
  const chips = Array.from(document.querySelectorAll(".seg .chip"));
  function setWhen(val) {
    whenHidden.value = val;
    const scheduled = val === "Later";
    document.getElementById("date").disabled = !scheduled;
    document.getElementById("time").disabled = !scheduled;
    document.getElementById("date").required = scheduled;
    document.getElementById("time").required = scheduled;
    chips.forEach((c) => c.classList.toggle("active", c.dataset.when === val));
  }
  chips.forEach((c) =>
    c.addEventListener("click", () => {
      setWhen(c.dataset.when);
    })
  );
  setWhen(whenHidden.value || "ASAP");

  // Duration & pricing
  function computePrice(service, unit, qty) {
    const base = PRICES[service];
    if (!base || !qty) return null;
    let multiplier = qty;
    if (unit === "weeks") multiplier = 7 * qty;
    if (unit === "months") multiplier = 30 * qty;
    let gross = base * multiplier;
    let discount = 0;
    if (unit === "weeks") discount = 0.25;
    if (unit === "months") discount = 0.4;
    return Math.round(gross * (1 - discount));
  }

  function updateReview(e) {
    e.preventDefault();

    const data = new FormData(form);
    const service = data.get("service") || "";
    const unit = data.get("duration_unit") || "days";
    const qty = parseInt(data.get("duration_qty") || "1", 10);
    const stops = [];
    for (const [k, v] of data.entries()) {
      if (/^stop\d+$/.test(k) && v) stops.push(v);
    }
    const route = [data.get("pickup"), ...stops, data.get("destination")]
      .filter(Boolean)
      .join(" → ");
    const when = data.get("when") || "ASAP";
    const contact = `${data.get("name") || "—"} • ${data.get("phone") || "—"}`;

    const priceFrom = PRICES[service];
    const computed = computePrice(service, unit, qty);
    const nf = new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    });
    const compText =
      typeof computed === "number"
        ? nf.format(computed) + (unit === "days" ? " (from)" : " (discounted)")
        : "—";

    document.getElementById("reviewService").textContent = service || "—";
    document.getElementById("reviewRoute").textContent = route || "—";
    document.getElementById("reviewWhen").textContent = when || "—";
    document.getElementById("reviewDuration").textContent =
      (qty || 1) + " " + unit;
    document.getElementById("reviewPrice").textContent = compText;
    document.getElementById("reviewContact").textContent = contact;

    document.getElementById("price_from").value =
      typeof priceFrom === "number" ? priceFrom : "";
    document.getElementById("computed_price").value =
      typeof computed === "number" ? computed : "";
    document.getElementById("summary").value = JSON.stringify({
      service,
      route,
      when,
      duration_unit: unit,
      duration_qty: qty,
      price_from: priceFrom || null,
      computed_price: computed || null,
      contact,
      notes: form.notes?.value,
    });
    console.log("Summary:", document.getElementById("summary").value, data);
  }

  function updateReview2(e) {
    e.preventDefault();
    if (!validateStep(current)) return;

    const data = new FormData(form);
    const service = data.get("service") || "";
    const unit = data.get("duration_unit") || "days";
    const qty = parseInt(data.get("duration_qty") || "1", 10);
    const stops = [];
    for (const [k, v] of data.entries()) {
      if (/^stop\d+$/.test(k) && v) stops.push(v);
    }
    const route = [data.get("pickup"), ...stops, data.get("destination")]
      .filter(Boolean)
      .join(" → ");
    const when = data.get("when") || "ASAP";
    const contact = `${data.get("name") || "—"} • ${data.get("phone") || "—"}`;

    const priceFrom = PRICES[service];
    const computed = computePrice(service, unit, qty);
    const nf = new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    });
    const compText =
      typeof computed === "number"
        ? nf.format(computed) + (unit === "days" ? " (from)" : " (discounted)")
        : "—";

    document.getElementById("reviewService").textContent = service || "—";
    document.getElementById("reviewRoute").textContent = route || "—";
    document.getElementById("reviewWhen").textContent = when || "—";
    document.getElementById("reviewDuration").textContent =
      (qty || 1) + " " + unit;
    document.getElementById("reviewPrice").textContent = compText;
    document.getElementById("reviewContact").textContent = contact;

    document.getElementById("price_from").value =
      typeof priceFrom === "number" ? priceFrom : "";
    document.getElementById("computed_price").value =
      typeof computed === "number" ? computed : "";
    document.getElementById("summary").value = JSON.stringify({
      service,
      route,
      when,
      duration_unit: unit,
      duration_qty: qty,
      price_from: priceFrom || null,
      computed_price: computed || null,
      contact,
      notes: form.notes?.value,
    });

    const json = {};
    data.forEach((value, key) => {
      json[key] = value;
      console.log(json[key], " ", value);
    });
    console.log("Summary:", JSON.stringify(json));

    // Show loading state (optional)
    submitBtn.disabled = true;
    submitBtn.textContent = "Requesting...";

    // Send POST request
    fetch("https://hooks.zapier.com/hooks/catch/24260943/ut9x0z9/", {
      // Change URL to your backend endpoint
      method: "POST",

      body: JSON.stringify(json),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to request ride");
        return res.json();
      })
      .then((result) => {
        // Success: show confirmation, redirect, etc.
        alert("Ride requested successfully!");
        form.reset();
        showStep(0);
      })
      .catch((err) => {
        alert("Error: " + err.message, "json: ", json);
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Request Ride";
      });
  }
  form.addEventListener("input", updateReview);
  form.addEventListener("submit", updateReview2);

  // Add stop
  const stopsEl = document.getElementById("stops");
  document.getElementById("addStop").addEventListener("click", () => {
    const id = "stop" + (stopsEl.children.length + 1);
    const wrap = document.createElement("div");
    wrap.className = "stop-row";
    wrap.innerHTML = `<label for="${id}">Stop ${
      stopsEl.children.length + 1
    }</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="${id}" name="${id}" list="place-suggestions"/>
        <button class="btn ghost small" type="button" aria-label="Remove stop">Remove</button>
      </div>`;
    wrap.querySelector("button").addEventListener("click", () => wrap.remove());
    stopsEl.appendChild(wrap);
  });

  // Init
  showStep(0);
});

// Year
safe(function () {
  document.getElementById("year").textContent = new Date().getFullYear();
});
