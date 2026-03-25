export default function RotationPage() {
  return (
    <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Rotation</h1>
      <p>This screen will edit roster order and the shared-week day split rule.</p>
      <ul>
        <li>Roster order for single-clerk weeks</li>
        <li>Shared-week settings (enabled, week numbers, Jonas/Julie day mapping)</li>
        <li>Preview next 6 weeks</li>
      </ul>
    </main>
  );
}

