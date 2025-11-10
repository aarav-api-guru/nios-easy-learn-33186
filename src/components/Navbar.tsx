import { Link } from 'react-router-dom';
import { BookOpen, Home } from 'lucide-react';
import { Button } from './ui/button';

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity">
            <BookOpen className="h-6 w-6" />
            <span>NIOS Class 10</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/math">Mathematics</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/science">Science</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
