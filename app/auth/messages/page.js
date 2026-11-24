"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  EnvelopeIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  PencilSquareIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useUser } from "@/components/UserContext";
import { Notice, Spinner, initials } from "@/components/ui";
import { api } from "@/lib/api";

const FOLDERS = [
  { key: "inbox", label: "Inbox", icon: EnvelopeIcon },
  { key: "sent", label: "Sent", icon: PaperAirplaneIcon },
  { key: "archived", label: "Archived", icon: ArchiveBoxIcon },
  { key: "trash", label: "Trash", icon: TrashIcon },
];

export default function MessagesPageWrapper() {
  // useSearchParams needs a Suspense boundary in the App Router
  return (
    <Suspense fallback={<Spinner />}>
      <MessagesPage />
    </Suspense>
  );
}

function MessagesPage() {
  const user = useUser();
  const me = String(user.id);
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState(null);
  const [directory, setDirectory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [folder, setFolder] = useState("inbox");
  const [compose, setCompose] = useState(null); // null | { to, subject, content }
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    Promise.all([api("/api/messages"), api("/api/directory")])
      .then(([msgs, dir]) => {
        setMessages(msgs);
        setDirectory(dir.filter((d) => String(d.id) !== me));
      })
      .catch((e) => setNotice({ type: "error", text: e.message }));
  }, [me]);

  // /auth/messages?to=1004 opens a new message to that person
  useEffect(() => {
    const to = searchParams.get("to");
    if (to && to !== me) setCompose({ to, subject: "", content: "" });
  }, [searchParams, me]);

  const lists = useMemo(() => {
    const all = messages || [];
    return {
      inbox: all.filter((m) => m.to === me && !m.archived && !m.deleted),
      sent: all.filter((m) => m.from === me && !m.deleted && !m.archived),
      archived: all.filter((m) => m.archived && !m.deleted),
      trash: all.filter((m) => m.deleted),
    };
  }, [messages, me]);

  if (!messages) return notice ? <div className="p-6"><Notice notice={notice} /></div> : <Spinner />;

  const displayed = lists[folder];
  const selected = messages.find((m) => m.id === selectedId) || null;
  const unread = lists.inbox.filter((m) => !m.read).length;

  async function act(id, action) {
    try {
      const updated = await api("/api/messages", { method: "PATCH", body: { id, action } });
      if (action === "purge") {
        setMessages((list) => list.filter((m) => m.id !== id));
      } else {
        setMessages((list) => list.map((m) => (m.id === id ? updated : m)));
      }
      if (action !== "read") setSelectedId(null);
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    }
  }

  function open(msg) {
    setSelectedId(msg.id);
    if (!msg.read && msg.to === me) act(msg.id, "read");
  }

  async function send(e) {
    e.preventDefault();
    try {
      const created = await api("/api/messages", { method: "POST", body: compose });
      setMessages((list) => [...created, ...list]);
      setCompose(null);
      setNotice({
        type: "success",
        text: created.length > 1 ? `Message sent to ${created.length} people.` : `Message sent to ${created[0].to_name}.`,
      });
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  }

  const otherParty = (m) => (m.from === me ? `To: ${m.to_name}` : m.from_name);

  return (
    <div className="p-4 h-[calc(100vh-4.5rem)] flex flex-col gap-3">
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <div className="flex flex-1 min-h-0 bg-white rounded-lg shadow-md overflow-hidden border">
        {/* Folders */}
        <div className="w-56 border-r bg-gray-50 p-4 flex flex-col shrink-0">
          <h2 className="text-lg font-semibold mb-4 text-blue-600 flex items-center gap-2">
            <EnvelopeIcon className="h-5 w-5" /> Messages
          </h2>
          <button
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg shadow hover:bg-blue-700"
            onClick={() => setCompose({ to: "", subject: "", content: "" })}
          >
            <PencilSquareIcon className="h-5 w-5" /> New Message
          </button>
          <div className="mt-6 space-y-1 text-gray-600 text-sm">
            {FOLDERS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:text-blue-600 hover:bg-blue-50 ${
                  folder === key ? "text-blue-600 font-medium bg-blue-50" : ""
                }`}
                onClick={() => {
                  setFolder(key);
                  setSelectedId(null);
                }}
              >
                <Icon className="h-4 w-4" /> {label}
                <span className="ml-auto text-xs text-gray-400">
                  {key === "inbox" && unread > 0 ? <b className="text-blue-600">{unread}</b> : lists[key].length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="w-2/5 border-r overflow-y-auto">
          {displayed.length === 0 && <div className="p-6 text-gray-500">No messages here.</div>}
          {displayed.map((msg) => (
            <div
              key={msg.id}
              onClick={() => open(msg)}
              className={`flex items-center gap-4 p-4 border-b cursor-pointer hover:bg-blue-50 transition ${
                selectedId === msg.id ? "bg-blue-100" : ""
              }`}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                {initials(...(msg.from === me ? msg.to_name : msg.from_name).split(" "))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <span className={`truncate ${!msg.read ? "font-bold" : "font-medium"}`}>{otherParty(msg)}</span>
                  <span className="text-xs text-gray-400 shrink-0">{format(new Date(msg.date), "PP")}</span>
                </div>
                <p className="truncate text-sm text-gray-700">
                  <span className={`mr-1 ${!msg.read ? "font-bold" : "font-medium"}`}>{msg.subject}</span>
                  <span className="text-gray-500">{msg.content}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reading panel */}
        <div className="flex-1 p-6 overflow-y-auto">
          {selected ? (
            <div>
              <h2 className="text-xl font-semibold mb-2">{selected.subject}</h2>
              <p className="text-sm text-gray-500">From: {selected.from_name}</p>
              <p className="text-sm text-gray-500">To: {selected.to_name}</p>
              <p className="text-sm text-gray-500 mb-4">{format(new Date(selected.date), "PPpp")}</p>
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{selected.content}</p>

              <div className="flex flex-wrap gap-4 mt-6 text-sm text-gray-600 border-t pt-4">
                {selected.to === me && !selected.deleted && (
                  <button
                    className="flex items-center gap-1 hover:text-blue-600"
                    onClick={() =>
                      setCompose({
                        to: selected.from,
                        subject: selected.subject.startsWith("Re: ") ? selected.subject : `Re: ${selected.subject}`,
                        content: "",
                      })
                    }
                  >
                    <ArrowUturnLeftIcon className="h-4 w-4" /> Reply
                  </button>
                )}
                {!selected.deleted &&
                  (selected.archived ? (
                    <button className="flex items-center gap-1 hover:text-blue-600" onClick={() => act(selected.id, "unarchive")}>
                      <ArchiveBoxXMarkIcon className="h-4 w-4" /> Unarchive
                    </button>
                  ) : (
                    <button className="flex items-center gap-1 hover:text-blue-600" onClick={() => act(selected.id, "archive")}>
                      <ArchiveBoxIcon className="h-4 w-4" /> Archive
                    </button>
                  ))}
                {selected.deleted ? (
                  <>
                    <button className="flex items-center gap-1 hover:text-blue-600" onClick={() => act(selected.id, "restore")}>
                      <ArrowPathIcon className="h-4 w-4" /> Restore
                    </button>
                    <button
                      className="flex items-center gap-1 hover:text-red-600"
                      onClick={() => window.confirm("Delete this message forever?") && act(selected.id, "purge")}
                    >
                      <XMarkIcon className="h-4 w-4" /> Delete forever
                    </button>
                  </>
                ) : (
                  <button className="flex items-center gap-1 hover:text-red-600" onClick={() => act(selected.id, "delete")}>
                    <TrashIcon className="h-4 w-4" /> Delete
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-500 flex items-center justify-center h-full">Select a message to read</div>
          )}
        </div>
      </div>

      {compose && (
        <ComposeModal
          compose={compose}
          setCompose={setCompose}
          onSend={send}
          directory={directory}
          canMessageAll={user.role === "admin"}
        />
      )}
    </div>
  );
}

function ComposeModal({ compose, setCompose, onSend, directory, canMessageAll }) {
  const set = (key) => (e) => setCompose((c) => ({ ...c, [key]: e.target.value }));
  const recipient = directory.find((d) => String(d.id) === String(compose.to));
  const [search, setSearch] = useState("");

  const matches = search
    ? directory
        .filter((d) => `${d.name} ${d.department} ${d.job_title}`.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 6)
    : [];

  return (
    <div className="fixed inset-0 bg-gray-800/40 flex items-center justify-center z-50 p-4" onClick={() => setCompose(null)}>
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-3 right-3 text-gray-500 hover:text-black" onClick={() => setCompose(null)} aria-label="Close">
          ✕
        </button>
        <h2 className="text-lg font-semibold mb-4">New Message</h2>
        <form onSubmit={onSend} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">To</label>
            {compose.to ? (
              <div className="flex items-center justify-between border border-gray-300 rounded px-2 py-1.5 bg-blue-50">
                <span>
                  {compose.to === "all" ? "Everyone" : recipient ? `${recipient.name} · ${recipient.department}` : `Employee #${compose.to}`}
                </span>
                <button type="button" className="text-gray-500 hover:text-black" onClick={() => setCompose((c) => ({ ...c, to: "" }))}>
                  ✕
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type a name or department…"
                  autoComplete="off"
                  autoFocus
                  className="w-full border border-gray-300 rounded px-2 py-1.5"
                />
                <ul className="border border-gray-200 mt-1 rounded bg-white max-h-48 overflow-auto empty:hidden">
                  {canMessageAll && (
                    <li
                      onClick={() => setCompose((c) => ({ ...c, to: "all" }))}
                      className="px-2 py-1.5 hover:bg-gray-100 cursor-pointer font-medium text-blue-700"
                    >
                      📣 Everyone
                    </li>
                  )}
                  {matches.map((d) => (
                    <li
                      key={d.id}
                      onClick={() => {
                        setCompose((c) => ({ ...c, to: String(d.id) }));
                        setSearch("");
                      }}
                      className="px-2 py-1.5 hover:bg-gray-100 cursor-pointer"
                    >
                      {d.name} <span className="text-xs text-gray-500">· {d.job_title} · {d.department}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div>
            <label className="block mb-1 font-medium" htmlFor="subject">Subject</label>
            <input id="subject" type="text" required maxLength={200} value={compose.subject} onChange={set("subject")} className="w-full border border-gray-300 rounded px-2 py-1.5" />
          </div>

          <div>
            <label className="block mb-1 font-medium" htmlFor="content">Message</label>
            <textarea id="content" required maxLength={5000} rows={6} value={compose.content} onChange={set("content")} className="w-full border border-gray-300 rounded px-2 py-1.5 resize-y" />
          </div>

          <button
            type="submit"
            disabled={!compose.to}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <PaperAirplaneIcon className="w-4 h-4" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
