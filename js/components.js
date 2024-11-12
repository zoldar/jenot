
// editable-area component

class EditableArea extends HTMLElement {
  static observedAttributes = ["readonly"];

  constructor() {
    super();
  }

  connectedCallback() {
    const text = this.textContent;
    this.textContent = "";
    this.displayElement = document.createElement("p", { class: "display" });
    this.inputElement = document.createElement("textarea");
    this.inputElement.value = text;

    this.appendChild(this.displayElement);
    this.appendChild(this.inputElement);

    this.inputElement.addEventListener("input", () => this.#sync());

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
    this.displayElement.innerHTML = renderText(this.inputElement.value);
    this.inputElement.style.height = this.displayElement.scrollHeight + "px";
    this.inputElement.style.width = this.displayElement.scrollWidth + "px";
  }
}

export function renderText(text) {
  return text.replace(/(?:\r\n|\r|\n)/g, "<br>") + "<br>";
}

customElements.define("editable-area", EditableArea);

// task-list component

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

    // drag and drop events

    this.parentNode.addEventListener("dragstart", (e) => {
      this.parentNode.classList.add("dragging");
    });

    this.parentNode.addEventListener("dragend", () => {
      this.parentNode.classList.remove("dragging");
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
        newLI.setAttribute("draggable", "true");
        const newItem = document.createElement("task-list-item");
        newLI.appendChild(newItem);
        this.querySelector("ul").appendChild(newLI);
        newItem.focusStart();
      }

      const currentLI = e.target.parentNode;
      currentLI.remove();
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
      }
    });

    this.addEventListener("addTask", (e) => {
      const text = e.detail || "";
      const currentLI = e.target.parentNode;

      const newLI = document.createElement("li");
      newLI.setAttribute("draggable", "true");
      const newItem = document.createElement("task-list-item");
      newItem.textContent = text;
      newLI.appendChild(newItem);
      currentLI.after(newLI);
      newItem.focusStart();
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
