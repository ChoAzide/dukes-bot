export default function TasksPage() {
  return (
    <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Tasks</h1>
      <p>This screen will edit daily/weekly/monthly tasks (stored in Azure Table Storage via the backend API).</p>
      <p>
        MVP wiring: the UI will call <code>/api/config</code> on the backend, render tasks, and allow add/edit/disable.
      </p>
    </main>
  );
}

