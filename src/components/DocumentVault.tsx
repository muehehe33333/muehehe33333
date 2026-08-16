import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, FileText, Trash2, ExternalLink, ShieldCheck, UploadCloud, File } from 'lucide-react';

type Document = {
  id: string;
  title: string;
  category: string;
  file_url: string;
};

export default function DocumentVault() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('KTP / Identitas');
  const [file, setFile] = useState<File | null>(null);

  const categories = ['KTP / Identitas', 'Kartu Keluarga', 'Ijazah / Transkrip', 'Sertifikat', 'Lainnya'];

  useEffect(() => { fetchDocuments(); }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setDocuments(data);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) return alert('Pilih file dan isi judul dokumen!');
    
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      
      // FIX: Menghapus deklarasi 'uploadData' yang tidak terpakai
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) {
        alert('Gagal mengupload file: ' + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);

      await supabase.from('documents').insert({
        user_id: user.id,
        title,
        category,
        file_url: publicUrl
      });

      setTitle('');
      setFile(null);
      fetchDocuments();
    }
    setUploading(false);
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!window.confirm('Yakin ingin menghapus dokumen ini secara permanen?')) return;
    
    await supabase.from('documents').delete().eq('id', id);
    
    const fileName = fileUrl.split('/').pop();
    if (fileName) {
      await supabase.storage.from('documents').remove([fileName]);
    }
    
    fetchDocuments();
  };

  if (loading) return <div className="animate-pulse h-64 bg-slate-100 rounded-2xl flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-500">
      
      <div className="bg-slate-900 p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2 text-white">
            <ShieldCheck size={24} className="text-emerald-400" />
            <h3 className="font-bold text-xl">Brankas Dokumen</h3>
          </div>
          <p className="text-sm text-slate-400">Penyimpanan aman KTP, Kartu Keluarga, dan sertifikat penting.</p>
        </div>
        <FileText size={100} className="absolute -bottom-6 -right-6 text-slate-800 opacity-50 rotate-12" />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleUpload} className="space-y-4">
          <h4 className="font-bold text-sm uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-2">Upload Dokumen Baru</h4>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nama Dokumen</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: KTP Asli" className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50" required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Kategori</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50">
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">Pilih File (Gambar/PDF)</label>
             <div className="flex items-center gap-3">
               <label className="flex-1 cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl py-6 hover:bg-slate-100 transition">
                 <UploadCloud size={24} className="text-slate-400 mb-2" />
                 <span className="text-xs font-bold text-slate-600">{file ? file.name : 'Ketuk untuk upload file'}</span>
                 <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
               </label>
             </div>
          </div>

          <button type="submit" disabled={uploading} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 mt-2">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} 
            {uploading ? 'Mengamankan...' : 'Simpan ke Brankas'}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h4 className="font-bold text-sm uppercase tracking-wider text-slate-500 ml-2">Arsip Tersimpan</h4>
        {documents.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-10 bg-slate-50 rounded-xl border border-slate-200">Brankas masih kosong.</p>
        ) : documents.map(doc => (
          <div key={doc.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600"><File size={20} /></div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm leading-tight">{doc.title}</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{doc.category}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={doc.file_url} target="_blank" rel="noreferrer" className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"><ExternalLink size={16} /></a>
              <button onClick={() => handleDelete(doc.id, doc.file_url)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}