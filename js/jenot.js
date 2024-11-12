import { renderText } from "./components.js";
import { NoteStore } from "./store.js";

const Notes = new NoteStore("jenot-app");

Notes.addEventListener("save", render.bind(this));

Notes.reset();

Notes.add({
  type: "note",
  content: "This is a test note",
});

Notes.add({
  type: "tasklist",
  content: [
    { checked: false, content: "First item" },
    { checked: true, content: "Second item" },
    { checked: false, content: "Third item" },
  ],
});

Notes.saveStorage();

function render() {
  const notes = Notes.all();
  const notesContainer = document.querySelector("#notes");
  notesContainer.textContent = "";

  notes.forEach((note) => {
    const container = document.createElement("div");
    container.id = note.id;
    container.classList.add("note");
    container.classList.add("readonly");

    if (note.type === "note") {
      container.innerHTML = renderText(note.content);
    } else if (note.type === "tasklist") {
      const list = document.createElement("ul");

      note.content.forEach((task) => {
        const item = document.createElement("li");
        const check = document.createElement("p");
        check.textContent = task.checked ? "☑" : "☐";
        item.appendChild(check);
        const itemContent = document.createElement("p");
        itemContent.innerHTML = renderText(task.content);
        item.appendChild(itemContent);
        list.append(item);
      });

      container.appendChild(list);
    }

    notesContainer.appendChild(container);
  });
}
