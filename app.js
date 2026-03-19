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
    actualWinner: overrides.actualWinner ?? "",
    actualLoser: overrides.actualLoser ?? "",
    russPickWinner: overrides.russPickWinner ?? "",
    russPickLoser: overrides.russPickLoser ?? "",
    kennyPickWinner: overrides.kennyPickWinner ?? "",
    kennyPickLoser: overrides.kennyPickLoser ?? "",
    russAction: overrides.russAction ?? "",
    russActionResult: overrides.russActionResult ?? "",
    kennyAction: overrides.kennyAction ?? "",
    kennyActionResult: overrides.kennyActionResult ?? "",
  };
}

let state = loadState();

const elements = {
  weekList: document.getElementById("week-list"),
  weekTitleDisplay: document.getElementById("week-title-display"),
  weekSubtitle: document.getElementById("week-subtitle"),
  weekNameInput: document.getElementById("week-name-input"),
  seasonInput: document.getElementById("season-input"),
  weekNotesInput: document.getElementById("week-notes-input"),
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

  elements.seasonInput.addEventListener("input", (event) => {
    updateSelectedWeek("season", event.target.value, false);
  });

  elements.seasonInput.addEventListener("blur", (event) => {
    updateSelectedWeek("season", event.target.value, true);
  });

  elements.weekNotesInput.addEventListener("input", (event) => {
    updateSelectedWeek("notes", event.target.value, false);
  });

  elements.weekNotesInput.addEventListener("blur", (event) => {
    updateSelectedWeek("notes", event.target.value, true);
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

  elements.weekNameInput.value = week.name;
  elements.seasonInput.value = week.season;
  elements.weekNotesInput.value = week.notes;
}

function renderGames() {
  const week = getSelectedWeek();
  elements.gamesBody.innerHTML = "";

  if (!week || week.games.length === 0) {
    elements.gamesBody.innerHTML = `<tr><td colspan="18" class="empty-state">No games yet. Add the matchups you want for this week.</td></tr>`;
    return;
  }

  week.games.forEach((game) => {
    const row = document.createElement("tr");
    const russPick = calculatePickScore(game.russPickWinner, game.russPickLoser, game.actualWinner, game.actualLoser);
    const kennyPick = calculatePickScore(game.kennyPickWinner, game.kennyPickLoser, game.actualWinner, game.actualLoser);
    const russAction = calculateActionScore(game.russAction, game.russActionResult);
    const kennyAction = calculateActionScore(game.kennyAction, game.kennyActionResult);

    row.innerHTML = `
      <td>${textInput(game.matchup, "Game", game.id, "matchup")}</td>
      <td>${textInput(game.actualWinner, "Winner", game.id, "actualWinner")}</td>
      <td>${textInput(game.actualLoser, "Loser", game.id, "actualLoser")}</td>
      <td>${textInput(game.russPickWinner, "Russ winner pick", game.id, "russPickWinner")}</td>
      <td>${textInput(game.russPickLoser, "Russ loser pick", game.id, "russPickLoser")}</td>
      <td class="score-cell">${scorePill(russPick.win, "win")}</td>
      <td class="score-cell">${scorePill(russPick.loss, "loss")}</td>
      <td>${textInput(game.kennyPickWinner, "Kenny winner pick", game.id, "kennyPickWinner")}</td>
      <td>${textInput(game.kennyPickLoser, "Kenny loser pick", game.id, "kennyPickLoser")}</td>
      <td class="score-cell">${scorePill(kennyPick.win, "win")}</td>
      <td class="score-cell">${scorePill(kennyPick.loss, "loss")}</td>
      <td>${textInput(game.russAction, "Russ betting action", game.id, "russAction")}</td>
      <td class="score-cell">${actionSelect(game.id, "russActionResult", game.russActionResult, "win")}</td>
      <td class="score-cell">${actionSelect(game.id, "russActionResult", game.russActionResult, "loss")}</td>
      <td>${textInput(game.kennyAction, "Kenny betting action", game.id, "kennyAction")}</td>
      <td class="score-cell">${actionSelect(game.id, "kennyActionResult", game.kennyActionResult, "win")}</td>
      <td class="score-cell">${actionSelect(game.id, "kennyActionResult", game.kennyActionResult, "loss")}</td>
      <td></td>
    `;

    elements.gamesBody.appendChild(row);
  });

  bindGameInputs();
}

function renderScoreboard() {
  const week = getSelectedWeek();
  if (!week) return;
  const totals = summarizeWeek(week);

  const cards = [
    { title: "Russ Pick Points", value: totals.russPickWins, detail: `${totals.russPickLosses} wrong` },
    { title: "Russ Action Points", value: totals.russActionWins, detail: `${totals.russActionLosses} wrong` },
    { title: "Kenny Pick Points", value: totals.kennyPickWins, detail: `${totals.kennyPickLosses} wrong` },
    { title: "Kenny Action Points", value: totals.kennyActionWins, detail: `${totals.kennyActionLosses} wrong` },
  ];

  elements.scoreboard.innerHTML = cards
    .map(
      (card) => `
        <article class="score-card">
          <h3>${card.title}</h3>
          <div class="score-number">${card.value}</div>
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
      <td colspan="5">Totals</td>
      <td class="score-cell">${scorePill(totals.russPickWins, "win")}</td>
      <td class="score-cell">${scorePill(totals.russPickLosses, "loss")}</td>
      <td colspan="2"></td>
      <td class="score-cell">${scorePill(totals.kennyPickWins, "win")}</td>
      <td class="score-cell">${scorePill(totals.kennyPickLosses, "loss")}</td>
      <td></td>
      <td class="score-cell">${scorePill(totals.russActionWins, "win")}</td>
      <td class="score-cell">${scorePill(totals.russActionLosses, "loss")}</td>
      <td></td>
      <td class="score-cell">${scorePill(totals.kennyActionWins, "win")}</td>
      <td class="score-cell">${scorePill(totals.kennyActionLosses, "loss")}</td>
      <td></td>
    </tr>
  `;
}

function bindGameInputs() {
  elements.gamesBody.querySelectorAll("input, textarea").forEach((input) => {
    if (input.tagName === "TEXTAREA") {
      autoResizeTextarea(input);
    }

    input.addEventListener("input", (event) => {
      const gameId = event.target.dataset.gameId;
      const field = event.target.dataset.field;
      updateGame(gameId, field, event.target.value, false);
      if (event.target.tagName === "TEXTAREA") {
        autoResizeTextarea(event.target);
      }
    });

    input.addEventListener("blur", (event) => {
      const gameId = event.target.dataset.gameId;
      const field = event.target.dataset.field;
      updateGame(gameId, field, event.target.value, true);
    });
  });

  elements.gamesBody.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const gameId = event.target.dataset.gameId;
      const field = event.target.dataset.field;
      const point = event.target.dataset.point;
      updateActionResult(gameId, field, event.target.value === point ? point : "");
    });
  });
}

function summarizeWeek(week) {
  return week.games.reduce(
    (totals, game) => {
      const russPick = calculatePickScore(game.russPickWinner, game.russPickLoser, game.actualWinner, game.actualLoser);
      const kennyPick = calculatePickScore(game.kennyPickWinner, game.kennyPickLoser, game.actualWinner, game.actualLoser);
      const russAction = calculateActionScore(game.russAction, game.russActionResult);
      const kennyAction = calculateActionScore(game.kennyAction, game.kennyActionResult);

      totals.russPickWins += russPick.win;
      totals.russPickLosses += russPick.loss;
      totals.kennyPickWins += kennyPick.win;
      totals.kennyPickLosses += kennyPick.loss;
      totals.russActionWins += russAction.win;
      totals.russActionLosses += russAction.loss;
      totals.kennyActionWins += kennyAction.win;
      totals.kennyActionLosses += kennyAction.loss;
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

function calculatePickScore(pickWinner, pickLoser, actualWinner, actualLoser) {
  if (!pickWinner.trim() || !pickLoser.trim() || !actualWinner.trim() || !actualLoser.trim()) {
    return { win: 0, loss: 0 };
  }

  const isRight =
    normalize(pickWinner) === normalize(actualWinner) &&
    normalize(pickLoser) === normalize(actualLoser);

  return {
    win: isRight ? 1 : 0,
    loss: isRight ? 0 : 1,
  };
}

function calculateActionScore(action, result) {
  if (!action.trim()) {
    return { win: 0, loss: 0 };
  }

  return {
    win: result === "win" ? 1 : 0,
    loss: result === "loss" ? 1 : 0,
  };
}

function actionSelect(gameId, field, currentValue, pointType) {
  const selected = currentValue === pointType ? "selected" : "";
  return `
    <select class="action-select" data-game-id="${gameId}" data-field="${field}" data-point="${pointType}" aria-label="${pointType}">
      <option value="">0</option>
      <option value="${pointType}" ${selected}>1</option>
    </select>
  `;
}

function textInput(value, placeholder, gameId, field) {
  if (field === "matchup") {
    return `<textarea class="game-textarea" rows="2" placeholder="${placeholder}" data-game-id="${gameId}" data-field="${field}">${escapeHtml(value)}</textarea>`;
  }

  return `<input type="text" value="${escapeAttribute(value)}" placeholder="${placeholder}" data-game-id="${gameId}" data-field="${field}">`;
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

function updateActionResult(gameId, field, value) {
  const game = getSelectedWeek().games.find((entry) => entry.id === gameId);
  game[field] = value;
  commit();
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

function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}
