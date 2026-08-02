import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Users, Search, Phone, BookOpen, Trash2, Edit3, X, Tag } from 'lucide-react';

type ContactCategory = 'Dosen' | 'Mentor / Instruktur' | 'Rekan Tim / Hackathon' | 'Kakak Tingkat' | 'Teman Kampus' | 'Relasi Luar' | 'Lainnya';

type Contact = { 
  id: string; 
  name: string; 
  category: ContactCategory; 
  phone: string; 
  major: string; 
  notes: string; 
  tag: string;
};

export default function ContactDirectory() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ContactCategory>('Teman Kampus');
  const [phone, setPhone] = useState('');
  const [major, setMajor] = useState('');
  const [notes, setNotes] = useState('');
  const [tag, setTag] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('contacts').select('*').eq('user_id', user.id).order('name', { ascending: true });
      if (data) setContacts(data);
    }
    setLoading(false);
  };

  const resetForm = () => { 
    setEditingId(null); 
    setName(''); 
    setCategory('Teman Kampus'); 
    setPhone(''); 
    setMajor(''); 
    setNotes(''); 
    setTag('');
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const payload = { user_id: user.id, name, category, phone, major, notes, tag };
      if (editingId) await supabase.from('contacts').update(payload).eq('id', editingId);
      else await supabase.from('contacts').insert(payload);
      resetForm(); fetchContacts();
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
    setTag(contact.tag || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.tag && c.tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getCategoryBadge = (cat: ContactCategory) => {
    switch (cat) {
      case 'Dosen': return 'bg-purple-100 text-purple-700';
      case 'Mentor / Instruktur': return 'bg-blue-100 text-blue-700';
      case 'Rekan Tim / Hackathon': return 'bg-emerald-100 text-emerald-700';
      case 'Kakak Tingkat': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) return <div className="animate-pulse h-64 bg-slate-100 rounded-2xl flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users size={24} className="text-emerald-400" />
            <h3 className="font-bold text-2xl">Contact Directory & Network</h3>
          </div>
          <p className="text-sm text-slate-400">Pusat data relasi, mentor program, rekan tim, dan jejaring profesional.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="Cari nama, prodi, tag, keahlian..." 
            className="w-full bg-slate-800 text-white pl-9 pr-4 py-2.5 rounded-xl text-sm border border-slate-700 focus:outline-none focus:border-slate-500" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Input / Edit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative h-fit">
          {editingId && (
            <div className="absolute top-0 left-0 right-0 bg-yellow-100 text-yellow-800 text-xs font-bold p-2 text-center flex justify-between px-4 rounded-t-2xl">
              <span>MODE EDIT KONTAK</span>
              <button onClick={resetForm}><X size={14}/></button>
            </div>
          )}
          
          <form onSubmit={handleSaveContact} className={`space-y-4 ${editingId ? 'mt-6' : ''}`}>
            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-2">
              {editingId ? 'Edit Kontak' : 'Tambah Kontak Baru'}
            </h4>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nama Lengkap</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Alex (Mentor)" className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Kategori</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as ContactCategory)} className="w-full px-2 py-2 border rounded-md text-xs bg-slate-50 font-medium">
                  <option value="Teman Kampus">Teman Kampus</option>
                  <option value="Kakak Tingkat">Kakak Tingkat</option>
                  <option value="Dosen">Dosen</option>
                  <option value="Mentor / Instruktur">Mentor / Instruktur</option>
                  <option value="Rekan Tim / Hackathon">Rekan Tim / Hackathon</option>
                  <option value="Relasi Luar">Relasi Luar</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">No. WhatsApp</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812..." className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-slate-50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Jurusan / Instansi</label>
                <input type="text" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Prodi / Asal" className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Label Khusus (Tag)</label>
                <input type="text" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Cth: IDCamp / Tim Dev" className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Catatan / Keahlian</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Keahlian, peran, atau hal penting..." rows={3} className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50 resize-none"></textarea>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={submitting} className={`flex-1 text-white font-bold py-2.5 rounded-md transition-colors text-sm flex items-center justify-center gap-2 ${editingId ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-slate-900 hover:bg-black'}`}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : editingId ? <Edit3 size={16} /> : <Plus size={16} />} 
                {editingId ? 'Simpan Perubahan' : 'Simpan Kontak'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-md text-sm font-bold">Batal</button>
              )}
            </div>
          </form>
        </div>

        {/* Grid Kartu Kontak */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredContacts.length === 0 ? (
              <p className="col-span-2 text-center text-sm text-slate-400 py-12">Belum ada kontak tersimpan yang cocok dengan pencarian.</p>
            ) : (
              filteredContacts.map(contact => (
                <div key={contact.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between group hover:border-slate-300 transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="flex flex-wrap gap-1">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm ${getCategoryBadge(contact.category)}`}>
                          {contact.category}
                        </span>
                        {contact.tag && (
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm flex items-center gap-1">
                            <Tag size={10} /> {contact.tag}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(contact)} className="p-1 border rounded text-slate-600 hover:bg-slate-100"><Edit3 size={12}/></button>
                        <button onClick={() => handleDelete(contact.id)} className="p-1 border border-red-200 bg-red-50 text-red-600 rounded"><Trash2 size={12}/></button>
                      </div>
                    </div>
                    
                    <h4 className="font-bold text-md text-slate-900 mt-2">{contact.name}</h4>
                    {contact.major && <p className="text-xs text-slate-500 font-medium mb-3">{contact.major}</p>}
                    
                    {contact.notes && (
                      <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-600 flex items-start gap-2 mb-3 border border-slate-100">
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