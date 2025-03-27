"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Power,
  Hourglass,
  RotateCw,
  Loader2,
  MailCheck,
  X,
  ChevronRight,
  Trash2,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowDownUp,
  ArrowRightFromLine,
  Loader,
  Mail,
  Laptop,
  Instagram,
} from "lucide-react";
import { Lead } from "@/types/Lead";
import { LeadTable } from "@/components/LeadTable";
import { format } from "date-fns";
import { sessionTime } from "@/constants";
import Head from "next/head";
import { DMGenerator } from "@/components/DMGenerator";
import useAuthRedirect from "@/hooks/useAuthRedirect";
import { Roboto } from "next/font/google";
import Link from "next/link";

export const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

interface LeadsResponse {
  message: string;
  logArray: string[];
}

interface LeadsEmailResults {
  email: string;
  sent: boolean;
}

function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [gettingLeads, setGettingLeads] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(sessionTime);
  const [storeMailsOnly, setStoreMailsOnly] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadsResponse, setLeadsResponse] = useState<LeadsResponse>({
    message: "No records",
    logArray: [],
  });
  const [leadsEmailResults, setLeadsEmailResults] = useState<
    LeadsEmailResults[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("date-desc");

  const intervalRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);
  const leadsPerPage = 50;

  useAuthRedirect();

  const filteredLeads = leads
    .filter(
      (lead) =>
        lead.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.job_desc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.emails?.some((email) =>
          email.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        lead.keywords?.some((keyword) =>
          keyword.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        lead.tags?.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        )
    )
    .sort((a, b) => {
      if (sortBy === "date-asc") {
        return (
          new Date(a.created_at ?? 0).getTime() -
          new Date(b.created_at ?? 0).getTime()
        );
      } else if (sortBy === "date-desc") {
        return (
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
        );
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);

  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = filteredLeads.slice(indexOfFirstLead, indexOfLastLead);

  // FETCH ON PAGE LOAD
  useEffect(() => {
    getLeads();
  }, []);

  // Timer

  // INTERVAL TIMER
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (intervalRef.current) return;

    setTimeLeft(sessionTime);
    filterAndStoreNewLeads();

    intervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          filterAndStoreNewLeads();
          return sessionTime;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  // SEARCH
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedLead(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // PAGINATION
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getLeads = async () => {
    // return;
    setGettingLeads(true);

    const res = await fetch("/api/lead/get-leads");
    if (res.ok) {
      const data = await res.json();
      setLeads(data?.data);
    }
    setGettingLeads(false);
  };

  const deleteLead = async (id: number) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    const res = await fetch("/api/lead/delete-lead", {
      method: "DELETE",
      body: JSON.stringify({ id }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      setLeads((prev) => prev.filter((lead) => lead.id !== id));
      if (selectedLead?.id === id) {
        setSelectedLead(null);
      }
    }
  };

  // MAIN FUNCTION TO BRING NEW LEADS
  const filterAndStoreNewLeads = async () => {
    // return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setLoading(true);

      const response = await fetch("/api/filter-and-store", {
        method: "POST",
        body: JSON.stringify({ storeMailsOnly }),
        headers: { "Content-Type": "application/json" },
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", jsonError);
        result = [];
      }

      setLeadsResponse({ message: result.message, logArray: result.logArray });
      setLeadsEmailResults(result.emailResults);
      console.log(result.emailResults);

      await getLeads();

      setRunCount((prev) => prev + 1);
      setTimeLeft(sessionTime);
    } catch (error) {
      console.error("Error in filterAndStoreNewLeads:", error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const sendEmail = async (lead: Lead) => {
    if (!confirm("Send application email?")) return;

    const res = await fetch("/api/message/send-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription: lead.job_desc,
        emails: lead.emails,
      }),
    });

    await res.json();

    alert(
      res.ok === true
        ? "SUCCESS: Application sent!"
        : "FAILURE: Failed to send application"
    );
    console.log(res);
  };

  const sendFollowUp = async (lead: Lead) => {
    if (!confirm("Send a Follow-up Mail?")) return;

    const res = await fetch("/api/message/send-followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription: lead.job_desc,
        emails: lead.emails,
      }),
    });

    await res.json();
    alert(
      res.ok === true
        ? "SUCCESS: Follow-up sent!"
        : "FAILURE: Failed to send follow-up"
    );
    console.log(res);
  };

  const toggleAutoProcess = () => {
    setRunCount(0);
    setIsRunning((prev) => !prev);
  };

  const viewLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
  };

  // PAGINATION FUNTIONS
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; // Show at most 5 page numbers

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  };

  return (
    <div
      className={`min-h-screen relative bg-black text-white ${roboto.className}`}
    >
      <Head>
        <title>Lead Management</title>
        <link rel="icon" href="/fav.png" />
      </Head>

      {loading && (
        <div className="fixed z-50 inset-0 bg-black/60 flex items-end justify-center pointer-events-none animate-pulse">
          <div className="p-6 flex flex-col items-center max-w-xs w-full">
            <h3 className="text-2xl font-medium text-neutral-300 mb-2"></h3>
            <p className="text-neutral-200 text-center mb-4 flex items-center gap-2">
              <Loader className="text-emerald-500 animate-spin" size={20} />{" "}
              Finding leads...
            </p>
          </div>
        </div>
      )}

      <div className="flex h-screen overflow-hidden">
        {/* MAIN */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* HEADER */}
          <header className="bg-neutral-900/70 backdrop-blur-sm border-b border-neutral-800 h-fit grid grid-cols-3 max-sm:grid-cols-1 gap-4 max-sm:gap-2 py-2 px-6 max-sm:p-2 items-center sticky top-0 z-10 w-full shadow-2xl">
            <h1 className="text-xl font-medium text-neutral-200 max-sm:hidden">
              Lead Management
            </h1>
            <div className="flex item-center justify-center gap-2 text-center">
              <p
                className={`bg-neutral-500/20 text-neutral-300 text-sm px-3 py-1 h-fit ${
                  runCount > 0 ? "max-sm:basis-1/2" : "max-sm:basis-full"
                }`}
              >
                {leads?.length} Leads
              </p>
              {runCount > 0 && (
                <p className="bg-neutral-500/20 text-neutral-300 text-sm px-3 py-1 h-fit max-sm:basis-1/2">
                  Process runs: {runCount}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setStoreMailsOnly((prev) => !prev)}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 h-10 max-sm:h-8 border transition-colors max-sm:basis-1/2 ${
                  storeMailsOnly
                    ? "bg-emerald-500/20 border-emerald-500/30 text-neutral-300"
                    : "bg-neutral-900/70 border-neutral-800 text-neutral-400"
                }`}
                title="Store Emails Only"
              >
                <MailCheck size={18} />
                {!storeMailsOnly && <span className="text-base">All Data</span>}
                {storeMailsOnly && (
                  <span className="text-base">Emails Only</span>
                )}
              </button>

              <button
                onClick={toggleAutoProcess}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 h-10 max-sm:h-8 border transition-colors max-sm:basis-1/2 ${
                  isRunning
                    ? "bg-emerald-500/20 border-emerald-500/30 text-neutral-300"
                    : "bg-neutral-900/70 border-neutral-800 text-neutral-400"
                }`}
                title={isRunning ? "AI Process Running" : "Start AI Process"}
              >
                {isRunning ? (
                  <>
                    <Hourglass size={18} className="text-neutral-300" />
                    <span className="font-medium text-neutral-300">
                      {format(new Date(timeLeft * 1000), "mm:ss")}
                    </span>
                  </>
                ) : (
                  <>
                    <Power size={18} />
                    <span className="text-base">Start</span>
                  </>
                )}
              </button>
            </div>
          </header>

          {/* BODY */}
          <div className="flex-1 overflow-hidden flex">
            {/* LEADS AREA */}
            <div
              className={`flex-1 p-6 pb-20 max-sm:pb-20 max-sm:p-2 max-sm:py-4 overflow-auto ${
                selectedLead ? "max-md:hidden" : ""
              }`}
            >
              <div className="shadow-xl overflow-hidden">
                <div className="flex gap-2 items-center justify-between mb-6 max-sm:mb-4 overflow-x-auto">
                  <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search leads by title, email, or desc..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 h-10 bg-neutral-900/70 border border-neutral-800 focus:border-neutral-500 hover:border-neutral-700 outline-none transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-nowrap">
                    <button
                      onClick={() => {
                        const newSortBy =
                          sortBy === "date-desc" ? "date-asc" : "date-desc";
                        setSortBy(newSortBy);
                      }}
                      className="bg-neutral-900/70 border border-neutral-800 text-neutral-400 px-4 py-2 h-10 outline-none text-sm flex items-center gap-2 hover:border-neutral-500"
                    >
                      {sortBy === "date-desc" ? (
                        <>
                          <ArrowDownUp size={16} />
                          Newest First
                        </>
                      ) : (
                        <>
                          <ArrowUpDown size={16} />
                          Oldest First
                        </>
                      )}
                    </button>

                    {/* <select
                      value={filterByTag}
                      onChange={(e) => setFilterByTag(e.target.value)}
                      className="relative bg-neutral-900/70 border border-neutral-800 text-neutral-400 px-4 py-2 h-10 outline-none text-sm"
                    >
                      <option value="flex items-center gap-2">Tag</option>
                      {PREDEFINED_TAGS.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select> */}

                    <button
                      onClick={getLeads}
                      className="inline-flex items-center gap-2 px-4 py-2 h-10 bg-neutral-900/70 border border-neutral-800 hover:border-neutral-500 transition-colors"
                      title="Refresh Leads"
                    >
                      {gettingLeads ? (
                        <Loader2
                          size={20}
                          className="animate-spin text-neutral-400"
                        />
                      ) : (
                        <RotateCw size={20} className="text-neutral-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-neutral-800">
                  <LeadTable
                    leads={currentLeads}
                    setLeads={setLeads}
                    onDelete={deleteLead}
                    onSendEmail={sendEmail}
                    onSendFollowUp={sendFollowUp}
                    onViewDetails={viewLeadDetails}
                    leadsResponse={leadsResponse}
                    leadsEmailResults={leadsEmailResults}
                  />
                </div>
              </div>

              {/* Improved Pagination */}
              {totalPages > 0 && (
                <div className="mt-6 flex justify-center">
                  <div className="flex items-center bg-neutral-900/70 border border-neutral-800 overflow-hidden">
                    <button
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      className="h-10 w-10 flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
                      title="First Page"
                    >
                      <ChevronsLeft size={20} />
                    </button>

                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className="h-10 w-10 flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
                      title="Previous Page"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <div className="flex border-l border-r border-neutral-800">
                      {getPageNumbers().map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`h-10 w-10 flex items-center justify-center transition-colors ${
                            currentPage === pageNum
                              ? "bg-neutral-800 text-white"
                              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className="h-10 w-10 flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
                      title="Next Page"
                    >
                      <ChevronRight size={20} />
                    </button>

                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-10 w-10 flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
                      title="Last Page"
                    >
                      <ChevronsRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {/* Page info */}
              {filteredLeads.length > 0 && (
                <div className="mt-3 text-center text-sm text-neutral-500">
                  Showing {indexOfFirstLead + 1} to{" "}
                  {Math.min(indexOfLastLead, filteredLeads.length)} of{" "}
                  {filteredLeads.length} leads
                </div>
              )}
            </div>

            {/* SIDE SHEET */}
            {selectedLead && (
              <div className="w-full md:w-2/3 bg-neutral-900/70 border-l border-neutral-800 overflow-y-auto animate-in scrollbar-none">
                <div className="p-2 px-3 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900 z-10">
                  <h2 className="font-medium text-base text-neutral-200">
                    Lead Details
                  </h2>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="p-1 flex items-center gap-2 hover:bg-neutral-900/70/20 text-neutral-400 hover:text-neutral-300"
                  >
                    Esc
                    <ArrowRightFromLine size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4 px-3">
                  <div>
                    <DMGenerator jobDescription={selectedLead?.job_desc} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-neutral-400 text-sm font-medium">
                      Title
                    </h3>
                    <p className="text-white bg-neutral-900/70 p-3 border border-neutral-800 text-sm capitalize">
                      {selectedLead.job_title}
                    </p>
                  </div>

                  {selectedLead.job_desc && (
                    <div className="space-y-2">
                      <h3 className="text-neutral-400 text-sm font-medium">
                        Description
                      </h3>
                      <div className="bg-neutral-900/70 p-3 border border-neutral-800">
                        <p className="text-neutral-100 whitespace-pre-line text-sm leading-loose">
                          {selectedLead.job_desc
                            .split(". ")
                            .map((sentence, index) => (
                              <React.Fragment key={index}>
                                {sentence
                                  .trim()
                                  .split(" ")
                                  .map((word, wordIndex) => (
                                    <React.Fragment key={wordIndex}>
                                      {word.startsWith("http") ||
                                      word.startsWith("www.") ||
                                      word.includes(".com") ||
                                      word.includes(".net") ||
                                      word.includes(".org") ||
                                      word.includes(".io") ||
                                      word.includes(".co") ||
                                      word.includes(".ai") ||
                                      word.includes(".to") ||
                                      word.includes(".site") ||
                                      word.includes(".app") ||
                                      word.includes(".us") ||
                                      word.includes(".uk") ||
                                      word.includes(".au") ||
                                      word.includes(".pk") ||
                                      word.includes(".ae") ? (
                                        <Link
                                          href={
                                            word.startsWith("http")
                                              ? word
                                              : `http://${word}`
                                          }
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sky-400 hover:text-sky-300"
                                        >
                                          {word}
                                        </Link>
                                      ) : (
                                        word
                                      )}{" "}
                                    </React.Fragment>
                                  ))}
                                .<br />
                                <br />
                              </React.Fragment>
                            ))}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedLead.keywords &&
                    selectedLead.keywords.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-neutral-400 text-sm font-medium">
                          Keywords
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedLead.keywords.map((keyword, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-neutral-500/10 text-neutral-300 text-sm border border-neutral-500/20"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {selectedLead.emails && selectedLead.emails.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-neutral-400 text-sm font-medium flex items-center gap-2">
                        <Mail size={14} /> Emails
                      </h3>
                      <div className="bg-neutral-900/70 p-3 border border-neutral-800 space-y-2">
                        {selectedLead.emails.map((email, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between"
                          >
                            <span className="text-neutral-100 text-sm">
                              {email}
                            </span>
                            <button
                              onClick={() =>
                                selectedLead.id && deleteLead(selectedLead.id)
                              }
                              className="text-red-400 hover:text-red-300 p-1 hover:bg-red-900/20"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedLead.websites &&
                    selectedLead.websites.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-neutral-400 text-sm font-medium flex items-center gap-2">
                          <Laptop size={14} /> Websites
                        </h3>
                        <div className="bg-neutral-900/70 p-3 border border-neutral-800 space-y-2">
                          {selectedLead.websites.map((website, i) => (
                            <Link
                              key={i}
                              href={website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between text-sm text-sky-400 hover:text-sky-300"
                            >
                              <span>{website}</span>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                  {selectedLead.social_links &&
                    selectedLead.social_links.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between  gap-2 items-center w-full">
                          <h3 className="text-neutral-400 text-sm font-medium flex items-center gap-2">
                            <Instagram size={14} /> Social Links
                          </h3>
                        </div>
                        <div className="bg-neutral-900/70 p-3 border border-neutral-800 space-y-2">
                          {selectedLead.social_links.map((link, i) => (
                            <Link
                              key={i}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between text-violet-400 hover:text-violet-300 text-sm"
                            >
                              <span>
                                {link.slice(0, 40)}
                                {link.length > 40 && "..."}
                              </span>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                  <button
                    onClick={() =>
                      selectedLead.id && deleteLead(selectedLead.id)
                    }
                    className="mt-4 w-full py-2 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
