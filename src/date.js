export function todayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return {
    label: formatDate(start),
    since: start.toISOString(),
    until: end.toISOString()
  };
}

export function recentRange(days = 7) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - Math.max(days - 1, 0));
  start.setHours(0, 0, 0, 0);

  return {
    label: formatDate(now),
    since: start.toISOString(),
    until: now.toISOString()
  };
}

export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
