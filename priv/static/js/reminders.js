export function reminderLabel(reminder) {
  if (reminder.enabled) {
    const date = new Date(`${reminder.date}T${reminder.time}:00`);
    const day = date.getDate();
    const month = date.toLocaleString("en", { month: "short" });
    return `${day} ${month} ${reminder.time}`;
  }

  return "";
}
