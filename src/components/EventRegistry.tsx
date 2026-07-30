import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Calendar as CalendarIcon, Clock, AlertCircle, CheckCircle2, Circle, ArrowRightCircle, Trash2, X } from 'lucide-react';

type AcademicEvent = {
  id: string;
  title: string;
  type: 'tugas' | 'praktikum' | 'ujian' | 'lainnya';
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
};

export default function EventRegistry() {
  const [mainTab, setMainTab] = useState<'radar' | 'calendar'>('radar');
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'tugas' | 'praktikum' | 'ujian' | 'lainnya'>('tugas');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Calendar State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const currentDate = new Date();
  const [calendarMonth, setCalendarMonth] = useState(currentDate.getMonth());
  const [calendarYear, setCalendarYear] = useState(currentDate.getFullYear());

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('academic_events')
        .select('*')
        .eq('user_id', user.id)
        .order('deadline', { ascending: true });
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
      await supabase.from('academic_events').insert({
        user_id: user.id,
        title,
        type,
        deadline,
        priority,
        status: 'pending'
      });
      setTitle(''); setDeadline(''); setType('tugas'); setPriority('medium');
      fetchEvents();
    }
    setSubmitting(false);
  };

  const updateEventStatus = async (id: string, newStatus: string) => {
    await supabase.from('academic_events').update({ status: newStatus }).eq('id', id);
    fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    if (!window.confirm('Hapus tugas ini dari jadwal?')) return;
    await supabase.from('academic_events').delete().eq('id', id);
    fetchEvents();
  };

  const calculateDaysLeft = (dateString: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateString);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Helper Kalender
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

  const pendingEvents = events.filter(e => e.status !== 'completed');
  const completedEvents = events.filter(e => e.status === 'completed');

  if (loading) return <div className="animate-pulse h-64 bg-slate-100 rounded-xl flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[600px]">
      
      {/* Header & Tabs */}
      <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <CalendarIcon size={24} className="text-blue-400" />
            <h3 className="font-bold text-xl">Event Registry</h3>
          </div>
          <p className="text-xs text-slate-400">Pusat manajemen tenggat waktu dan jadwal akademik.</p>
        </div>
        
        <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
          <button onClick={() => setMainTab('radar')} className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${mainTab === 'radar' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'}`}>Radar Tugas</button>
          <button onClick={() => setMainTab('calendar')} className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${mainTab === 'calendar' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'}`}>Kalender Visual</button>
        </div>
      </div>

      <div className="flex-1">
        
        {/* TAB 1: RADAR TUGAS (List & Form) */}
        {mainTab === 'radar' && (
          <div className="flex flex-col lg:flex-row h-full">
            
            {/* Kiri: Form */}
            <div className="w-full lg:w-1/3 p-6 border-r border-slate-100 bg-white">
              <form onSubmit={handleAddEvent} className="bg-slate-50 border border-slate-200 p-6 rounded-xl shadow-sm space-y-4">
                <h4 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-200 pb-2">Tambah Jadwal Baru</h4>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Tugas / Acara</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Misal: Laporan Praktikum" className="w-full px-3 py-2 border rounded-md text-sm" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tipe</label>
                    <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full px-3 py-2 border rounded-md text-sm bg-white">
                      <option value="tugas">Tugas</option><option value="praktikum">Praktikum</option><option value="ujian">Ujian</option><option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Prioritas</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full px-3 py-2 border rounded-md text-sm bg-white">
                      <option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi (Urgent)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tenggat Waktu (Deadline)</label>
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required />
                </div>
                <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-md hover:bg-black transition-colors flex items-center justify-center gap-2 mt-4 text-sm disabled:opacity-50">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Masukkan ke Radar
                </button>
              </form>
            </div>

            {/* Kanan: List */}
            <div className="w-full lg:w-2/3 p-6 bg-slate-50 overflow-y-auto max-h-[600px] space-y-6">
              
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-sm uppercase tracking-widest text-slate-500">Tugas & Jadwal Aktif</h3>
                  <span className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-md">{pendingEvents.length} Pending</span>
                </div>
                <div className="p-4 space-y-3">
                  {pendingEvents.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-6">Tidak ada tugas menumpuk.</p>
                  ) : pendingEvents.map(event => {
                    const daysLeft = calculateDaysLeft(event.deadline);
                    const isUrgent = daysLeft <= 2 || event.priority === 'high';
                    return (
                      <div key={event.id} className={`p-4 rounded-lg border flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                        <div className="flex gap-4">
                          <button onClick={() => updateEventStatus(event.id, event.status === 'pending' ? 'in_progress' : 'completed')} className={`mt-1 shrink-0 ${event.status === 'pending' ? 'text-slate-300 hover:text-blue-500' : 'text-blue-500 hover:text-emerald-500'}`}>
                            {event.status === 'pending' ? <Circle size={20} /> : <ArrowRightCircle size={20} />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm ${event.type === 'ujian' ? 'bg-purple-100 text-purple-700' : event.type === 'praktikum' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{event.type}</span>
                              {event.status === 'in_progress' && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-sm">ON PROGRESS</span>}
                            </div>
                            <h4 className={`font-bold text-md ${isUrgent ? 'text-red-900' : 'text-slate-900'}`}>{event.title}</h4>
                            <div className="flex items-center gap-1 mt-1 text-xs font-mono text-slate-500"><Clock size={12} /> {event.deadline}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                          <div className={`text-xs font-bold flex items-center gap-1 ${daysLeft < 0 ? 'text-red-600' : daysLeft <= 2 ? 'text-red-600' : 'text-slate-500'}`}>
                            {daysLeft < 0 ? <><AlertCircle size={14}/> TERLAMBAT</> : daysLeft === 0 ? <><AlertCircle size={14}/> HARI INI</> : `${daysLeft} Hari Lagi`}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => updateEventStatus(event.id, 'completed')} className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-black">Selesai</button>
                            <button onClick={() => deleteEvent(event.id)} className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100"><h3 className="font-bold text-sm text-slate-500">Riwayat Selesai ({completedEvents.length})</h3></div>
                <div className="p-4 space-y-2">
                  {completedEvents.length === 0 ? <p className="text-xs text-slate-400 text-center">Belum ada tugas selesai.</p> : completedEvents.map(event => (
                    <div key={event.id} className="flex justify-between items-center p-2 rounded-md bg-slate-50 border border-transparent hover:border-slate-200">
                      <div className="flex items-center gap-3"><CheckCircle2 size={16} className="text-emerald-500" /><span className="text-sm font-medium text-slate-500 line-through">{event.title}</span></div>
                      <button onClick={() => deleteEvent(event.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
              
            </div>
          </div>
        )}

        {/* TAB 2: KALENDER VISUAL (Grid Berwarna) */}
        {mainTab === 'calendar' && (
          <div className="flex flex-col md:flex-row h-full">
            {/* Kiri: Grid Kalender */}
            <div className="w-full md:w-2/3 p-6 border-r border-slate-100 bg-white">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">{monthNames[calendarMonth]} {calendarYear}</h3>
                <div className="flex gap-2">
                  <button onClick={() => { if(calendarMonth===0){setCalendarMonth(11); setCalendarYear(y=>y-1)} else setCalendarMonth(m=>m-1) }} className="p-2 border rounded hover:bg-slate-50">&lt;</button>
                  <button onClick={() => { if(calendarMonth===11){setCalendarMonth(0); setCalendarYear(y=>y+1)} else setCalendarMonth(m=>m+1) }} className="p-2 border rounded hover:bg-slate-50">&gt;</button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => <div key={d} className="text-xs font-bold text-slate-400 py-2">{d}</div>)}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {generateCalendarDays().map((day, idx) => (
                  day === null ? (
                    <div key={`empty-${idx}`} className="h-20 rounded-md bg-transparent"></div>
                  ) : (
                    <button 
                      key={day.fullDate} 
                      onClick={() => setSelectedDate(day.fullDate)}
                      className={`h-20 flex flex-col items-center justify-start pt-2 rounded-md border transition-all relative
                        ${selectedDate === day.fullDate ? 'border-black shadow-md scale-105 bg-slate-50' : 'border-slate-100 hover:border-slate-300'} 
                        ${day.events.length > 0 ? 'cursor-pointer' : 'opacity-70 cursor-default'}`}
                    >
                      <span className={`text-sm font-bold ${selectedDate === day.fullDate ? 'text-black' : 'text-slate-600'}`}>{day.date}</span>
                      
                      {/* Indikator Titik Warna (Maksimal 3 agar tidak luber) */}
                      <div className="flex flex-wrap justify-center gap-1 mt-2 px-1">
                        {day.events.slice(0,3).map(ev => (
                          <div 
                            key={ev.id} 
                            className={`w-2 h-2 rounded-full ${ev.status === 'completed' ? 'bg-emerald-400' : ev.type === 'ujian' ? 'bg-purple-500' : ev.type === 'praktikum' ? 'bg-amber-400' : 'bg-slate-400'}`}
                            title={ev.title}
                          ></div>
                        ))}
                        {day.events.length > 3 && <div className="w-2 h-2 rounded-full bg-slate-300 flex items-center justify-center text-[8px] font-bold">+</div>}
                      </div>
                    </button>
                  )
                ))}
              </div>

              {/* Keterangan Warna */}
              <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-400 rounded-full"></div> Tugas</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-400 rounded-full"></div> Praktikum</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-500 rounded-full"></div> Ujian</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-400 rounded-full"></div> Selesai</div>
              </div>
            </div>

            {/* Kanan: Detail Hari yang Diklik */}
            <div className="w-full md:w-1/3 p-6 bg-slate-50 h-[600px] overflow-y-auto">
              {!selectedDate ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                  <CalendarIcon size={32} className="mb-3 opacity-20" />
                  <p className="text-sm">Klik kotak tanggal yang memiliki indikator warna untuk melihat rincian acara.</p>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                    <h3 className="font-bold font-mono text-lg">{selectedDate}</h3>
                    <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-black"><X size={16} /></button>
                  </div>
                  
                  <div className="space-y-4">
                    {events.filter(e => e.deadline === selectedDate).length === 0 ? (
                      <p className="text-sm text-slate-500 text-center">Tidak ada jadwal pada hari ini.</p>
                    ) : (
                      events.filter(e => e.deadline === selectedDate).map(event => (
                        <div key={event.id} className={`p-4 rounded-lg border shadow-sm ${event.status === 'completed' ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm ${event.type === 'ujian' ? 'bg-purple-100 text-purple-700' : event.type === 'praktikum' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                              {event.type}
                            </span>
                            {event.status === 'completed' && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12}/> SELESAI</span>}
                          </div>
                          
                          <h4 className={`font-bold text-sm mb-3 ${event.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}>{event.title}</h4>
                          
                          {event.status !== 'completed' && (
                            <div className="flex gap-2">
                              <button onClick={() => updateEventStatus(event.id, 'completed')} className="flex-1 text-xs font-bold bg-slate-900 text-white py-1.5 rounded-md hover:bg-black transition-colors">Tandai Selesai</button>
                              <button onClick={() => deleteEvent(event.id)} className="px-3 text-slate-400 hover:text-red-600 bg-slate-100 rounded-md hover:bg-red-50 transition-colors"><Trash2 size={14}/></button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}