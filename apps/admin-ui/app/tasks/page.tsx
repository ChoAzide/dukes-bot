"use client";

import { useEffect, useState } from "react";
import type { BotConfig, TaskDefinition } from "@clerkbot/shared";
import { fetchConfig, updateConfig } from "../../src/api/client";

function normalizeTaskDefaults(): Partial<TaskDefinition> {
  return {
    id: "",
    title: "",
    active: true
  };
}

function cloneTask(t: TaskDefinition): TaskDefinition {
  return JSON.parse(JSON.stringify(t)) as TaskDefinition;
}

export default function TasksPage() {
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
        <h1 style={{ marginTop: 0 }}>Tasks</h1>
        <p>Loading config...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Tasks</h1>
        <p style={{ color: "crimson" }}>Failed to load config: {error}</p>
      </main>
    );
  }

  if (!cfg) {
    return (
      <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Tasks</h1>
        <p>No config found yet in the backend.</p>
      </main>
    );
  }

  function updateTask(idx: number, patch: Partial<TaskDefinition>) {
    setCfg((prev) => {
      if (!prev) return prev;
      const nextTasks = prev.tasks.map((t, i) => {
        if (i !== idx) return t;
        return { ...cloneTask(t), ...patch };
      });
      return { ...prev, tasks: nextTasks };
    });
  }

  function addTask(cadence: TaskDefinition["cadence"]) {
    setCfg((prev) => {
      if (!prev) return prev;
      const newTask: TaskDefinition = {
        ...(normalizeTaskDefaults() as any),
        id: `${cadence}_task_${prev.tasks.length + 1}`,
        title: "",
        cadence,
        active: true
      };
      return { ...prev, tasks: [...prev.tasks, newTask] };
    });
  }

  return (
    <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Tasks</h1>
      <p>Edit daily/weekly/monthly tasks. Task `id` is what the bot matches for `done <task>`.</p>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={() => addTask("daily")}>
          Add Daily Task
        </button>
        <button type="button" onClick={() => addTask("weekly")}>
          Add Weekly Task
        </button>
        <button type="button" onClick={() => addTask("monthly")}>
          Add Monthly Task
        </button>
        <button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th style={{ borderBottom: "1px solid rgba(0,0,0,0.12)", paddingBottom: 8 }}>Active</th>
            <th style={{ borderBottom: "1px solid rgba(0,0,0,0.12)", paddingBottom: 8 }}>Id</th>
            <th style={{ borderBottom: "1px solid rgba(0,0,0,0.12)", paddingBottom: 8 }}>Title (optional)</th>
            <th style={{ borderBottom: "1px solid rgba(0,0,0,0.12)", paddingBottom: 8 }}>Cadence</th>
          </tr>
        </thead>
        <tbody>
          {cfg.tasks.map((t, idx) => (
            <tr key={`${t.id}-${idx}`}>
              <td style={{ paddingTop: 10 }}>
                <input
                  type="checkbox"
                  checked={t.active}
                  onChange={(e) => updateTask(idx, { active: e.target.checked })}
                />
              </td>
              <td style={{ paddingTop: 10 }}>
                <input value={t.id} onChange={(e) => updateTask(idx, { id: e.target.value })} style={{ width: "100%" }} />
              </td>
              <td style={{ paddingTop: 10 }}>
                <input
                  value={t.title}
                  onChange={(e) => updateTask(idx, { title: e.target.value })}
                  style={{ width: "100%" }}
                />
              </td>
              <td style={{ paddingTop: 10 }}>
                <select value={t.cadence} onChange={(e) => updateTask(idx, { cadence: e.target.value as any })}>
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                  <option value="monthly">monthly</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

