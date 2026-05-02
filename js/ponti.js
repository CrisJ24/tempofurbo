// Tempofurbo - Calendario ponti 2026
// JavaScript volutamente semplice e commentato: niente framework, solo DOM e date native.

const monthNames = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const weekDays = ["L", "M", "M", "G", "V", "S", "D"];

const calendarGrid = document.getElementById("calendarGrid");
const bridgeSummary = document.getElementById("bridgeSummary");
const yearSelect = document.getElementById("yearSelect");
const worksSaturdayInput = document.getElementById("worksSaturday");

let selectedButton = null;

// Normalizza le date a mezzogiorno per evitare problemi di fuso/ora legale.
function makeDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

function todayDate() {
  const now = new Date();
  return makeDate(now.getFullYear(), now.getMonth(), now.getDate());
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function addDays(date, amount) {
  const copy = makeDate(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + amount);
  return copy;
}

// Algoritmo di Pasqua gregoriana.
// Serve per calcolare anche il Lunedì dell'Angelo.
function easterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return makeDate(year, month, day);
}

function getItalianHolidays(year) {
  const easter = easterDate(year);
  const easterMonday = addDays(easter, 1);

  const holidays = [
    { date: makeDate(year, 0, 1), name: "Capodanno" },
    { date: makeDate(year, 0, 6), name: "Epifania" },
    { date: easter, name: "Pasqua" },
    { date: easterMonday, name: "Lunedì dell’Angelo" },
    { date: makeDate(year, 3, 25), name: "Festa della Liberazione" },
    { date: makeDate(year, 4, 1), name: "Festa del lavoro" },
    { date: makeDate(year, 5, 2), name: "Festa della Repubblica" },
    { date: makeDate(year, 7, 15), name: "Ferragosto" },
    { date: makeDate(year, 10, 1), name: "Ognissanti" },
    { date: makeDate(year, 11, 8), name: "Immacolata" },
    { date: makeDate(year, 11, 25), name: "Natale" },
    { date: makeDate(year, 11, 26), name: "Santo Stefano" }
  ];

  const map = new Map();
  holidays.forEach((holiday) => {
    map.set(dateKey(holiday.date), holiday.name);
  });

  return { holidays, map };
}

function isWeekend(date, worksSaturday) {
  const day = date.getDay(); // 0 domenica, 6 sabato
  return worksSaturday ? day === 0 : day === 0 || day === 6;
}

function isWorkingDay(date, worksSaturday, holidayMap) {
  return !isWeekend(date, worksSaturday) && !holidayMap.has(dateKey(date));
}

// Conta il blocco di giorni liberi consecutivi generato da ferie consigliate + festività + weekend.
function countFreeBlock(seedDate, recommendedKeys, holidayMap, worksSaturday) {
  function isFree(date) {
    const key = dateKey(date);
    return recommendedKeys.has(key) || holidayMap.has(key) || isWeekend(date, worksSaturday);
  }

  let start = makeDate(seedDate.getFullYear(), seedDate.getMonth(), seedDate.getDate());
  while (isFree(addDays(start, -1))) {
    start = addDays(start, -1);
  }

  let end = makeDate(seedDate.getFullYear(), seedDate.getMonth(), seedDate.getDate());
  while (isFree(addDays(end, 1))) {
    end = addDays(end, 1);
  }

  const days = Math.round((end - start) / 86400000) + 1;
  return { start, end, days };
}

function uniqueDates(dates) {
  const seen = new Set();
  return dates.filter((date) => {
    const key = dateKey(date);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Genera suggerimenti semplici ma solidi.
// Caso martedì: lunedì precedente.
// Caso giovedì: venerdì successivo.
// Se si lavora anche il sabato, aggiunge anche il sabato quando serve per non spezzare il ponte.
function getBridgeSuggestions(year, worksSaturday, holidayMap) {
  const { holidays } = getItalianHolidays(year);
  const today = todayDate();
  const suggestions = [];

  holidays.forEach((holiday) => {
    const dow = holiday.date.getDay();
    let recommended = [];

    if (dow === 2) { // martedì
      recommended.push(addDays(holiday.date, -1));

      if (worksSaturday) {
        recommended.push(addDays(holiday.date, -3)); // sabato precedente
      }
    }

    if (dow === 4) { // giovedì
      recommended.push(addDays(holiday.date, 1));

      if (worksSaturday) {
        recommended.push(addDays(holiday.date, 2)); // sabato successivo
      }
    }

    if (dow === 5) { // venerdì: weekend lungo naturale, ma giovedì può allungare
      recommended.push(addDays(holiday.date, -1));
    }

    if (dow === 1) { // lunedì: weekend lungo naturale, ma martedì può allungare
      recommended.push(addDays(holiday.date, 1));
    }

    recommended = uniqueDates(recommended)
      .filter((date) => date.getFullYear() === year)
      .filter((date) => isWorkingDay(date, worksSaturday, holidayMap))
      .filter((date) => date >= today);

    if (recommended.length === 0) {
      return;
    }

    const recommendedKeys = new Set(recommended.map(dateKey));
    const block = countFreeBlock(holiday.date, recommendedKeys, holidayMap, worksSaturday);
    const leaveDays = recommended.length;
    const ratio = block.days / leaveDays;

    // Evita suggerimenti deboli.
    if (block.days < 3) {
      return;
    }

    suggestions.push({
      holiday,
      recommended,
      block,
      leaveDays,
      ratio,
      isBest: ratio >= 4 || (block.days >= 4 && leaveDays === 1)
    });
  });

  return suggestions.sort((a, b) => {
    if (b.isBest !== a.isBest) return Number(b.isBest) - Number(a.isBest);
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    return a.holiday.date - b.holiday.date;
  });
}

function renderBridgeSummary(suggestions) {
  bridgeSummary.innerHTML = "";

  if (suggestions.length === 0) {
    bridgeSummary.innerHTML = `
      <div class="empty-state">
        Nessun ponte futuro particolarmente conveniente trovato con queste impostazioni.
        Le festività restano comunque evidenziate nel calendario.
      </div>
    `;
    return;
  }

  suggestions.slice(0, 6).forEach((suggestion) => {
    const card = document.createElement("article");
    card.className = "bridge-card";

    const recommendedList = suggestion.recommended
      .map((date) => formatDate(date))
      .join(", ");

    card.innerHTML = `
      <h3>${suggestion.holiday.name}</h3>
      <p>
        Prendi ferie: <strong>${recommendedList}</strong>.<br>
        Ottieni circa <strong>${suggestion.block.days} giorni liberi consecutivi</strong>
        usando <strong>${suggestion.leaveDays} ${suggestion.leaveDays === 1 ? "giorno" : "giorni"} di ferie</strong>.
      </p>
      <div class="bridge-meta">
        ${suggestion.isBest ? `<span class="badge badge-yellow">Ponte vantaggioso</span>` : `<span class="badge badge-green">Ferie consigliate</span>`}
        <span class="badge badge-blue">${formatDate(suggestion.block.start)} → ${formatDate(suggestion.block.end)}</span>
      </div>
    `;

    bridgeSummary.appendChild(card);
  });
}

function renderCalendar() {
  const year = Number(yearSelect.value);
  const worksSaturday = worksSaturdayInput.checked;
  const today = todayDate();

  const { map: holidayMap } = getItalianHolidays(year);
  const suggestions = getBridgeSuggestions(year, worksSaturday, holidayMap);

  const recommendedMap = new Map();
  const bestMonths = new Set();

  suggestions.forEach((suggestion) => {
    if (suggestion.isBest) {
      bestMonths.add(suggestion.holiday.date.getMonth());
    }

    suggestion.recommended.forEach((date) => {
      recommendedMap.set(dateKey(date), {
        label: `Ferie consigliate per ${suggestion.holiday.name}`,
        best: suggestion.isBest
      });
    });
  });

  renderBridgeSummary(suggestions);

  calendarGrid.innerHTML = "";

  for (let month = 0; month < 12; month += 1) {
    const monthCard = document.createElement("article");
    monthCard.className = "month-card";
    if (bestMonths.has(month)) {
      monthCard.classList.add("has-best-bridge");
    }

    const monthHeader = document.createElement("div");
    monthHeader.className = "month-header";
    monthHeader.innerHTML = `
      <h3>${monthNames[month]}</h3>
      ${bestMonths.has(month) ? `<span class="month-tag">Ponte top</span>` : ""}
    `;

    const weekdays = document.createElement("div");
    weekdays.className = "weekdays";
    weekDays.forEach((day) => {
      const span = document.createElement("span");
      span.textContent = day;
      weekdays.appendChild(span);
    });

    const daysGrid = document.createElement("div");
    daysGrid.className = "days-grid";

    // Offset: in JS domenica è 0, lunedì è 1.
    // Qui vogliamo il lunedì come prima colonna.
    const firstDay = makeDate(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i += 1) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      daysGrid.appendChild(empty);
    }

    const dayInfo = document.createElement("div");
    dayInfo.className = "day-info";
    dayInfo.textContent = "Clicca su un giorno evidenziato per leggere il dettaglio.";

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = makeDate(year, month, day);
      const key = dateKey(date);
      const button = document.createElement("button");
      button.className = "day";
      button.type = "button";
      button.textContent = day;
      button.setAttribute("aria-label", formatDate(date));

      const labels = [];

      if (date < today) {
        button.classList.add("past");
      }

      if (isWeekend(date, worksSaturday)) {
        button.classList.add("weekend");
        labels.push("Weekend");
      }

      if (holidayMap.has(key)) {
        button.classList.add("holiday");
        labels.push(holidayMap.get(key));
      }

      if (recommendedMap.has(key)) {
        const recommendation = recommendedMap.get(key);
        button.classList.add("recommended");
        labels.push(recommendation.label);

        if (recommendation.best) {
          button.classList.add("best");
        }
      }

      button.addEventListener("click", () => {
        if (selectedButton) {
          selectedButton.classList.remove("selected");
        }

        selectedButton = button;
        button.classList.add("selected");

        if (labels.length === 0) {
          dayInfo.innerHTML = `<strong>${formatDate(date)}</strong>: nessuna evidenza particolare.`;
          return;
        }

        dayInfo.innerHTML = `<strong>${formatDate(date)}</strong>: ${labels.join(" · ")}.`;
      });

      daysGrid.appendChild(button);
    }

    monthCard.appendChild(monthHeader);
    monthCard.appendChild(weekdays);
    monthCard.appendChild(daysGrid);
    monthCard.appendChild(dayInfo);
    calendarGrid.appendChild(monthCard);
  }
}

worksSaturdayInput.addEventListener("change", renderCalendar);
yearSelect.addEventListener("change", renderCalendar);

renderCalendar();
