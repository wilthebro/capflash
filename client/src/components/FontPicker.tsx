import { useEffect, useMemo, useState } from 'react';
import { FALLBACK_FONTS, listSystemFonts, loadFontFile } from '../lib/fonts';
import { useEditorStore } from '../store/editorStore';

interface Props {
  value: string;
  onChange: (family: string) => void;
}

/** Font select: curated + system fonts (Chromium queryLocalFonts) + uploaded fonts. */
export function FontPicker({ value, onChange }: Props) {
  const fonts = useEditorStore((s) => s.fonts);
  const addFont = useEditorStore((s) => s.addFont);
  const addNotice = useEditorStore((s) => s.addNotice);
  const [systemFonts, setSystemFonts] = useState<string[]>(FALLBACK_FONTS);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setSystemFonts(await listSystemFonts());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const rec = await loadFontFile(file);
      addFont(rec);
      addNotice(`Font "${rec.family}" loaded.`);
      onChange(rec.family);
    } catch (err) {
      addNotice(`Could not load font ${file.name}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  const all = useMemo(() => {
    const set = new Set(systemFonts);
    for (const f of fonts) set.add(f.family);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [systemFonts, fonts]);

  return (
    <div className="font-picker">
      <select value={value} onChange={(e) => onChange(e.target.value)} title="Font family">
        {all.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
        {!all.includes(value) && <option value={value}>{value}</option>}
      </select>
      <button className="icon-button" onClick={() => void refresh()} disabled={loading} title="Reload system fonts">
        ⟳
      </button>
      <label className="upload-button" title="Upload a font (.ttf / .otf / .woff)">
        Upload font
        <input type="file" accept=".ttf,.otf,.woff,.woff2" hidden onChange={(e) => void onUpload(e)} />
      </label>
    </div>
  );
}
