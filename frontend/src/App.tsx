import FormPanel from './components/FormPanel';
import ChatPanel from './components/ChatPanel';

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Elevated Header */}
      <header style={{
        padding: '16px 24px',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '32px', height: '32px', 
            borderRadius: '6px', 
            backgroundColor: 'var(--primary-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 'bold'
          }}>
            AI
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
              HCP Engagement → Log Interaction
            </div>
            <h1 style={{ fontSize: '16px', margin: 0, color: 'var(--text-primary)' }}>
              Log Interaction
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '24px', overflowY: 'auto' }}>
          <FormPanel />
        </div>
        <div style={{ borderLeft: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-chat)' }}>
          <ChatPanel />
        </div>
      </main>
    </div>
  );
}

export default App;
