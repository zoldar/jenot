export function stringToHTML(str, allChildren) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(str, "text/html");

  if (allChildren) {
    return Array.from(doc.body.childNodes);
  } else {
    return doc.body.firstChild;
  }
}

export function html(strings, ...values) {
  return stringToHTML(String.raw({ raw: strings }));
}

export function renderText(text) {
  const content = text.replace(/(?:\r\n|\r|\n)/g, "<br>") + "<br>";
  return stringToHTML(content, true);
}
