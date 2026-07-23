import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ThemeToggle from "./components/ThemeToggle";
import SearchPage from "./pages/SearchPage";
import NewPage from "./pages/NewPage";
import RisersPage from "./pages/RisersPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <div className="flex flex-col">
          <Sidebar />
          <div className="p-4">
            <ThemeToggle />
          </div>
        </div>
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/new" element={<NewPage />} />
            <Route path="/risers" element={<RisersPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
