import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import UserSelector from "./components/UserSelector";
import NotesList from "./components/NotesList";
import NoteDetail from "./components/NoteDetail";
import CreateNote from "./components/CreateNote";
import "./App.css";

const App = () => {
  return (
    <UserProvider>
      <Router>
        <Navbar /> {/* 🔥 Added Navbar */}
        <div className="App">
          <div className="glass-container">
            <Routes>
              <Route path="/" element={<UserSelector />} />
              <Route path="/create-note" element={<CreateNote />} />
              <Route path="/notes" element={<NotesList />} />
              <Route path="/note/:noteID" element={<NoteDetail />} />
            </Routes>
          </div>
        </div>
        <Footer /> {/* 🔥 Added Footer */}
      </Router>
    </UserProvider>
  );
};

export default App;
