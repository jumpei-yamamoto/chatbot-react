// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import UserChat from "./UserChat";
import AdminChat from "./AdminChat";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AdminChat />} />
        <Route path="/" element={<UserChat />} />
      </Routes>
    </Router>
  );
};

export default App;
