(() => {
  const DEFAULT_DATA = {
    coachAgenda: [
      { id: "c1", time: "17:00", title: "Técnica de bandeja", detail: "Grupo competición (6 jugadores)" },
      { id: "c2", time: "18:30", title: "Salida de pared + transición", detail: "Adultos intermedio (8 jugadores)" },
      { id: "c3", time: "20:00", title: "Partido condicionado", detail: "Foco en toma de decisión bajo presión" },
    ],
    playerSessions: [
      { date: "2026-02-03", focus: "Bandeja y volea", score: 7.8 },
      { date: "2026-02-01", focus: "Dirección de globo", score: 7.2 },
      { date: "2026-01-29", focus: "Defensa pared de revés", score: 7.5 },
    ],
    scAthletes: [
      { name: "Lucía", load: "Alta", note: "Sin molestias, mantener volumen" },
      { name: "Javi", load: "Media", note: "Reducir impacto por hombro derecho" },
      { name: "Irene", load: "Alta", note: "Buena respuesta en potencia lateral" },
      { name: "Mario", load: "Baja", note: "Retorno progresivo tras sobrecarga" },
    ],
  };

  const storageKeys = {
    theme: "padelpro:theme",
    role: "padelpro:selectedRole",
    coachAgenda: "padelpro:coachAgenda",
  };

  const cards = Array.from(document.querySelectorAll(".card[data-role]"));
  const themeToggle = document.querySelector("#theme-toggle");

  let padelData = { ...DEFAULT_DATA };

  function mergeData(raw) {
    return {
      coachAgenda: Array.isArray(raw?.coachAgenda) ? raw.coachAgenda : DEFAULT_DATA.coachAgenda,
      playerSessions: Array.isArray(raw?.playerSessions) ? raw.playerSessions : DEFAULT_DATA.playerSessions,
      scAthletes: Array.isArray(raw?.scAthletes) ? raw.scAthletes : DEFAULT_DATA.scAthletes,
    };
  }

  async function loadPadelData() {
    try {
      const response = await fetch("./data/padel-data.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();
      padelData = mergeData(raw);
    } catch {
      padelData = { ...DEFAULT_DATA };
    }
  }

  function applyTheme(theme) {
    const resolvedTheme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    localStorage.setItem(storageKeys.theme, resolvedTheme);
    if (themeToggle) {
      themeToggle.textContent = resolvedTheme === "dark" ? "Claro" : "Oscuro";
      themeToggle.setAttribute("aria-label", `Cambiar a tema ${resolvedTheme === "dark" ? "claro" : "oscuro"}`);
    }
  }

  function initTheme() {
    const storedTheme = localStorage.getItem(storageKeys.theme);
    if (storedTheme) {
      applyTheme(storedTheme);
      return;
    }
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(prefersLight ? "light" : "dark");
  }

  function applySelection(role, persist = true) {
    cards.forEach((card) => {
      const selected = card.dataset.role === role;
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-pressed", String(selected));
    });
    if (persist) {
      localStorage.setItem(storageKeys.role, role);
    }
  }

  function openRole(card) {
    const role = card.dataset.role;
    const target = card.dataset.target;
    if (!role || !target) return;
    applySelection(role, true);
    window.location.href = target;
  }

  function initCards() {
    if (!cards.length) return;

    cards.forEach((card) => {
      card.setAttribute("role", "button");
      card.setAttribute("aria-pressed", "false");

      card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--mx", `${x}%`);
        card.style.setProperty("--my", `${y}%`);
      });

      card.addEventListener("click", () => openRole(card));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openRole(card);
        }
      });
    });

    const stored = localStorage.getItem(storageKeys.role);
    const exists = cards.some((card) => card.dataset.role === stored);
    applySelection(exists ? stored : cards[0].dataset.role, false);
  }

  function initReveal() {
    const revealTargets = document.querySelectorAll(".roles, .features, .feat, footer");
    if (!revealTargets.length) return;

    revealTargets.forEach((element) => element.classList.add("reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    revealTargets.forEach((element) => observer.observe(element));
  }

  function getSavedCoachChecks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKeys.coachAgenda) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveCoachChecks(checks) {
    localStorage.setItem(storageKeys.coachAgenda, JSON.stringify(checks));
  }

  function initCoachPage() {
    const agendaContainer = document.querySelector("#coach-agenda-content");
    if (!agendaContainer) return;

    const checks = getSavedCoachChecks();
    agendaContainer.innerHTML = padelData.coachAgenda
      .map(
        (item) => `
          <label class="list-item">
            <strong>${item.time} - ${item.title}</strong>
            <span>${item.detail}</span>
            <span>
              <input type="checkbox" data-coach-task="${item.id}" ${checks[item.id] ? "checked" : ""} />
              Completada
            </span>
          </label>
        `,
      )
      .join("");

    document.querySelectorAll("[data-coach-task]").forEach((el) => {
      el.addEventListener("change", () => {
        checks[el.dataset.coachTask] = el.checked;
        saveCoachChecks(checks);
      });
    });
  }

  function initPlayerPage() {
    const metrics = document.querySelector("#player-metrics-content");
    const sessions = document.querySelector("#player-sessions-content");
    if (!metrics || !sessions) return;

    const sessionsData = padelData.playerSessions.length ? padelData.playerSessions : DEFAULT_DATA.playerSessions;
    const avgScore = (sessionsData.reduce((sum, item) => sum + Number(item.score || 0), 0) / sessionsData.length).toFixed(1);
    const latest = sessionsData[0];

    metrics.innerHTML = `
      <div class="chip">Sesiones completadas: ${sessionsData.length}</div>
      <div class="chip">Valoración media: ${avgScore}/10</div>
      <div class="chip">Último foco: ${latest.focus}</div>
      <div class="chip">Último entreno: ${latest.date}</div>
    `;

    sessions.innerHTML = sessionsData
      .map(
        (session, idx) => `
          <div class="list-item">
            <strong>Sesión #${15 - idx} - ${session.focus}</strong>
            <span>Fecha: ${session.date}</span>
            <span>Valoración técnica: ${session.score}/10</span>
          </div>
        `,
      )
      .join("");
  }

  function initScPage() {
    const metrics = document.querySelector("#sc-metrics-content");
    const athletes = document.querySelector("#sc-athletes-content");
    if (!metrics || !athletes) return;

    const athletesData = padelData.scAthletes.length ? padelData.scAthletes : DEFAULT_DATA.scAthletes;
    const highLoadCount = athletesData.filter((athlete) => athlete.load === "Alta").length;
    metrics.innerHTML = `
      <div class="chip">Atletas activos: ${athletesData.length}</div>
      <div class="chip">Carga alta: ${highLoadCount}</div>
      <div class="chip">Sesiones fuerza/semana: 3</div>
      <div class="chip">Riesgo de fatiga: controlado</div>
    `;

    athletes.innerHTML = athletesData
      .map(
        (athlete) => `
          <div class="list-item">
            <strong>${athlete.name} - Carga ${athlete.load}</strong>
            <span>${athlete.note}</span>
          </div>
        `,
      )
      .join("");
  }

  themeToggle?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  });

  async function boot() {
    initTheme();
    initCards();
    initReveal();
    await loadPadelData();
    initCoachPage();
    initPlayerPage();
    initScPage();
  }

  boot();
})();
