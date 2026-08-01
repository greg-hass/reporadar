import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import MobileNav from "./components/MobileNav";
import SearchPage from "./pages/SearchPage";
import NewPage from "./pages/NewPage";
import RisersPage from "./pages/RisersPage";
import FavouritesPage from "./pages/FavouritesPage";
import RepoDetailPage from "./pages/RepoDetailPage";
import { ToastProvider } from "./components/Toast";
import ComparePage from "./pages/ComparePage";
import CompareBar from "./components/CompareBar";
import { CompareProvider } from "./hooks/useCompare";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CompareProvider>
          <div className="min-h-screen lg:flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1 px-4 pt-5 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-6 md:pt-6 md:pb-10 lg:px-10 lg:pt-8">
                <Routes>
                  <Route path="/" element={<RisersPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/new" element={<NewPage />} />
                  <Route path="/risers" element={<Navigate to="/" replace />} />
                  <Route path="/favourites" element={<FavouritesPage />} />
                  <Route path="/compare" element={<ComparePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/repo/:owner/:name" element={<RepoDetailPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
            <MobileNav />
            <CompareBar />
          </div>
        </CompareProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
