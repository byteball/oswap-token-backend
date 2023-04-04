const exists = (array) => {
  array.forEach((item) => {
    if (item === undefined) {
      throw Error("value is undefined");
    }
  });
};

const objectContains = (obj, keys = []) => {
  const fields = Object.keys(obj);
  const values = Object.values(obj);

  if (fields.length === keys.length) {
    keys.forEach((key) => {
      if (obj[key] === undefined) {
        throw Error("not valid object");
      }
    });
  } else {
    throw Error("Please enter all parameters");
  }

  return {
    fields,
    values,
    length: keys.length,
  };
};

exports.exists = exists;
exports.objectContains = objectContains;
