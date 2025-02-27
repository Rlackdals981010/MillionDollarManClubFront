import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Home from "./components/Home"
import Revenue from "./components/RevenueLog"
import Seed from "./components/SeedLog"

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} /> {/* 로그인 페이지 */}
        <Route path="/home" element={<Home />} /> {/* 메인 페이지 */}
        <Route path="/revenue" element={<Revenue />} /> {/* 수익 로그 페이지 */}
        <Route path="/seed" element={<Seed />} /> {/* 시드 로그 페이지 */}
      </Routes>
    </Router>
  );
};

export default App;