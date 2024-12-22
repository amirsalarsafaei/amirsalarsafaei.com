import React, { useState } from 'react';

import { Link } from 'react-router-dom';

import './Navbar.scss';

interface NavItem {
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'CV', path: '/cv' },
  { label: 'Blogs', path: '/blogs' },
  { label: 'Contact', path: '/contact' },
  { label: 'Github', path: 'https://github.com/amirsalarsafaei'}
];


const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand-link">
        <h1  className="navbar-brand">AmirSalar Safaei;</h1>
      </Link>
      <div className="navbar-hamburger" onClick={toggleMenu}>
        <span></span>
        <span></span>
        <span></span>
      </div>
      <ul className={`navbar-nav ${isOpen ? 'nav-open' : ''}`}>
        {navItems.map((item) => (
          <li key={item.path} className="nav-item">
            <Link 
              to={item.path} 
              className="nav-link"
              onClick={() => setIsOpen(false)}
            >{`<${item.label}/>`}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
