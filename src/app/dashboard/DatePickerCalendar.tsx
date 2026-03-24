'use client';

import { useState } from 'react';
import { getTodayStr } from './helpers';

interface DatePickerCalendarProps {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

export default function DatePickerCalendar({
  value,
  onChange,
  onClose,
}: DatePickerCalendarProps) {
  const todayStr = getTodayStr();
  const parsed = value ? value.split('-').map(Number) : null;
  const [viewYear, setViewYear] = useState(parsed ? parsed[0] : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed[1] - 1 : new Date().getMonth());
  const [pendingDate, setPendingDate] = useState(value || todayStr);
  const [isClosing, setIsClosing] = useState(false);

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function triggerClose(confirm: boolean) {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      if (confirm) onChange(pendingDate);
      onClose();
    }, 180);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(d: number) {
    const m = String(viewMonth + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    setPendingDate(`${viewYear}-${m}-${day}`);
  }

  const isPendingToday = pendingDate === todayStr;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => triggerClose(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
          animation: isClosing ? 'backdropFadeOut 0.18s ease-in forwards' : 'backdropFade 0.15s ease',
        }}
      />

      {/* Floating centered card */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201,
        background: '#252535',
        borderRadius: '20px',
        width: 'min(340px, calc(100vw - 2rem))',
        boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
        overflow: 'hidden',
        animation: isClosing
          ? 'popOut 0.18s ease-in forwards'
          : 'popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>

        {/* Header: "When?" centred + ✕ */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 1rem 0.875rem' }}>
          <span style={{ fontWeight: '700', fontSize: '1rem', color: '#f1f1f8' }}>When?</span>
          <button
            type="button"
            onClick={() => triggerClose(false)}
            style={{
              position: 'absolute',
              right: '1rem',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#9b9bb8',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* ⭐ Today quick row */}
        <button
          type="button"
          onClick={() => {
            setPendingDate(todayStr);
            const now = new Date();
            setViewYear(now.getFullYear());
            setViewMonth(now.getMonth());
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.125rem',
            background: 'transparent',
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            color: '#f1f1f8',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '500',
            textAlign: 'left',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ fontSize: '1rem' }}>⭐</span>
          <span>Today</span>
          {isPendingToday && (
            <span style={{ marginLeft: 'auto', color: '#BC9BF3', fontSize: '1rem' }}>✓</span>
          )}
        </button>

        {/* Month navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.625rem 0.875rem 0.375rem',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          <button
            type="button"
            onClick={prevMonth}
            style={{ background: 'none', border: 'none', color: '#9b9bb8', cursor: 'pointer', fontSize: '1.3rem', padding: '0.25rem 0.5rem', lineHeight: 1 }}
          >‹</button>
          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#f1f1f8' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            style={{ background: 'none', border: 'none', color: '#9b9bb8', cursor: 'pointer', fontSize: '1.3rem', padding: '0.25rem 0.5rem', lineHeight: 1 }}
          >›</button>
        </div>

        {/* Calendar grid */}
        <div style={{ padding: '0 0.875rem 0.75rem' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.125rem' }}>
            {DAY_HEADERS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: '600', color: '#5a5a78', padding: '0.25rem 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const cellStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isToday = cellStr === todayStr;
              const isSelected = cellStr === pendingDate;
              return (
                <button
                  key={i}
                  type="button"
                  className="day-btn"
                  onClick={() => selectDay(d)}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '50%',
                    border: 'none',
                    background: isSelected
                      ? '#8DB654'
                      : 'transparent',
                    color: isSelected ? 'white' : isToday ? '#BC9BF3' : '#d4d4e8',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: isSelected || isToday ? '700' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.12s, transform 0.1s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(188,155,243,0.18)'; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  {isToday && !isSelected && (
                    <span style={{ position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: '#BC9BF3' }} />
                  )}
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer: Done */}
        <div style={{ padding: '0.5rem 0.875rem 1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            type="button"
            onClick={() => triggerClose(true)}
            style={{
              width: '100%',
              padding: '0.8rem',
              background: '#8DB654',
              border: 'none',
              borderRadius: '14px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '700',
              letterSpacing: '0.01em',
              transition: 'opacity 0.15s, transform 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
