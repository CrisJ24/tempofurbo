const monthNames = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const weekdayLabels = ["L", "M", "M", "G", "V", "S", "D"];

const selectedDates = new Set();

const yearSelect = document.getElementById("yearSelect");
const worksSaturday = document.getElementById("worksSaturday");
const calendarGrid = document.getElementById("calendarGrid");
const bridgeSummary = document.getElementById("bridgeSummary");

function pad(value) {
  return String(value).padStart(2, "0");
}

function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatDate(key) {
  const date = fromKey(key);
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "long" });
}

// Algoritmo classico per calcolare la Pasqua gregoriana.
function getEasterDate(year) {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day, 12);
}

function getItalianHolidays(year) {
  const easter = getEasterDate(year);
  const easterMonday = addDays(easter, 1);

  const holidays = [
    { key: `${year}-01-01`, name: "Capodanno" },
    { key: `${year}-01-06`, name: "Epifania" },
    { key: toKey(easterMonday), name: "Lunedì dell’Angelo" },
    { key: `${year}-04-25`, name: "Liberazione" },
    { key: `${year}-05-01`, name: "Festa del lavoro" },
    { key: `${year}-06-02`, name: "Festa della Repubblica" },
    { key: `${year}-08-15`, name: "Ferragosto" },
    { key: `${year}-11-01`, name: "Ognissanti" },
    { key: `${year}-12-08`, name: "Immacolata" },
    { key: `${year}-12-25`, name: "Natale" },
    { key: `${year}-12-26`, name: "Santo Stefano" }
  ];

  return holidays;
}

function isWeekend(date, saturdayIsWorking) {
  const day = date.getDay();
  if (saturdayIsWorking) {
    return day === 0;
  }
  return day === 0 || day === 6;
}

function isWorkingDay(key, holidayKeys, saturdayIsWorking) {
  const date = fromKey(key);
  return !holidayKeys.has(key) && !isWeekend(date, saturdayIsWorking);
}

function getDateRange(start, end) {
  const dates = [];
  let cursor = new Date(start);

  while (cursor <= end) {
    dates.push(toKey(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function calculateBridgeSuggestions(year, saturdayIsWorking) {
  const holidays = getItalianHolidays(year);
  const holidayKeys = new Set(holidays.map(item => item.key));
  const suggestions = [];

  holidays.forEach(holiday => {
    const holidayDate = fromKey(holiday.key);
    let best = null;

    for (let before = 0; before <= 4; before += 1) {
      for (let after = 0; after <= 4; after += 1) {
        const start = addDays(holidayDate, -before);
        const end = addDays(holidayDate, after);
        const range = getDateRange(start, end);

        const vacationDays = range.filter(key => isWorkingDay(key, holidayKeys, saturdayIsWorking));
        const totalDays = range.length;

        // Escludiamo i suggerimenti troppo deboli: devono produrre almeno 4 giorni consecutivi.
        if (totalDays < 4 || vacationDays.length === 0 || vacationDays.length > 4) {
          continue;
        }

        const score = totalDays / vacationDays.length;

        if (!best || score > best.score || (score === best.score && totalDays > best.totalDays)) {
          best = {
            holidayName: holiday.name,
            holidayKey: holiday.key,
            startKey: toKey(start),
            endKey: toKey(end),
            vacationDays,
            totalDays,
            score
          };
        }
      }
    }

    if (best) {
      suggestions.push(best);
    }
  });

  return suggestions
    .sort((a, b) => b.score - a.score || b.totalDays - a.totalDays)
    .slice(0, 6);
}

function getRecommendedDateSets(suggestions) {
  const recommended = new Set();
  const topDays = new Set();
  const topMonths = new Set();

  suggestions.slice(0, 4).forEach((suggestion, index) => {
    suggestion.vacationDays.forEach(key => recommended.add(key));

    if (index < 3) {
      getDateRange(fromKey(suggestion.startKey), fromKey(suggestion.endKey)).forEach(key => topDays.add(key));
      topMonths.add(fromKey(suggestion.holidayKey).getMonth());
    }
  });

  return { recommended, topDays, topMonths };
}

function renderSummary(suggestions) {
  bridgeSummary.innerHTML = "";

  if (!suggestions.length) {
    bridgeSummary.innerHTML = `<article class="summary-card"><h3>Nessun ponte forte trovato</h3><p>Per questo anno le festività cadono in modo poco favorevole.</p></article>`;
    return;
  }

  suggestions.slice(0, 3).forEach((suggestion, index) => {
    const card = document.createElement("article");
    card.className = `summary-card ${index === 0 ? "top" : ""}`;

    const vacationText = suggestion.vacationDays.map(formatDate).join(", ");

    card.innerHTML = `
      <div class="summary-meta">
        <span class="pill yellow">${index === 0 ? "Ponte top" : "Occasione"}</span>
        <span class="pill green">${suggestion.vacationDays.length} ferie → ${suggestion.totalDays} giorni</span>
      </div>
      <h3>${suggestion.holidayName}</h3>
      <p>Periodo: ${formatDate(suggestion.startKey)} - ${formatDate(suggestion.endKey)}.</p>
      <p>Giorni suggeriti: ${vacationText}.</p>
    `;

    bridgeSummary.appendChild(card);
  });
}

function renderCalendar() {
  const year = Number(yearSelect.value);
  const saturdayIsWorking = worksSaturday.checked;
  const holidays = getItalianHolidays(year);
  const holidayMap = new Map(holidays.map(item => [item.key, item.name]));
  const suggestions = calculateBridgeSuggestions(year, saturdayIsWorking);
  const { recommended, topDays, topMonths } = getRecommendedDateSets(suggestions);

  renderSummary(suggestions);
  calendarGrid.innerHTML = "";

  for (let month = 0; month < 12; month += 1) {
    const monthCard = document.createElement("article");
    monthCard.className = `month-card ${topMonths.has(month) ? "has-top-bridge" : ""}`;

    const monthHead = document.createElement("div");
    monthHead.className = "month-head";
    monthHead.innerHTML = `
      <h3>${monthNames[month]} ${year}</h3>
      ${topMonths.has(month) ? `<span class="month-badge">Ponte vantaggioso</span>` : ""}
    `;

    const weekdays = document.createElement("div");
    weekdays.className = "weekdays";
    weekdays.innerHTML = weekdayLabels.map(day => `<span>${day}</span>`).join("");

    const days = document.createElement("div");
    days.className = "days";

    const firstDay = new Date(year, month, 1, 12);
    const lastDay = new Date(year, month + 1, 0, 12);
    const mondayBasedStart = (firstDay.getDay() + 6) % 7;

    for (let i = 0; i < mondayBasedStart; i += 1) {
      const empty = document.createElement("button");
      empty.className = "day empty";
      empty.type = "button";
      days.appendChild(empty);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(year, month, day, 12);
      const key = toKey(date);
      const button = document.createElement("button");
      const classes = ["day"];

      if (isWeekend(date, saturdayIsWorking)) classes.push("weekend");
      if (holidayMap.has(key)) classes.push("holiday");
      if (recommended.has(key)) classes.push("recommended");
      if (topDays.has(key)) classes.push("top-day");
      if (selectedDates.has(key)) classes.push("selected");

      button.className = classes.join(" ");
      button.type = "button";
      button.textContent = day;
      button.title = holidayMap.get(key) || key;
      button.setAttribute("aria-label", holidayMap.get(key) ? `${day} ${monthNames[month]}: ${holidayMap.get(key)}` : `${day} ${monthNames[month]}`);

      button.addEventListener("click", () => {
        if (selectedDates.has(key)) {
          selectedDates.delete(key);
        } else {
          selectedDates.add(key);
        }
        renderCalendar();
      });

      days.appendChild(button);
    }

    const note = document.createElement("p");
    note.className = "calendar-note";
    note.textContent = topMonths.has(month)
      ? "Mese con almeno un ponte interessante: controlla i giorni verdi e gialli."
      : "";

    monthCard.appendChild(monthHead);
    monthCard.appendChild(weekdays);
    monthCard.appendChild(days);
    if (note.textContent) monthCard.appendChild(note);
    calendarGrid.appendChild(monthCard);
  }
}

yearSelect.addEventListener("change", () => {
  selectedDates.clear();
  renderCalendar();
});

worksSaturday.addEventListener("change", () => {
  selectedDates.clear();
  renderCalendar();
});

renderCalendar();
