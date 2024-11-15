import { renderText } from "./dom.js";
import { NoteStore } from "./store.js";
import "./components.js";

const Notes = new NoteStore("jenot-app");

const newNote = document.querySelector("#new-note");

Notes.addEventListener("save", render.bind(this));

render();

newNote.addEventListener("addNote", (e) => {
  Notes.add(e.detail);
  Notes.saveStorage();
});

function render() {
  const notes = Notes.all();
  console.log(notes)
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
  });
}
