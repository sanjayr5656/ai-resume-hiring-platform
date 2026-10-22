interface FieldProps {
  label: string;
  placeholder?: string;
  type?: string;
  error?: string;
  hint?: string;
  value?: string;
  onChange?: (v: string) => void;
  required?: boolean;
  id?: string;
  disabled?: boolean;
  name?: string;
}

export const Field = ({
  label,
  placeholder,
  type = 'text',
  error,
  hint,
  value,
  onChange,
  required,
  id,
  disabled,
  name,
}: FieldProps) => (
  <label className={`field ${error ? 'field-error' : ''}`}>
    <span>
      {label}
      {required && <span aria-hidden="true"> *</span>}
    </span>
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      value={value ?? ''}
      disabled={disabled}
      required={required}
      onChange={(e) => onChange?.(e.target.value)}
      aria-invalid={!!error}
      aria-describedby={error ? `${label}-error` : hint ? `${label}-hint` : undefined}
    />
    {error ? (
      <small id={`${label}-error`} role="alert">
        {error}
      </small>
    ) : hint ? (
      <small id={`${label}-hint`}>{hint}</small>
    ) : null}
  </label>
);
