import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface LogoProps {
  goHome?: () => void;
  className?: string;
}

export const Logo = ({ goHome, className = '' }: LogoProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleClick = () => {
    if (goHome) {
      goHome();
    } else if (user) {
      navigate(user.role === 'recruiter' ? '/recruiter' : '/candidate');
    } else {
      navigate('/');
    }
  };

  return (
    <button
      type="button"
      className={`logo ${className}`.trim()}
      onClick={handleClick}
      aria-label="HireLens home"
    >
      Hire<span>Lens</span>
      <i aria-hidden="true" />
    </button>
  );
};
