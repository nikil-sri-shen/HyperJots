import React from "react";
import { useUserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

const NotesList = () => {
  const { notes, loading, error } = useUserContext();
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black p-10">
      <h2 className="text-center text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
        Notes
      </h2>

      {loading ? (
        <p className="text-center text-blue-400 mt-4">Loading...</p>
      ) : error ? (
        <p className="text-center text-red-400 mt-4">{error}</p>
      ) : notes.length === 0 ? (
        <p className="text-center text-gray-300 mt-4">No notes available</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {notes.map((note) => (
            <div
              key={note.noteID}
              className="p-6 bg-white/10 backdrop-blur-lg shadow-xl rounded-2xl border border-white/20 hover:scale-105 transition-transform duration-300 cursor-pointer"
              onClick={() => navigate(`/note/${note.noteID}`)} // Navigate to note detail page
            >
              <h3 className="text-xl font-semibold text-white">{note.title}</h3>
              <p className="text-gray-300 mt-2">
                {note.content.length > 100
                  ? `${note.content.substring(0, 200)}...`
                  : note.content}
              </p>
              <button
                className="mt-3 bg-purple-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-600 active:scale-95 transition"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent navigation on button click
                  navigate(`/note/${note.noteID}`);
                }}
              >
                Read More
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 🔥 Create New Note Button (Navigates to Create Page) */}
      <div className="mt-6 text-center">
        <button
          className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-xl hover:bg-blue-600 active:scale-95 transition"
          onClick={() => navigate("/create-note")}
        >
          Create New Note
        </button>
      </div>
    </div>
  );
};

export default NotesList;
