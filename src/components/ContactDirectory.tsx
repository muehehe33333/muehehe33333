import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Users, Search, Phone, BookOpen, Trash2, Edit3, X } from 'lucide-react';

type Contact = {
  id: string;
  name: string;
  category: 'Dosen' | 'Kakak Tingkat' | 'Teman Kampus' | 'Relasi Luar' | 'Lainnya';
  phone: string;
  major: string;
  notes: string;
};

export default function ContactDirectory() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Dosen' | 'Kakak Tingkat' | 'Teman Kampus' | 'Relasi Luar' | 'Lainnya'>('Teman Kampus');
  const [phone, setPhone] = useState('');
  const [major, setMajor] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      if (data) setContacts(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setName(''); setCategory('Teman Kampus'); setPhone(''); setMajor(''); setNotes('');
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const payload = { user_id: user.id, name, category, phone, major, notes };
      
      if (editingId) {
        await supabase.from('contacts').update(payload).eq('id', editingId);
      } else {
        await supabase.from('contacts').insert(payload);
      }
      
      resetForm();
      fetchContacts();
    }
    setSubmitting(false);
  };

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setName(contact.name);
    setCategory(contact.category);
    setPhone(contact.phone || '');
    setMajor(contact.major || '');
    setNotes(contact.notes || '');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus kontak ini dari direktori?')) return;
    await supabase.from('contacts').delete().eq('id', id);
    if (editingId === id) resetForm();
    fetchContacts();
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.major && c.major.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <div className="animate-pulse h-64 bg-slate-100 rounded-xl flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[600px]">
      
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users size={24} className="text-emerald-400" />
            <h3 className="font-bold text-xl">Contact Directory</h3>
          </div>
          <p className="text-xs text-slate-400">Pusat data jaringan relasi, kating, dosen, dan rekan perantauan.</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="Cari nama, prodi, catatan..." 
            className="w-full bg-slate-800 text-white pl-9 pr-4 py-2 rounded-lg text-xs border border-slate-700 focus:outline-none focus:border-slate-500"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-full flex-1">
        
        {/* Kiri: Form Input / Edit */}
        <div className="w-full lg:w-1/3 p-6 border-r border-slate-100 bg-white relative">
          {editingId && (
            <div className="absolute top-0 left-0 right-0 bg-yellow-100 text-yellow-800 text-xs font-bold p-2 text-center flex justify-between px-4">
              <span>MODE EDIT KONTAK</span>
              <button onClick={resetForm}><X size={14}/></button>
            </div>
          )}

          <form onSubmit={handleSaveContact} className={`bg-slate-50 border border-slate-200 p-6 rounded-xl shadow-sm space-y-4 ${editingId ? 'mt-6' : ''}`}>
            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-200 pb-2">
              {editingId ? 'Edit Kontak' : 'Tambah Kontak Baru'}
            </h4>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Budi Santoso" className="w-full px-3 py-2 border rounded-md text-sm" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full px-3 py-2 border rounded-md text-sm bg-white">
                  <option value="Teman Kampus">Teman Kampus</option>
                  <option value="Kakak Tingkat">Kakak Tingkat</option>
                  <option value="Dosen">Dosen</option>
                  <option value="Relasi Luar">Relasi Luar</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812..." className="w-full px-3 py-2 border rounded-md text-sm font-mono" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jurusan / Instansi</label>
              <input type="text" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Contoh: D3 Teknik Informatika" className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Personal / Keahlian</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Misal: Jago mikrokontroler, asisten lab jarkom." rows={3} className="w-full px-3 py-2 border rounded-md text-sm resize-none"></textarea>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={submitting} className={`flex-1 text-white font-bold py-2.5 rounded-md transition-colors text-sm flex items-center justify-center gap-2 ${editingId ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-slate-900 hover:bg-black'}`}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : editingId ? <Edit3 size={16} /> : <Plus size={16} />} 
                {editingId ? 'Simpan Perubahan' : 'Simpan Kontak'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="bg-slate-200 text-slate-700 px-4 py-2.5 rounded-md text-sm font-bold">Batal</button>
              )}
            </div>
          </form>
        </div>

        {/* Kanan: Grid Kartu Kontak */}
        <div className="w-full lg:w-2/3 p-6 bg-slate-50 overflow-y-auto max-h-[600px]">
          <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-200 pb-2">Daftar Relasi ({filteredContacts.length})</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredContacts.length === 0 ? (
              <p className="col-span-2 text-center text-sm text-slate-400 py-12">Belum ada kontak yang tersimpan.</p>
            ) : (
              filteredContacts.map(contact => (
                <div key={contact.id} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between group hover:border-slate-300 transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm ${contact.category === 'Dosen' ? 'bg-purple-100 text-purple-700' : contact.category === 'Kakak Tingkat' ? 'bg-amber-100 text-amber-700' : contact.category === 'Relasi Luar' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                        {contact.category}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(contact)} className="p-1 border rounded text-slate-600 hover:bg-slate-100"><Edit3 size={12} /></button>
                        <button onClick={() => handleDelete(contact.id)} className="p-1 border border-red-200 bg-red-50 text-red-600 rounded"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    
                    <h4 className="font-bold text-md text-slate-900">{contact.name}</h4>
                    {contact.major && <p className="text-xs text-slate-500 font-medium mb-3">{contact.major}</p>}
                    
                    {contact.notes && (
                      <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs text-slate-600 flex items-start gap-2 mb-3">
                        <BookOpen size={14} className="text-slate-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">{contact.notes}</p>
                      </div>
                    )}
                  </div>

                  {contact.phone && (
                    <div className="border-t border-slate-100 pt-3 mt-2 flex justify-between items-center text-xs">
                      <span className="font-mono text-slate-500 flex items-center gap-1.5"><Phone size={12}/> {contact.phone}</span>
                      <a href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="font-bold text-emerald-600 hover:underline">WhatsApp</a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}