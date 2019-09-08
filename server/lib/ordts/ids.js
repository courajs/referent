export function eq(idA, idB) {
  return cmp(idA, idB) === 0;
}
export function lt(idA, idB) {
  return cmp(idA, idB) < 0;
}
export function lte(idA, idB) {
  return cmp(idA, idB) <= 0;
}
export function gt(idA, idB) {
  return cmp(idA, idB) > 0;
}
export function gte(idA, idB) {
  return cmp(idA, idB) >= 0;
}

export function cmp(idA, idB) {
  if (idA === null && idB == null) {
    return 0;
  } else if (idA === null) {
    return 1;
  } else if (idB === null) {
    return -1;
  }

  let diff = idA.lamport - idB.lamport;
  if (diff !== 0) {
    return diff;
  } else {
    if (idA.site > idB.site) {
      return 1;
    } else if (idA.site < idB.site) {
      return -1;
    } else {
      return 0;
    }
  }
}
