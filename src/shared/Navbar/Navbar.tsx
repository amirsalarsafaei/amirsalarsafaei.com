import React, { useState } from 'react';
import styled from 'styled-components';

interface NavItem {
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'CV', path: '/cv.pdf' },
  { label: 'Blogs', path: '/blogs' },
  { label: 'Contact', path: '/contact' },
];

const NavbarContainer = styled.nav`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #333333ed;
  color: white;
  z-index: 10000000000000;
`;

const Name = styled.h1`
  margin: 0;
  font-size: 1.5rem;
`;

const NavLinks = styled.ul<{ $isOpen: boolean }>`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;

  @media (max-width: 768px) {
    flex-direction: column;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: #333333ed;
    display: ${({ $isOpen }) => ($isOpen ? 'flex' : 'none')};
    padding: 1rem 0;
    font-size: 0.9rem;
  }
`;

const NavItem = styled.li`
  margin-left: 1rem;

  @media (max-width: 768px) {
    margin: 0.5rem 0.5rem;
    font-size: 1.3rem;
  }
`;

const NavLink = styled.a`
  color: white;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const HamburgerIcon = styled.div`
  display: none;
  flex-direction: column;
  cursor: pointer;

  @media (max-width: 768px) {
    display: flex;
  }

  span {
    height: 2px;
    width: 25px;
    background: white;
    margin-bottom: 4px;
    border-radius: 5px;
  }
`;

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <NavbarContainer>
      <Name>AmirSalar Safaei;</Name>
      <HamburgerIcon onClick={toggleMenu}>
        <span></span>
        <span></span>
        <span></span>
      </HamburgerIcon>
      <NavLinks $isOpen={isOpen}>
        {navItems.map((item) => (
          <NavItem key={item.path}>
            <NavLink href={item.path} onClick={() => setIsOpen(false)}>{`<${item.label}/>`}</NavLink>
          </NavItem>
        ))}
      </NavLinks>
    </NavbarContainer>
  );
};

export default Navbar;
