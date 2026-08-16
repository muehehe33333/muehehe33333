import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Calendar as CalendarIcon, Circle, ArrowRightCircle, Trash2, X, AlignLeft, ChevronDown, ChevronUp, Flag, Tag, Clock, ArrowRight } from 'lucide-react';

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

export default function EventRegistry() {
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('tugas');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // UI States
  const [activeFilter, setActiveFilter] = useState<EventType | 'semua'>('semua');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Calendar States
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const currentDate = new Date();
  const [calendarMonth, setCalendarMonth] = useState(currentDate.getMonth());
  const [calendarYear, setCalendarYear] = useState(currentDate.getFullYear());

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('academic_events').select('*').eq('user_id', user.id).order('deadline', { ascending: true });
      if (data) setEvents(data);
    }
    setLoading(false);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('academic_events').insert({ user_id: user.id, title, description, type, deadline, priority, status: 'pending' });
      setTitle(''); setDescription(''); setDeadline(''); setType('tugas'); setPriority('medium'); fetchEvents();
    }
    setSubmitting(false);
  };

  const updateEventStatus = async (id: string, newStatus: string) => { await supabase.from('academic_events').update({ status: newStatus }).eq('id', id); fetchEvents(); };
  const deleteEvent = async (id: string) => { if (!window.confirm('Hapus agenda ini dari radar?')) return; await supabase.from('academic_events').delete().eq('id', id); fetchEvents(); };

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

  // Filter Radar
  let pendingEvents = events.filter(e => e.status !== 'completed');
  if (activeFilter !== 'semua') {
    pendingEvents = pendingEvents.filter(e => e.type === activeFilter);
  }

  const filters = ['semua', 'tugas', 'praktikum', 'ujian', 'bootcamp', 'hackathon', 'proyek', 'lainnya'];

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl"><CalendarIcon size={28} /></div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Agenda & Proyek</h2>
          <p className="text-slate-500 text-sm mt-1">Pusat kendali jadwal dan tenggat waktu.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RADAR AKTIF (DAFTAR TUGAS) */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm flex flex-col h-[650px]">
          
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="font-bold text-lg text-slate-800">Radar Aktif</h3>
            <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm">{pendingEvents.length} Item</span>
          </div>

          {/* FILTER CHIPS (HORIZONTAL SCROLL DENGAN PENANDA VISUAL) */}
          <div className="relative mb-6 shrink-0">
            <div ref={scrollRef} className="flex overflow-x-auto gap-2 pb-2 [&::-webkit-scrollbar]:hidden scroll-smooth relative z-10" style={{ scrollbarWidth: 'none' }}>
              {filters.map(f => (
                <button 
                  key={f} 
                  onClick={() => setActiveFilter(f as any)} 
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shrink-0 border ${activeFilter === f ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            {/* Penanda Visual Scroll (Gradient putih & Ikon) */}
            <div className="absolute top-0 right-0 h-full w-16 bg-gradient-to-l from-white to-transparent pointer-events-none z-20 flex items-center justify-end pr-1 pb-2 md:hidden">
              <div className="bg-white/80 p-1 rounded-full shadow-sm text-slate-400 animate-pulse"><ArrowRight size={14}/></div>
            </div>
          </div>

          <div className="overflow-y-auto pr-2 space-y-4 flex-1 [&::-webkit-scrollbar]:hidden">
            {pendingEvents.length === 0 ? (
              <div className="text-center text-slate-400 py-10 bg-slate-50 rounded-[1.5rem] border border-dashed border-slate-200">
                Agenda kosong. Silakan istirahat.
              </div>
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
                      
                      {/* PREVIEW DESKRIPSI (SMART EXPAND) */}
                      {event.description && (
                        <div className="mt-2">
                          <button onClick={() => setExpandedId(isExpanded ? null : event.id)} className={`text-xs font-semibold flex items-center gap-1 transition-colors ${isUrgent ? 'text-rose-600 hover:text-rose-800' : 'text-slate-500 hover:text-blue-600'}`}>
                            {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} {isExpanded ? 'Tutup Detail' : 'Lihat Deskripsi'}
                          </button>
                          {isExpanded && (
                            <div className="mt-2 text-sm text-slate-600 bg-white p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed shadow-sm">
                              {event.description}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200/50">
                        <div className={`text-xs font-bold flex items-center gap-1.5 ${daysLeft < 0 ? 'text-rose-600' : daysLeft <= 2 ? 'text-rose-600' : 'text-slate-500'}`}>
                          <Clock size={14}/>
                          {daysLeft < 0 ? 'TERLAMBAT' : daysLeft === 0 ? 'HARI INI' : `${daysLeft} Hari Lagi`}
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => deleteEvent(event.id)} className="text-slate-400 hover:text-rose-600 p-2 bg-white rounded-xl shadow-sm border border-slate-100"><Trash2 size={16} /></button>
                           <button onClick={() => updateEventStatus(event.id, 'completed')} className="text-[11px] font-bold bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-900 shadow-sm">Selesai</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* FORM TAMBAH AGENDA */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm h-fit">
          <form onSubmit={handleAddEvent} className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-800 mb-6 border-b border-slate-50 pb-4">Tambah Agenda</h4>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Nama Tugas / Acara <span className="text-rose-500">*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wajib diisi..." className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100" required />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Deskripsi & Link (Opsional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Catatan tambahan, link GMeet, dll..." rows={3} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 resize-none"></textarea>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Kategori</label>
                <select value={type} onChange={(e) => setType(e.target.value as EventType)} className="w-full px-3 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-100 text-slate-700">
                  <option value="tugas">Tugas</option><option value="praktikum">Praktikum</option><option value="ujian">Ujian</option><option value="bootcamp">Bootcamp</option><option value="hackathon">Hackathon</option><option value="proyek">Proyek Pribadi</option><option value="lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Prioritas</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full px-3 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-100 text-slate-700">
                  <option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Urgent</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Tenggat Waktu (Deadline) <span className="text-rose-500">*</span></label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-100" required />
            </div>
            
            <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-600/20 text-sm">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Simpan Agenda
            </button>
          </form>
        </div>

      </div>
      
      {/* KALENDER BULANAN FULL */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg text-slate-800">Kalender Akademik</h3>
            <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">{monthNames[calendarMonth]} {calendarYear}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { if(calendarMonth===0){setCalendarMonth(11); setCalendarYear(y=>y-1)} else setCalendarMonth(m=>m-1) }} className="p-2.5 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors text-slate-500"><ChevronUp size={16} className="-rotate-90" /></button>
            <button onClick={() => { if(calendarMonth===11){setCalendarMonth(0); setCalendarYear(y=>y+1)} else setCalendarMonth(m=>m+1) }} className="p-2.5 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors text-slate-500"><ChevronDown size={16} className="-rotate-90" /></button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => <div key={d} className="text-[10px] sm:text-xs font-bold text-slate-400 py-1 uppercase">{d}</div>)}
        </div>
        
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {generateCalendarDays().map((day, idx) => (
            day === null ? <div key={`empty-${idx}`} className="h-14 sm:h-20"></div> : (
              <button 
                key={day.fullDate} 
                onClick={() => setSelectedDate(day.fullDate)} 
                className={`h-14 sm:h-20 flex flex-col items-center justify-start pt-2 rounded-2xl border transition-all ${selectedDate === day.fullDate ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-transparent bg-slate-50 hover:bg-slate-100'} ${day.events.length > 0 ? 'cursor-pointer' : 'opacity-70 cursor-default'}`}
              >
                <span className={`text-xs sm:text-sm font-bold ${selectedDate === day.fullDate ? 'text-blue-700' : 'text-slate-600'}`}>{day.date}</span>
                <div className="flex flex-wrap justify-center gap-1 mt-1.5 px-1">
                  {day.events.slice(0,3).map(ev => (
                    <div key={ev.id} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${ev.status === 'completed' ? 'bg-emerald-400' : getTypeColor(ev.type, true)}`} title={ev.title}></div>
                  ))}
                  {day.events.length > 3 && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-300 flex items-center justify-center text-[6px] sm:text-[8px] font-bold text-white">+</div>}
                </div>
              </button>
            )
          ))}
        </div>
        
        {/* DETAIL KALENDER SAAT DITEKAN */}
        {selectedDate && (
          <div className="mt-6 border-t border-slate-100 pt-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold font-mono text-sm sm:text-base text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">{selectedDate}</h3>
              <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-rose-500 p-1 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors"><X size={16} /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.filter(e => e.deadline === selectedDate).length === 0 ? (
                <p className="text-sm text-slate-400 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 col-span-full text-center">Jadwal kosong pada tanggal ini.</p>
              ) : events.filter(e => e.deadline === selectedDate).map(event => (
                <div key={event.id} className="p-4 rounded-[1.5rem] border bg-slate-50/80 border-slate-100 flex gap-3">
                  <div className={`mt-0.5 shrink-0 ${event.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`}><Circle size={16} fill="currentColor" className="opacity-20"/></div>
                  <div>
                    <h4 className={`font-bold text-sm ${event.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{event.title}</h4>
                    {event.description && <p className="text-xs text-slate-500 mt-1.5 flex items-start gap-1.5 leading-relaxed"><AlignLeft size={12} className="shrink-0 mt-0.5"/> {event.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}