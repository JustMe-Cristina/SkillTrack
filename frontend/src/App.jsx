import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import Autentificare from "./pages/Autentificare";
import PanouPrincipal from "./pages/PanouPrincipal";
import AnalizaJob from "./pages/AnalizaJob";
import JoburiUrmarite from "./pages/JoburiUrmarite";
import CompetenteleMele from "./pages/CompetenteleMele";
import PlanuriDeDezvoltare from "./pages/PlanuriDeDezvoltare";
import Analytics from "./pages/Analytics";
import ProfilulMeu from "./pages/ProfilulMeu";
import DetaliiJobUrmarit from "./pages/DetaliiJobUrmarit";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/autentificare" element={<Autentificare />} />

        <Route
          path="/panou"
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
          path="/joburi-urmarite"
          element={
            <ProtectedRoute>
              <JoburiUrmarite />
            </ProtectedRoute>
          }
        />

        <Route
          path="/joburi-urmarite/:jobId"
          element={
            <ProtectedRoute>
              <DetaliiJobUrmarit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competentele-mele"
          element={
            <ProtectedRoute>
              <CompetenteleMele />
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

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profilul-meu"
          element={
            <ProtectedRoute>
              <ProfilulMeu />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/panou" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
