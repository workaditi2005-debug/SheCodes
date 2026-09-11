import { useState } from "react";

// ── Simple form state hook ───────────────
export function useFormState(initial = {}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});

  const set = (field, value) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const reset = () => {
    setValues(initial);
    setErrors({});
  };

  const validate = (rules) => {
    const errs = {};
    Object.entries(rules).forEach(([field, fn]) => {
      const msg = fn(values[field]);
      if (msg) errs[field] = msg;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  return { values, errors, set, reset, validate };
}
