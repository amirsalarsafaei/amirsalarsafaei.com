import React from 'react';
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

const NavLinks = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
`;

const NavItem = styled.li`
  margin-left: 1rem;
`;

const NavLink = styled.a`
  color: white;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const Navbar: React.FC = () => {
  return (
    <NavbarContainer>
      <Name>AmirSalar Safaei;</Name>
      <NavLinks>
        {navItems.map((item) => (
          <NavItem key={item.path}>
            <NavLink href={item.path}>{`<${item.label}/>`}</NavLink>
          </NavItem>
        ))}
      </NavLinks>
    </NavbarContainer>
  );
};

export default Navbar;
