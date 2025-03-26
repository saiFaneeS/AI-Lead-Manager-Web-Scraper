import { useState } from "react";
import { Clipboard, Instagram, Loader } from "lucide-react";

interface DmProps {
  jobDescription: string;
}

export function DMGenerator({ jobDescription }: DmProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [DM, setDM] = useState("");

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      const res = await fetch("/api/message/generate-dm", {
        method: "POST",
        body: JSON.stringify({ jobDescription }),
        headers: { "Content-Type": "application/json" },
      });

      if (res) {
        const data = await res.json();
        setDM(data.message);
      }
    } catch (error) {
      console.log("Error generating DM: ", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (DM) {
      navigator.clipboard
        .writeText(DM)
        .then(() => {
          console.log("copied");
        })
        .catch((err) => {
          console.log("couldn't copied", err);
        });
    }
  };

  return (
    <div className="flex flex-col w-full mx-auto">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !jobDescription.trim()}
          className="bg-emerald-500/40 border border-emerald-500/50 text-zinc-300 flex items-center justify-center gap-2 w-full py-2 hover:bg-emerald-500/50 focus:outline outline-1 outline-emerald-500"
        >
          {isGenerating ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Instagram className="h-4 w-4" />
              Generate DM
            </>
          )}
        </button>

        {DM && (
          <>
            <div className="flex items-center justify-between gap-2 w-full mt-2">
              <p>Message:</p>
              <button
                onClick={copyToClipboard}
                className="bg-emerald-600/40 hover:bg-zinc-700 text-white flex items-center justify-between gap-2 p-2 px-4 text-xs"
              >
                <Clipboard className="h-4 w-4 shrink-0" />
                Copy
              </button>
            </div>
            <div className="bg-zinc-900/70 p-3 border border-zinc-800 max-h-[300px] overflow-y-auto text-sm leading-loose">
              {DM}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
