const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Purely a visual placeholder for now — this is where client-facing
// online booking will eventually plug in, showing available session
// dates the same way the admin sees them here.
export default function SalesPage() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <p style={{ color: '#666', maxWidth: 560, marginTop: 20 }}>
        A booking calendar will live here — once online booking is built, clients will be able to
        see your availability and reserve a session date directly. For now, this is a preview of
        the layout.
      </p>

      <div
        style={{
          marginTop: 24,
          maxWidth: 480,
          border: '1px solid #e5e0d8',
          borderRadius: 8,
          padding: 20,
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontFamily: 'var(--font-serif), Georgia, serif' }}>{monthLabel}</strong>
          <span
            style={{
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#b8860b',
              background: 'rgba(196, 166, 114, 0.15)',
              padding: '3px 8px',
              borderRadius: 4,
            }}
          >
            Coming soon
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
            marginTop: 16,
            fontSize: 11,
            color: '#999',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {WEEKDAYS.map((day) => (
            <div key={day} style={{ textAlign: 'center', padding: '4px 0' }}>
              {day}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
            marginTop: 4,
          }}
        >
          {cells.map((day, i) => {
            const isToday = day === today.getDate();
            return (
              <div
                key={i}
                style={{
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  fontSize: 13,
                  color: day ? '#444' : 'transparent',
                  background: isToday ? 'var(--ink)' : 'transparent',
                  ...(isToday ? { color: 'var(--cream)' } : {}),
                }}
              >
                {day ?? '.'}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
