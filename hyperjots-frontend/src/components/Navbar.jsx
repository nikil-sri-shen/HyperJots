import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="w-full bg-gray-900 text-white p-4 shadow-md py-4 px-6 fixed top-0 left-0 z-50">
      <div className="container mx-auto flex justify-between items-center max-w-7xl">
        <div>
          <h1 className="text-xl font-bold">
            <Link to="/">🚀 HyperJots Notes</Link>
          </h1>
          <p className="text-sm font-bold">Powered by HyperLedger Fabric</p>
        </div>

        <div className="space-x-6">
          <Link to="/" className="hover:text-blue-400 transition">
            Home
          </Link>
          <Link to="/notes" className="hover:text-blue-400 transition">
            Notes
          </Link>
          <Link
            to="/create-note"
            className="bg-blue-500 px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition"
          >
            + Create Note
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
