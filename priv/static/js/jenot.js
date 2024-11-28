import "./service-worker-init.js";
import { renderText } from "./dom.js";
import { LocalNoteStore } from "./local-store.js";
import { SyncedNoteStore } from "./synced-store.js";
import {
  authorizeNotifications,
  notificationsEnabled,
  sendNotification,
} from "./notifications.js";
import "./components.js";

const URL_PARAMS = new URLSearchParams(window.location.search);

// Notes storage configuration.
// Currently supports either simple, local storage based implementation
// and a more elaborate one, using a combination of IndexedDB + network sync.
const Notes = URL_PARAMS.has("localStorage")
  ? new LocalNoteStore("jenot-app")
  : new SyncedNoteStore("jenot-app", "notes", "/");

// Very rudimentary periodic sync. It will be refactored into a more real-time
// solution using either websocket of long-polling, so that server can notify about
// new data to sync.
const sync = async () => {
  await Notes.sync();
  Notes.saveStorage();
};

setInterval(sync, 5000);

// Notifications API test - to be reused for push notifications later on

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

// There are two note-form component instances - one for
// composing new notes and another one for editing existing notes.

const newNote = document.querySelector("#new-note");
const editNote = document.querySelector("#edit-note");

// Each save event originating from storage triggers a re-render
// of notes list.
Notes.addEventListener("save", render.bind(this));

// Initial notes render and initial sync.
render();
sync();

// note-form component specific event handlers
newNote.addEventListener("addNote", async (e) => {
  await Notes.add(e.detail);
  Notes.saveStorage();
});

editNote.addEventListener("updateNote", async (e) => {
  newNote.classList.remove("hidden");
  editNote.classList.add("hidden");
  await Notes.update(e.detail);
  Notes.saveStorage();
});

editNote.addEventListener("deleteNote", async (e) => {
  newNote.classList.remove("hidden");
  editNote.classList.add("hidden");
  await Notes.remove(e.detail);
  Notes.saveStorage();
});

// All notes are currently re-rendered on each storage
// update. The routine will be optimized to replace only
// nodes that actually changed - most likely based on unique
// note IDs associated with block elements.

async function render() {
  const notes = await Notes.all();
  const notesContainer = document.querySelector("#notes");
  notesContainer.replaceChildren();

  notes.forEach((note) => {
    const container = document.createElement("div");
    container.id = note.id;
    container.classList.add("note");
    container.classList.add("readonly");

    if (note.type === "note") {
      container.replaceChildren(...renderText(note.content));
    } else if (note.type === "tasklist") {
      const list = document.createElement("ul");

      note.content.forEach((task) => {
        const item = document.createElement("li");
        const check = document.createElement("p");
        check.textContent = task.checked ? "☑" : "☐";
        item.appendChild(check);
        const itemContent = document.createElement("p");
        itemContent.replaceChildren(...renderText(task.content));
        item.appendChild(itemContent);
        list.append(item);
      });

      container.appendChild(list);
    }

    notesContainer.appendChild(container);

    container.addEventListener("click", async (e) => {
      newNote.classList.add("hidden");
      editNote.classList.remove("hidden");
      const note = await Notes.get(container.id);
      editNote.load(note);
    });
  });
}
