import { renderText, html } from "./dom.js";
import { reminderLabel } from "./reminders.js";

// reminder-picker component

class ReminderPicker extends HTMLElement {
  constructor() {
    super();
    this.reminder = this.#new();
  }

  connectedCallback() {
    this.dateInput = this.querySelector(".date");
    this.timeInput = this.querySelector(".time");
    this.repeatInput = this.querySelector(".repeat");
    this.clearButton = this.querySelector(".clear");

    const that = this;

    this.dateInput.addEventListener("change", () => {
      that.reminder.date = that.dateInput.value;

      this.#emitUpdate();
    });

    this.timeInput.addEventListener("change", () => {
      that.reminder.time = that.timeInput.value;

      this.#emitUpdate();
    });

    this.repeatInput.addEventListener("change", () => {
      that.reminder.unit = that.repeatInput.value;

      this.#emitUpdate();
    });

    this.clearButton.addEventListener("click", () => {
      this.reminder = this.#new();
      this.reminder.enabled = false;
      this.#updateUI();
      this.#emitUpdate();
    });

    this.#updateUI();
  }

  enableDefault() {
    this.reminder = this.#new();
    this.reminder.enabled = true;
    this.#updateUI();
    this.#emitUpdate();
  }

  set value(reminder) {
    this.reminder = reminder || this.#new();
    this.#updateUI();
  }

  get value() {
    return this.reminder;
  }

  get label() {
    return reminderLabel(this.reminder);
  }

  #updateUI() {
    this.dateInput.value = this.reminder.date;
    this.timeInput.value = this.reminder.time;
    this.repeatInput.value = this.reminder.unit;
  }

  #new() {
    const now = new Date().toISOString();
    const [date, rest] = now.split("T");
    const fullTime = rest.split(".")[0];
    const [hour, minute, _minute] = fullTime.split(":");

    return {
      enabled: false,
      count: 1,
      date: date,
      time: `${hour}:${minute}`,
      unit: "",
    };
  }

  #emitUpdate() {
    if (this.reminder.date && this.reminder.time) {
      this.dispatchEvent(new Event("reminderUpdate", { bubbles: true }));
    }
  }
}

customElements.define("reminder-picker", ReminderPicker);

// editable-area component

class EditableArea extends HTMLElement {
  static observedAttributes = ["readonly"];

  constructor() {
    super();
  }

  connectedCallback() {
    const text = this.textContent;
    this.displayElement = document.createElement("p");
    this.displayElement.classList.add("display");
    this.inputElement = document.createElement("textarea");
    this.inputElement.value = text;

    this.replaceChildren(this.displayElement, this.inputElement);

    this.inputElement.addEventListener("input", (e) => {
      this.dispatchEvent(new Event("contentChange", { bubbles: true }));
      this.#sync();
    });

    new ResizeObserver(() => {
      this.inputElement.style.height = this.displayElement.scrollHeight + "px";
      this.inputElement.style.width = this.displayElement.scrollWidth + "px";
    }).observe(this.displayElement);

    this.#updateReadonly();
    this.#sync();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "readonly") {
      this.#updateReadonly();
    }
  }

  get value() {
    return this.inputElement.value;
  }

  set value(text) {
    this.inputElement.value = text;
    this.#sync();
  }

  focusStart() {
    this.inputElement.focus();
    this.inputElement.selectionEnd = 0;
  }

  focusEnd() {
    this.inputElement.focus();
    this.inputElement.selectionStart = this.inputElement.value.length;
  }

  cutTextAfterCursor() {
    const cursorPos = this.inputElement.selectionStart;
    const text = this.inputElement.value;
    this.inputElement.value = text.slice(0, cursorPos);

    this.#sync();
    return text.slice(cursorPos);
  }

  append(text) {
    const cursorStartPos = this.inputElement.selectionStart;
    const cursorEndPos = this.inputElement.selectionEnd;
    this.inputElement.value += text;
    this.inputElement.selectionStart = cursorStartPos;
    this.inputElement.selectionEnd = cursorEndPos;
    this.#sync();
  }

  cursorAtStart() {
    return this.inputElement.selectionEnd === 0;
  }

  cursorAtEnd() {
    return this.inputElement.selectionStart === this.inputElement.value.length;
  }

  #updateReadonly() {
    if (this.inputElement) {
      const readonly = ["", "true"].includes(this.attributes.readonly?.value);
      this.inputElement.disabled = readonly;
    }
  }

  #sync() {
    this.displayElement.replaceChildren(...renderText(this.inputElement.value));
  }
}

customElements.define("editable-area", EditableArea);

// task-list-item component

class TaskListItem extends HTMLElement {
  static observedAttributes = ["checked"];

  constructor() {
    super();
  }

  connectedCallback() {
    const text = this.textContent;
    this.textContent = "";

    const template = document.querySelector("#task-list-item").content;

    Array.from(template.children).forEach((child) => {
      this.appendChild(child.cloneNode(true));
    });

    this.taskList = this.closest("task-list");
    this.handleElement = this.querySelector(".handle");
    this.checkboxElement = this.querySelector(".checkbox input");
    this.contentElement = this.querySelector("editable-area");
    this.contentElement.value = text;
    this.removeButton = this.querySelector(".remove button");

    this.handleElement.addEventListener("click", (e) => e.preventDefault());

    this.removeButton.addEventListener("click", (e) => {
      this.dispatchEvent(new Event("removeTaskWithButton", { bubbles: true }));
      e.preventDefault();
    });

    this.contentElement.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && this.contentElement.cursorAtStart()) {
        this.dispatchEvent(
          new CustomEvent("removeTask", {
            bubbles: true,
            detail: this.contentElement.cutTextAfterCursor(),
          }),
        );
        e.preventDefault();
      } else if (e.key === "Enter") {
        const textAfterCursor = this.contentElement.cutTextAfterCursor();
        this.dispatchEvent(
          new CustomEvent("addTask", {
            bubbles: true,
            detail: textAfterCursor,
          }),
        );
        e.preventDefault();
      } else if (e.key === "ArrowUp" && this.contentElement.cursorAtStart()) {
        this.dispatchEvent(new Event("moveToPrevTask", { bubbles: true }));
        e.preventDefault();
      } else if (e.key === "ArrowDown" && this.contentElement.cursorAtEnd()) {
        this.dispatchEvent(new Event("moveToNextTask", { bubbles: true }));
        e.preventDefault();
      }
    });

    this.checkboxElement.addEventListener("change", () =>
      this.dispatchEvent(new Event("contentChange", { bubbles: true })),
    );

    // drag and drop events

    this.handleElement.addEventListener("mousedown", () => {
      this.parentNode.setAttribute("draggable", "true");
    });

    this.parentNode.addEventListener("dragstart", (e) => {
      const isHandle = e.explicitOriginalTarget.closest
        ? e.explicitOriginalTarget.closest(".handle")
        : e.explicitOriginalTarget.parentNode.closest(".handle");

      if (isHandle) {
        this.parentNode.classList.add("dragging");
      } else {
        e.preventDefault();
      }
    });

    this.parentNode.addEventListener("dragend", () => {
      this.parentNode.setAttribute("draggable", "false");
      this.parentNode.classList.remove("dragging");
      this.dispatchEvent(new Event("contentChange", { bubbles: true }));
    });

    this.parentNode.addEventListener("touchstart", (e) => {
      if (e.target.closest("div").classList.contains("handle")) {
        this.parentNode.classList.add("dragging");
        this.taskList.dragActiveElement = this.parentNode;
        if (!this.taskList.dragPlaceholder) {
          this.taskList.dragPlaceholder = document.createElement("div");
          this.taskList.dragPlaceholder.classList.add("drag-placeholder");
          this.taskList.dragPlaceholder.textContent = ">";
        }

        e.preventDefault();
      }
    });

    const taskListUL = this.taskList.querySelector("ul");

    this.parentNode.addEventListener("touchmove", (e) => {
      if (this.taskList.dragActiveElement) {
        const touch = e.touches[0];
        this.parentNode.style.position = "absolute";
        this.parentNode.style.left = `${touch.clientX}px`;
        this.parentNode.style.top = `${touch.clientY}px`;
        this.parentNode.style.width = "240px";

        if (this.taskList.dragPlaceholder) {
          const afterElement = getDragAfterElement(taskListUL, touch.clientY);
          if (afterElement) {
            taskListUL.insertBefore(
              this.taskList.dragPlaceholder,
              afterElement,
            );
          } else {
            taskListUL.appendChild(this.taskList.dragPlaceholder);
          }
        }
        e.preventDefault();
      }
    });

    this.parentNode.addEventListener("touchend", () => {
      if (this.taskList.dragActiveElement) {
        this.parentNode.classList.remove("dragging");
        if (
          this.taskList.dragActiveElement &&
          this.taskList.dragPlaceholder &&
          this.taskList.dragPlaceholder.parentNode
        ) {
          this.taskList.dragPlaceholder.parentNode.insertBefore(
            this.taskList.dragActiveElement,
            this.taskList.dragPlaceholder,
          );
          this.taskList.dragPlaceholder.remove();
          this.taskList.dragActiveElement.style.position = "static";
          this.taskList.dragActiveElement.style.left = "";
          this.taskList.dragActiveElement.style.top = "";
          this.taskList.dragActiveElement.style.width = "";
        }
        this.taskList.dragActiveElement = null;
        this.taskList.dragPlaceholder = null;
      }
    });

    this.#updateChecked();
    this.dispatchEvent(new Event("contentChange", { bubbles: true }));
  }

  disconnectedCallback() {
    this.textContent = this.contentElement.value;
    this.setAttribute("checked", this.checkboxElement.checked);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "checked") {
      this.#updateChecked();
    }
  }

  append(text) {
    this.contentElement.append(text);
  }

  get value() {
    return {
      content: this.contentElement.value,
      checked: !!this.checkboxElement.checked,
    };
  }

  set value(item) {
    this.checkboxElement.checked = item.checked;
    this.contentElement.value = item.content;
  }

  focusStart() {
    this.contentElement.focusStart();
  }

  focusEnd() {
    this.contentElement.focusEnd();
  }

  #updateChecked() {
    if (this.checkboxElement) {
      const checked = ["", "true"].includes(this.attributes.checked?.value);
      this.checkboxElement.checked = checked;
    }
  }
}

customElements.define("task-list-item", TaskListItem);

// task-list component

class TaskList extends HTMLElement {
  dragPlaceholder = null;
  dragActiveElement = null;

  constructor() {
    super();
  }

  connectedCallback() {
    this.listElement = this.querySelector("ul");

    this.addEventListener("removeTaskWithButton", (e) => {
      const tasksCount = this.querySelectorAll("task-list-item").length;

      if (tasksCount === 1) {
        const newLI = document.createElement("li");
        const newItem = document.createElement("task-list-item");
        newLI.appendChild(newItem);
        this.querySelector("ul").appendChild(newLI);
        newItem.focusStart();
      }

      const currentLI = e.target.parentNode;
      currentLI.remove();

      this.dispatchEvent(new Event("contentChange", { bubbles: true }));
    });

    this.addEventListener("removeTask", (e) => {
      const textToAppend = e.detail || "";
      const currentLI = e.target.parentNode;
      const previousItem =
        currentLI.previousElementSibling?.querySelector("task-list-item");

      if (previousItem) {
        previousItem.focusEnd();
        previousItem.append(textToAppend);
        currentLI.remove();
        this.dispatchEvent(new Event("contentChange", { bubbles: true }));
      }
    });

    this.addEventListener("addTask", (e) => {
      const text = e.detail || "";
      const currentLI = e.target.parentNode;

      const newLI = document.createElement("li");
      const newItem = document.createElement("task-list-item");
      newItem.textContent = text;
      newLI.appendChild(newItem);
      currentLI.after(newLI);
      newItem.focusStart();
      this.dispatchEvent(new Event("contentChange", { bubbles: true }));
    });

    this.addEventListener("moveToNextTask", (e) => {
      const currentLI = e.target.parentNode;
      const nextItem =
        currentLI.nextElementSibling?.querySelector("task-list-item");

      if (nextItem) {
        nextItem.focusStart();
      }
    });

    this.addEventListener("moveToPrevTask", (e) => {
      const currentLI = e.target.parentNode;
      const prevItem =
        currentLI.previousElementSibling?.querySelector("task-list-item");

      if (prevItem) {
        prevItem.focusEnd();
      }
    });

    // drag and drop
    this.listElement.addEventListener("dragover", (e) => {
      e.preventDefault();

      const afterElement = getDragAfterElement(this.listElement, e.clientY);
      const draggable = document.querySelector(".dragging");

      if (afterElement == null) {
        this.listElement.appendChild(draggable);
      } else {
        this.listElement.insertBefore(draggable, afterElement);
      }
    });
  }

  get value() {
    return Array.from(this.querySelectorAll("task-list-item")).map(
      (item) => item.value,
    );
  }

  set value(tasks) {
    this.listElement.replaceChildren();

    tasks.forEach((task) => {
      const item = html`
        <li><task-list-item></task-list-itm></li>
        `;
      this.listElement.appendChild(item);
      item.querySelector("task-list-item").value = task;
    });

    this.dispatchEvent(new Event("contentChange", { bubbles: true }));
  }
}

function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll("li:not(.dragging)"),
  ];

  return draggableElements.reduce(
    (closest, containerChild) => {
      const box = containerChild.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: containerChild };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY },
  ).element;
}

customElements.define("task-list", TaskList);

// note-form component

function convertToTaskList(note) {
  return note.split("\n").map((line) => {
    return { checked: false, content: line };
  });
}

function convertToNote(tasks) {
  const lines = tasks.map((task) => task.content);
  return lines.join("\n");
}

const contentMap = {
  note_string: (s) => s,
  note_object: convertToNote,
  tasklist_object: (s) => s,
  tasklist_string: convertToTaskList,
};

class NoteForm extends HTMLElement {
  constructor() {
    super();

    this.note = {
      type: "note",
      content: "",
      reminder: null,
    };
  }

  connectedCallback() {
    this.mode = this.attributes.mode.value;
    this.content = this.querySelector(".content");
    this.tasklistModeButton = this.querySelector(".tasklist-mode");
    this.noteModeButton = this.querySelector(".note-mode");
    this.removeButton = this.querySelector(".remove");
    this.addButton = this.querySelector(".add");
    this.saveButton = this.querySelector(".save");
    this.reminderButton = this.querySelector(".reminder");
    this.reminderButtonLabel = this.querySelector(".reminder span");
    this.reminderPicker = this.querySelector("reminder-picker");

    this.addEventListener("click", (e) => {
      const textareaInside = e.target.querySelector("textarea");
      if (textareaInside) {
        textareaInside.focus();
        return true;
      }

      if (
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLButtonElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
        this.content.querySelector("textarea")?.focus();
      }

      return true;
    });

    this.tasklistModeButton.addEventListener("click", (e) => {
      e.preventDefault();
      this.#setNote("type", "tasklist");
      this.#updateUI();
    });

    this.noteModeButton.addEventListener("click", (e) => {
      e.preventDefault();
      this.#setNote("type", "note");
      this.#updateUI();
    });

    this.removeButton.addEventListener("click", (e) => {
      e.preventDefault();
      this.dispatchEvent(
        new CustomEvent("deleteNote", {
          bubbles: true,
          detail: this.note,
        }),
      );
      this.#reset();
    });

    this.reminderButton.addEventListener("click", (e) => {
      e.preventDefault();
      this.reminderPicker.classList.toggle("hidden");
      // reset and enable the reminder when first clicking the
      // reminder button and there's either no reminder set yet
      // or it's disabled
      if (
        !this.note.reminder?.enabled &&
        !this.reminderPicker.classList.contains("hidden")
      ) {
        this.reminderPicker.enableDefault();
      }
    });

    this.addEventListener("reminderUpdate", () => {
      this.#setNote("reminder", this.reminderPicker.value);
      this.#updateUI();
    });

    if (this.mode === "add") {
      this.addButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.dispatchEvent(
          new CustomEvent("addNote", {
            bubbles: true,
            detail: this.note,
          }),
        );
        this.#reset();
      });
    } else {
      this.saveButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.dispatchEvent(
          new CustomEvent("updateNote", {
            bubbles: true,
            detail: this.note,
          }),
        );
        this.#reset();
      });
    }

    this.addEventListener("contentChange", () => {
      this.#setNote("content", this.content.firstChild.value);
    });

    this.#updateUI();
    this.#setContent();
  }

  load(note) {
    this.note = note;
    this.reminderPicker.value = note.reminder;
    this.#updateUI();
    this.#setContent();
  }

  #reset() {
    this.note = {
      type: "note",
      content: "",
      reminder: null,
    };

    this.reminderPicker.value = null;

    this.#updateUI();
    this.#setContent();
  }

  #setNote(field, value) {
    this.note[field] = value;

    if (field === "type") {
      this.#setContent();
    }

    if (this.mode === "add") {
      this.dispatchEvent(
        new CustomEvent("updateDraft", {
          bubbles: true,
          detail: this.note,
        }),
      );
    } else {
      this.dispatchEvent(
        new CustomEvent("updateNoteInProgress", {
          bubbles: true,
          detail: this.note,
        }),
      );
    }
  }

  #updateUI() {
    if (this.note.reminder?.enabled) {
      this.reminderButtonLabel.textContent = reminderLabel(this.note.reminder);
    } else {
      this.reminderPicker.classList.add("hidden");
      this.reminderButtonLabel.textContent = "";
    }
    if (this.note.type === "note") {
      this.tasklistModeButton.classList.remove("hidden");
      this.noteModeButton.classList.add("hidden");
    } else {
      this.tasklistModeButton.classList.add("hidden");
      this.noteModeButton.classList.remove("hidden");
    }
  }

  #setContent() {
    const contentFun =
      contentMap[`${this.note.type}_${typeof this.note.content}`];
    this.note.content = contentFun(this.note.content);

    if (this.note.type === "note") {
      const note = html`<editable-area></editable-area>`;
      this.content.replaceChildren(note);
      note.value = this.note.content;
    } else {
      const taskList = html`<task-list><ul></ul></task-list>`;
      this.content.replaceChildren(taskList);
      taskList.value = this.note.content;
    }
  }
}

customElements.define("note-form", NoteForm);
