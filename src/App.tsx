import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import MobileNav from "./components/MobileNav";
import { ToastProvider } from "./components/Toast";
import CompareBar from "./components/CompareBar";
import { CompareProvider } from "./hooks/useCompare";

const SearchPage = lazy(() => import("./pages/SearchPage"));
const NewPage = lazy(() => import("./pages/NewPage"));
const RisersPage = lazy(() => import("./pages/RisersPage"));
const FavouritesPage = lazy(() => import("./pages/FavouritesPage"));
const RepoDetailPage = lazy(() => import("./pages/RepoDetailPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

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
                <Suspense fallback={<div role="status" className="py-12 text-center text-muted">Loading page…</div>}>
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
                </Suspense>
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
