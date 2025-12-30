import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import ManuscriptWorkspace from "@/pages/ManuscriptWorkspace";
import WorkflowWorkspace from "@/pages/WorkflowWorkspace";
import ToneStyleWorkspace from "@/pages/ToneStyleWorkspace";
import ArtStudio from "@/pages/ArtStudio";
import MarketIntelligence from "@/pages/MarketIntelligence";
import Settings from "@/pages/Settings";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="manuscript/:projectId?" element={<ManuscriptWorkspace />} />
            <Route path="workflow/:projectId?" element={<WorkflowWorkspace />} />
            <Route path="tone/:projectId?" element={<ToneStyleWorkspace />} />
            <Route path="art/:projectId?" element={<ArtStudio />} />
            <Route path="market" element={<MarketIntelligence />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
