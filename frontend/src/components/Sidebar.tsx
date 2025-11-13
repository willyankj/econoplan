'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiHome, FiTrendingUp, FiPlusCircle, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { IconType } from 'react-icons';

interface NavItemProps {
  icon: IconType;
  label: string;
  href: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, href }) => (
  <Link href={href}>
    <a className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md">
      <Icon className="w-5 h-5 mr-3" />
      <span className="font-medium">{label}</span>
    </a>
  </Link>
);

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-20 p-2 bg-white rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white shadow-xl z-10 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out w-64`}
      >
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-800">Econoplan</h1>
        </div>
        <nav className="mt-8">
          <ul className="space-y-2 px-4">
            <li>
              <NavItem icon={FiHome} label="Dashboard" href="/dashboard" />
            </li>
            <li>
              <NavItem icon={FiTrendingUp} label="Transações" href="/transactions" />
            </li>
          </ul>
        </nav>
        <div className="absolute bottom-0 w-full p-4">
          <NavItem icon={FiLogOut} label="Sair" href="/login" />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
