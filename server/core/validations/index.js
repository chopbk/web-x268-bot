const { ValidationError } = require("../utils/error-handler");

const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validate params
      if (schema.params) {
        validateObject(req.params, schema.params, "params");
      }

      // Validate query
      if (schema.query) {
        validateObject(req.query, schema.query, "query");
      }

      // Validate body
      if (schema.body) {
        validateObject(req.body, schema.body, "body");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

const validateObject = (data, schema, location) => {
  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key];

    // Check required
    if (rules.required) {
      // Nếu required là function thì gọi function đó
      const isRequired =
        typeof rules.required === "function"
          ? rules.required(data)
          : rules.required;

      if (
        isRequired &&
        (value === undefined || value === null || value === "")
      ) {
        throw new ValidationError(`Thiếu thông tin ${key} trong ${location}`);
      }
      if (!isRequired) continue;
    }

    if (value !== undefined && value !== null) {
      // Check type
      if (rules.type && typeof value !== rules.type) {
        throw new ValidationError(
          `Giá trị ${key} phải là ${rules.type} trong ${location}`
        );
      }

      // Check enum
      if (rules.enum && !rules.enum.includes(value)) {
        throw new ValidationError(
          `Giá trị ${key} phải là một trong các giá trị: ${rules.enum.join(
            ", "
          )} trong ${location}`
        );
      }

      // Check min/max for numbers
      if (rules.type === "number") {
        if (rules.min !== undefined && value < rules.min) {
          throw new ValidationError(
            `Giá trị ${key} phải lớn hơn hoặc bằng ${rules.min} trong ${location}`
          );
        }
        if (rules.max !== undefined && value > rules.max) {
          throw new ValidationError(
            `Giá trị ${key} phải nhỏ hơn hoặc bằng ${rules.max} trong ${location}`
          );
        }
      }

      // Check validate function
      if (rules.validate && typeof rules.validate === "function") {
        const isValid = rules.validate(value, data);
        if (!isValid) {
          throw new ValidationError(
            `Giá trị ${key} không hợp lệ trong ${location}`
          );
        }
      }
    }
  }
};

module.exports = {
  validate,
};
