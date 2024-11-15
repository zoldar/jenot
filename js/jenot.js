import "./service-worker.js";
import { renderText } from "./dom.js";
import { NoteStore } from "./store.js";
import { DBNoteStore } from "./db-store.js";
import "./components.js";

const urlParams = new URLSearchParams(window.location.search);

const Notes = urlParams.has("localStorage")
  ? new NoteStore("jenot-app")
  : new DBNoteStore("jenot-app", "notes");

const newNote = document.querySelector("#new-note");
const editNote = document.querySelector("#edit-note");

Notes.addEventListener("save", render.bind(this));

render();

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
