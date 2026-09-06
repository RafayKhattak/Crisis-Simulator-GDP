"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { DebriefReportView } from "@/components/gmail/debrief-report";
import { GmailAvatar } from "@/components/gmail/gmail-avatar";
import { GmailLogo } from "@/components/gmail/gmail-logo";
import { MdIcon } from "@/components/gmail/md-icon";
import { SiteFooter } from "@/components/brand/site-footer";
import { useToast } from "@/hooks/use-toast";
import { accountAvatar } from "@/lib/branding";
import { TRAINEE_EMAIL, TRAINEE_NAME } from "@/lib/constants";
import {
  formatGmailFullDate,
  formatGmailListDate,
  isThreadUnread,
  latestInbound,
  latestMessage,
  snippet,
  threadSubject,
  THREAD_SUBJECT,
  threadMessages,
} from "@/lib/mail-utils";
import {
  clearMailboxChrome,
  laterStamp,
  loadMailboxChrome,
  saveMailboxChrome,
} from "@/lib/mailbox-state";
import { cn } from "@/lib/utils";
import type {
  DebriefReport,
  ScenarioPayload,
  SendMessageResponse,
  SessionNudge,
} from "@/types/api";
import type { CharacterRow, MessageRow } from "@/types/database";

type FolderId =
  | "inbox"
  | "starred"
  | "snoozed"
  | "sent"
  | "drafts"
  | "spam"
  | "trash";

type TabId = "primary" | "social" | "promotions";

const NAV: Array<{
  id: FolderId;
  label: string;
  icon: string;
}> = [
  { id: "inbox", label: "Inbox", icon: "inbox" },
  { id: "starred", label: "Starred", icon: "star" },
  { id: "snoozed", label: "Snoozed", icon: "schedule" },
  { id: "sent", label: "Sent", icon: "send" },
  { id: "drafts", label: "Drafts", icon: "note" },
];

const MORE_NAV: Array<{ id: FolderId; label: string; icon: string }> = [
  { id: "spam", label: "Spam", icon: "report" },
  { id: "trash", label: "Trash", icon: "delete" },
];

function IconBtn({
  name,
  label,
  onClick,
  filled,
  disabled,
}: {
  name: string;
  label: string;
  onClick?: () => void;
  filled?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="gmail-icon-btn"
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      disabled={disabled}
    >
      <MdIcon name={name} filled={filled} size={20} />
    </button>
  );
}

export function MailApp({
  initialPayload,
}: {
  initialPayload?: ScenarioPayload;
}) {
  const { toast } = useToast();
  const [payload, setPayload] = useState<ScenarioPayload | null>(
    initialPayload ?? null
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [folder, setFolder] = useState<FolderId>("inbox");
  const [tab, setTab] = useState<TabId>("primary");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<MessageRow[]>(
    initialPayload?.messages ?? []
  );
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeToId, setComposeToId] = useState<string | null>(null);
  const [composeSubject, setComposeSubject] = useState(THREAD_SUBJECT);
  const [composeBody, setComposeBody] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [readAt, setReadAt] = useState<Record<string, string>>({});
  const [mailboxReady, setMailboxReady] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [nudges, setNudges] = useState<SessionNudge[]>([]);
  const [debrief, setDebrief] = useState<DebriefReport | null>(null);
  const [view, setView] = useState<"mail" | "debrief">("mail");
  const [grading, setGrading] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (initialPayload) return;
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/scenario", { cache: "no-store" });
        const data = (await response.json()) as ScenarioPayload & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load scenario.");
        }
        if (cancelled) return;
        setPayload(data);
        setMessages(data.messages);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load scenario."
          );
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialPayload]);

  const traineeId = payload?.trainee?.id;

  useLayoutEffect(() => {
    if (!traineeId || !payload) return;
    const chrome = loadMailboxChrome(traineeId);
    const nextReadAt = { ...chrome.readAt };
    if (Object.keys(nextReadAt).length === 0) {
      for (const character of payload.characters) {
        const thread = threadMessages(
          payload.messages,
          character,
          payload.traineeEmail
        );
        const last = thread[thread.length - 1];
        const replied = thread.some(
          (message) => message.sender_email === payload.traineeEmail
        );
        if (replied && last) nextReadAt[character.id] = last.created_at;
      }
    }
    setReadAt(nextReadAt);
    setStarred(new Set(chrome.starred));
    setNudges(chrome.nudges);
    setMailboxReady(true);
  }, [payload, traineeId]);

  useEffect(() => {
    if (!traineeId || !mailboxReady) return;
    saveMailboxChrome(traineeId, {
      readAt,
      starred: Array.from(starred),
      nudges,
    });
  }, [traineeId, mailboxReady, readAt, starred, nudges]);

  const markCharacterRead = useCallback(
    (characterId: string, stamp?: string) => {
      const now = new Date().toISOString();
      setReadAt((current) => ({
        ...current,
        [characterId]: laterStamp(current[characterId], stamp, now),
      }));
    },
    []
  );

  const traineeEmail = payload?.traineeEmail ?? TRAINEE_EMAIL;
  const characters = useMemo(
    () => payload?.characters ?? [],
    [payload?.characters]
  );

  const selectedCharacter = useMemo(
    () => characters.find((row) => row.id === selectedCharacterId) ?? null,
    [characters, selectedCharacterId]
  );

  const messageHistory = useMemo(() => {
    if (!selectedCharacter) return [];
    return threadMessages(messages, selectedCharacter, traineeEmail);
  }, [messages, selectedCharacter, traineeEmail]);

  const visibleCharacters = useMemo(() => {
    const filtered = characters.filter((character) => {
      const haystack =
        `${character.name} ${character.role} ${character.email} ${threadSubject(character.email)}`.toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      const last = latestMessage(messages, character, traineeEmail);
      if (folder === "starred") return starred.has(character.id);
      if (folder === "sent") return last?.sender_email === traineeEmail;
      if (folder === "drafts" || folder === "snoozed" || folder === "spam" || folder === "trash") {
        return false;
      }
      return true;
    });
    return filtered.sort((a, b) => {
      const aTime = latestMessage(messages, a, traineeEmail)?.created_at ?? "";
      const bTime = latestMessage(messages, b, traineeEmail)?.created_at ?? "";
      return bTime.localeCompare(aTime);
    });
  }, [characters, folder, messages, query, starred, traineeEmail]);

  const unreadCount = useMemo(
    () =>
      characters.filter((character) =>
        isThreadUnread(
          messages,
          character,
          traineeEmail,
          readAt[character.id]
        )
      ).length,
    [characters, messages, readAt, traineeEmail]
  );

  useEffect(() => {
    const count = unreadCount > 0 ? `Inbox (${unreadCount})` : "Inbox";
    document.title = `${count} - ${traineeEmail} - Gmail`;
  }, [traineeEmail, unreadCount]);

  const openThread = (characterId: string) => {
    const character = characters.find((row) => row.id === characterId);
    const inbound = character
      ? latestInbound(messages, character, traineeEmail)
      : undefined;
    markCharacterRead(characterId, inbound?.created_at);
    setSelectedCharacterId(characterId);
    setReplyOpen(false);
    setChecked(new Set());
    setView("mail");
  };

  const markUnread = (characterId: string) => {
    setReadAt((current) => {
      const next = { ...current };
      delete next[characterId];
      return next;
    });
  };

  const closeThread = () => {
    setSelectedCharacterId(null);
    setReplyOpen(false);
    setDraft("");
  };

  const sendToCharacter = useCallback(
    async (character: CharacterRow, text: string) => {
      if (!payload || !text.trim() || sending) return;
      const userMessage = text.trim();
      setSending(true);

      const optimistic: MessageRow = {
        id: `optimistic-${crypto.randomUUID()}`,
        scenario_id: payload.scenario.id,
        trainee_id: payload.trainee?.id ?? "demo-trainee",
        sender_email: traineeEmail,
        receiver_email: character.email,
        content: userMessage,
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, optimistic]);

      try {
        const response = await fetch("/api/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage,
            characterId: character.id,
            scenarioId: payload.scenario.id,
          }),
        });
        const data = (await response.json()) as SendMessageResponse & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "The agent pipeline failed.");
        }

        setMessages((current) => [
          ...current.filter((row) => row.id !== optimistic.id),
          data.user_message,
          data.character_reply,
        ]);
        markCharacterRead(character.id, data.character_reply.created_at);

        if (data.evaluator_result.violation) {
          const excerpt = userMessage.replace(/\s+/g, " ").trim();
          setNudges((current) => [
            ...current,
            {
              at: new Date().toISOString(),
              toName: character.name,
              toEmail: character.email,
              excerpt:
                excerpt.length > 140 ? `${excerpt.slice(0, 137)}…` : excerpt,
              reason:
                data.evaluator_result.reason ||
                "Your last action appears to violate the incident-response SOP.",
            },
          ]);
          toast({
            variant: "destructive",
            title: "SYSTEM COMPLIANCE WARNING",
            description:
              data.evaluator_result.reason ||
              "Your last action appears to violate the incident-response SOP.",
          });
        }
        return true;
      } catch (error) {
        setMessages((current) =>
          current.filter((row) => row.id !== optimistic.id)
        );
        toast({
          variant: "destructive",
          title: "Message not sent",
          description:
            error instanceof Error ? error.message : "Unknown pipeline error.",
        });
        return false;
      } finally {
        setSending(false);
      }
    },
    [payload, sending, toast, traineeEmail, markCharacterRead]
  );

  const finishSimulation = useCallback(async () => {
    if (!payload || grading) return;
    setComposeOpen(false);
    setSelectedCharacterId(null);
    setReplyOpen(false);
    setView("debrief");
    setGrading(true);
    try {
      const response = await fetch("/api/complete-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: payload.scenario.id,
          scenarioTitle: payload.scenario.title,
          nudges,
          messages: messages.filter((row) => !row.id.startsWith("optimistic-")),
        }),
      });
      const data = (await response.json()) as DebriefReport & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to grade the session.");
      }
      setDebrief(data);
    } catch (error) {
      setView("mail");
      toast({
        variant: "destructive",
        title: "Could not generate the report",
        description:
          error instanceof Error ? error.message : "Unknown grading error.",
      });
    } finally {
      setGrading(false);
    }
  }, [grading, messages, nudges, payload, toast]);

  const sendReply = async () => {
    if (!selectedCharacter || !draft.trim()) return;
    const ok = await sendToCharacter(selectedCharacter, draft);
    if (ok) {
      setDraft("");
      setReplyOpen(false);
    }
  };

  const sendCompose = async () => {
    const character =
      characters.find((row) => row.id === composeToId) ?? characters[0];
    if (!character || !composeBody.trim()) return;
    const ok = await sendToCharacter(character, composeBody);
    if (ok) {
      setComposeOpen(false);
      setComposeBody("");
      openThread(character.id);
    }
  };

  const refresh = async () => {
    const response = await fetch("/api/scenario", { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = (await response.json()) as ScenarioPayload;
    setPayload(data);
    setMessages(data.messages);
  };

  const signOut = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const resetExercise = async () => {
    if (resetting) return;
    const confirmed = window.confirm(
      "Reset only your inbox to the six opening crisis emails? Other trainees are not affected."
    );
    if (!confirmed) return;
    setResetting(true);
    try {
      const response = await fetch("/api/reset-inbox", { method: "POST" });
      const data = (await response.json()) as ScenarioPayload & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not reset this inbox.");
      }
      setPayload(data);
      setMessages(data.messages);
      setDebrief(null);
      setNudges([]);
      setReadAt({});
      setStarred(new Set());
      if (data.trainee?.id) clearMailboxChrome(data.trainee.id);
      setView("mail");
      setFolder("inbox");
      setSelectedCharacterId(null);
      setComposeOpen(false);
      setReplyOpen(false);
      setDraft("");
      toast({
        title: "Exercise reset",
        description: "Your mailbox is back to the opening Nightfall emails.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description:
          error instanceof Error ? error.message : "Could not reset this inbox.",
      });
    } finally {
      setResetting(false);
      setAccountOpen(false);
    }
  };

  if (loadError) {
    return (
      <div className="sim-shell">
        <div className="gmail-root">
          <p className="gmail-error">{loadError}</p>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="sim-shell">
        <div className="gmail-root" />
        <SiteFooter />
      </div>
    );
  }

  const traineePhoto = accountAvatar(
    payload.trainee?.email,
    payload.trainee?.name
  );
  const inThread = Boolean(selectedCharacter);
  const emptyFolder =
    folder === "drafts" ||
    folder === "snoozed" ||
    folder === "spam" ||
    folder === "trash";

  return (
    <div className="sim-shell">
    <div className="gmail-root">
      <header className="gmail-header">
        <div className="gmail-logo-wrap">
          <IconBtn name="menu" label="Main menu" />
          <GmailLogo />
        </div>
        <div className="gmail-search">
          <IconBtn name="search" label="Search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search mail"
            aria-label="Search mail"
          />
          <IconBtn name="tune" label="Show search options" />
        </div>
        <div className="gmail-header-right">
          <IconBtn name="help_outline" label="Support" />
          <IconBtn name="settings" label="Settings" />
          <IconBtn name="apps" label="Google apps" />
          <button
            type="button"
            className="gmail-icon-btn"
            title={payload.trainee?.name ?? TRAINEE_NAME}
            aria-label="Account"
            onClick={() => setAccountOpen((open) => !open)}
          >
            <GmailAvatar
              name={payload.trainee?.name ?? TRAINEE_NAME}
              email={payload.trainee?.email ?? traineeEmail}
              size={32}
            />
          </button>
          {accountOpen ? (
            <div className="gmail-account">
              <p className="gmail-account-name">{payload.trainee?.name ?? TRAINEE_NAME}</p>
              <p className="gmail-account-email">{payload.trainee?.email ?? traineeEmail}</p>
              <p className="gmail-account-role">Role in exercise: {TRAINEE_NAME}</p>
              <button type="button" onClick={() => void resetExercise()} disabled={resetting}>
                {resetting ? "Resetting…" : "Reset my exercise"}
              </button>
              <button type="button" onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <div className={cn("gmail-progress", sending && "is-on")} />

      <div className="gmail-body">
        <nav className="gmail-nav">
          <button
            type="button"
            className="gmail-compose"
            onClick={() => {
              const first = characters[0];
              setComposeToId(first?.id ?? null);
              setComposeSubject(threadSubject(first?.email));
              setComposeOpen(true);
            }}
          >
            <MdIcon name="edit" size={24} />
            Compose
          </button>
          <button
            type="button"
            className="gmail-finish"
            onClick={() => void finishSimulation()}
            disabled={grading || resetting}
          >
            <MdIcon name="assignment_turned_in" size={22} />
            {grading ? "Grading…" : "Finish training"}
          </button>
          <button
            type="button"
            className="gmail-reset"
            onClick={() => void resetExercise()}
            disabled={resetting || sending || grading}
          >
            <MdIcon name="restart_alt" size={22} />
            {resetting ? "Resetting…" : "Reset exercise"}
          </button>
          {NAV.map((item) => {
            const count =
              item.id === "inbox" && unreadCount > 0 ? unreadCount : null;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "gmail-nav-item",
                  folder === item.id && "is-active"
                )}
                onClick={() => {
                  setFolder(item.id);
                  closeThread();
                  setTab("primary");
                  setView("mail");
                }}
              >
                <MdIcon
                  name={item.icon}
                  size={20}
                  filled={folder === item.id}
                />
                <span className="label">{item.label}</span>
                {count ? <span className="count">{count}</span> : null}
              </button>
            );
          })}
          <button
            type="button"
            className="gmail-nav-item"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <MdIcon name={moreOpen ? "expand_less" : "expand_more"} size={20} />
            <span className="label">More</span>
          </button>
          {moreOpen
            ? MORE_NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "gmail-nav-item",
                    folder === item.id && "is-active"
                  )}
                  onClick={() => {
                    setFolder(item.id);
                    closeThread();
                    setView("mail");
                  }}
                >
                  <MdIcon name={item.icon} size={20} />
                  <span className="label">{item.label}</span>
                </button>
              ))
            : null}
          <div className="gmail-nav-section">
            Labels
            <IconBtn name="add" label="Create new label" />
          </div>
          <button type="button" className="gmail-nav-item">
            <MdIcon name="label" size={20} />
            <span className="label">P1 · Nightfall</span>
          </button>
          {debrief ? (
            <button
              type="button"
              className={cn(
                "gmail-nav-item",
                view === "debrief" && "is-active"
              )}
              onClick={() => {
                closeThread();
                setView("debrief");
              }}
            >
              <MdIcon name="menu_book" size={20} filled={view === "debrief"} />
              <span className="label">Lessons learned</span>
            </button>
          ) : null}
        </nav>

        <section className="gmail-main">
          {view === "debrief" ? (
            grading || !debrief ? (
              <div className="debrief-loading">
                <MdIcon name="hourglass_top" size={28} />
                <h2>Preparing the assessment</h2>
                <p>
                  Scoring each outbound email against the PDPL ransomware
                  playbook.
                </p>
              </div>
            ) : (
              <DebriefReportView
                report={debrief}
                onBack={() => setView("mail")}
                onReset={() => void resetExercise()}
                resetting={resetting}
              />
            )
          ) : (
            <>
          <div className="gmail-toolbar">
            {inThread ? (
              <IconBtn name="arrow_back" label="Back to Inbox" onClick={closeThread} />
            ) : (
              <IconBtn name="check_box_outline_blank" label="Select" />
            )}
            <IconBtn
              name={inThread ? "archive" : "refresh"}
              label={inThread ? "Archive" : "Refresh"}
              onClick={inThread ? closeThread : () => void refresh()}
            />
            <IconBtn name="report" label="Report spam" />
            <IconBtn name="delete" label="Delete" />
            {inThread ? (
              <>
                <IconBtn
                  name="mail"
                  label="Mark as unread"
                  onClick={() => {
                    if (selectedCharacterId) {
                      markUnread(selectedCharacterId);
                      closeThread();
                    }
                  }}
                />
                <IconBtn name="schedule" label="Snooze" />
                <IconBtn name="drive_file_move" label="Move to" />
                <IconBtn name="label" label="Labels" />
                <IconBtn name="more_vert" label="More" />
              </>
            ) : (
              <IconBtn name="more_vert" label="More" />
            )}
            <div className="gmail-toolbar-right">
              <span>
                {inThread
                  ? `${
                      visibleCharacters.findIndex(
                        (row) => row.id === selectedCharacterId
                      ) + 1
                    } of ${visibleCharacters.length}`
                  : visibleCharacters.length
                    ? `1–${visibleCharacters.length} of ${visibleCharacters.length}`
                    : "0 of 0"}
              </span>
              <IconBtn name="chevron_left" label="Newer" disabled />
              <IconBtn name="chevron_right" label="Older" disabled />
            </div>
          </div>

          {!inThread && folder === "inbox" ? (
            <div className="gmail-tabs">
              {(
                [
                  { id: "primary" as const, label: "Primary", icon: "inbox" },
                  { id: "social" as const, label: "Social", icon: "group" },
                  {
                    id: "promotions" as const,
                    label: "Promotions",
                    icon: "local_offer",
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn("gmail-tab", tab === item.id && "is-active")}
                  onClick={() => setTab(item.id)}
                >
                  <MdIcon
                    name={item.icon}
                    size={20}
                    filled={tab === item.id}
                  />
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          {inThread && selectedCharacter ? (
            <div className="gmail-thread">
              <div className="gmail-subject-row">
                <h2>{threadSubject(selectedCharacter.email)}</h2>
                <span className="gmail-chip-inbox gmail-chip">Inbox</span>
                <span className="gmail-chip">P1</span>
                <div className="gmail-toolbar-right">
                  <IconBtn name="print" label="Print" />
                  <IconBtn name="open_in_new" label="In new window" />
                </div>
              </div>
              <div className="gmail-thread-scroll">
                {messageHistory.map((message, index) => {
                  const mine = message.sender_email === traineeEmail;
                  const authorName = mine ? TRAINEE_NAME : selectedCharacter.name;
                  const authorEmail = mine
                    ? traineeEmail
                    : selectedCharacter.email;
                  const isLast = index === messageHistory.length - 1;
                  const expanded =
                    isLast || expandedIds.has(message.id) || messageHistory.length <= 2;
                  if (!expanded) {
                    return (
                      <button
                        key={message.id}
                        type="button"
                        className="gmail-msg is-collapsed"
                        onClick={() =>
                          setExpandedIds((current) =>
                            new Set(current).add(message.id)
                          )
                        }
                      >
                        <GmailAvatar
                          name={authorName}
                          email={authorEmail}
                          size={32}
                          photo={mine ? traineePhoto : null}
                        />
                        <div className="gmail-from">{authorName}</div>
                        <div className="gmail-preview">
                          {snippet(message.content).slice(0, 80)}
                        </div>
                      </button>
                    );
                  }
                  return (
                    <article key={message.id} className="gmail-msg">
                      <GmailAvatar
                        name={authorName}
                        email={authorEmail}
                        size={40}
                        photo={mine ? traineePhoto : null}
                      />
                      <div>
                        <div className="gmail-msg-head">
                          <div className="gmail-msg-meta">
                            <div>
                              <span className="gmail-msg-name">{authorName}</span>{" "}
                              <span className="gmail-msg-email">
                                &lt;{authorEmail}&gt;
                              </span>
                            </div>
                            <div className="gmail-msg-to">
                              to {mine ? selectedCharacter.name : "me"} ▾
                            </div>
                          </div>
                          <div className="gmail-msg-side">
                            {formatGmailFullDate(message.created_at)}
                            <IconBtn name="star_border" label="Not starred" />
                            <IconBtn name="reply" label="Reply" onClick={() => setReplyOpen(true)} />
                            <IconBtn name="more_vert" label="More" />
                          </div>
                        </div>
                        <div className="gmail-msg-body">{message.content}</div>
                        {isLast && !replyOpen ? (
                          <div className="gmail-reply-actions">
                            <button
                              type="button"
                              className="gmail-pill"
                              onClick={() => setReplyOpen(true)}
                            >
                              <MdIcon name="reply" size={18} />
                              Reply
                            </button>
                            <button type="button" className="gmail-pill">
                              <MdIcon name="reply_all" size={18} />
                              Reply all
                            </button>
                            <button type="button" className="gmail-pill">
                              <MdIcon name="forward" size={18} />
                              Forward
                            </button>
                          </div>
                        ) : null}
                        {isLast && replyOpen ? (
                          <div className="gmail-reply-card">
                            <div className="gmail-reply-to">
                              <MdIcon name="reply" size={18} />
                              {selectedCharacter.name} ({selectedCharacter.email})
                            </div>
                            <textarea
                              value={draft}
                              autoFocus
                              onChange={(event) => setDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" &&
                                  (event.metaKey || event.ctrlKey)
                                ) {
                                  event.preventDefault();
                                  void sendReply();
                                }
                              }}
                              placeholder=""
                            />
                            <div className="gmail-reply-bar">
                              <button
                                type="button"
                                className="gmail-send"
                                onClick={() => void sendReply()}
                                disabled={sending || !draft.trim()}
                              >
                                Send
                              </button>
                              <IconBtn name="format_bold" label="Formatting options" />
                              <IconBtn name="attach_file" label="Attach files" />
                              <IconBtn name="link" label="Insert link" />
                              <IconBtn name="mood" label="Insert emoji" />
                              <IconBtn name="add_to_drive" label="Insert files using Drive" />
                              <IconBtn name="image" label="Insert photo" />
                              <IconBtn name="lock_clock" label="Toggle confidential mode" />
                              <IconBtn name="more_vert" label="More options" />
                              <span style={{ marginLeft: "auto" }}>
                                <IconBtn
                                  name="delete"
                                  label="Discard draft"
                                  onClick={() => {
                                    setReplyOpen(false);
                                    setDraft("");
                                  }}
                                />
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="gmail-list">
              {tab !== "primary" && folder === "inbox" ? (
                <div className="gmail-empty">
                  <h2>
                    {tab === "social"
                      ? "Your Social tab is empty"
                      : "Your Promotions tab is empty"}
                  </h2>
                  <p>
                    Mail from {tab === "social" ? "social networks" : "mailing lists"}
                    {" "}will show up here.
                  </p>
                </div>
              ) : emptyFolder ? (
                <div className="gmail-empty">
                  <h2>
                    {folder === "drafts"
                      ? "You don't have any saved drafts."
                      : folder === "snoozed"
                        ? "Nothing in Snoozed."
                        : folder === "spam"
                          ? "Hooray, no spam here!"
                          : "No conversations in Trash."}
                  </h2>
                  <p>
                    {folder === "drafts"
                      ? "Saving a draft inside a conversation keeps it here."
                      : "This training inbox starts empty in this folder."}
                  </p>
                </div>
              ) : visibleCharacters.length === 0 ? (
                <div className="gmail-empty">
                  <h2>No matching conversations.</h2>
                </div>
              ) : (
                visibleCharacters.map((character) => {
                  const last = latestMessage(messages, character, traineeEmail);
                  const unread = isThreadUnread(
                    messages,
                    character,
                    traineeEmail,
                    readAt[character.id]
                  );
                  const fromYou = last?.sender_email === traineeEmail;
                  const preview = last ? snippet(last.content) : "";
                  return (
                    <div
                      key={character.id}
                      className={cn(
                        "gmail-row",
                        unread ? "is-unread" : "is-read",
                        checked.has(character.id) && "is-checked"
                      )}
                      onClick={() => openThread(character.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") openThread(character.id);
                      }}
                      role="row"
                      tabIndex={0}
                    >
                      <button
                        type="button"
                        className="gmail-check"
                        aria-label="Select"
                        onClick={(event) => {
                          event.stopPropagation();
                          setChecked((current) => {
                            const next = new Set(current);
                            if (next.has(character.id)) next.delete(character.id);
                            else next.add(character.id);
                            return next;
                          });
                        }}
                      >
                        <MdIcon
                          name={
                            checked.has(character.id)
                              ? "check_box"
                              : "check_box_outline_blank"
                          }
                          size={18}
                        />
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "gmail-star",
                          starred.has(character.id) && "is-on"
                        )}
                        aria-label="Star"
                        onClick={(event) => {
                          event.stopPropagation();
                          setStarred((current) => {
                            const next = new Set(current);
                            if (next.has(character.id)) next.delete(character.id);
                            else next.add(character.id);
                            return next;
                          });
                        }}
                      >
                        <MdIcon
                          name="star"
                          filled={starred.has(character.id)}
                          size={20}
                        />
                      </button>
                      <div className="gmail-from">{character.name}</div>
                      <div className="gmail-snippet-cell">
                        <span className="gmail-subject">
                          {threadSubject(character.email)}
                        </span>
                        <span className="gmail-preview">
                          {" - "}
                          {fromYou ? "You: " : ""}
                          {preview}
                        </span>
                      </div>
                      <div className="gmail-row-end">
                        <div className="gmail-date">
                          {last ? formatGmailListDate(last.created_at) : ""}
                        </div>
                        <div className="gmail-row-actions">
                          <IconBtn name="archive" label="Archive" />
                          <IconBtn name="delete" label="Delete" />
                          <IconBtn
                            name="mail"
                            label="Mark as unread"
                            onClick={() => markUnread(character.id)}
                          />
                          <IconBtn name="schedule" label="Snooze" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
            </>
          )}
        </section>
      </div>

      {composeOpen ? (
        <div className="gmail-compose-window" role="dialog" aria-label="New Message">
          <div className="gmail-compose-title">
            <span>New Message</span>
            <IconBtn name="minimize" label="Minimize" />
            <IconBtn name="open_in_full" label="Full screen" />
            <IconBtn
              name="close"
              label="Save & close"
              onClick={() => setComposeOpen(false)}
            />
          </div>
          <div className="gmail-compose-field">
            <label htmlFor="gm-to">To</label>
            <select
              id="gm-to"
              value={composeToId ?? ""}
              onChange={(event) => {
                const nextId = event.target.value;
                setComposeToId(nextId);
                const next = characters.find((row) => row.id === nextId);
                setComposeSubject(threadSubject(next?.email));
              }}
            >
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name} &lt;{character.email}&gt;
                </option>
              ))}
            </select>
          </div>
          <div className="gmail-compose-field">
            <label htmlFor="gm-sub">Subject</label>
            <input
              id="gm-sub"
              value={composeSubject}
              onChange={(event) => setComposeSubject(event.target.value)}
            />
          </div>
          <textarea
            value={composeBody}
            onChange={(event) => setComposeBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void sendCompose();
              }
            }}
          />
          <div className="gmail-reply-bar">
            <button
              type="button"
              className="gmail-send"
              onClick={() => void sendCompose()}
              disabled={sending || !composeBody.trim()}
            >
              Send
            </button>
            <IconBtn name="format_bold" label="Formatting options" />
            <IconBtn name="attach_file" label="Attach files" />
            <IconBtn name="link" label="Insert link" />
            <IconBtn name="mood" label="Insert emoji" />
            <span style={{ marginLeft: "auto" }}>
              <IconBtn
                name="delete"
                label="Discard draft"
                onClick={() => {
                  setComposeOpen(false);
                  setComposeBody("");
                }}
              />
            </span>
          </div>
        </div>
      ) : null}
    </div>
    <SiteFooter />
    </div>
  );
}
