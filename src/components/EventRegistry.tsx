import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Calendar as CalendarIcon, Circle, ArrowRightCircle, Trash2, X, ChevronDown, ChevronUp, Flag, Tag, Clock, ArrowRight, Edit3, CheckCircle2, Circle as CircleOutline, ChevronLeft, ChevronRight } from 'lucide-react';

type EventType = 'tugas' | 'praktikum' | 'ujian' | 'bootcamp' | 'hackathon' | 'proyek' | 'lainnya';

type AcademicEvent = { 
  id: string; 
  title: string; 
  description?: string;
  type: EventType; 
  deadline: string; 
  status: 'pending' | 'in_progress' | 'completed'; 
  priority: 'high' | 'medium' | 'low'; 
};

type TodoItem = {
  id: string;
  task: string;
  is_completed: boolean;
};

export default function EventRegistry() {
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form & Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('tugas');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Todo States
  const [newTask, setNewTask] = useState('');
  const [addingTodo, setAddingTodo] = useState(false);

  // UI States
  const [activeFilter, setActiveFilter] = useState<EventType | 'semua'>('semua');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Calendar States
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const currentDate = new Date();
  const [calendarMonth, setCalendarMonth] = useState(currentDate.getMonth());
  const [calendarYear, setCalendarYear] = useState(currentDate.getFullYear());

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [eventsRes, todosRes] = await Promise.all([
        supabase.from('academic_events').select('*').eq('user_id', user.id).order('deadline', { ascending: true }),
        supabase.from('todos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);
      
      if (eventsRes.data) setEvents(eventsRes.data);
      if (todosRes.data) setTodos(todosRes.data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle(''); setDescription(''); setDeadline(''); setType('tugas'); setPriority('medium');
    setIsFormOpen(false);
  };

  const handleOpenEdit = (event: AcademicEvent) => {
    setEditingId(event.id);
    setTitle(event.title);
    setDescription(event.description || '');
    setType(event.type);
    setDeadline(event.deadline);
    setPriority(event.priority);
    setIsFormOpen(true);
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const payload = { title, description, type, deadline, priority };
      if (editingId) {
        await supabase.from('academic_events').update(payload).eq('id', editingId);
      } else {
        await supabase.from('academic_events').insert({ user_id: user.id, status: 'pending', ...payload });
      }
      resetForm();
      fetchData();
    }
    setSubmitting(false);
  };

  const updateEventStatus = async (id: string, newStatus: string) => { await supabase.from('academic_events').update({ status: newStatus }).eq('id', id); fetchData(); };
  
  const deleteEvent = async (id: string) => { 
    if (!window.confirm('Hapus agenda ini secara permanen?')) return; 
    await supabase.from('academic_events').delete().eq('id', id); 
    if (editingId === id) resetForm();
    fetchData(); 
  };

  // --- TODO HANDLERS (DIPERBAIKI) ---
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setAddingTodo(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase.from('todos')
        .insert({ user_id: user.id, task: newTask.trim(), is_completed: false })
        .select()
        .single();
      
      if (error) {
        alert(`Gagal menambah To-Do. Pesan Error: ${error.message}`);
      } else if (data) {
        setTodos([data, ...todos]); // Tampilkan langsung di layar
      }
      setNewTask('');
    }
    setAddingTodo(false);
  };

  const toggleTodo = async (id: string, currentStatus: boolean) => {
    setTodos(todos.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
    const { error } = await supabase.from('todos').update({ is_completed: !currentStatus }).eq('id', id);
    if (error) alert(`Gagal mengubah status To-Do: ${error.message}`);
  };

  const deleteTodo = async (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) alert(`Gagal menghapus To-Do: ${error.message}`);
  };

  // --- CALENDAR LOGIC ---
  const calculateDaysLeft = (dateString: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateString.split('-');
    const target = new Date(Number(y), Number(m) - 1, Number(d));
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const generateCalendarDays = () => {
    const days = [];
    for (let i = 0; i < getFirstDayOfMonth(calendarYear, calendarMonth); i++) days.push(null);
    for (let i = 1; i <= getDaysInMonth(calendarYear, calendarMonth); i++) {
      const d = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.deadline === d);
      days.push({ date: i, fullDate: d, events: dayEvents });
    }
    return days;
  };

  const getTypeColor = (t: string, isDot = false) => {
    switch (t) {
      case 'ujian': return isDot ? 'bg-purple-500' : 'bg-purple-100 text-purple-700 border-purple-200';
      case 'praktikum': return isDot ? 'bg-amber-400' : 'bg-amber-100 text-amber-700 border-amber-200';
      case 'bootcamp': return isDot ? 'bg-blue-500' : 'bg-blue-100 text-blue-700 border-blue-200';
      case 'hackathon': return isDot ? 'bg-rose-500' : 'bg-rose-100 text-rose-700 border-rose-200';
      case 'proyek': return isDot ? 'bg-indigo-500' : 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'tugas': return isDot ? 'bg-slate-500' : 'bg-slate-200 text-slate-700 border-slate-300';
      default: return isDot ? 'bg-slate-300' : 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  let pendingEvents = events.filter(e => e.status !== 'completed');
  if (activeFilter !== 'semua') pendingEvents = pendingEvents.filter(e => e.type === activeFilter);
  const filters = ['semua', 'tugas', 'praktikum', 'ujian', 'bootcamp', 'hackathon', 'proyek', 'lainnya'];

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;

  return (
    <div className="space-y-6 relative">
      
      {/* HEADER WITH ADD BUTTON */}
      <div className="bg-white p-6 sm:p-7 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl"><CalendarIcon size={28} /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Agenda & Proyek</h2>
            <p className="text-slate-500 text-sm mt-1">Pusat kendali jadwal dan To-Do harian.</p>
          </div>
        </div>
        <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-5 rounded-2xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 text-sm">
          <Plus size={18} /> Tambah Agenda
        </button>
      </div>

      {/* BARIS 1: RADAR AKTIF (DAFTAR TUGAS BESAR) */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 sm:p-7 shadow-sm flex flex-col h-[500px]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="font-bold text-lg text-slate-800">Radar Utama</h3>
          <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm">{pendingEvents.length} Item</span>
        </div>

        <div className="relative mb-6 shrink-0">
          <div ref={scrollRef} className="flex overflow-x-auto gap-2 pb-2 [&::-webkit-scrollbar]:hidden scroll-smooth relative z-10" style={{ scrollbarWidth: 'none' }}>
            {filters.map(f => (
              <button key={f} onClick={() => setActiveFilter(f as any)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shrink-0 border ${activeFilter === f ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="absolute top-0 right-0 h-full w-16 bg-gradient-to-l from-white to-transparent pointer-events-none z-20 flex items-center justify-end pr-1 pb-2 md:hidden">
            <div className="bg-white/80 p-1 rounded-full shadow-sm text-slate-400 animate-pulse"><ArrowRight size={14}/></div>
          </div>
        </div>

        <div className="overflow-y-auto pr-2 space-y-4 flex-1 [&::-webkit-scrollbar]:hidden">
          {pendingEvents.length === 0 ? (
            <div className="text-center text-slate-400 py-10 bg-slate-50 rounded-[1.5rem] border border-dashed border-slate-200">Radar bersih. Tidak ada tugas mendesak.</div>
          ) : pendingEvents.map(event => {
            const daysLeft = calculateDaysLeft(event.deadline);
            const isUrgent = daysLeft <= 2 || event.priority === 'high';
            const isExpanded = expandedId === event.id;

            return (
              <div key={event.id} className={`p-5 rounded-[1.5rem] border transition-all ${isUrgent ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50/80 border-slate-100'} hover:shadow-sm`}>
                <div className="flex gap-4 items-start">
                  <button onClick={() => updateEventStatus(event.id, event.status === 'pending' ? 'in_progress' : 'completed')} className={`mt-1 shrink-0 transition-colors ${event.status === 'pending' ? 'text-slate-300 hover:text-blue-500' : 'text-blue-500'}`}>
                    {event.status === 'pending' ? <Circle size={24} strokeWidth={2.5}/> : <ArrowRightCircle size={24} strokeWidth={2.5}/>}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${getTypeColor(event.type)}`}><Tag size={10} className="inline mr-1 mb-0.5"/>{event.type}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase flex items-center gap-1 ${event.priority === 'high' ? 'bg-rose-100 text-rose-700' : event.priority === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                        <Flag size={10}/> {event.priority === 'high' ? 'Tinggi' : event.priority === 'medium' ? 'Sedang' : 'Rendah'}
                      </span>
                    </div>
                    <h4 className={`font-bold text-base mb-1 truncate ${isUrgent ? 'text-rose-950' : 'text-slate-900'}`}>{event.title}</h4>
                    
                    {event.description && (
                      <div className="mt-2">
                        <button onClick={() => setExpandedId(isExpanded ? null : event.id)} className={`text-xs font-semibold flex items-center gap-1 transition-colors ${isUrgent ? 'text-rose-600 hover:text-rose-800' : 'text-slate-500 hover:text-blue-600'}`}>
                          {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} {isExpanded ? 'Tutup Detail' : 'Lihat Deskripsi'}
                        </button>
                        {isExpanded && (<div className="mt-2 text-sm text-slate-600 bg-white p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed shadow-sm">{event.description}</div>)}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200/50">
                      <div className={`text-xs font-bold flex items-center gap-1.5 ${daysLeft < 0 ? 'text-rose-600' : daysLeft <= 2 ? 'text-rose-600' : 'text-slate-500'}`}>
                        <Clock size={14}/> {daysLeft < 0 ? 'TERLAMBAT' : daysLeft === 0 ? 'HARI INI' : `${daysLeft} Hari Lagi`}
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => handleOpenEdit(event)} className="text-slate-400 hover:text-blue-600 p-2 bg-white rounded-xl shadow-sm border border-slate-100"><Edit3 size={16} /></button>
                         <button onClick={() => deleteEvent(event.id)} className="text-slate-400 hover:text-rose-600 p-2 bg-white rounded-xl shadow-sm border border-slate-100"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* BARIS 2: KALENDER & TO-DO LIST (GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TO-DO LIST HARIAN */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 sm:p-7 shadow-sm flex flex-col h-[500px]">
          <h3 className="font-bold text-lg text-slate-800 mb-6 shrink-0 border-b border-slate-50 pb-4">To-Do List Harian</h3>
          
          <form onSubmit={handleAddTodo} className="flex gap-2 mb-4 shrink-0">
            <input 
              type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} 
              placeholder="Tugas kecil hari ini..." 
              className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none" 
            />
            <button type="submit" disabled={addingTodo || !newTask.trim()} className="p-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors disabled:opacity-50 shadow-sm">
              {addingTodo ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            </button>
          </form>

          <div className="overflow-y-auto pr-2 space-y-2 flex-1 [&::-webkit-scrollbar]:hidden">
            {todos.length === 0 ? (
              <p className="text-center text-xs text-slate-400 mt-10">Bebas tugas! Nikmati waktu Anda.</p>
            ) : todos.map(todo => (
              <div key={todo.id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all group ${todo.is_completed ? 'bg-slate-50/50 border-slate-50 opacity-60' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <button onClick={() => toggleTodo(todo.id, todo.is_completed)} className={`shrink-0 transition-colors ${todo.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-blue-500'}`}>
                    {todo.is_completed ? <CheckCircle2 size={20} /> : <CircleOutline size={20} />}
                  </button>
                  <span className={`text-sm truncate transition-all ${todo.is_completed ? 'line-through text-slate-400 font-medium' : 'text-slate-700 font-bold'}`}>
                    {todo.task}
                  </span>
                </div>
                <button onClick={() => deleteTodo(todo.id)} className="text-slate-300 hover:text-rose-500 p-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* KALENDER BULANAN MINI */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 sm:p-7 shadow-sm h-[500px] flex flex-col">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="font-bold text-lg text-slate-800">{monthNames[calendarMonth]} {calendarYear}</h3>
            <div className="flex gap-2">
              <button onClick={() => { if(calendarMonth===0){setCalendarMonth(11); setCalendarYear(y=>y-1)} else setCalendarMonth(m=>m-1) }} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"><ChevronLeft size={16} /></button>
              <button onClick={() => { if(calendarMonth===11){setCalendarMonth(0); setCalendarYear(y=>y+1)} else setCalendarMonth(m=>m+1) }} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center mb-2 shrink-0">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => <div key={d} className="text-[10px] sm:text-xs font-bold text-slate-400 py-1 uppercase">{d}</div>)}
          </div>
          
          <div className="grid grid-cols-7 gap-1 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden">
            {generateCalendarDays().map((day, idx) => (
              day === null ? <div key={`empty-${idx}`} className="h-10 sm:h-14"></div> : (
                <button 
                  key={day.fullDate} 
                  onClick={() => setSelectedDate(day.fullDate)} 
                  className={`h-10 sm:h-14 flex flex-col items-center justify-start pt-1.5 sm:pt-2 rounded-2xl border transition-all ${selectedDate === day.fullDate ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-transparent bg-slate-50/50 hover:bg-slate-50'} ${day.events.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className={`text-xs sm:text-sm font-bold ${selectedDate === day.fullDate ? 'text-blue-700' : 'text-slate-600'}`}>{day.date}</span>
                  <div className="flex flex-wrap justify-center gap-0.5 mt-1 px-1">
                    {day.events.slice(0,3).map(ev => <div key={ev.id} className={`w-1.5 h-1.5 rounded-full ${ev.status === 'completed' ? 'bg-emerald-400' : getTypeColor(ev.type, true)}`}></div>)}
                  </div>
                </button>
              )
            ))}
          </div>
        </div>

      </div>

      {/* OVERLAY LACI BAWAH / MODAL FORM (Z-INDEX 999 SUPER TINGGI & PADDING BAWAH EKSTRA) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 p-7 pb-24 sm:pb-7 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmitEvent} className="space-y-4">
              <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                <h4 className="font-bold text-base text-slate-800">{editingId ? 'Edit Agenda' : 'Tambah Agenda Baru'}</h4>
                <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-xl"><X size={18}/></button>
              </div>
              
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Nama Tugas / Acara <span className="text-rose-500">*</span></label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wajib diisi..." className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none" required /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Deskripsi & Link (Opsional)</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Catatan tambahan, link GMeet, dll..." rows={3} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 resize-none outline-none"></textarea></div>
              
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Kategori</label><select value={type} onChange={(e) => setType(e.target.value as EventType)} className="w-full px-3 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-100 text-slate-700 outline-none"><option value="tugas">Tugas</option><option value="praktikum">Praktikum</option><option value="ujian">Ujian</option><option value="bootcamp">Bootcamp</option><option value="hackathon">Hackathon</option><option value="proyek">Proyek</option><option value="lainnya">Lainnya</option></select></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Prioritas</label><select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full px-3 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-100 text-slate-700 outline-none"><option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Urgent</option></select></div>
              </div>
              
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Tenggat Waktu (Deadline) <span className="text-rose-500">*</span></label><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none" required /></div>
              
              <button type="submit" disabled={submitting} className={`w-full text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4 shadow-lg text-sm ${editingId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}>
                {submitting ? <Loader2 size={18} className="animate-spin" /> : editingId ? <Edit3 size={18} /> : <Plus size={18} />} 
                {editingId ? 'Simpan Perubahan' : 'Simpan Agenda'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}