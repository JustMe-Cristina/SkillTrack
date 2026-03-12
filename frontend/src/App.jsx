import { BrowserRouter, Routes, Route } from "react-router-dom";

import Autentificare from "./pages/Autentificare";
import AnalizaJob from "./pages/AnalizaJob";
import CompetenteleMele from "./pages/CompetenteleMele";
import JoburiUrmărite from "./pages/JoburiUrmarite";
import PlanuriDeDezvoltare from "./pages/PlanuriDeDezvoltare";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Autentificare />} />
        <Route path="/analiza" element={<AnalizaJob />} />
        <Route path="/competente" element={<CompetenteleMele />} />
        <Route path="/joburi" element={<JoburiUrmărite />} />
        <Route path="/roadmaps" element={<PlanuriDeDezvoltare />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;