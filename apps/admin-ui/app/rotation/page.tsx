"use client";

import { useEffect, useState } from "react";
import type { BotConfig, ClerkUser, Weekday } from "@clerkbot/shared";
import { assignedClerkUserIdForDay, isoWeekNumber, isoWeekday } from "@clerkbot/shared";
import { fetchConfig, updateConfig } from "../../src/api/client";

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

const weekdays: { id: Weekday; label: string }[] = [
  { id: 1, label: "Mon (1)" },
  { id: 2, label: "Tue (2)" },
  { id: 3, label: "Wed (3)" },
  { id: 4, label: "Thu (4)" },
  { id: 5, label: "Fri (5)" }
];

export default function RotationPage() {
  const [cfg, setCfg] = useState<BotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchConfig()
      .then((c) => {
        if (!alive) return;
        setCfg(c);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message ?? String(e));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function onSave() {
    if (!cfg) return;
    setSaving(true);
    try {
      await updateConfig(cfg);
      alert("Config saved.");
    } catch (e: any) {
      alert(`Save failed: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Rotation</h1>
        <p>Loading config...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Rotation</h1>
        <p style={{ color: "crimson" }}>Failed to load config: {error}</p>
      </main>
    );
  }

  if (!cfg) {
    return (
      <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Rotation</h1>
        <p>No config found yet in the backend.</p>
      </main>
    );
  }

  const sharedUsers = cfg.rotation.sharedWeekRule.users;
  const userA: ClerkUser | undefined = sharedUsers[0];
  const userB: ClerkUser | undefined = sharedUsers[1];

  function startOfIsoWeekMonday(d: Date): Date {
    const weekday = isoWeekday(d); // 1=Mon ... 7=Sun
    const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    nd.setDate(nd.getDate() - (weekday - 1));
    return nd;
  }

  function addDays(d: Date, days: number): Date {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd;
  }

  const previewWeeks = Array.from({ length: 6 }, (_, i) => {
    const thisMonday = startOfIsoWeekMonday(new Date());
    const weekDate = addDays(thisMonday, i * 7);
    const weekNumber = isoWeekNumber(weekDate);
    const sharedEnabled = cfg.rotation.sharedWeekRule.enabled;
    const isShared = sharedEnabled && cfg.rotation.sharedWeekRule.weekNumbers.includes(weekNumber);

    if (isShared) {
      const split: Record<string, Weekday[]> = {} as any;
      const weekdays: Weekday[] = [1, 2, 3, 4, 5];
      for (const wd of weekdays) {
        const dayDate = addDays(weekDate, wd - 1);
        const userId = assignedClerkUserIdForDay(cfg.rotation, dayDate);
        if (!split[userId]) split[userId] = [];
        split[userId]!.push(wd);
      }

      const splitText = Object.entries(split)
        .map(([userId, wds]) => {
          const u = cfg.rotation.sharedWeekRule.users.find((x) => x.userId === userId);
          const range = wds.join(",");
          return `${u?.displayName ?? userId} (weekdays ${range})`;
        })
        .join(" + ");

      return { weekNumber, label: `Shared: ${splitText}` };
    }

    const clerkUserId = assignedClerkUserIdForDay(cfg.rotation, weekDate);
    const clerk = cfg.rotation.roster.find((u) => u.userId === clerkUserId);
    return { weekNumber, label: clerk?.displayName ?? clerkUserId };
  });

  function updateRoster(idx: number, patch: Partial<ClerkUser>) {
    setCfg((prev) => {
      if (!prev) return prev;
      const nextRoster = prev.rotation.roster.map((u, i) => (i === idx ? { ...u, ...patch } : u));
      return { ...prev, rotation: { ...prev.rotation, roster: nextRoster } };
    });
  }

  function updateSharedUser(idx: number, patch: Partial<ClerkUser>) {
    setCfg((prev) => {
      if (!prev) return prev;
      const nextUsers = prev.rotation.sharedWeekRule.users.map((u, i) => (i === idx ? { ...u, ...patch } : u));
      return { ...prev, rotation: { ...prev.rotation, sharedWeekRule: { ...prev.rotation.sharedWeekRule, users: nextUsers } } };
    });
  }

  function setSharedWeekNumbers(raw: string) {
    const nums = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));

    setCfg((prev) => {
      if (!prev) return prev;
      return { ...prev, rotation: { ...prev.rotation, sharedWeekRule: { ...prev.rotation.sharedWeekRule, weekNumbers: nums } } };
    });
  }

  function setWeekdayAssignment(weekday: Weekday, userId: string) {
    setCfg((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rotation: {
          ...prev.rotation,
          sharedWeekRule: {
            ...prev.rotation.sharedWeekRule,
            weekdayAssignment: { ...prev.rotation.sharedWeekRule.weekdayAssignment, [weekday]: userId }
          }
        }
      };
    });
  }

  return (
    <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Rotation</h1>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Single-clerk roster (single weeks)</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ borderBottom: "1px solid rgba(0,0,0,0.12)", paddingBottom: 8 }}>Display name</th>
              <th style={{ borderBottom: "1px solid rgba(0,0,0,0.12)", paddingBottom: 8 }}>UserId</th>
            </tr>
          </thead>
          <tbody>
            {cfg.rotation.roster.map((u, idx) => (
              <tr key={`${u.userId}-${idx}`}>
                <td style={{ paddingTop: 10 }}>
                  <input value={u.displayName} onChange={(e) => updateRoster(idx, { displayName: e.target.value })} style={{ width: "100%" }} />
                </td>
                <td style={{ paddingTop: 10 }}>
                  <input value={u.userId} onChange={(e) => updateRoster(idx, { userId: e.target.value })} style={{ width: "100%" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Shared weeks (two people split the days)</h2>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={cfg.rotation.sharedWeekRule.enabled}
              onChange={(e) => {
                setCfg((prev) => {
                  if (!prev) return prev;
                  return { ...prev, rotation: { ...prev.rotation, sharedWeekRule: { ...prev.rotation.sharedWeekRule, enabled: e.target.checked } } };
                });
              }}
            />
            Shared weeks enabled
          </label>

          <div>
            <div style={{ opacity: 0.75, marginBottom: 4 }}>Shared week numbers (ISO week)</div>
            <input
              value={cfg.rotation.sharedWeekRule.weekNumbers.join(",")}
              onChange={(e) => setSharedWeekNumbers(e.target.value)}
              style={{ width: 360 }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          {sharedUsers.map((u, idx) => (
            <div key={`${u.userId}-${idx}`} style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Shared user {idx === 0 ? "A" : "B"}</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ opacity: 0.75, marginBottom: 4 }}>Display name</div>
                <input
                  value={u.displayName}
                  onChange={(e) => updateSharedUser(idx, { displayName: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <div style={{ opacity: 0.75, marginBottom: 4 }}>UserId</div>
                <input value={u.userId} onChange={(e) => updateSharedUser(idx, { userId: e.target.value })} style={{ width: "100%" }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ opacity: 0.75, marginBottom: 8 }}>Day split mapping (Mon–Fri)</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ borderBottom: "1px solid rgba(0,0,0,0.12)", paddingBottom: 8 }}>Weekday</th>
                <th style={{ borderBottom: "1px solid rgba(0,0,0,0.12)", paddingBottom: 8 }}>Assigned user</th>
              </tr>
            </thead>
            <tbody>
              {weekdays.map(({ id, label }) => {
                const aId = userA?.userId ?? "";
                const bId = userB?.userId ?? "";
                return (
                  <tr key={id}>
                    <td style={{ paddingTop: 10 }}>{label}</td>
                    <td style={{ paddingTop: 10 }}>
                      <select
                        value={cfg.rotation.sharedWeekRule.weekdayAssignment[id]}
                        onChange={(e) => setWeekdayAssignment(id, e.target.value)}
                        style={{ width: 360 }}
                      >
                        <option value={aId}>{userA?.displayName ?? "User A"}</option>
                        <option value={bId}>{userB?.displayName ?? "User B"}</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Preview next 6 ISO weeks</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ borderBottom: "1px solid rgba(0,0,0,0.12)", paddingBottom: 8 }}>ISO week</th>
              <th style={{ borderBottom: "1px solid rgba(0,0,0,0.12)", paddingBottom: 8 }}>Clerk(s)</th>
            </tr>
          </thead>
          <tbody>
            {previewWeeks.map((w) => (
              <tr key={w.weekNumber}>
                <td style={{ paddingTop: 10 }}>{w.weekNumber}</td>
                <td style={{ paddingTop: 10 }}>{w.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div style={{ marginTop: 22 }}>
        <button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </main>
  );
}

