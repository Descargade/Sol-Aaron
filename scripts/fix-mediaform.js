const fs = require('fs');

const oldMediaForm = `function MediaForm({ item, onClose }: { item: MediaItem | null; onClose: () => void }) { const request = useRequestUploadUrl(); const create = useCreateMedia(); const qc = useQueryClient(); const [file, setFile] = useState<File | null>(null); const [progress, setProgress] = useState(''); const submit = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); let objectPath = String(f.get('objectPath') || ''); if (file) { setProgress('preparando subida…'); const result = await request.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type as any } }); setProgress('subiendo archivo…'); await fetch(result.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file }); objectPath = result.objectPath; } if (!objectPath) return; create.mutate({ data: { title: String(f.get('title')), description: String(f.get('description')), date: String(f.get('date')), type: file?.type.startsWith('video') ? 'video' : 'image', objectPath, albumId: f.get('albumId') ? Number(f.get('albumId')) : null, isPublic: f.get('isPublic') === 'on' } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListMediaQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminStoryQueryKey() }); onClose(); } }); }; return <Modal title="Subir un recuerdo" onClose={onClose}><form onSubmit={submit}><label className="file-drop"><UploadCloud size={24} /><strong>{file ? file.name : 'Elegí una foto o video'}</strong><small>JPG, PNG, WEBP, MP4 · hasta 50 MB</small><input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} data-testid="input-media-file" /></label><Field name="title" label="título" required /><Field name="date" label="fecha" type="date" required /><Field name="description" label="descripción" /><label>álbum<select name="albumId" data-testid="select-media-album"><option value="">sin álbum</option>{albums.map((a) => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label><label className="check-line"><input type="checkbox" name="isPublic" defaultChecked data-testid="checkbox-media-public" /> visible en la historia pública</label><p className="form-hint">{progress}</p><button className="button dark full" disabled={create.isPending || request.isPending} data-testid="button-save-media"><UploadCloud size={16} /> {progress || 'guardar archivo'}</button></form></Modal>; }`;

const newMediaForm = `function MediaForm({ item, onClose }: { item: MediaItem | null; onClose: () => void }) {
  const request = useRequestUploadUrl();
  const create = useCreateMedia();
  const update = useUpdateMedia();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(item?.objectPath || null);
  const [progress, setProgress] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    let objectPath = item?.objectPath || '';

    if (file) {
      setProgress('preparando subida…');
      const result = await request.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type as any } });
      setProgress('subiendo archivo…');
      await fetch(result.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      objectPath = result.objectPath;
    }

    const payload = {
      title: String(f.get('title')),
      description: String(f.get('description')),
      date: String(f.get('date')),
      type: file?.type.startsWith('video') ? 'video' : (item?.type || 'image'),
      objectPath,
      albumId: f.get('albumId') ? Number(f.get('albumId')) : null,
      isPublic: f.get('isPublic') === 'on'
    };
    const done = () => { qc.invalidateQueries({ queryKey: getListMediaQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminStoryQueryKey() }); onClose(); };

    if (item) update.mutate({ id: item.id, data: payload }, { onSuccess: done });
    else create.mutate({ data: payload }, { onSuccess: done });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const isVideo = item?.type === 'video' || file?.type.startsWith('video');

  return <Modal title={item ? 'Editar recuerdo' : 'Subir un recuerdo'} onClose={onClose}><form onSubmit={submit}><label className="file-drop"><UploadCloud size={24} /><strong>{file ? file.name : 'Elegí una foto o video'}</strong><small>JPG, PNG, WEBP, MP4 · hasta 50 MB</small><input type="file" accept="image/*,video/*" onChange={handleFileChange} data-testid="input-media-file" /></label>{previewUrl && <div className="media-preview-form">{isVideo ? <CirclePlay size={48} /> : <img src={previewUrl} alt="Vista previa" />}</div>}<Field name="title" label="título" defaultValue={item?.title} required /><Field name="date" label="fecha" type="date" defaultValue={item?.date} required /><Field name="description" label="descripción" defaultValue={item?.description} textarea /><label>álbum<select name="albumId" data-testid="select-media-album"><option value="">sin álbum</option>{albums.map((a) => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label><label className="check-line"><input type="checkbox" name="isPublic" defaultChecked={item?.isPublic ?? false} data-testid="checkbox-media-public" /> público</label><p className="form-hint">El enlace externo permite abrir el archivo en su fuente original (YouTube, Drive, etc.) al hacer click en la tarjeta.</p><button className="button dark full" data-testid="button-save-media"><Check size={16} /> {item ? 'guardar cambios' : 'subir recuerdo'}</button></form></Modal>;
}`;

const content = fs.readFileSync('C:\\Users\\user\\Desktop\\Sol&Aaron\\artifacts\\nuestra-historia\\src\\App.tsx', 'utf8');
if (content.includes(oldMediaForm)) {
  const newContent = content.replace(oldMediaForm, newMediaForm);
  fs.writeFileSync('C:\\Users\\user\\Desktop\\Sol&Aaron\\artifacts\\nuestra-historia\\src\\App.tsx', newContent, 'utf8');
  console.log('REPLACED!');
} else {
  console.log('NOT FOUND - checking...');
  const idx = content.indexOf('function MediaForm({ item, onClose }: { item: MediaItem | null; onClose: () => void })');
  console.log('Index:', idx);
  if (idx >= 0) {
    console.log('Found at', idx);
    console.log(content.substring(idx, idx + 300));
  }
}