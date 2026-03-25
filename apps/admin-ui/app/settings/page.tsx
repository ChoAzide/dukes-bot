"use client";

import { useEffect, useState } from "react";
import type { BotConfig } from "@clerkbot/shared";
import { fetchConfig, updateConfig } from "../../src/api/client";

export default function SettingsPage() {
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
        <h1 style={{ marginTop: 0 }}>Settings</h1>
        <p>Loading config...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Settings</h1>
        <p style={{ color: "crimson" }}>Failed to load config: {error}</p>
      </main>
    );
  }

  if (!cfg) {
    return (
      <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Settings</h1>
        <p>No config found yet in the backend.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Settings</h1>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Reminder schedule</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <label>
            <div style={{ opacity: 0.75, marginBottom: 4 }}>Hour</div>
            <input
              type="number"
              min={0}
              max={23}
              value={cfg.reminder.hour}
              onChange={(e) => setCfg((prev) => (prev ? { ...prev, reminder: { ...prev.reminder, hour: Number(e.target.value) } } : prev))}
            />
          </label>
          <label>
            <div style={{ opacity: 0.75, marginBottom: 4 }}>Minute</div>
            <input
              type="number"
              min={0}
              max={59}
              value={cfg.reminder.minute}
              onChange={(e) => setCfg((prev) => (prev ? { ...prev, reminder: { ...prev.reminder, minute: Number(e.target.value) } } : prev))}
            />
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={cfg.reminder.weekdaysOnly}
              onChange={(e) => setCfg((prev) => (prev ? { ...prev, reminder: { ...prev.reminder, weekdaysOnly: e.target.checked } } : prev))}
            />
            Remind only on weekdays (Mon–Fri)
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ opacity: 0.75, marginBottom: 4 }}>Timezone string</div>
          <input
            value={cfg.rotation.timezone}
            onChange={(e) => setCfg((prev) => (prev ? { ...prev, rotation: { ...prev.rotation, timezone: e.target.value } } : prev))}
            style={{ width: "100%" }}
          />
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Holiday behavior</h2>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={cfg.holiday.skipDailyOnHolidays}
            onChange={(e) => setCfg((prev) => (prev ? { ...prev, holiday: { ...prev.holiday, skipDailyOnHolidays: e.target.checked } } : prev))}
          />
          Skip daily tasks on Danish public holidays; weekly/monthly due shifts to next working day
        </label>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Announcement channel</h2>
        <p style={{ opacity: 0.8 }}>
          Store the Teams channel <code>conversation.id</code> (the bot must be able to join that channel and send proactive messages).
        </p>
        <input
          value={cfg.announcement.teamsChannelConversationId ?? ""}
          onChange={(e) => setCfg((prev) => (prev ? { ...prev, announcement: { ...prev.announcement, teamsChannelConversationId: e.target.value } } : prev))}
          style={{ width: "100%" }}
        />
      </section>

      <div style={{ marginTop: 22 }}>
        <button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </main>
  );
}

