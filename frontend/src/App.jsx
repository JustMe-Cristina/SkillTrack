import { Routes, Route, Navigate } from "react-router-dom";

import RutaProtejata from "./components/RutaProtejata";
import LandingPage from "./pages/LandingPage";
import Autentificare from "./pages/Autentificare";
import PanouPrincipal from "./pages/PanouPrincipal";
import AnalizaJob from "./pages/AnalizaJob";
import JoburiUrmarite from "./pages/JoburiUrmarite";
import CompetenteleMele from "./pages/CompetenteleMele";
import PlanuriDeDezvoltare from "./pages/PlanuriDeDezvoltare";
import Analytics from "./pages/Analytics";
import ProfilulMeu from "./pages/ProfilulMeu";
import DetaliiJobUrmarit from "./pages/DetaliiJobUrmarit";
import VerificareEmail from "./pages/VerificareEmail";
import AiUitatParola from "./pages/AiUitatParola";
import ResetareParola from "./pages/ResetareParola";


function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/autentificare" element={<Autentificare />} />
      <Route path="/verificare-email" element={<VerificareEmail />} />
      <Route path="/ai-uitat-parola" element={<AiUitatParola />} />
      <Route path="/resetare-parola/:token" element={<ResetareParola />} />

      <Route
        path="/panou"
        element={
          <RutaProtejata>
            <PanouPrincipal />
          </RutaProtejata>
        }
      />

      <Route
        path="/analiza"
        element={
          <RutaProtejata>
            <AnalizaJob />
          </RutaProtejata>
        }
      />

      <Route
        path="/joburi-urmarite"
        element={
          <RutaProtejata>
            <JoburiUrmarite />
          </RutaProtejata>
        }
      />

      <Route
        path="/joburi-urmarite/:jobId"
        element={
          <RutaProtejata>
            <DetaliiJobUrmarit />
          </RutaProtejata>
        }
      />

      <Route
        path="/competentele-mele"
        element={
          <RutaProtejata>
            <CompetenteleMele />
          </RutaProtejata>
        }
      />

      <Route
        path="/roadmaps"
        element={
          <RutaProtejata>
            <PlanuriDeDezvoltare />
          </RutaProtejata>
        }
      />

      <Route
        path="/analytics"
        element={
          <RutaProtejata>
            <Analytics />
          </RutaProtejata>
        }
      />

      <Route
        path="/profilul-meu"
        element={
          <RutaProtejata>
            <ProfilulMeu />
          </RutaProtejata>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;