import { Link } from 'react-router-dom';
import './Button.css';

/**
 * Bouton arrondi réutilisable.
 * Peut rendre un <Link> React Router (si prop "to"), un <a> (si prop "href") ou un <button>.
 */
export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger'
  size = 'md',         // 'sm' | 'md' | 'lg'
  to,
  href,
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  ...rest
}) {
  const classes = `btn btn--${variant} btn--${size} ${className}`.trim();

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}

