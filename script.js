(() => {
  const cards = Array.from(document.querySelectorAll('.card'));
  const storageKey = 'padelpro:selectedRole';

  function applySelection(role, persist = true) {
    cards.forEach((card) => {
      const isSelected = card.dataset.role === role;
      card.classList.toggle('selected', isSelected);
      card.setAttribute('aria-pressed', String(isSelected));
    });

    if (persist) {
      localStorage.setItem(storageKey, role);
    }
  }

  window.selectRole = (role) => {
    applySelection(role, true);

    const selected = cards.find((card) => card.dataset.role === role);
    if (!selected) return;

    selected.animate(
      [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-3px) scale(1.01)' },
        { transform: 'translateY(0) scale(1)' },
      ],
      { duration: 260, easing: 'ease-out' }
    );
  };

  cards.forEach((card) => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-pressed', 'false');

    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mx', `${x}%`);
      card.style.setProperty('--my', `${y}%`);
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const role = card.dataset.role;
        if (role) window.selectRole(role);
      }
    });
  });

  const stored = localStorage.getItem(storageKey);
  if (stored && cards.some((card) => card.dataset.role === stored)) {
    applySelection(stored, false);
  } else if (cards[0]?.dataset.role) {
    applySelection(cards[0].dataset.role, false);
  }

  const revealTargets = document.querySelectorAll('.roles, .features, .feat, footer');
  revealTargets.forEach((element) => element.classList.add('reveal'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -8% 0px',
    }
  );

  revealTargets.forEach((element) => observer.observe(element));
})();
