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

// Taken from https://stackoverflow.com/a/8943487
const urlRegex =
  /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;

function linkify(text) {
  return text.replace(urlRegex, function (url) {
    return '<a href="' + url + '" target="_blank">' + url + "</a>";
  });
}

export function renderText(text) {
  const content = linkify(text).replace(/(?:\r\n|\r|\n)/g, "<br>") + "<br>";
  return stringToHTML(content, true);
}
