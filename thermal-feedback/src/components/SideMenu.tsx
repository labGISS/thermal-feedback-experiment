import { useState } from "react";
import { TEMP_SET_POINT } from "../experimentConfig";

const PASSWORD = "1234";

interface Props {
  tempSetPoint: number;
  onTempSetPointChange: (value: number) => void;
}

export const SideMenu = ({ tempSetPoint, onTempSetPointChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);

  const handleToggle = () => {
    if (open) {
      setOpen(false);
      setUnlocked(false);
      setPwInput("");
      setPwError(false);
    } else {
      setOpen(true);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setUnlocked(false);
    setPwInput("");
    setPwError(false);
  };

  const handleUnlock = () => {
    if (pwInput === PASSWORD) {
      setUnlocked(true);
      setPwError(false);
      setPwInput("");
    } else {
      setPwError(true);
      setPwInput("");
    }
  };

  const handleAccuracy = () => {
    handleClose();
    window.open("/cube2/accuracy", "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className="fixed top-5 left-5 z-50 w-10 h-10 flex flex-col justify-center items-center gap-1.5 bg-white border border-gray-200 rounded-full shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
        aria-label={open ? "Chiudi menu" : "Apri menu"}
      >
        <span className={`block w-4 h-0.5 bg-gray-600 transition-transform duration-200 ${open ? "translate-y-2 rotate-45" : ""}`} />
        <span className={`block w-4 h-0.5 bg-gray-600 transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
        <span className={`block w-4 h-0.5 bg-gray-600 transition-transform duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={handleClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="px-6 py-5 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Menu</span>
        </div>

        {!unlocked ? (
          /* Password gate */
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7a4.5 4.5 0 00-9 0v3.5M6 10.5h12a1.5 1.5 0 011.5 1.5v7a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5V12A1.5 1.5 0 016 10.5z" />
            </svg>
            <p className="text-sm text-gray-500">Inserisci la password</p>
            <input
              type="password"
              value={pwInput}
              onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              autoFocus
              className={`w-full border rounded-md px-3 py-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary ${pwError ? "border-red-400 ring-1 ring-red-400" : "border-gray-300"}`}
              placeholder="••••"
            />
            {pwError && <p className="text-xs text-red-500">Password errata</p>}
            <button
              onClick={handleUnlock}
              className="w-full bg-gray-800 text-white text-sm font-medium py-2 rounded-md hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Accedi
            </button>
          </div>
        ) : (
          /* Menu content */
          <nav className="flex-1 px-4 py-6 flex flex-col gap-4">
            {/* Temp set point override */}
            <div className="px-4 flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Set point (°C)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tempSetPoint}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!isNaN(v)) onTempSetPointChange(v);
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {tempSetPoint !== TEMP_SET_POINT && (
                  <button
                    onClick={() => onTempSetPointChange(TEMP_SET_POINT)}
                    className="text-xs text-gray-400 hover:text-gray-600 shrink-0 cursor-pointer"
                    title="Ripristina default"
                  >
                    Reset
                  </button>
                )}
              </div>
              {tempSetPoint !== TEMP_SET_POINT && (
                <p className="text-xs text-amber-500">Default: {TEMP_SET_POINT} °C</p>
              )}
            </div>

            <div className="border-t border-gray-100" />

            {/* Accuracy panel */}
            <button
              onClick={handleAccuracy}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors text-sm font-medium w-full text-left cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Accuratezza prove
            </button>

            {/* External results */}
            <button
              type="button"
              onClick={() => {
                window.open("http://labgis.it/cube2-results/", "_blank", "noopener,noreferrer");
                handleClose();
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors text-sm font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Risultati globali
            </button>
          </nav>
        )}
      </aside>
    </>
  );
};
