export default async function PortalPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Debug Mode</h1>
      <p>DATABASE_URL: {process.env.DATABASE_URL ? 'Set ✓' : 'Missing ✗'}</p>
      <p>Node Env: {process.env.NODE_ENV || 'unknown'}</p>
    </div>
  );
}
