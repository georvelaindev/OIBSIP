"use strict";

/* ==========================================================================
   Tribute Page — Nelson Mandela
   Navigation, animations, onglets de biographie et chronologie cliquable.
   La page reste entièrement lisible sans JavaScript, et les animations sont
   désactivées si l'utilisateur demande moins de mouvement (la classe "js"
   n'est alors pas ajoutée, voir index.html).
   ========================================================================== */

// Distance de défilement (px) avant d'afficher le bouton de retour en haut.
const SHOW_BUTTON_AFTER = 400;
const animated = document.documentElement.classList.contains("js");

/* Évite de recalculer à chaque événement de défilement -------------------- */
function onScroll(callback) {
  let waiting = false;
  function handler() {
    if (waiting) {
      return;
    }
    waiting = true;
    window.requestAnimationFrame(() => {
      waiting = false;
      callback();
    });
  }
  window.addEventListener("scroll", handler, { passive: true });
  window.addEventListener("resize", handler);
  callback();
}

/* Barre de progression + menu : section active ---------------------------- */
function setupNavigation() {
  const nav = document.querySelector(".site-nav");
  const bar = document.getElementById("progress-bar");
  const links = Array.from(document.querySelectorAll("[data-nav]"));
  const sections = links
    .map((link) => document.getElementById(link.dataset.nav))
    .filter(Boolean);

  onScroll(() => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = maxScroll > 0 ? Math.min(1, window.scrollY / maxScroll) : 0;
    if (bar) {
      bar.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
    }
    if (nav) {
      nav.classList.toggle("is-scrolled", window.scrollY > 8);
    }

    const marker = window.innerHeight * 0.4;
    let current = null;
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= marker) {
        current = section.id;
      }
    });
    if (ratio > 0.995 && sections.length > 0) {
      // Tout en bas de page, la dernière section reste sélectionnée.
      current = sections[sections.length - 1].id;
    }

    links.forEach((link) => {
      const isCurrent = link.dataset.nav === current;
      link.classList.toggle("is-active", isCurrent);
      if (isCurrent) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  });
}

/* Apparition des blocs quand ils entrent à l'écran ------------------------ */
function setupReveal() {
  if (!animated) {
    return;
  }
  const items = document.querySelectorAll("[data-reveal]");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

  items.forEach((item) => observer.observe(item));
}

/* Citation : les mots apparaissent l'un après l'autre -------------------- */
function setupQuote() {
  const quote = document.querySelector(".quote");
  const paragraph = quote ? quote.querySelector("[data-words]") : null;
  if (!animated || !paragraph) {
    return;
  }

  const text = paragraph.textContent.trim();
  paragraph.textContent = "";

  // Le texte complet reste lisible par les lecteurs d'écran
  const readable = document.createElement("span");
  readable.className = "visually-hidden";
  readable.textContent = text;
  paragraph.appendChild(readable);

  const visual = document.createElement("span");
  visual.setAttribute("aria-hidden", "true");
  text.split(/\s+/).forEach((word, index) => {
    const span = document.createElement("span");
    span.className = "word";
    span.style.setProperty("--i", String(index));
    span.textContent = word;
    visual.appendChild(span);
    visual.appendChild(document.createTextNode(" "));
  });
  paragraph.appendChild(visual);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        quote.classList.add("is-visible");
        observer.disconnect();
      }
    });
  }, { threshold: 0.35 });
  observer.observe(quote);
}

/* Biographie : un onglet par paragraphe (filtrage) ------------------------ */
function setupBioTabs() {
  const container = document.querySelector(".bio-text");
  const paragraphs = container ? Array.from(container.querySelectorAll("p")) : [];
  if (paragraphs.length === 0) {
    return;
  }

  const tablist = document.createElement("div");
  tablist.className = "bio-tabs";
  tablist.setAttribute("role", "tablist");
  tablist.setAttribute("aria-label", "Parties de la biographie");

  const tabs = paragraphs.map((paragraph, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "bio-tab";
    tab.id = "bio-tab-" + (index + 1);
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", paragraph.id);
    tab.textContent = paragraph.dataset.label || "Partie " + (index + 1);
    tablist.appendChild(tab);

    paragraph.setAttribute("role", "tabpanel");
    paragraph.setAttribute("aria-labelledby", tab.id);
    return tab;
  });
  container.parentNode.insertBefore(tablist, container);

  function select(index, moveFocus) {
    paragraphs.forEach((paragraph, i) => paragraph.classList.toggle("is-active", i === index));
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    if (moveFocus) {
      tabs[index].focus();
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(index, false));
    tab.addEventListener("keydown", (event) => {
      let next = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = (index + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = tabs.length - 1;
      }
      if (next !== null) {
        event.preventDefault();
        select(next, true);
      }
    });
  });

  select(0, false);
}

/* Chronologie horizontale : frise + carte de détail ------------------------ */
function setupTimeline() {
  const viewport = document.querySelector(".timeline-viewport");
  const list = document.querySelector(".timeline");
  const items = list ? Array.from(list.querySelectorAll(".timeline-item")) : [];
  if (!viewport || items.length === 0) {
    return;
  }
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Lecture des données déjà présentes dans le HTML (rien n'est dupliqué à la main)
  const steps = items.map((item, index) => ({
    item,
    tab: item.querySelector(".timeline-toggle"),
    year: item.querySelector("time").textContent.trim(),
    title: item.querySelector(".timeline-title").textContent.trim(),
    text: item.querySelector(".timeline-detail").textContent.trim(),
    id: index + 1
  }));

  // La liste devient une rangée d'onglets : sémantique « tablist »
  list.setAttribute("role", "tablist");
  list.setAttribute("aria-label", "Étapes de la vie de Nelson Mandela");
  items.forEach((item) => {
    item.setAttribute("role", "presentation");
    item.querySelector(".timeline-heading").setAttribute("role", "presentation");
  });

  // Carte de détail : une carte par étape, superposées (hauteur = la plus haute)
  const panel = document.createElement("div");
  panel.className = "timeline-panel";
  panel.setAttribute("data-reveal", "");
  const cards = document.createElement("div");
  cards.className = "step-cards";

  const cardEls = steps.map((step) => {
    const card = document.createElement("article");
    card.className = "step-card";
    card.id = "step-card-" + step.id;
    card.setAttribute("role", "tabpanel");
    card.setAttribute("aria-labelledby", "step-tab-" + step.id);

    const year = document.createElement("p");
    year.className = "step-year";
    year.setAttribute("aria-hidden", "true");
    year.textContent = step.year;
    const title = document.createElement("p");
    title.className = "step-title";
    title.textContent = step.title;
    const text = document.createElement("p");
    text.className = "step-text";
    text.textContent = step.text;

    card.append(year, title, text);
    cards.appendChild(card);

    step.tab.id = "step-tab-" + step.id;
    step.tab.setAttribute("role", "tab");
    step.tab.setAttribute("aria-controls", card.id);
    step.tab.removeAttribute("tabindex");
    return card;
  });

  const controls = document.createElement("div");
  controls.className = "step-controls";
  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "step-btn step-prev";
  prev.setAttribute("aria-label", "Étape précédente");
  prev.innerHTML = '<span aria-hidden="true">&larr;</span><span class="step-label">Précédent</span>';
  const counter = document.createElement("span");
  counter.className = "step-counter";
  counter.setAttribute("aria-live", "polite");
  const next = document.createElement("button");
  next.type = "button";
  next.className = "step-btn step-next";
  next.setAttribute("aria-label", "Étape suivante");
  next.innerHTML = '<span class="step-label">Suivant</span><span aria-hidden="true">&rarr;</span>';
  controls.append(prev, counter, next);

  panel.append(cards, controls);
  viewport.parentNode.insertBefore(panel, viewport.nextSibling);

  let current = 0;

  // La ligne colorée va du premier point jusqu'au point de l'étape choisie
  function updateFill() {
    const first = items[0];
    const chosen = items[current];
    const x = chosen.offsetLeft + chosen.offsetWidth / 2 - (first.offsetLeft + first.offsetWidth / 2);
    list.style.setProperty("--fill", Math.max(0, x).toFixed(1) + "px");
  }

  // Sur petit écran la frise défile : l'étape choisie est ramenée au centre
  function centerInViewport(item) {
    const max = viewport.scrollWidth - viewport.clientWidth;
    if (max <= 0) {
      return;
    }
    const left = item.offsetLeft - (viewport.clientWidth - item.offsetWidth) / 2;
    viewport.scrollTo({
      left: Math.max(0, Math.min(max, left)),
      behavior: reduceMotion ? "auto" : "smooth"
    });
  }

  function select(index, options) {
    const opts = options || {};
    current = index;
    if (opts.byUser) {
      // Ce que l'utilisateur manipule ne doit jamais rester masqué par le fondu
      viewport.classList.add("is-visible");
      panel.classList.add("is-visible");
    }
    steps.forEach((step, i) => {
      const on = i === index;
      step.item.classList.toggle("is-open", on);
      step.tab.setAttribute("aria-selected", String(on));
      step.tab.tabIndex = on ? 0 : -1;
      cardEls[i].classList.toggle("is-active", on);
    });
    counter.textContent = index + 1 + " / " + steps.length;
    prev.disabled = index === 0;
    next.disabled = index === steps.length - 1;
    updateFill();
    centerInViewport(items[index]);
    if (opts.focus) {
      steps[index].tab.focus({ preventScroll: true });
    }
  }

  steps.forEach((step, index) => {
    step.tab.addEventListener("click", () => select(index, { byUser: true }));
    step.tab.addEventListener("keydown", (event) => {
      let target = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        target = Math.min(steps.length - 1, index + 1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        target = Math.max(0, index - 1);
      } else if (event.key === "Home") {
        target = 0;
      } else if (event.key === "End") {
        target = steps.length - 1;
      }
      if (target !== null) {
        event.preventDefault();
        select(target, { byUser: true, focus: true });
      }
    });
  });
  prev.addEventListener("click", () => select(current - 1, { byUser: true }));
  next.addEventListener("click", () => select(current + 1, { byUser: true }));

  window.addEventListener("resize", updateFill);
  select(0, {});
}

/* Titre géant : s'ajuste exactement à la largeur disponible ------------------ */
function setupHeroTitle() {
  const title = document.querySelector(".h1-last");
  const stage = document.querySelector(".hero-stage");
  if (!title || !stage) {
    return;
  }

  function fit() {
    // On repart de la taille prévue par le CSS avant chaque mesure.
    title.style.fontSize = "";
    const current = parseFloat(window.getComputedStyle(title).fontSize);
    const textWidth = title.getBoundingClientRect().width / currentScale();
    const available = stage.clientWidth;
    if (textWidth > 0 && available > 0) {
      title.style.fontSize = (current * available / textWidth).toFixed(2) + "px";
    }
  }

  // L'animation d'apparition modifie l'échelle du bloc : on la neutralise pour mesurer
  function currentScale() {
    const matrix = window.getComputedStyle(title).transform;
    return matrix && matrix !== "none" ? parseFloat(matrix.split("(")[1]) || 1 : 1;
  }

  fit();
  window.addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fit);
  }
}

/* Bouton retour en haut ---------------------------------------------------- */
function setupBackToTop() {
  const button = document.getElementById("back-to-top");
  if (!button) {
    return;
  }

  onScroll(() => {
    button.hidden = window.scrollY < SHOW_BUTTON_AFTER;
  });
  // Le défilement fluide est défini par la feuille de style.
  button.addEventListener("click", () => window.scrollTo({ top: 0 }));
}

// Confirme au script de secours dans index.html que ce fichier a été chargé.
document.documentElement.classList.add("js-ready");

setupHeroTitle();
setupBioTabs();
setupTimeline();
setupNavigation();
setupReveal();
setupQuote();
setupBackToTop();
