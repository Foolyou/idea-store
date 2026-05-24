"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "ok" | "fail";

export default function TestPage() {
  const [dbStatus, setDb] = useState<Status>("idle");
  const [dbMsg, setDbMsg] = useState("");
  const [utStatus, setUt] = useState<Status>("idle");
  const [utMsg, setUtMsg] = useState("");

  async function testDB() {
    setDb("loading");
    try {
      const r = await fetch("/api/test-db");
      const d = await r.json();
      setDb(d.ok ? "ok" : "fail");
      setDbMsg(JSON.stringify(d, null, 2));
    } catch {
      setDb("fail");
      setDbMsg("Network error");
    }
  }

  async function testUT() {
    setUt("loading");
    try {
      const r = await fetch("/api/test-uploadthing");
      const d = await r.json();
      setUt(d.ok ? "ok" : "fail");
      setUtMsg(JSON.stringify(d, null, 2));
    } catch {
      setUt("fail");
      setUtMsg("Network error");
    }
  }

  const badge = (s: Status) => {
    if (s === "ok") return "🟢 ";
    if (s === "fail") return "🔴 ";
    if (s === "loading") return "⏳ ";
    return "⚪ ";
  };

  return (
    <div className="max-w-app mx-auto p-lg min-h-screen">
      <h1 className="text-title text-text-primary mb-lg">服务连接测试</h1>

      <div className="space-y-md">
        {/* Turso */}
        <div className="bg-bg-card rounded-md p-lg shadow-card">
          <h2 className="text-body font-bold text-text-primary mb-sm">
            {badge(dbStatus)}Turso 数据库
          </h2>
          <button
            onClick={testDB}
            className="text-caption text-white bg-action-primary rounded-full px-lg py-sm"
          >
            测试连接
          </button>
          {dbMsg && (
            <pre className="mt-sm text-caption text-text-secondary bg-bg-page p-sm rounded-sm overflow-auto max-h-[200px]">
              {dbMsg}
            </pre>
          )}
        </div>

        {/* UploadThing */}
        <div className="bg-bg-card rounded-md p-lg shadow-card">
          <h2 className="text-body font-bold text-text-primary mb-sm">
            {badge(utStatus)}UploadThing 图片服务
          </h2>
          <button
            onClick={testUT}
            className="text-caption text-white bg-action-primary rounded-full px-lg py-sm"
          >
            测试连接
          </button>
          {utMsg && (
            <pre className="mt-sm text-caption text-text-secondary bg-bg-page p-sm rounded-sm overflow-auto max-h-[200px]">
              {utMsg}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
