import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Autentificare from "./pages/Autentificare";
import PanouPrincipal from "./pages/PanouPrincipal";
import AnalizaJob from "./pages/AnalizaJob";
import CompetenteleMele from "./pages/CompetenteleMele";
import JoburiUrmarite from "./pages/JoburiUrmarite";
import PlanuriDeDezvoltare from "./pages/PlanuriDeDezvoltare";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Autentificare />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PanouPrincipal />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analiza"
          element={
            <ProtectedRoute>
              <AnalizaJob />
            </ProtectedRoute>
          }
        />

        <Route
          path="/competente"
          element={
            <ProtectedRoute>
              <CompetenteleMele />
            </ProtectedRoute>
          }
        />

        <Route
          path="/joburi"
          element={
            <ProtectedRoute>
              <JoburiUrmarite />
            </ProtectedRoute>
          }
        />

        <Route
          path="/roadmaps"
          element={
            <ProtectedRoute>
              <PlanuriDeDezvoltare />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;