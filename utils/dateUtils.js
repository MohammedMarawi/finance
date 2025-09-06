function resolveDateRange(period, customFrom, customTo) {
  const now = new Date();
  let start = null;
  let end = null;

  if (customFrom || customTo) {
    start = customFrom ? new Date(customFrom) : null;
    end = customTo ? new Date(customTo) : null;
    return { start, end };
  }

  switch (period) {
    case "daily": {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    }
    case "weekly": {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
      break;
    }
    case "monthly":
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    }
  }
  return { start, end };
}

module.exports = { resolveDateRange };
  