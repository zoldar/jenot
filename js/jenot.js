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
    this.displayElement.innerHTML = render(this.inputElement.value);
    this.inputElement.style.height = this.displayElement.scrollHeight + "px";
    this.inputElement.style.width = this.displayElement.scrollWidth + "px";
  }
}

function render(text) {
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

    this.#updateChecked();
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
  constructor() {
    super();
  }

  connectedCallback() {
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
  }
}

customElements.define("task-list", TaskList);
