import React, { useState } from "react";
import { useUserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

const UserSelector = () => {
  const { setSelectedOrg } = useUserContext();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleOrgChange = async (e) => {
    const org = e.target.value;

    if (!org) return;

    try {
      setIsLoading(true);
      setError(null);

      setSelectedOrg(org);
      navigate("/notes");
    } catch (err) {
      setError("Failed to process your request. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="p-8 bg-white/10 backdrop-blur-lg shadow-2xl rounded-2xl border border-white/20 text-center w-96">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          Select Organization
        </h2>

        <select
          onChange={handleOrgChange}
          defaultValue=""
          className="mt-6 w-full p-3 rounded-lg bg-black/30 text-white border border-white/20 focus:ring-2 focus:ring-blue-500 transition-all"
        >
          <option value="" disabled className="text-gray-300">
            Choose an organization
          </option>
          <option value="org1" className="bg-gray-800">
            Org 1
          </option>
          <option value="org2" className="bg-gray-800">
            Org 2
          </option>
        </select>

        {isLoading && (
          <div className="mt-4">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-blue-400 mt-2">Loading...</p>
          </div>
        )}

        {error && <p className="mt-4 text-red-400">{error}</p>}
      </div>
    </div>
  );
};

export default UserSelector;
