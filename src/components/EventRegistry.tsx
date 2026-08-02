import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Calendar as CalendarIcon, AlertCircle, CheckCircle2, Circle, ArrowRightCircle, Trash2, X } from 'lucide-react';

type EventType = 'tugas' | 'praktikum' | 'ujian' | 'bootcamp' | 'hackathon' | 'proyek' | 'lainnya';

type AcademicEvent = { 
  id: string; 
  title: string; 
  type: EventType; 
  deadline: string; 
  status: 'pending' | 'in_progress' | 'completed'; 
  priority: 'high' | 'medium' | 'low'; 
};

export default function EventRegistry() {
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('tugas');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const currentDate = new Date();
  const [calendarMonth, setCalendarMonth] = useState(currentDate.getMonth());
  const [calendarYear, setCalendarYear] = useState(currentDate.getFullYear());

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
      await supabase.from('academic_events').insert({ user_id: user.id, title, type, deadline, priority, status: 'pending' });
      setTitle(''); setDeadline(''); setType('tugas'); setPriority('medium'); fetchEvents();
    }
    setSubmitting(false);
  };

  const updateEventStatus = async (id: string, newStatus: string) => { await supabase.from('academic_events').update({ status: newStatus }).eq('id', id); fetchEvents(); };
  const deleteEvent = async (id: string) => { if (!window.confirm('Hapus kegiatan ini dari radar?')) return; await supabase.from('academic_events').delete().eq('id', id); fetchEvents(); };

  const calculateDaysLeft = (dateString: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateString);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

  const getTypeColor = (type: string, isDot = false) => {
    switch (type) {
      case 'ujian': return isDot ? 'bg-purple-500' : 'bg-purple-100 text-purple-700';
      case 'praktikum': return isDot ? 'bg-amber-400' : 'bg-amber-100 text-amber-700';
      case 'bootcamp': return isDot ? 'bg-blue-500' : 'bg-blue-100 text-blue-700';
      case 'hackathon': return isDot ? 'bg-rose-500' : 'bg-rose-100 text-rose-700';
      case 'proyek': return isDot ? 'bg-indigo-500' : 'bg-indigo-100 text-indigo-700';
      case 'tugas': return isDot ? 'bg-slate-400' : 'bg-slate-200 text-slate-600';
      default: return isDot ? 'bg-slate-300' : 'bg-slate-100 text-slate-500';
    }
  };

  const pendingEvents = events.filter(e => e.status !== 'completed');

  if (loading) return <div className="animate-pulse h-64 bg-slate-100 rounded-2xl flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <CalendarIcon size={24} className="text-blue-400" />
          <h3 className="font-bold text-2xl">Event & Project Registry</h3>
        </div>
        <p className="text-sm text-slate-400">Pusat manajemen tenggat waktu akademik, submission, dan proyek ekstrakurikuler.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit">
          <form onSubmit={handleAddEvent} className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-2">Tambah Agenda Baru</h4>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nama Tugas / Acara</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Misal: Submission IDCamp / Mentoring DBS" className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Kategori</label>
                <select value={type} onChange={(e) => setType(e.target.value as EventType)} className="w-full px-2 py-2 border rounded-md text-xs bg-slate-50 font-medium">
                  <option value="tugas">Tugas Kampus</option>
                  <option value="praktikum">Praktikum / Lab</option>
                  <option value="ujian">Ujian (UTS/UAS)</option>
                  <option value="bootcamp">Bootcamp / Mentoring</option>
                  <option value="hackathon">Hackathon / Lomba</option>
                  <option value="proyek">Proyek Pribadi</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Prioritas</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full px-2 py-2 border rounded-md text-xs bg-slate-50 font-medium">
                  <option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Urgent (Tinggi)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tenggat Waktu (Deadline)</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50" required />
            </div>
            <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-md hover:bg-black transition-colors flex items-center justify-center gap-2 mt-4 text-sm">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Masukkan ke Radar
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2 shrink-0">
            <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800">Radar Agenda Aktif</h3>
            <span className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-md">{pendingEvents.length} Pending</span>
          </div>
          <div className="overflow-y-auto pr-2 space-y-3 flex-1">
            {pendingEvents.length === 0 ? <p className="text-center text-sm text-slate-400 py-10">Agenda kosong. Anda bisa beristirahat.</p> : pendingEvents.map(event => {
              const daysLeft = calculateDaysLeft(event.deadline);
              const isUrgent = daysLeft <= 2 || event.priority === 'high';
              return (
                <div key={event.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex gap-4">
                    <button onClick={() => updateEventStatus(event.id, event.status === 'pending' ? 'in_progress' : 'completed')} className={`mt-1 shrink-0 ${event.status === 'pending' ? 'text-slate-300 hover:text-blue-500' : 'text-blue-500 hover:text-emerald-500'}`}>
                      {event.status === 'pending' ? <Circle size={20} /> : <ArrowRightCircle size={20} />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm ${getTypeColor(event.type)}`}>{event.type}</span>
                        {event.status === 'in_progress' && <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-sm uppercase">On Progress</span>}
                      </div>
                      <h4 className={`font-bold text-md ${isUrgent ? 'text-red-900' : 'text-slate-900'}`}>{event.title}</h4>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className={`text-xs font-bold flex items-center gap-1 mr-2 ${daysLeft < 0 ? 'text-red-600' : daysLeft <= 2 ? 'text-red-600' : 'text-slate-500'}`}>
                      {daysLeft < 0 ? <><AlertCircle size={14}/> TERLAMBAT</> : daysLeft === 0 ? <><AlertCircle size={14}/> HARI INI</> : `${daysLeft} Hari Lagi`}
                    </div>
                    <button onClick={() => updateEventStatus(event.id, 'completed')} className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-black">Selesai</button>
                    <button onClick={() => deleteEvent(event.id)} className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 border border-transparent"><Trash2 size={16} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800">{monthNames[calendarMonth]} {calendarYear}</h3>
            <div className="flex gap-2">
              <button onClick={() => { if(calendarMonth===0){setCalendarMonth(11); setCalendarYear(y=>y-1)} else setCalendarMonth(m=>m-1) }} className="p-2 border rounded-md hover:bg-slate-50">&lt;</button>
              <button onClick={() => { if(calendarMonth===11){setCalendarMonth(0); setCalendarYear(y=>y+1)} else setCalendarMonth(m=>m+1) }} className="p-2 border rounded-md hover:bg-slate-50">&gt;</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">{['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => <div key={d} className="text-xs font-bold text-slate-400 py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-2">
            {generateCalendarDays().map((day, idx) => (
              day === null ? <div key={`empty-${idx}`} className="h-16"></div> : (
                <button key={day.fullDate} onClick={() => setSelectedDate(day.fullDate)} className={`h-16 flex flex-col items-center justify-start pt-2 rounded-md border transition-all ${selectedDate === day.fullDate ? 'border-slate-800 shadow-md bg-slate-50' : 'border-slate-100 hover:border-slate-300'} ${day.events.length > 0 ? 'cursor-pointer' : 'opacity-70 cursor-default'}`}>
                  <span className={`text-sm font-bold ${selectedDate === day.fullDate ? 'text-slate-900' : 'text-slate-600'}`}>{day.date}</span>
                  <div className="flex flex-wrap justify-center gap-1 mt-2 px-1">
                    {day.events.slice(0,3).map(ev => (
                      <div key={ev.id} className={`w-2 h-2 rounded-full ${ev.status === 'completed' ? 'bg-emerald-400' : getTypeColor(ev.type, true)}`} title={ev.title}></div>
                    ))}
                    {day.events.length > 3 && <div className="w-2 h-2 rounded-full bg-slate-300 flex items-center justify-center text-[8px] font-bold">+</div>}
                  </div>
                </button>
              )
            ))}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div> Tugas</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div> Praktikum</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div> Ujian</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Bootcamp</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Hackathon</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div> Proyek</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div> Selesai</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit max-h-[500px] overflow-y-auto">
          {!selectedDate ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-10"><CalendarIcon size={32} className="mb-3 opacity-20" /><p className="text-sm">Klik kotak tanggal untuk melihat rincian agenda.</p></div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                <h3 className="font-bold font-mono text-lg text-slate-800">{selectedDate}</h3>
                <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-black p-1 bg-slate-100 rounded-md"><X size={14} /></button>
              </div>
              <div className="space-y-3">
                {events.filter(e => e.deadline === selectedDate).length === 0 ? <p className="text-sm text-slate-500 text-center">Agenda kosong pada hari ini.</p> : events.filter(e => e.deadline === selectedDate).map(event => (
                  <div key={event.id} className={`p-4 rounded-xl border ${event.status === 'completed' ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm ${getTypeColor(event.type)}`}>{event.type}</span>
                      {event.status === 'completed' && <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-sm"><CheckCircle2 size={12}/> LUNAS</span>}
                    </div>
                    <h4 className={`font-bold text-sm mb-3 ${event.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}>{event.title}</h4>
                    {event.status !== 'completed' && (
                      <div className="flex gap-2">
                        <button onClick={() => updateEventStatus(event.id, 'completed')} className="flex-1 text-xs font-bold bg-slate-900 text-white py-1.5 rounded-md hover:bg-black transition-colors">Tandai Selesai</button>
                        <button onClick={() => deleteEvent(event.id)} className="px-3 text-slate-400 bg-slate-100 rounded-md hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}