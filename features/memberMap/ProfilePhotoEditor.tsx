import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Props = { photoUrl: string; disabled?: boolean; onSaved: (url: string) => void; onBusyChange: (busy: boolean) => void };
export default function ProfilePhotoEditor({ photoUrl, disabled, onSaved, onBusyChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function savePhoto() {
    if (!file || saving) return;
    setSaving(true); onBusyChange(true); setError('');
    try {
      const photo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read this photo.'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/member/update-photo', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not save your photo.');
      onSaved(json.photoUrl); setFile(null);
      toast.success('Photo saved to Mighty Networks and your map profile.');
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); onBusyChange(false); }
  }

  return <section className="rounded-lg border border-gray-200 p-3 space-y-3" aria-label="Profile photo">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Profile photo</p>
    <div className="flex flex-wrap items-center gap-4">
      <div className="w-24 h-24 shrink-0 rounded-md bg-gray-100 overflow-hidden">
        {preview || photoUrl ? <img src={preview || photoUrl} alt="Profile photo preview" className="w-full h-full object-contain" /> :
          <span className="flex h-full items-center justify-center text-xs text-gray-500">No photo</span>}
      </div>
      <label className="min-w-0 flex-1 text-sm">
        <span className="block font-medium mb-1">Choose a new photo</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || saving}
          className="block w-full text-sm" onChange={e => {
            const selected = e.target.files?.[0]; e.target.value = '';
            if (!selected) return;
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 5 * 1024 * 1024) {
              setError('Choose a JPG, PNG, or WebP image under 5 MB.'); return;
            }
            setError(''); setFile(selected);
          }} />
      </label>
    </div>
    <p className="text-xs text-gray-600">JPG, PNG, or WebP, up to 5 MB. Your full photo is preserved. Save photo updates Mighty Networks and this map separately from the fields below.</p>
    {file && <div className="flex gap-3">
      <button type="button" onClick={savePhoto} disabled={disabled || saving} className="rounded-md bg-green-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60">{saving ? 'Saving photo…' : 'Save photo'}</button>
      <button type="button" onClick={() => { setFile(null); setError(''); }} disabled={disabled || saving} className="text-sm px-3 py-2">Discard photo</button>
    </div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
