"use client";

import { ArrowDownFromLine, ChevronRight, Terminal } from "lucide-react";
import { useEffect, useState } from "react";

interface TerminalModalProps {
  leadsResponse: {
    message: string;
    logArray: string[];
  };
}

export const TerminalModal = ({ leadsResponse }: TerminalModalProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleModal = () => setIsOpen((prev) => !prev);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <>
      <button
        onClick={toggleModal}
        className="flex items-center gap-2 px-4 py-2 h-8 text-sm bg-zinc-900 hover:bg-zinc-800 border border-zinc-900 transition-colors"
      >
        <Terminal className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center cursor-default pointer-events-none z-50">
          <div className="bg-zinc-900 w-full max-w-3xl h-full mt-44 sm:mt-28 overflow-hidden shadow-xl pointer-events-auto">
            <div className="flex justify-between items-center py-2 px-4 border-b border-zinc-800">
              <div className="flex gap-2">
                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              </div>
              <button
                onClick={toggleModal}
                className="text-zinc-400 hover:text-zinc-200 flex gap-2 items-center"
              >
                Esc
                <ArrowDownFromLine size={18} />
              </button>
            </div>
            <div className="text-xs">
              <p className="text-zinc-400 mb-2 px-4 pt-3">{leadsResponse?.message}</p>
              <div className="text-zinc-300 whitespace-pre-wrap break-words text-start h-[75vh] overflow-y-auto flex flex-col gap-4 p-4">
                {leadsResponse?.logArray?.map((log, index) => (
                  <pre
                    key={index}
                    className="flex items-center gap-1 break-words whitespace-pre-wrap"
                  >
                    <span className="text-blue-400">
                      <ChevronRight size={14} />
                    </span>
                    {log}
                  </pre>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
