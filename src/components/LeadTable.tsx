"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  Mail,
  Trash2,
  Settings,
  Eye,
  EyeOff,
  Check,
  Square,
  X,
  Loader,
  Mails,
  Plus,
  Pen,
  AlignRight,
  Link2,
  LinkIcon,
} from "lucide-react";
import { Lead } from "@/types/Lead";
import { formatDistanceToNow } from "date-fns";
import { sessionTime } from "@/constants";
import Link from "next/link";
import { TerminalModal } from "./TerminalModal";

const SESSION_TIME = sessionTime;

const PREDEFINED_TAGS = [
  "Invalid",
  "Direct Messaged",
  "Followed Up",
  "Lost",
  "Won",
] as const;

const tagStyles: Record<string, string> = {
  Invalid: "bg-red-400 text-black",
  "Direct Messaged": "bg-blue-500 text-black",
  "Followed Up": "bg-yellow-500 text-black",
  Lost: "bg-red-500 text-white",
  Won: "bg-emerald-600 text-white",
};

const columns = [
  { key: "select", label: "" },
  { key: "jobTitle", label: "Job Title" },
  // { key: "keywords", label: "Keywords" },
  { key: "social", label: "Socials" },
  { key: "websites", label: "Websites" },
  { key: "emails", label: "Emails" },
  { key: "tags", label: "Tags" },
  { key: "actions", label: "Actions" },
];

interface LeadsResponse {
  message: string;
  logArray: string[];
}

interface LeadsEmailResults {
  email: string;
  sent: boolean;
}

export interface LeadTableProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  onDelete: (id: number) => Promise<void>;
  onSendEmail: (lead: Lead) => Promise<void>;
  onSendFollowUp: (lead: Lead) => Promise<void>;
  onViewDetails: (lead: Lead) => void;
  leadsResponse: LeadsResponse;
  leadsEmailResults: LeadsEmailResults[];
}

interface ColumnVisibility {
  select: boolean;
  jobTitle: boolean;
  websites: boolean;
  social: boolean;
  keywords: boolean;
  emails: boolean;
  actions: boolean;
  tags: boolean;
}

export function LeadTable({
  leads,
  setLeads,
  onDelete,
  onSendEmail,
  onSendFollowUp,
  onViewDetails,
  leadsResponse,
  leadsEmailResults,
}: LeadTableProps) {
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
    select: true,
    jobTitle: true,
    keywords: false,
    social: false,
    websites: false,
    emails: true,
    actions: true,
    tags: true,
  });
  const [deletingMail, setDeletingMail] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, Record<number, boolean>>
  >({
    websites: {},
    social: {},
    emails: {},
  });
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [showTagInput, setShowTagInput] = useState<Record<number, boolean>>({});
  const [customTag, setCustomTag] = useState<Record<number, string>>({});
  const [addingTag, setAddingTag] = useState<Record<number, boolean>>({});
  const [removingTag, setRemovingTag] = useState<Record<number, string>>({});
  const [newEmail, setNewEmail] = useState<Record<number, string>>({});
  const [editingEmail, setEditingEmail] = useState<
    Record<number, string | null>
  >({});

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowColumnSettings(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleSection = (section: string, leadId: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [leadId]: !prev[section]?.[leadId],
      },
    }));
  };

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const isLeadRecent = (date: string) => {
    return Date.now() - new Date(date).getTime() < SESSION_TIME * 1000;
  };

  const toggleLeadSelection = (leadId: number) => {
    setSelectedLeads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const toggleAllLeads = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((lead) => lead.id!)));
    }
  };

  const addTag = useCallback(
    async (id: number, tag: string) => {
      if (!tag.trim()) return;

      setAddingTag((prev) => ({ ...prev, [id]: true }));
      try {
        const response = await fetch("/api/lead/add-tag", {
          method: "PUT",
          body: JSON.stringify({ id, tag: tag.trim() }),
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error("Failed to add tag");
        }

        await response.json();

        setLeads((prev) =>
          prev.map((lead) => {
            if (lead.id === id) {
              return {
                ...lead,
                tags: [...(lead.tags || []), tag.trim()],
              };
            }
            return lead;
          })
        );

        setShowTagInput((prev) => ({ ...prev, [id]: false }));
        setCustomTag((prev) => ({ ...prev, [id]: "" }));
      } catch (error) {
        console.error("Error adding tag:", error);
        alert("Failed to add tag");
      } finally {
        setAddingTag((prev) => ({ ...prev, [id]: false }));
      }
    },
    [setLeads]
  );

  const removeTag = useCallback(
    async (id: number, tagToRemove: string) => {
      setRemovingTag((prev) => ({ ...prev, [id]: tagToRemove }));
      try {
        const response = await fetch("/api/lead/remove-tag", {
          method: "DELETE",
          body: JSON.stringify({ id, tag: tagToRemove }),
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          setLeads((prev) =>
            prev.map((lead) => {
              if (lead.id === id) {
                return {
                  ...lead,
                  tags: (lead.tags || []).filter((tag) => tag !== tagToRemove),
                };
              }
              return lead;
            })
          );
        }
      } catch (error) {
        console.error("Error removing tag:", error);
        alert("Failed to remove tag");
      } finally {
        setRemovingTag((prev) => ({ ...prev, [id]: "" }));
      }
    },
    [setLeads]
  );

  const handleUpdateEmail = async (
    id: number,
    oldEmail: string,
    newEmail: string
  ) => {
    try {
      const response = await fetch("/api/lead/update-email", {
        method: "PUT",
        body: JSON.stringify({ id, oldEmail, newEmail }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to update email");
      }

      await response.json();

      setLeads((prev) =>
        prev.map((lead) => {
          if (lead.id === id) {
            return {
              ...lead,
              emails: lead.emails.map((email) =>
                email === oldEmail ? newEmail : email
              ),
            };
          }
          return lead;
        })
      );

      setEditingEmail((prev) => ({ ...prev, [id]: null }));
    } catch (error) {
      console.error("Error updating email:", error);
      alert("Failed to update email");
    }
  };

  const handleDeleteEmail = async (id: number, email: string) => {
    setDeletingMail(true);
    if (!confirm("Delete email?")) {
      setDeletingMail(false);
      return;
    }

    const res = await fetch("/api/lead/delete-email", {
      method: "DELETE",
      body: JSON.stringify({ id, email }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === id
            ? { ...lead, emails: lead.emails.filter((e) => e !== email) }
            : lead
        )
      );
    }
    setDeletingMail(false);
  };

  const handleBulkDeleteLeads = async (selectedIds: number[]) => {
    if (selectedLeads.size === 0) return;

    if (confirm(`Delete ${selectedLeads.size} leads?`)) {
      const idsToDelete = Array.from(selectedLeads);

      try {
        const res = await fetch("/api/lead/delete-many", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: idsToDelete }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to delete leads");
        }

        const updatedLeads = leads.filter(
          (lead) => lead.id !== undefined && !selectedIds.includes(lead.id)
        );

        setSelectedLeads(new Set());
        setLeads(updatedLeads);
        alert("Leads deleted successfully");
      } catch (error) {
        console.error("Error deleting leads:", error);
        alert("An error occurred while deleting leads");
      }
    }
  };

  return (
    <div className="relative">
      {/* ACTION BUTTONS */}
      <div className="fixed left-0 bottom-0 w-full pointer-events-none flex justify-end p-4 pr-6">
        <div className="bg-neutral-950 p-2 flex justify-center items-center pointer-events-auto gap-2 w-fit border-2 border-neutral-900 shadow-2xl">
          {selectedLeads.size > 0 && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleBulkDeleteLeads(Array.from(selectedLeads))}
                className="flex items-center gap-2 px-4 py-2 h-8 text-base bg-red-950 text-red-300 hover:bg-red-900 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedLeads.size})
              </button>
            </div>
          )}
          <TerminalModal leadsResponse={leadsResponse} />
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="flex items-center gap-2 px-4 py-2 h-8 text-base bg-neutral-900 hover:bg-neutral-800 border border-neutral-900 transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
          {showColumnSettings && (
            <div className="absolute bottom-20 right-28 translate-x-1/2 z-10 bg-neutral-950 shadow-xl p-4 min-w-44 border border-neutral-700">
              <div className="flex items-center justify-between mb-2 w-full gap-6">
                <h3 className="text-base font-medium text-neutral-300">
                  Columns
                </h3>

                <button
                  onClick={() => setShowColumnSettings(false)}
                  className="text-neutral-400 hover:text-neutral-300"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2">
                {columns.map(
                  ({ key, label }) =>
                    key !== "select" && (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-base cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            visibleColumns[key as keyof ColumnVisibility]
                          }
                          onChange={() =>
                            toggleColumn(key as keyof ColumnVisibility)
                          }
                          className="text-neutral-500 focus:ring-neutral-500 bg-neutral-900/70 border-neutral-900"
                        />
                        {label}
                      </label>
                    )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LEAD TABLE */}
      <table className="divide-y divide-neutral-800 overflow-hidden w-full">
        <thead className="bg-neutral-900/70">
          <tr>
            {visibleColumns.select && (
              <th className="px-4 py-3">
                <button
                  onClick={toggleAllLeads}
                  className="p-0.5 hover:bg-neutral-900/70 transition-colors"
                >
                  {selectedLeads.size === leads.length ? (
                    <Check className="h-4 w-4 text-red-500" />
                  ) : (
                    <Square className="h-4 w-4 text-neutral-400" />
                  )}
                </button>
              </th>
            )}
            {columns.map(
              ({ key, label }) =>
                key !== "select" &&
                visibleColumns[key as keyof ColumnVisibility] && (
                  <th
                    key={key}
                    className="px-6 py-3 text-left text-sm font-medium text-neutral-300 uppercase tracking-wider"
                  >
                    {label}
                  </th>
                )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {leads.length === 0 ? (
            <tr>
              <td
                colSpan={Object.values(visibleColumns).filter(Boolean).length}
                className="px-6 py-3 text-center text-neutral-400"
              >
                No leads found
              </td>
            </tr>
          ) : (
            leads.map((lead, index) => (
              <tr
                key={lead.id}
                title={lead.job_title}
                className={`text-sm ${
                  lead.created_at && isLeadRecent(lead.created_at)
                    ? "bg-emerald-700 bg-opacity-15 hover:bg-opacity-20"
                    : "bg-neutral-900 bg-opacity-30 hover:bg-opacity-50"
                } transition-colors`}
              >
                {visibleColumns.select && (
                  <td
                    className="px-4 py-4 w-[40px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => toggleLeadSelection(lead.id!)}
                      className="p-0.5 hover:bg-neutral-900/70 transition-colors"
                    >
                      {selectedLeads.has(lead.id!) ? (
                        <Check className="h-4 w-4 text-red-500 bg-red-900/30" />
                      ) : (
                        <Square className="h-4 w-4 text-neutral-400" />
                      )}
                    </button>
                  </td>
                )}

                {visibleColumns.jobTitle && (
                  <td className="px-6 py-3 whitespace-nowrap">
                    <Link
                      href={lead.job_link}
                      target="_blank"
                      className={`mb-1 flex items-center gap-1 text-nowrap w-fit ${
                        lead.created_at && isLeadRecent(lead.created_at)
                          ? "text-green-400"
                          : "text-neutral-200"
                      } hover:underline`}
                    >
                      {index + 1 + ". "} {lead.job_title.slice(0, 30)}
                      {lead.job_title.length > 30 && "..."}
                      <Link2 className="h-3 w-3" />
                    </Link>
                    <div className="text-neutral-400 text-xs">
                      {lead.created_at &&
                        formatDistanceToNow(new Date(lead.created_at), {
                          addSuffix: true,
                        })}
                    </div>
                  </td>
                )}

                {visibleColumns.keywords && (
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-2 max-w-60">
                      {lead.keywords?.map((word, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-neutral-500/10 text-neutral-300 text-nowrap border border-neutral-500/20 text-sm"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </td>
                )}

                {visibleColumns.social && (
                  <td className="px-6 py-3">
                    <div className="space-y-1">
                      {(expandedSections.social[lead.id!]
                        ? lead.social_links
                        : lead.social_links?.slice(0, 2)
                      )?.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400 hover:text-violet-300 w-fit flex items-center gap-1 text-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {link.slice(0, 30)}
                          {link.length > 30 && "..."}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                      {(lead.social_links?.length || 0) > 2 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSection("social", lead.id!);
                          }}
                          className="text-neutral-400 hover:text-neutral-300 text-xs flex items-center gap-1"
                        >
                          {expandedSections.social[lead.id!] ? (
                            <>
                              Show less <EyeOff className="h-3 w-3" />
                            </>
                          ) : (
                            <>
                              Show {lead.social_links!.length - 2} more{" "}
                              <Eye className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                )}

                {visibleColumns.websites && (
                  <td className="px-6 py-3">
                    <div className="space-y-1">
                      {(expandedSections.websites[lead.id!]
                        ? lead.websites
                        : lead.websites?.slice(0, 2)
                      )?.map((website, i) => (
                        <a
                          key={i}
                          href={website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:text-sky-300 w-fit flex text-nowrap items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {website.slice(0, 30)}
                          {website.length > 30 && "..."}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                      {(lead.websites?.length || 0) > 2 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSection("websites", lead.id!);
                          }}
                          className="text-neutral-400 hover:text-neutral-300 text-xs flex items-center gap-1"
                        >
                          {expandedSections.websites[lead.id!] ? (
                            <>
                              Show less <EyeOff className="h-3 w-3" />
                            </>
                          ) : (
                            <>
                              Show {lead.websites!.length - 2} more{" "}
                              <Eye className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                )}

                {visibleColumns.emails && (
                  <td className="px-6 py-3">
                    <div className="text-sm space-y-1">
                      {(expandedSections.emails[lead.id!]
                        ? lead.emails
                        : lead.emails?.slice(0, 2)
                      )?.map((email, i) => {
                        const emailStatus = leadsEmailResults?.find(
                          (result) =>
                            result.email.toLowerCase() === email.toLowerCase()
                        );

                        const isNotSent = emailStatus && !emailStatus.sent;

                        return (
                          <div className="flex items-center" key={i}>
                            {editingEmail[lead.id!] === email ? (
                              <input
                                type="text"
                                className="bg-neutral-800 text-neutral-300 px-2 py-1 text-xs border border-neutral-700"
                                value={newEmail[lead.id!] || email}
                                placeholder="new email"
                                onChange={(e) =>
                                  setNewEmail((prev) => ({
                                    ...prev,
                                    [lead.id!]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateEmail(
                                      lead.id!,
                                      email,
                                      newEmail[lead.id!] || email
                                    );
                                  }
                                }}
                              />
                            ) : (
                              <Link
                                href={`mailto:${email}`}
                                className={`text-nowrap flex items-center w-fit ${
                                  isNotSent
                                    ? "text-red-400"
                                    : "text-neutral-200 hover:text-neutral-100"
                                }`}
                                title={email}
                              >
                                {email.slice(0, 32)}
                                {email.length > 32 && "..."}
                              </Link>
                            )}
                            {editingEmail[lead.id!] === email ? (
                              <></>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEmail(lead.id!, email);
                                }}
                                className="text-neutral-400 hover:text-red-300 ml-2"
                                title="Delete Email"
                              >
                                {deletingMail ? (
                                  <Loader className="h-3 w-3 animate-spin" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                              </button>
                            )}
                            <button
                              className="text-neutral-400 hover:text-neutral-300 ml-2"
                              title="Edit Email"
                              onClick={() => {
                                setEditingEmail((prev) => ({
                                  ...prev,
                                  [lead.id!]:
                                    prev[lead.id!] === email ? null : email,
                                }));
                                setNewEmail((prev) => ({
                                  ...prev,
                                  [lead.id!]: email,
                                }));
                              }}
                            >
                              {editingEmail[lead.id!] === email ? (
                                <X className="h-3 w-3" />
                              ) : (
                                <Pen className="h-3 w-3" />
                              )}{" "}
                            </button>
                            {editingEmail[lead.id!] === email && (
                              <button
                                onClick={() =>
                                  handleUpdateEmail(
                                    lead.id!,
                                    email,
                                    newEmail[lead.id!] || email
                                  )
                                }
                                className="text-emerald-400 hover:text-emerald-300 ml-2"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {(lead.emails?.length || 0) > 2 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSection("emails", lead.id!);
                          }}
                          className="text-neutral-400 hover:text-neutral-300 text-xs flex items-center gap-1"
                        >
                          {expandedSections.emails[lead.id!] ? (
                            <>
                              Show less <EyeOff className="h-3 w-3" />
                            </>
                          ) : (
                            <>
                              Show {lead.emails!.length - 2} more{" "}
                              <Eye className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                )}

                {visibleColumns.tags && (
                  <td
                    className="px-6 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-wrap gap-2 items-center">
                      {lead.tags?.map((tag, i) => (
                        <span
                          key={i}
                          className={`px-2 py-1 text-xs flex items-center gap-1 text-nowrap
                            ${
                              tagStyles[tag] ||
                              "bg-neutral-800 text-neutral-300"
                            }`}
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(lead.id!, tag)}
                            className="ml-1"
                          >
                            {removingTag[lead.id!] === tag ? (
                              <Loader className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="size-3" />
                            )}
                          </button>
                        </span>
                      ))}

                      {showTagInput[lead.id!] ? (
                        <div className="flex items-start flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <select
                              className="bg-neutral-800 text-neutral-300 p-1 text-xs border w-32 border-neutral-700 outline-none"
                              value={customTag[lead.id!] || ""}
                              onChange={(e) => {
                                if (e.target.value === "custom") {
                                  setCustomTag((prev) => ({
                                    ...prev,
                                    [lead.id!]: "",
                                  }));
                                } else {
                                  addTag(lead.id!, e.target.value);
                                }
                              }}
                            >
                              <option value="">Select...</option>
                              {PREDEFINED_TAGS.map((tag) => (
                                <option key={tag} value={tag}>
                                  {tag}
                                </option>
                              ))}
                              <option value="custom">Custom...</option>
                            </select>
                            <button
                              onClick={() => {
                                setShowTagInput((prev) => ({
                                  ...prev,
                                  [lead.id!]: false,
                                }));
                                setCustomTag((prev) => ({
                                  ...prev,
                                  [lead.id!]: "",
                                }));
                              }}
                              className="text-neutral-400 hover:text-neutral-300"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          {customTag[lead.id!] !== undefined && (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                className="bg-neutral-800 text-neutral-300 px-2 py-1 text-xs w-32 border border-neutral-700"
                                placeholder="Custom..."
                                value={customTag[lead.id!] || ""}
                                onChange={(e) =>
                                  setCustomTag((prev) => ({
                                    ...prev,
                                    [lead.id!]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    addTag(lead.id!, customTag[lead.id!]);
                                  }
                                }}
                              />
                              <button
                                onClick={() =>
                                  addTag(lead.id!, customTag[lead.id!])
                                }
                                className="text-emerald-400 hover:text-emerald-300"
                              >
                                {addingTag[lead.id!] ? (
                                  <Loader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setShowTagInput((prev) => ({
                              ...prev,
                              [lead.id!]: true,
                            }))
                          }
                          className="text-neutral-400 hover:text-neutral-300 flex items-center gap-1 text-xs text-nowrap"
                        >
                          <Plus className="h-3 w-3" />
                          Add tag
                        </button>
                      )}
                    </div>
                  </td>
                )}

                {visibleColumns.actions && (
                  <td
                    className="px-6 py-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-4">
                      <Link
                        href={lead.job_link}
                        target="_blank"
                        className="text-neutral-400 hover:text-neutral-300 p-1 bg-neutral-900/70 border border-neutral-800/80 cursor-pointer"
                        title="View Job"
                      >
                        <LinkIcon size={18} />
                      </Link>
                      <div
                        onClick={() => onViewDetails(lead)}
                        className="text-neutral-400 hover:text-neutral-300 p-1 bg-neutral-900/70 border border-neutral-800/80 cursor-pointer"
                        title="View Details"
                      >
                        <AlignRight size={18} />
                      </div>
                      <button
                        onClick={() => onSendEmail(lead)}
                        className="text-emerald-500 hover:text-emerald-300 p-1 bg-neutral-900/70 border border-neutral-800/80"
                        title="Send Email"
                      >
                        <Mail size={18} />
                      </button>
                      <button
                        onClick={() => onSendFollowUp(lead)}
                        className="text-emerald-500 hover:text-emerald-300 p-1 bg-neutral-900/70 border border-neutral-800/80"
                        title="Send Follow-up"
                      >
                        <Mails size={18} />
                      </button>
                      <button
                        onClick={() => lead.id && onDelete(lead.id)}
                        className="text-red-500 hover:text-red-300 p-1 bg-neutral-900/20 border border-neutral-800/80"
                        title="Delete"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
