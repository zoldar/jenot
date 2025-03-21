import "./service-worker-init.js";
import { renderText } from "./dom.js";
import { SyncedNoteStore } from "./synced-store.js";
import {
  notificationsAvailable,
  authorizeNotifications,
  notificationsEnabled,
  sendNotification,
} from "./notifications.js";
import "./components.js";
import { reminderLabel } from "./reminders.js";

async function resetApp() {
  await window.navigator.serviceWorker
    .getRegistration()
    .then((r) => r.unregister());
  await caches
    .keys()
    .then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  window.location.reload();
}

document.querySelector("#reset-app").addEventListener("click", resetApp);

const URL_PARAMS = new URLSearchParams(window.location.search);

// Cookie presence determines login state
const isLoggedIn = !!document.cookie
  .split("; ")
  .find((row) => row.startsWith("jenot_pub="));

// Notes storage configuration.
// The storage is a combination of IndexedDB + network sync.
// Network sync is only enabled is user is logged in.
const endpoint = isLoggedIn ? "/" : null;
const Notes = new SyncedNoteStore("jenot-app", endpoint);
await Notes.init();

// Reset metadata to force full sync
if (URL_PARAMS.has("reset-meta")) {
  history.replaceState(
    null,
    "",
    location.href.replace("&reset-meta", "").replace("?reset-meta", ""),
  );
  await Notes.setMeta({ lastSync: null });
}

// Very rudimentary periodic sync. It will be refactored into a more real-time
// solution using either websocket or long-polling, so that server can notify about
// new data to sync.
const sync = async () => {
  await Notes.sync();
  Notes.saveStorage();
};

if (isLoggedIn) {
  setInterval(sync, 5000);
}

// New account provisioning and login/logout actions

const newAccountForm = document.querySelector("#new-account-form");
const loginLink = document.querySelector("#login-link");
const logoutForm = document.querySelector("#logout-form");

if (!isLoggedIn) {
  loginLink.classList.remove("hidden");
  newAccountForm.classList.remove("hidden");
} else {
  logoutForm.classList.remove("hidden");
}

// Notifications API test - to be reused for push notifications later on

if (notificationsAvailable()) {
  document.querySelector("#notifications-pane").classList.remove("hidden");
  const notificationsButton = document.querySelector("#enable-notifications");
  const notificationsTestButton = document.querySelector("#test-notifications");

  if (!notificationsEnabled()) {
    notificationsButton.classList.remove("hidden");
    notificationsButton.addEventListener("click", () => {
      authorizeNotifications(() => notificationsButton.classList.add("hidden"));
    });
  }

  notificationsTestButton.addEventListener("click", () => {
    setTimeout(() => {
      sendNotification("reminder", "This is a test reminder!");
    }, 8000);
  });
}

// Search

let filter = "";
const search = document.querySelector("#search");

search.addEventListener("input", (e) => {
  filter = e.target.value.trim().toLowerCase();
  Notes.saveStorage();
});

function filterNotes(notes) {
  if (filter !== "") {
    return notes.filter(
      (n) =>
        n.title.toLowerCase().indexOf(filter) > -1 ||
        textOf(n.content).toLowerCase().indexOf(filter) > -1,
    );
  }

  return notes;
}

function textOf(content) {
  if (typeof content === "object") {
    return content.map((n) => n.content).join("");
  } else {
    return content;
  }
}

// There are two note-form component instances - one for
// composing new notes and another one for editing existing notes.

const newNote = document.querySelector("#new-note");
const editNote = document.querySelector("#edit-note");
const editNoteDialog = document.querySelector("#edit-note-dialog");

// Load draft into new note
newNote.load(structuredClone(await Notes.getDraft()));

// Each save event originating from storage triggers a re-render
// of notes list.
Notes.addEventListener("save", render.bind(this));

// Initial notes render and initial sync.
render();
if (isLoggedIn) {
  sync();
}

// note-form component specific event handlers
newNote.addEventListener("addNote", async (e) => {
  await Notes.add(e.detail);
  await Notes.clearDraft();
  Notes.saveStorage();
});

newNote.addEventListener("updateDraft", async (e) => {
  await Notes.setDraft(e.detail);
});

newNote.addEventListener("deleteNote", async (e) => {
  await Notes.clearDraft();
});

editNote.addEventListener("updateNoteInProgress", async (e) => {
  const note = e.detail;
  note.updated = Date.now();
  await Notes.update(note, true);
});

editNote.addEventListener("updateNote", async (e) => {
  await Notes.update(e.detail);
  Notes.saveStorage();
  closeModal(editNoteDialog);
});

editNote.addEventListener("deleteNote", async (e) => {
  await Notes.remove(e.detail);
  Notes.saveStorage();
  closeModal(editNoteDialog);
});

// The notes rendering routine is optimized to replace only
// nodes that actually changed.

let currentNotes = {};

function notesEqual(note1, note2) {
  return note1.id === note2.id && note1.updated === note2.updated;
}

async function render() {
  const allNotes = await Notes.all();
  const notes = filterNotes(allNotes);
  const notesContainer = document.querySelector("#notes");

  let previousId = null;
  let notePrecedence = {};
  const ids = [];

  notes.forEach((n) => {
    notePrecedence[n.id] = previousId;
    ids.push(n.id);
    previousId = n.id;
  });

  Object.keys(currentNotes)
    .filter((id) => !ids.includes(id))
    .forEach((id) => {
      delete currentNotes[id];
      document.getElementById(id).remove();
    });

  notes.forEach((note) => {
    const existingNote = currentNotes[note.id];

    if (!existingNote) {
      const noteElement = renderNote(note);
      const beforeId = notePrecedence[note.id];

      if (!beforeId) {
        notesContainer.prepend(noteElement);
      } else {
        const before = document.getElementById(beforeId);
        if (before) {
          before.after(noteElement);
        } else {
          notesContainer.prepend(noteElement);
        }
      }
    } else if (!notesEqual(existingNote, note)) {
      const noteElement = renderNote(note);
      const existing = document.getElementById(note.id);
      existing.replaceWith(noteElement);
    }
  });

  currentNotes = {};
  notes.forEach((n) => (currentNotes[n.id] = structuredClone(n)));
}

function openModal(modal) {
  document.body.style.top = `-${window.scrollY}px`;
  document.body.style.position = "fixed";

  modal.showModal();
}

function closeModal(modal) {
  modal.close();

  const scrollY = document.body.style.top;
  document.body.style.position = "";
  document.body.style.top = "";
  window.scrollTo(0, parseInt(scrollY || "0") * -1);
}

function renderNote(note) {
  const container = document.createElement("div");
  container.id = note.id;
  container.classList.add("note");
  container.classList.add("readonly");

  if (note.title && note.title !== "") {
    const title = document.createElement("p");
    title.classList.add("title");
    title.replaceChildren(...renderText(note.title));
    container.appendChild(title);
  }

  if (note.type === "note") {
    const body = document.createElement("p");
    body.classList.add("body");
    body.replaceChildren(...renderText(note.content));
    container.appendChild(body);
  } else if (note.type === "tasklist") {
    const list = document.createElement("ul");
    list.classList.add("body");

    note.content.forEach((task) => {
      const item = document.createElement("li");
      if (task.checked) {
        item.classList.add("checked");
      }
      const check = document.createElement("p");
      check.classList.add("checkbox");
      check.textContent = task.checked ? "☑" : "☐";
      item.appendChild(check);
      const itemContent = document.createElement("p");
      itemContent.classList.add("content");
      itemContent.replaceChildren(...renderText(task.content));
      item.appendChild(itemContent);
      list.append(item);
    });

    container.appendChild(list);
  }

  if (note.reminder?.enabled) {
    const labelText = reminderLabel(note.reminder);
    const reminderBadge = document.createElement("span");
    reminderBadge.classList.add("reminder-label");
    reminderBadge.textContent = `⏲ ${labelText}`;
    container.appendChild(reminderBadge);
  }

  container.addEventListener("click", async (e) => {
    if (e.target.tagName !== "A") {
      const note = await Notes.get(container.id);
      editNote.load(structuredClone(note));
      openModal(editNoteDialog);
    }
  });

  return container;
}
