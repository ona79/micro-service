import './FormField.css';

/**
 * Champ de formulaire réutilisable (input, select ou textarea) avec label et aide.
 */
export default function FormField({
  id,
  label,
  type = 'text', // 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea'
  value,
  onChange,
  options = [],
  placeholder = '',
  required = false,
  min,
  max,
  helpText,
}) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-field__label">
        {label} {required && <span className="form-field__required">*</span>}
      </label>

      {type === 'select' ? (
        <select
          id={id}
          className="form-field__control"
          value={value}
          onChange={onChange}
          required={required}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          className="form-field__control form-field__control--textarea"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={4}
        />
      ) : (
        <input
          id={id}
          type={type}
          className="form-field__control"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
        />
      )}

      {helpText && <span className="form-field__help">{helpText}</span>}
    </div>
  );
}

