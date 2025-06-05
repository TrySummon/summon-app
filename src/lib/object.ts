export const recurseCountKeys = (obj: Record<string, unknown>): number =>
  Object.keys(obj).reduce((acc, curr) => {
    if (obj[curr] && typeof obj[curr] === "object")
      return ++acc + recurseCountKeys(obj[curr] as Record<string, unknown>);
    else return ++acc;
  }, 0);
