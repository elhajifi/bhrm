"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  EnvelopeIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  ArchiveBoxIcon,
  PencilSquareIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("inbox"); // inbox | sent

  async function fetchData() {
    try {
      setLoading(true);
      const [messagesRes, employeesRes, userRes] = await Promise.all([
        fetch("/api/messages"),
        fetch("/api/data"),
        fetch("/api/me"),
      ]);

      if (!messagesRes.ok || !employeesRes.ok || !userRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [messagesData, employeesData, userData] = await Promise.all([
        messagesRes.json(),
        employeesRes.json(),
        userRes.json(),
      ]);

      setMessages(messagesData);
      setEmployees(employeesData);
      setCurrentUser(userData.user || null);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function resolveEmployeeName(id) {
    const employee = employees.find((e) => e.id.toString() === id?.toString());
    if (employee)
      return `${employee.profile.first_name} ${employee.profile.last_name}`;
    return null;
  }

  function getSenderName(msg) {
    if (msg.from_name) return msg.from_name;
    if (msg.from && msg.from !== "admin") {
      const name = resolveEmployeeName(msg.from);
      if (name) return name;
      return msg.from;
    }
    if (msg.from === "admin") return "Admin";
    return "Unknown";
  }

  function getSenderInitials(msg) {
    const name = getSenderName(msg);
    if (!name || name === "Admin" || name === "Unknown") return "A";
    const parts = name.split(" ");
    return parts.map((p) => p[0].toUpperCase()).join("");
  }

  const handleToChange = (e) => {
    const value = e.target.value;
    setTo(value);
    if (value.trim() === "") return setSuggestions([]);

    const matches = employees
      .filter(
        (emp) =>
          `${emp.profile.first_name} ${emp.profile.last_name}`
            .toLowerCase()
            .includes(value.toLowerCase()) || emp.id.toString().includes(value)
      )
      .slice(0, 5);

    setSuggestions(matches);
  };

  const handleSelectSuggestion = (emp) => {
    setTo(`${emp.profile.first_name} ${emp.profile.last_name} (ID: ${emp.id})`);
    setSuggestions([]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject || !content || !to)
      return alert("To, subject, and content are required");

    let toId = to;
    if (isNaN(Number(to))) {
      const match = /\(ID:\s*(\d+)\)/.exec(to);
      if (match) {
        toId = match[1];
      } else {
        const emp = employees.find(
          (emp) =>
            `${emp.profile.first_name} ${emp.profile.last_name} (ID: ${emp.id})` === to
        );
        if (!emp) return alert("Recipient not found");
        toId = emp.id;
      }
    }

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: String(toId),
        subject,
        content,
        from: String(currentUser?.id || "admin"),
      }),
    });

    if (res.ok) {
      const newMsg = await res.json();
      setMessages((prev) => [newMsg, ...prev]);
      setSubject("");
      setContent("");
      setTo("");
      setShowCompose(false);
    } else {
      alert("Failed to send message");
    }
  };

  // Split messages into inbox and sent
  const inboxMessages = messages.filter(
    (msg) => msg.to === String(currentUser?.id)
  );
  const sentMessages = messages.filter(
    (msg) => msg.from === String(currentUser?.id)
  );

  const displayedMessages =
    activeTab === "inbox" ? inboxMessages : sentMessages;

  return (
    <div className="flex h-full bg-white rounded-lg shadow-md overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r bg-gray-50 p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4 text-blue-600 flex items-center gap-2">
          <EnvelopeIcon className="h-5 w-5" /> Messages
        </h2>
        <button
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg shadow hover:bg-blue-700"
          onClick={() => setShowCompose(true)}
        >
          <PencilSquareIcon className="h-5 w-5" /> New Message
        </button>
        <div className="mt-6 space-y-2 text-gray-600 text-sm">
          <div
            className={`flex items-center gap-2 cursor-pointer hover:text-blue-600 ${
              activeTab === "inbox" ? "text-blue-600 font-medium" : ""
            }`}
            onClick={() => setActiveTab("inbox")}
          >
            <EnvelopeIcon className="h-4 w-4" /> Inbox
          </div>
          <div
            className={`flex items-center gap-2 cursor-pointer hover:text-blue-600 ${
              activeTab === "sent" ? "text-blue-600 font-medium" : ""
            }`}
            onClick={() => setActiveTab("sent")}
          >
            <PaperAirplaneIcon className="h-4 w-4" /> Sent
          </div>
          <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
            <ArchiveBoxIcon className="h-4 w-4" /> Archived
          </div>
          <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
            <TrashIcon className="h-4 w-4" /> Trash
          </div>
        </div>
      </div>

      {/* Inbox / Sent */}
      <div className="flex-1 flex">
        {/* Message List */}
        <div className="w-1/2 border-r overflow-y-auto">
          {loading && <div className="p-6 text-gray-500">Loading…</div>}
          {error && <div className="p-6 text-red-500">{error}</div>}
          {!loading && !error && displayedMessages.length === 0 && (
            <div className="p-6 text-gray-500">No messages to display.</div>
          )}
          {displayedMessages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => setSelectedMessage(msg)}
              className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-blue-50 transition ${
                selectedMessage?.id === msg.id ? "bg-blue-100" : ""
              }`}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                {getSenderInitials(msg)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <span className="font-medium truncate">
                    {getSenderName(msg)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {format(new Date(msg.date), "PP")}
                  </span>
                </div>
                <p className="truncate text-sm text-gray-700">
                  <span className="font-medium mr-1">{msg.subject}</span>
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reading Panel */}
        <div className="w-1/2 p-6 overflow-y-auto">
          {selectedMessage ? (
            <div>
              <h2 className="text-xl font-semibold mb-2">
                {selectedMessage.subject}
              </h2>
              <p className="text-sm text-gray-500 mb-2">
                From: {getSenderName(selectedMessage)}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {format(new Date(selectedMessage.date), "PPpp")}
              </p>
              <p className="text-gray-800 leading-relaxed">
                {selectedMessage.content}
              </p>
              {activeTab === "inbox" && (
                <div className="flex gap-3 mt-6 text-sm text-gray-600">
                  <button
                    className="flex items-center gap-1 hover:text-blue-600"
                    onClick={() => {
                      setShowCompose(true);
                      setTo(getSenderName(selectedMessage));
                      setSubject("Re: " + selectedMessage.subject);
                    }}
                  >
                    <ArrowUturnLeftIcon className="h-4 w-4" /> Reply
                  </button>
                  <button className="flex items-center gap-1 hover:text-blue-600">
                    <ArchiveBoxIcon className="h-4 w-4" /> Archive
                  </button>
                  <button className="flex items-center gap-1 hover:text-red-600">
                    <TrashIcon className="h-4 w-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 flex items-center justify-center h-full">
              Select a message to read
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-gray-800/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
              onClick={() => setShowCompose(false)}
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-4">New Message</h2>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">To:</label>
                <input
                  type="text"
                  value={to}
                  onChange={handleToChange}
                  placeholder='Employee ID or "all"'
                  autoComplete="off"
                  className="w-full border border-gray-300 rounded px-2 py-1"
                />
                {suggestions.length > 0 && (
                  <ul className="border border-gray-300 mt-1 rounded bg-white max-h-40 overflow-auto">
                    {suggestions.map((emp) => (
                      <li
                        key={emp.id}
                        onClick={() => handleSelectSuggestion(emp)}
                        className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                      >
                        {emp.profile.first_name} {emp.profile.last_name} (ID:{" "}
                        {emp.id})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block mb-1 font-medium">Subject:</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Content:</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 resize-none"
                />
              </div>

              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
