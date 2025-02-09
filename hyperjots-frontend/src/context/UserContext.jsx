import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [selectedOrg, setSelectedOrg] = useState(
    localStorage.getItem("selectedOrg") || ""
  );
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch notes from API
  const fetchNotes = async (org) => {
    if (!org) return;
    setLoading(true);
    setError("");

    try {
      const { data } = await axios.get(
        `http://localhost:8080/api/getAllNotes?org=${org}`
      );
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to fetch notes. Please try again.");
      console.error("Fetch Notes Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new note
  const createNote = async (org, title, content) => {
    if (!org || !title.trim() || !content.trim()) return;
    setLoading(true);
    setError("");

    // Optimistic UI Update (Show new note immediately)
    const newNote = { noteID: Date.now(), title, content };
    setNotes((prevNotes) => [...prevNotes, newNote]);

    try {
      const { data } = await axios.post(
        `http://localhost:8080/api/createNote`,
        { org, title, content }
      );
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.noteID === newNote.noteID
            ? { ...note, noteID: data.noteID }
            : note
        )
      );
    } catch (err) {
      setError("Failed to create note.");
      console.error("Create Note Error:", err);
      setNotes((prevNotes) =>
        prevNotes.filter((note) => note.noteID !== newNote.noteID)
      ); // Revert optimistic update
    } finally {
      setLoading(false);
    }
  };

  // Update an existing note
  const updateNote = async (noteID, updatedTitle, updatedContent, org) => {
    if (!noteID || !updatedTitle.trim() || !updatedContent.trim()) return;
    setLoading(true);
    setError("");

    // Optimistic UI Update
    const prevNotes = [...notes];
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.noteID === noteID
          ? { ...note, title: updatedTitle, content: updatedContent }
          : note
      )
    );

    try {
      await axios.put(`http://localhost:8080/api/updateNote/${noteID}`, {
        org,
        title: updatedTitle,
        content: updatedContent,
      });
    } catch (err) {
      setError("Error updating note.");
      console.error("Update Note Error:", err);
      setNotes(prevNotes); // Revert optimistic update on error
    } finally {
      setLoading(false);
    }
  };

  // Sync selected organization with local storage & fetch notes
  useEffect(() => {
    if (selectedOrg) {
      localStorage.setItem("selectedOrg", selectedOrg);
      fetchNotes(selectedOrg);
    }
  }, [selectedOrg]);

  return (
    <UserContext.Provider
      value={{
        selectedOrg,
        setSelectedOrg,
        notes,
        loading,
        error,
        fetchNotes,
        createNote,
        updateNote,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
