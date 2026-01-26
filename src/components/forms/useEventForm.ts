import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react';
import { normalizeEventValues, type EventFormErrors, type EventFormValues } from '../../utils/formValidators';

const serialize = (values: EventFormValues) => JSON.stringify(normalizeEventValues(values));

type UseEventFormOptions = {
  initialValues: EventFormValues;
  onSubmit: (values: EventFormValues) => void;
  validate: (values: EventFormValues) => EventFormErrors;
};

export const useEventForm = ({ initialValues, onSubmit, validate }: UseEventFormOptions) => {
  const [values, setValues] = useState<EventFormValues>(initialValues);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const baselineRef = useRef<string>(serialize(initialValues));

  const setFieldValue = useCallback(<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetForm = useCallback((nextValues: EventFormValues) => {
    setValues(nextValues);
    setErrors({});
    baselineRef.current = serialize(nextValues);
  }, []);

  const handleSubmit = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const validationErrors = validate(values);
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length === 0) {
        onSubmit(values);
      }
    },
    [onSubmit, validate, values],
  );

  const hasChanges = useMemo(() => serialize(values) !== baselineRef.current, [values]);

  return {
    values,
    errors,
    setFieldValue,
    resetForm,
    handleSubmit,
    hasChanges,
  };
};
