import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Users, Phone, Mail, Trash2, ChevronDown, ChevronUp, Briefcase, UserCircle, Edit3, X } from 'lucide-react';

type Contact = {
  id: string;
  name: string;
  relationship: string;
  company?: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export default function ContactDirectory() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // State untuk Fitur Edit & Expand
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Teman Kampus');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const relationships = ['Dosen', 'Mentor', 'Teman Kampus', 'Keluarga', 'Profesional', 'Lainnya'];

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('network_contacts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setContacts(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setName(''); setCompany(''); setPhone(''); setEmail(''); setNotes(''); setRelationship('Teman Kampus');
  };

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const payload = { name, relationship, company, phone, email, notes };
      
      if (editingId) {
        await supabase.from('network_contacts').update(payload).eq('id', editingId);
      } else {
        await supabase.from('network_contacts').insert({ user_id: user.id, ...payload });
      }
      
      resetForm();
      fetchContacts();
    }
    setSubmitting(false);
  };

  const handleEditClick = (contact: Contact) => {
    setEditingId(contact.id);
    setName(contact.name);
    setRelationship(contact.relationship);
    setCompany(contact.company || '');
    setPhone(contact.phone || '');
    setEmail(contact.email || '');
    setNotes(contact.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll otomatis ke atas (ke form)
  };

  const deleteContact = async (id: string) => {
    if (!window.confirm('Hapus kontak ini dari radar?')) return;
    await supabase.from('network_contacts').delete().eq('id', id);
    if (editingId === id) resetForm();
    fetchContacts();
  };

  const getRelationshipColor = (rel: string) => {
    switch (rel) {
      case 'Dosen': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Mentor': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Keluarga': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Profesional': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Teman Kampus': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-200 text-slate-700 border-slate-300';
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl"><Users size={28} /></div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Relasi & Koneksi</h2>
          <p className="text-slate-500 text-sm mt-1">Kelola jaringan profesional dan akademik Anda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DAFTAR KONTAK */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm flex flex-col h-[650px]">
          <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-50 pb-4">
            <h3 className="font-bold text-lg text-slate-800">Buku Telepon</h3>
            <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm">{contacts.length} Orang</span>
          </div>

          <div className="overflow-y-auto pr-2 space-y-4 flex-1 [&::-webkit-scrollbar]:hidden">
            {contacts.length === 0 ? (
              <div className="text-center text-slate-400 py-10 bg-slate-50 rounded-[1.5rem] border border-dashed border-slate-200">
                Buku telepon kosong.
              </div>
            ) : contacts.map(contact => {
              const isExpanded = expandedId === contact.id;

              return (
                <div key={contact.id} className="p-5 rounded-[1.5rem] border border-slate-100 bg-slate-50/80 hover:bg-slate-50 hover:shadow-sm transition-all group">
                  <div className="flex justify-between items-start gap-4">
                    
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 shrink-0">
                        <UserCircle size={24} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${getRelationshipColor(contact.relationship)}`}>
                            {contact.relationship}
                          </span>
                        </div>
                        
                        <h4 className="font-bold text-base text-slate-900 mb-1 truncate">{contact.name}</h4>
                        
                        {contact.company && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-2">
                            <Briefcase size={12} /> {contact.company}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3 mt-3">
                          {contact.phone && <a href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"><Phone size={12} /> WhatsApp</a>}
                          {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"><Mail size={12} /> Email</a>}
                        </div>

                        {/* SMART EXPAND DESKRIPSI */}
                        {contact.notes && (
                          <div className="mt-4 pt-4 border-t border-slate-200/60">
                            <button onClick={() => setExpandedId(isExpanded ? null : contact.id)} className="text-xs font-semibold flex items-center gap-1 transition-colors text-slate-500 hover:text-indigo-600">
                              {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} {isExpanded ? 'Tutup Catatan' : 'Lihat Catatan'}
                            </button>
                            {isExpanded && (
                              <div className="mt-2 text-sm text-slate-600 bg-white p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed shadow-sm">
                                {contact.notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => handleEditClick(contact)} className="text-slate-400 hover:text-indigo-600 p-2 bg-white rounded-xl shadow-sm border border-slate-100 transition-colors">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => deleteContact(contact.id)} className="text-slate-400 hover:text-rose-600 p-2 bg-white rounded-xl shadow-sm border border-slate-100 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* FORM TAMBAH / EDIT KONTAK */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm h-fit transition-all">
          <form onSubmit={handleSubmitContact} className="space-y-4">
            <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-800">
                {editingId ? 'Edit Kontak' : 'Tambah Kontak Baru'}
              </h4>
              {editingId && (
                <button type="button" onClick={resetForm} className="text-xs font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg hover:bg-rose-100 flex items-center gap-1">
                  <X size={12}/> Batal
                </button>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Nama Lengkap <span className="text-rose-500">*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Wajib diisi..." className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100" required />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Hubungan</label>
              <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-100 text-slate-700">
                {relationships.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Instansi / Kampus</label>
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Opsional..." className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">No. WhatsApp</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812..." className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="@gmail..." className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Catatan Tambahan</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Keahlian, tempat ketemu, dll..." rows={2} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 resize-none"></textarea>
            </div>
            
            <button type="submit" disabled={submitting} className={`w-full text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 text-sm ${editingId ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'}`}>
              {submitting ? <Loader2 size={18} className="animate-spin" /> : editingId ? <Edit3 size={18} /> : <Plus size={18} />} 
              {editingId ? 'Simpan Perubahan' : 'Simpan Kontak'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}