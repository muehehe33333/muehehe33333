import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Trash2, ExternalLink, ShieldCheck, UploadCloud, File, FolderLock, Edit3, X } from 'lucide-react';

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

  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('KTP / Identitas');
    setFile(null);
  };

  const handleUploadOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Judul dokumen wajib diisi!');
    if (!editingId && !file) return alert('Pilih file untuk diupload!');
    
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // JIKA MODE EDIT (Hanya ubah nama & kategori, tanpa ubah file)
      if (editingId) {
        await supabase.from('documents').update({ title, category }).eq('id', editingId);
      } 
      // JIKA MODE UPLOAD BARU
      else if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);

        if (uploadError) {
          alert('Gagal mengupload file: ' + uploadError.message);
          setUploading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
        await supabase.from('documents').insert({ user_id: user.id, title, category, file_url: publicUrl });
      }

      resetForm();
      fetchDocuments();
    }
    setUploading(false);
  };

  const handleEditClick = (doc: Document) => {
    setEditingId(doc.id);
    setTitle(doc.title);
    setCategory(doc.category);
    setFile(null); // Kosongkan file karena kita tidak mengubah file fisiknya
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!window.confirm('Yakin ingin menghapus dokumen ini secara permanen?')) return;
    await supabase.from('documents').delete().eq('id', id);
    const fileName = fileUrl.split('/').pop();
    if (fileName) { await supabase.storage.from('documents').remove([fileName]); }
    if (editingId === id) resetForm();
    fetchDocuments();
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'KTP / Identitas': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Kartu Keluarga': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Ijazah / Transkrip': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Sertifikat': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-200 text-slate-700 border-slate-300';
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-slate-900 text-white p-7 md:p-8 rounded-[2rem] shadow-lg flex items-center gap-5 overflow-hidden relative">
        <div className="relative z-10 p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl backdrop-blur-sm border border-emerald-500/30">
          <ShieldCheck size={32} />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black tracking-tight">Brankas Dokumen</h2>
          <p className="text-emerald-100/70 text-sm mt-1">Penyimpanan terenkripsi untuk berkas vital Anda.</p>
        </div>
        <FolderLock size={200} className="absolute -right-10 -bottom-10 text-emerald-900 opacity-50 rotate-12 pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DAFTAR DOKUMEN TERSIMPAN (Kiri & Tengah di Desktop) */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm flex flex-col h-[600px] order-2 lg:order-1">
          <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-50 pb-4">
            <h3 className="font-bold text-lg text-slate-800">Arsip Tersimpan</h3>
            <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm">{documents.length} File</span>
          </div>

          <div className="overflow-y-auto pr-2 flex-1 [&::-webkit-scrollbar]:hidden">
            {documents.length === 0 ? (
              <div className="text-center text-slate-400 py-10 bg-slate-50 rounded-[1.5rem] border border-dashed border-slate-200">
                Brankas masih kosong.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map(doc => (
                  <div key={doc.id} className="bg-slate-50/80 border border-slate-100 p-5 rounded-[1.5rem] hover:bg-slate-50 hover:shadow-sm transition-all flex flex-col group">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`p-3 rounded-2xl shrink-0 border ${getCategoryColor(doc.category)}`}>
                        <File size={24} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 text-base mb-1 truncate">{doc.title}</h4>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{doc.category}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-auto border-t border-slate-200/60 pt-4">
                      <a href={doc.file_url} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 text-xs font-bold transition-all shadow-sm">
                        <ExternalLink size={14} /> Lihat File
                      </a>
                      {/* ACTION BUTTONS */}
                      <div className="flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClick(doc)} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 transition-all shadow-sm">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => handleDelete(doc.id, doc.file_url)} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FORM UPLOAD & EDIT (Kanan di Desktop) */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm h-fit order-1 lg:order-2 transition-all">
          <form onSubmit={handleUploadOrEdit} className="space-y-5">
            <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-800">
                {editingId ? 'Edit Info Dokumen' : 'Upload Dokumen'}
              </h4>
              {editingId && (
                <button type="button" onClick={resetForm} className="text-xs font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg hover:bg-rose-100 flex items-center gap-1">
                  <X size={12}/> Batal
                </button>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Nama Dokumen</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: KTP Asli" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-100" required />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Kategori</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-100 text-slate-700">
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {/* Sembunyikan input file jika sedang mode edit nama */}
            {!editingId && (
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Pilih File (Gambar/PDF)</label>
                 <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-[1.5rem] py-8 hover:bg-emerald-50 hover:border-emerald-200 transition-all group">
                   <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:text-emerald-500 transition-colors">
                     <UploadCloud size={24} className="text-slate-400 group-hover:text-emerald-500" />
                   </div>
                   <span className="text-sm font-bold text-slate-600 text-center px-4 leading-tight">{file ? file.name : 'Ketuk untuk pilih file dari perangkat'}</span>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Maks 5 MB</span>
                   <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                 </label>
              </div>
            )}
            
            {editingId && (
              <div className="bg-emerald-50 p-4 rounded-xl text-xs text-emerald-700 font-medium border border-emerald-100">
                File fisik dokumen tidak bisa diubah. Hapus dan upload ulang jika ingin mengganti file.
              </div>
            )}

            <button type="submit" disabled={uploading} className={`w-full text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4 text-sm ${editingId ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'}`}>
              {uploading ? <Loader2 size={18} className="animate-spin" /> : editingId ? <Edit3 size={18} /> : <Plus size={18} />} 
              {uploading ? 'Memproses...' : editingId ? 'Simpan Perubahan' : 'Simpan ke Brankas'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}