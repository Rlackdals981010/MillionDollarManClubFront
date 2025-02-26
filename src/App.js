import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Home from "./components/Home"


const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} /> {/* 로그인 페이지 */}
        <Route path="/home" element={<Home />} /> {/* 메인 페이지 */}
      </Routes>
    </Router>
  );
};

export default App;