import React, { useState } from "react";
import { useUserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

const CreateNote = () => {
  const { createNote, selectedOrg } = useUserContext();
  const navigate = useNavigate();
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      alert("Note title and content cannot be empty.");
      return;
    }

    try {
      await createNote(selectedOrg, newNoteTitle, newNoteContent);
      navigate("/notes"); // Redirect back to Notes page
    } catch (err) {
      alert("Failed to create note. Please try again.");
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black p-10 min-h-screen flex flex-col items-center justify-center">
      <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
        Create a New Note
      </h2>

      <div className="mt-6 p-6 bg-white/10 backdrop-blur-lg shadow-xl rounded-2xl border border-white/20 w-96">
        <input
          type="text"
          value={newNoteTitle}
          onChange={(e) => setNewNoteTitle(e.target.value)}
          className="w-full p-3 rounded-lg bg-black/30 text-white placeholder-gray-300 border border-white/20 focus:ring-2 focus:ring-blue-500"
          placeholder="Enter new note title"
        />
        <textarea
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          className="w-full mt-3 p-3 rounded-lg bg-black/30 text-white placeholder-gray-300 border border-white/20 focus:ring-2 focus:ring-blue-500 h-40"
          placeholder="Enter new note content"
        />
        <div className="flex justify-between mt-4">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-green-600 active:scale-95 transition"
            onClick={handleCreateNote}
          >
            Save Note
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-600 active:scale-95 transition"
            onClick={() => navigate("/notes")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateNote;
