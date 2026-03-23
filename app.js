const STORAGE_KEY = "yts-pickem-data-v1";

const defaultState = () => ({
  weeks: [
    createWeek({
      name: "Week 0",
      season: new Date().getFullYear().toString(),
      notes: "Add the games you want to track.",
      games: [createGame({ matchup: "Ohio State at Texas" })],
    }),
  ],
  selectedWeekId: null,
});

function createWeek(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: overrides.name ?? "New Week",
    season: overrides.season ?? new Date().getFullYear().toString(),
    notes: overrides.notes ?? "",
    games: overrides.games ?? [createGame()],
  };
}

function createGame(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    matchup: overrides.matchup ?? "",
    russPick: overrides.russPick ?? "",
    kennyPick: overrides.kennyPick ?? "",
    russPickWinner: overrides.russPickWinner ?? "",
    russPickLoser: overrides.russPickLoser ?? "",
    kennyPickWinner: overrides.kennyPickWinner ?? "",
    kennyPickLoser: overrides.kennyPickLoser ?? "",
    russAction: overrides.russAction ?? "",
    russActionWin: overrides.russActionWin ?? "",
    russActionLoss: overrides.russActionLoss ?? "",
    kennyAction: overrides.kennyAction ?? "",
    kennyActionWin: overrides.kennyActionWin ?? "",
    kennyActionLoss: overrides.kennyActionLoss ?? "",
  };
}

let state = loadState();

const elements = {
  weekList: document.getElementById("week-list"),
  weekTitleDisplay: document.getElementById("week-title-display"),
  weekSubtitle: document.getElementById("week-subtitle"),
  addWeekBtn: document.getElementById("add-week-btn"),
  addGameBtn: document.getElementById("add-game-btn"),
  gamesBody: document.getElementById("games-body"),
  totalsFooter: document.getElementById("totals-footer"),
  scoreboard: document.getElementById("scoreboard"),
  exportBtn: document.getElementById("export-btn"),
  importFile: document.getElementById("import-file"),
  weekButtonTemplate: document.getElementById("week-button-template"),
};

initialize();

function initialize() {
  normalizeWeekNames();

  if (!state.selectedWeekId || !findWeek(state.selectedWeekId)) {
    state.selectedWeekId = state.weeks[0]?.id ?? null;
  }

  wireEvents();
  render();
}

function wireEvents() {
  elements.addWeekBtn.addEventListener("click", () => {
    const weekNumber = getNextWeekNumber();
    const newWeek = createWeek({
      name: `Week ${weekNumber}`,
      notes: "Add a slate of games for this week.",
    });
    state.weeks.push(newWeek);
    state.selectedWeekId = newWeek.id;
    commit();
  });

  elements.addGameBtn.addEventListener("click", () => {
    const currentWeek = getSelectedWeek();
    currentWeek.games.push(createGame());
    commit();
  });

  elements.exportBtn.addEventListener("click", exportData);
  elements.importFile.addEventListener("change", importData);
}

function render() {
  renderWeekList();
  renderWeekMeta();
  renderGames();
  renderScoreboard();
  renderTotals();
}

function renderWeekList() {
  elements.weekList.innerHTML = "";

  state.weeks.forEach((week) => {
    const button = elements.weekButtonTemplate.content.firstElementChild.cloneNode(true);
    button.classList.toggle("active", week.id === state.selectedWeekId);
    button.innerHTML = `<strong>${escapeHtml(week.name)}</strong><span>${escapeHtml(week.season || "Season")} · ${escapeHtml(week.notes || "No notes yet")}</span>`;
    button.addEventListener("click", () => {
      state.selectedWeekId = week.id;
      commit();
    });
    elements.weekList.appendChild(button);
  });
}

function renderWeekMeta() {
  const week = getSelectedWeek();
  if (!week) return;

  elements.weekTitleDisplay.textContent = week.name || "Untitled Week";
  elements.weekSubtitle.textContent = `${week.season || "Season not set"} • ${week.games.length} game${week.games.length === 1 ? "" : "s"} on the board`;
}

function renderGames() {
  const week = getSelectedWeek();
  elements.gamesBody.innerHTML = "";

  if (!week || week.games.length === 0) {
    elements.gamesBody.innerHTML = `<tr><td colspan="11" class="empty-state">No games yet. Add the matchups you want for this week.</td></tr>`;
    return;
  }

  week.games.forEach((game) => {
    const gameRow = document.createElement("tr");
    gameRow.className = "game-block-row game-main-row";
    gameRow.innerHTML = `
      <td class="col-game">${textInput(game.matchup, game.id, "matchup")}</td>
      <td class="col-compact" rowspan="3">${textInput(game.russPick, game.id, "russPick")}</td>
      <td class="col-compact" rowspan="3">${textInput(game.kennyPick, game.id, "kennyPick")}</td>
      <td class="col-compact" rowspan="3">${textInput(game.russPickWinner, game.id, "russPickWinner")}</td>
      <td class="col-compact" rowspan="3">${textInput(game.russPickLoser, game.id, "russPickLoser")}</td>
      <td class="col-compact" rowspan="3">${textInput(game.kennyPickWinner, game.id, "kennyPickWinner")}</td>
      <td class="col-compact" rowspan="3">${textInput(game.kennyPickLoser, game.id, "kennyPickLoser")}</td>
      <td class="col-compact action-empty"></td>
      <td class="col-compact action-empty"></td>
      <td class="col-compact action-empty"></td>
      <td class="col-compact action-empty"></td>
    `;

    const russActionRow = document.createElement("tr");
    russActionRow.className = "game-block-row";
    russActionRow.innerHTML = `
      <td class="col-game">
        <label class="stacked-row-field">
          <span>Russ Action</span>
          ${textInput(game.russAction, game.id, "russAction")}
        </label>
      </td>
      <td class="col-compact">${textInput(game.russActionWin, game.id, "russActionWin")}</td>
      <td class="col-compact">${textInput(game.russActionLoss, game.id, "russActionLoss")}</td>
      <td class="col-compact action-empty"></td>
      <td class="col-compact action-empty"></td>
    `;

    const kennyActionRow = document.createElement("tr");
    kennyActionRow.className = "game-block-row";
    kennyActionRow.innerHTML = `
      <td class="col-game">
        <label class="stacked-row-field">
          <span>Kenny Action</span>
          ${textInput(game.kennyAction, game.id, "kennyAction")}
        </label>
      </td>
      <td class="col-compact action-empty"></td>
      <td class="col-compact action-empty"></td>
      <td class="col-compact">${textInput(game.kennyActionWin, game.id, "kennyActionWin")}</td>
      <td class="col-compact">${textInput(game.kennyActionLoss, game.id, "kennyActionLoss")}</td>
    `;

    elements.gamesBody.appendChild(gameRow);
    elements.gamesBody.appendChild(russActionRow);
    elements.gamesBody.appendChild(kennyActionRow);
  });

  bindGameInputs();
}

function renderScoreboard() {
  const week = getSelectedWeek();
  if (!week) return;
  const totals = summarizeWeek(week);

  const cards = [
    { title: "Russ Pick Points", value: totals.russPickWins, detail: `${totals.russPickWins} Correct, ${totals.russPickLosses} Incorrect` },
    { title: "Russ Action Points", value: totals.russActionWins, detail: `${totals.russActionWins} Correct, ${totals.russActionLosses} Incorrect` },
    { title: "Kenny Pick Points", value: totals.kennyPickWins, detail: `${totals.kennyPickWins} Correct, ${totals.kennyPickLosses} Incorrect` },
    { title: "Kenny Action Points", value: totals.kennyActionWins, detail: `${totals.kennyActionWins} Correct, ${totals.kennyActionLosses} Incorrect` },
  ];

  elements.scoreboard.innerHTML = cards
    .map(
      (card) => `
        <article class="score-card">
          <h3>${card.title}</h3>
          <p>${card.detail}</p>
        </article>
      `,
    )
    .join("");
}

function renderTotals() {
  const week = getSelectedWeek();
  if (!week) return;
  const totals = summarizeWeek(week);

  elements.totalsFooter.innerHTML = `
    <tr>
      <td>Totals</td>
      <td></td>
      <td></td>
      <td class="score-cell">${scorePill(totals.russPickWins, "win")}</td>
      <td class="score-cell">${scorePill(totals.russPickLosses, "loss")}</td>
      <td class="score-cell">${scorePill(totals.kennyPickWins, "win")}</td>
      <td class="score-cell">${scorePill(totals.kennyPickLosses, "loss")}</td>
      <td class="score-cell">${scorePill(totals.russActionWins, "win")}</td>
      <td class="score-cell">${scorePill(totals.russActionLosses, "loss")}</td>
      <td class="score-cell">${scorePill(totals.kennyActionWins, "win")}</td>
      <td class="score-cell">${scorePill(totals.kennyActionLosses, "loss")}</td>
    </tr>
  `;
}

function bindGameInputs() {
  const rowControls = Array.from(elements.gamesBody.querySelectorAll("input"));

  rowControls.forEach((control, index) => {
    control.dataset.tabIndex = String(index);
    control.addEventListener("keydown", handleGameGridTabbing);

    if (control.tagName === "INPUT") {
      control.addEventListener("input", (event) => {
        const gameId = event.target.dataset.gameId;
        const field = event.target.dataset.field;
        updateGame(gameId, field, event.target.value, false);
      });

      control.addEventListener("blur", (event) => {
        const gameId = event.target.dataset.gameId;
        const field = event.target.dataset.field;
        updateGame(gameId, field, event.target.value, true);
      });
      return;
    }

  });
}

function handleGameGridTabbing(event) {
  if (event.key !== "Tab") {
    return;
  }

  const controls = Array.from(elements.gamesBody.querySelectorAll("input"));
  const currentIndex = Number(event.target.dataset.tabIndex);
  const targetIndex = currentIndex + (event.shiftKey ? -1 : 1);
  const nextControl = controls[targetIndex];

  if (!nextControl) {
    return;
  }

  event.preventDefault();

  if (event.target.tagName === "INPUT") {
    updateGame(
      event.target.dataset.gameId,
      event.target.dataset.field,
      event.target.value,
      true,
    );
  }

  window.setTimeout(() => {
    const refreshedControls = Array.from(elements.gamesBody.querySelectorAll("input"));
    const refreshedTarget = refreshedControls[targetIndex];

    if (!refreshedTarget) {
      return;
    }

    refreshedTarget.focus();

    if (refreshedTarget.tagName === "INPUT" && typeof refreshedTarget.select === "function") {
      refreshedTarget.select();
    }
  }, 0);
}

function summarizeWeek(week) {
  return week.games.reduce(
    (totals, game) => {
      totals.russPickWins += parsePointValue(game.russPickWinner);
      totals.russPickLosses += parsePointValue(game.russPickLoser);
      totals.kennyPickWins += parsePointValue(game.kennyPickWinner);
      totals.kennyPickLosses += parsePointValue(game.kennyPickLoser);
      totals.russActionWins += parsePointValue(game.russActionWin);
      totals.russActionLosses += parsePointValue(game.russActionLoss);
      totals.kennyActionWins += parsePointValue(game.kennyActionWin);
      totals.kennyActionLosses += parsePointValue(game.kennyActionLoss);
      return totals;
    },
    {
      russPickWins: 0,
      russPickLosses: 0,
      kennyPickWins: 0,
      kennyPickLosses: 0,
      russActionWins: 0,
      russActionLosses: 0,
      kennyActionWins: 0,
      kennyActionLosses: 0,
    },
  );
}

function textInput(value, gameId, field) {
  const classNames = [];
  let maxLength = "";

  if (field === "matchup") {
    classNames.push("game-text-input");
    maxLength = ' maxlength="25"';
  }

  if (
    field === "russPick" ||
    field === "kennyPick" ||
    field === "russPickWinner" ||
    field === "russPickLoser" ||
    field === "kennyPickWinner" ||
    field === "kennyPickLoser" ||
    field === "russActionWin" ||
    field === "russActionLoss" ||
    field === "kennyActionWin" ||
    field === "kennyActionLoss"
  ) {
    classNames.push("compact-score-input");
  }

  if (field === "russAction" || field === "kennyAction") {
    classNames.push("action-text-input");
    maxLength = ' maxlength="40"';
  }

  const classAttribute = classNames.length ? ` class="${classNames.join(" ")}"` : "";
  return `<input${classAttribute} type="text" value="${escapeAttribute(value)}"${maxLength} data-game-id="${gameId}" data-field="${field}">`;
}

function scorePill(value, type) {
  return `<span class="score-pill ${type}">${value}</span>`;
}

function updateSelectedWeek(field, value, shouldCommit = true) {
  const week = getSelectedWeek();
  week[field] = value;
  if (shouldCommit) {
    commit();
  }
}

function updateGame(gameId, field, value, shouldCommit = true) {
  const game = getSelectedWeek().games.find((entry) => entry.id === gameId);
  game[field] = value;
  if (shouldCommit) {
    commit();
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ytspickem-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.weeks) || imported.weeks.length === 0) {
        throw new Error("Invalid data");
      }
      state = imported;
      normalizeWeekNames();
      if (!state.selectedWeekId || !findWeek(state.selectedWeekId)) {
        state.selectedWeekId = state.weeks[0].id;
      }
      commit();
    } catch (error) {
      window.alert("That file could not be imported.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function commit() {
  normalizeWeekNames();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const initialState = defaultState();
    initialState.selectedWeekId = initialState.weeks[0].id;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
    return initialState;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.weeks) || parsed.weeks.length === 0) {
      throw new Error("Bad data");
    }
    return parsed;
  } catch (error) {
    const fallback = defaultState();
    fallback.selectedWeekId = fallback.weeks[0].id;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

function getSelectedWeek() {
  return findWeek(state.selectedWeekId);
}

function findWeek(id) {
  return state.weeks.find((week) => week.id === id);
}

function getNextWeekNumber() {
  return state.weeks.length;
}

function normalizeWeekNames() {
  state.weeks.forEach((week, index) => {
    week.name = `Week ${index}`;
  });
}

function normalize(value) {
  return value.trim().toLowerCase();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value ?? "");
}

function parsePointValue(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return 0;
  }

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : 0;
}
