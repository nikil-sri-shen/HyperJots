import React from "react";

const Footer = () => {
  return (
    <footer className="w-full bg-gray-900 text-gray-400 text-center py-4 mt-6 fixed bottom-0 left-0">
      <p>© {new Date().getFullYear()} Nikil Sri Shen R. All rights reserved.</p>
    </footer>
  );
};

export default Footer;
