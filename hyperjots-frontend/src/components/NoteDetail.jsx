import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserContext } from "../context/UserContext";

const NoteDetail = () => {
  const { noteID } = useParams();
  const { notes, updateNote, selectedOrg } = useUserContext();
  const navigate = useNavigate();

  const note = notes.find((n) => n.noteID.toString() === noteID);
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!note) {
      navigate("/");
    }
  }, [note, navigate]);

  const handleUpdate = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Note title and content cannot be empty.");
      return;
    }

    await updateNote(note.noteID, title, content, selectedOrg);
    setIsEditing(false);
  };

  if (!note)
    return <p className="text-center text-red-400 mt-4">Note not found.</p>;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black p-10">
      <button
        className="bg-gray-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition mb-4"
        onClick={() => navigate("/notes")}
      >
        Back to Notes
      </button>

      <div className="p-6 bg-white/10 backdrop-blur-lg shadow-xl rounded-2xl border border-white/20 max-w-2xl mx-auto">
        {isEditing ? (
          <>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 rounded-lg bg-black/30 text-white border border-white/20 focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full mt-3 p-3 rounded-lg bg-black/30 text-white border border-white/20 focus:ring-2 focus:ring-blue-500"
              rows={Math.max(8, content.split("\n").length)}
              cols={Math.max(100, content.split("\n").length)}
            />
            <div className="flex justify-between mt-4">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                onClick={handleUpdate}
              >
                Save
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="text-gray-300 mt-4">{content}</p>
            <button
              className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
              onClick={() => setIsEditing(true)}
            >
              Edit Note
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default NoteDetail;
