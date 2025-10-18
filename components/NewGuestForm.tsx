import React, { useEffect, useMemo, useRef, useState } from 'react';

type FormState = {
  guest: string;
  company: string;
  department: string;
  responsible: string;
  plusOne: string;
};

type CreatePayload = {
  guest: string;
  company?: string;
  department?: string;
  responsible?: string;
  plusOne?: string;
};

type NewGuestFormProps = {
  onCreated: (row: {
    id: string;
    department?: string;
    responsible?: string;
    company?: string;
    guest: string;
    plusOne?: string;
  }) => void;
  onCancel?: () => void;
};

const initialState: FormState = {
  guest: '',
  company: '',
  department: '',
  responsible: '',
  plusOne: '',
};

export function NewGuestForm({ onCreated, onCancel }: NewGuestFormProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const guestInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    guestInputRef.current?.focus();
  }, []);

  const trimmedForm = useMemo(() => ({
    guest: form.guest.trim(),
    company: form.company.trim(),
    department: form.department.trim(),
    responsible: form.responsible.trim(),
    plusOne: form.plusOne.trim(),
  }), [form]);

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trimmedForm.guest) {
      setError('Guest name is required.');
      guestInputRef.current?.focus();
      return;
    }

    setError(null);
    setIsLoading(true);

    const payload: CreatePayload = {
      guest: trimmedForm.guest,
      company: trimmedForm.company || undefined,
      department: trimmedForm.department || undefined,
      responsible: trimmedForm.responsible || undefined,
      plusOne: trimmedForm.plusOne || undefined,
    };

    try {
      const response = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        const message = data?.error || data?.body || data?.message || 'Create failed';
        setError(typeof message === 'string' ? message : 'Create failed');
        if (response.status === 400) {
          guestInputRef.current?.focus();
        }
        return;
      }

      onCreated({
        id: data.id as string,
        guest: trimmedForm.guest,
        company: trimmedForm.company || undefined,
        department: trimmedForm.department || undefined,
        responsible: trimmedForm.responsible || undefined,
        plusOne: trimmedForm.plusOne || undefined,
      });

      setForm(initialState);
      setError(null);
      guestInputRef.current?.focus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel?.();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="bg-white/10 backdrop-blur border border-white/30 rounded-xl p-4"
      style={{ display: 'grid', gap: '12px' }}
    >
      <div style={{ display: 'grid', gap: '8px' }}>
        <label className="text-sm font-medium text-white" htmlFor="new-guest-name">
          Guest
        </label>
        <input
          id="new-guest-name"
          ref={guestInputRef}
          value={form.guest}
          onChange={(event) => handleChange('guest', event.target.value)}
          placeholder="Enter guest name"
          className="rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 px-3 py-2"
          required
          autoFocus
        />
        {error && (
          <p className="text-sm text-red-200" role="alert">
            {error}
          </p>
        )}
      </div>
      <div style={{ display: 'grid', gap: '8px' }}>
        <label className="text-sm font-medium text-white" htmlFor="new-guest-company">
          Company <span className="text-white text-xs">(optional)</span>
        </label>
        <input
          id="new-guest-company"
          value={form.company}
          onChange={(event) => handleChange('company', event.target.value)}
          placeholder="Company"
          className="rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 px-3 py-2"
        />
      </div>
      <div style={{ display: 'grid', gap: '8px' }}>
        <label className="text-sm font-medium text-white" htmlFor="new-guest-department">
          PMZ Department <span className="text-white text-xs">(optional)</span>
        </label>
        <input
          id="new-guest-department"
          value={form.department}
          onChange={(event) => handleChange('department', event.target.value)}
          placeholder="Department"
          className="rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 px-3 py-2"
        />
      </div>
      <div style={{ display: 'grid', gap: '8px' }}>
        <label className="text-sm font-medium text-white" htmlFor="new-guest-responsible">
          PMZ Responsible <span className="text-white text-xs">(optional)</span>
        </label>
        <input
          id="new-guest-responsible"
          value={form.responsible}
          onChange={(event) => handleChange('responsible', event.target.value)}
          placeholder="Responsible person"
          className="rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 px-3 py-2"
        />
      </div>
      <div style={{ display: 'grid', gap: '8px' }}>
        <label className="text-sm font-medium text-white" htmlFor="new-guest-plus-one">
          Plus one <span className="text-white text-xs">(optional)</span>
        </label>
        <input
          id="new-guest-plus-one"
          value={form.plusOne}
          onChange={(event) => handleChange('plusOne', event.target.value)}
          placeholder="Plus one name"
          className="rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-white/20 border border-white/40 text-white px-4 py-2 font-semibold transition disabled:opacity-50"
      >
        {isLoading ? 'Adding…' : 'Add guest'}
      </button>
    </form>
  );
}

export default NewGuestForm;
