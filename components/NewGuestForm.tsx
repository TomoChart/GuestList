import React, { useEffect, useRef, useState } from 'react';

export type NewGuestFormProps = {
  onCreated: (row: {
    id: string;
    department?: string;
    responsible?: string;
    company?: string;
    guest: string;
    plusOne?: string;
  }) => void;
};

type FormState = {
  guest: string;
  company: string;
  department: string;
  responsible: string;
  plusOne: string;
};

export default function NewGuestForm({ onCreated }: NewGuestFormProps) {
  const [form, setForm] = useState<FormState>({
    guest: '',
    company: '',
    department: '',
    responsible: '',
    plusOne: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guestRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    guestRef.current?.focus();
  }, []);

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (key === 'guest' && value.trim().length > 0) {
      setError(null);
    }
  };

  const resetForm = () => {
    setForm({ guest: '', company: '', department: '', responsible: '', plusOne: '' });
    setError(null);
    requestAnimationFrame(() => {
      guestRef.current?.focus();
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const guest = form.guest.trim();
    const company = form.company.trim();
    const department = form.department.trim();
    const responsible = form.responsible.trim();
    const plusOne = form.plusOne.trim();

    if (!guest) {
      setError('Guest name is required.');
      guestRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest,
          company: company || undefined,
          department: department || undefined,
          responsible: responsible || undefined,
          plusOne: plusOne || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const message = (data && (data.error || data.body || data.message)) || 'Create failed';
        if (res.status === 400) {
          setError(typeof message === 'string' ? message : 'Guest name is required.');
        } else {
          setError(typeof message === 'string' ? message : 'Failed to add guest.');
        }
        throw new Error(typeof message === 'string' ? message : 'Create failed');
      }

      onCreated({
        id: data.id as string,
        guest,
        company: company || undefined,
        department: department || undefined,
        responsible: responsible || undefined,
        plusOne: plusOne || undefined,
      });
      resetForm();
    } catch (err) {
      console.error('[NewGuestForm] submit failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      const search = document.getElementById('guest-list-search') as HTMLInputElement | null;
      search?.focus();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="bg-white/10 backdrop-blur border border-white/30 rounded-xl p-4 text-white"
      style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '1040px', margin: '0 auto 24px' }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Guest
          <input
            ref={guestRef}
            autoFocus
            required
            value={form.guest}
            onChange={(event) => handleChange('guest', event.target.value)}
            className="rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 px-3 py-2"
            placeholder="Full name"
          />
          {error && (
            <span className="text-xs text-red-200" role="alert">
              {error}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Company
          <input
            value={form.company}
            onChange={(event) => handleChange('company', event.target.value)}
            className="rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 px-3 py-2"
            placeholder="Company name (optional)"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          PMZ Department
          <input
            value={form.department}
            onChange={(event) => handleChange('department', event.target.value)}
            className="rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 px-3 py-2"
            placeholder="Department (optional)"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          PMZ Responsible
          <input
            value={form.responsible}
            onChange={(event) => handleChange('responsible', event.target.value)}
            className="rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 px-3 py-2"
            placeholder="Responsible person (optional)"
          />
        </label>
      </div>
      <label className="flex flex-col gap-2 text-sm">
        Plus one
        <input
          value={form.plusOne}
          onChange={(event) => handleChange('plusOne', event.target.value)}
          className="rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 px-3 py-2"
          placeholder="Plus one name (optional)"
        />
      </label>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-emerald-500/80 text-slate-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Adding…' : 'Add guest'}
        </button>
      </div>
    </form>
  );
}
