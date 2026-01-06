export default function EnvDebug() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <h2>Env Debug</h2>

      <div style={{ marginTop: 12 }}>
        <div><b>VITE_SUPABASE_URL:</b></div>
        <div style={{ wordBreak: "break-all" }}>{String(url)}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div><b>VITE_SUPABASE_ANON_KEY exists:</b></div>
        <div>{key ? "YES" : "NO"}</div>
      </div>
    </div>
  );
}