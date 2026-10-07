import { ChartColumn, ListChecks, User } from 'lucide-react';
import { motion } from 'motion/react';
import { NavLink } from 'react-router';

const ITEMS = [
  { to: '/', label: 'Abitudini', Icon: ListChecks, end: true },
  { to: '/stats', label: 'Statistiche', Icon: ChartColumn, end: false },
  { to: '/profile', label: 'Profilo', Icon: User, end: false },
];

export function Navbar() {
  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-[480px] grid-cols-3">
        {ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                `relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute top-0 h-0.5 w-10 rounded-full bg-accent"
                    />
                  )}
                  <Icon size={24} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                  <span aria-hidden>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
