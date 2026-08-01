import { useEffect, useState } from "react";
import { CheckIcon, Logo, XIcon } from "./icons";

interface DeferredInstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "reporadar-install-prompt-dismissed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<DeferredInstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY) === "true") return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    setIos(isIos);
    setVisible(isIos);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as DeferredInstallPrompt);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  return (
    <aside className="panel max-w-5xl mx-auto mb-4 relative flex items-start gap-3 p-3.5 sm:p-4 animate-fade-up" aria-label="Install RepoRadar">
      <Logo size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">Install RepoRadar</h2>
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success">
            Free
          </span>
        </div>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          {ios
            ? <>Add it to your iPhone Home Screen: tap <strong className="text-text">Share</strong>, then <strong className="text-text">Add to Home Screen</strong>.</>
            : "Keep your discovery station one tap away with the installable app shell."}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          {deferred && (
            <button type="button" onClick={() => void install()} className="btn-primary flex items-center gap-1.5 px-3 py-2 text-xs">
              <CheckIcon size={13} />
              Add to Home Screen
            </button>
          )}
          <button type="button" onClick={dismiss} className="text-xs text-muted hover:text-text px-1 py-1">
            Not now
          </button>
        </div>
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="shrink-0 rounded-lg p-1 text-muted hover:text-text">
        <XIcon size={15} />
      </button>
    </aside>
  );
}
