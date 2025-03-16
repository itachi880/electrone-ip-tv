export const findLastIndex = (array, condition, default_return = -1) => {
  for (let i = array.length - 1; i >= 0; i--) {
    if (condition(array[i])) {
      return i;
    }
  }
  return default_return; // If no such element is found
};
