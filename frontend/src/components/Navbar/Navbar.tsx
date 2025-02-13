'use client';

import React, { useState } from 'react';
import Link from 'next/link';

import './Navbar.scss';

interface NavItem {
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Resume', path: '/resume' },
  { label: 'Blogs', path: '/blogs' },
  { label: 'Contact', path: '/contact' },
  { label: 'Github', path: 'https://github.com/amirsalarsafaei'}
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="navbar">
      <Link href="/" className="brand-link">
        <h1 className="navbar-brand">AmirSalar Safaei;</h1>
      </Link>
      <div className="navbar-hamburger" onClick={toggleMenu}>
        <span></span>
        <span></span>
        <span></span>
      </div>
      <ul className={`navbar-nav ${isOpen ? 'nav-open' : ''}`}>
        {navItems.map((item) => (
          <li key={item.path} className="nav-item">
            {item.path.startsWith('http') ? (
              <a 
                href={item.path}
                className="nav-link"
                target="_blank"
                rel="noopener noreferrer"
              >{item.label}</a>
            ) : (
              <Link 
                href={item.path} 
                className="nav-link"
                onClick={() => setIsOpen(false)}
              >{item.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
