import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Activity, AlertTriangle, Target, TrendingDown, Calendar, Receipt, Lightbulb, Wallet, Users, TrendingUp, Circle, ArrowRight, Edit3, Trash2, X, Loader2 } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';

export default function ExecutiveDashboard() {
  const [balance, setBalance] = useState(0);
  const [emergencyLock, setEmergencyLock] = useState(0);
  const [ukt, setUkt] = useState({ id: '', paid_semesters: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [events, setEvents] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [unpaidDebts, setUnpaidDebts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  const [miniChartData, setMiniChartData] = useState<any[]>([]);
  const [todayExpense, setTodayExpense] = useState(0);
  const [net7d, setNet7d] = useState({ income: 0, expense: 0, total: 0 });

  // Calendar States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const dateScrollRef = useRef<HTMLDivElement>(null);

  // Edit Modal States (Global Dashboard Edit)
  const [editType, setEditType] = useState<'event' | 'bill' | 'trx' | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => { fetchDashboardData(); }, []);

  useEffect(() => {
    if (!loading && dateScrollRef.current) {
      setTimeout(() => {
        const todayElem = dateScrollRef.current?.querySelector('[data-today="true"]');
        if (todayElem) todayElem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }, 300);
    }
  }, [loading]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
    if (settings) setEmergencyLock(settings.emergency_lock);
    
    // Migrasi Logic UKT (Dari persentase ke 8 Semester)
    const { data: uktData } = await supabase.from('financial_targets').select('*').eq('user_id', user.id).eq('type', 'ukt').single();
    if (uktData) {
      if (uktData.target_amount > 10) {
        await supabase.from('financial_targets').update({ target_amount: 8, current_amount: 0 }).eq('id', uktData.id);
        setUkt({ id: uktData.id, paid_semesters: 0 });
      } else {
        setUkt({ id: uktData.id, paid_semesters: uktData.current_amount });
      }
    }

    const { data: trx } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false });
    if (trx) {
      setTransactions(trx);
      let runningBalance = 0;
      for (let i = 0; i < trx.length; i++) {
        if (trx[i].type === 'adjustment') { runningBalance += Number(trx[i].amount); break; } 
        else if (trx[i].type === 'income') { runningBalance += Number(trx[i].amount); } 
        else if (trx[i].type === 'expense') { runningBalance -= Number(trx[i].amount); }
      }
      setBalance(runningBalance);

      const today = new Date().toISOString().split('T')[0];
      setTodayExpense(trx.filter(t => t.type === 'expense' && t.category !== 'System' && t.transaction_date === today).reduce((sum, t) => sum + Number(t.amount), 0));

      const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0];
      }).reverse();
      
      let sumInc7d = 0; let sumExp7d = 0;
      const chartData = last7Days.map(date => {
        const dailyExp = trx.filter(t => t.type === 'expense' && t.category !== 'System' && t.transaction_date === date).reduce((sum, t) => sum + Number(t.amount), 0);
        const dailyInc = trx.filter(t => t.type === 'income' && t.category !== 'System' && t.transaction_date === date).reduce((sum, t) => sum + Number(t.amount), 0);
        sumExp7d += dailyExp; sumInc7d += dailyInc;
        return { date: date.substring(8, 10), Total: dailyExp };
      });
      setMiniChartData(chartData);
      setNet7d({ income: sumInc7d, expense: sumExp7d, total: sumInc7d - sumExp7d });
    }

    const { data: evts } = await supabase.from('academic_events').select('*').eq('user_id', user.id).neq('status', 'completed');
    if (evts) setEvents(evts);

    const { data: bls } = await supabase.from('recurring_bills').select('*').eq('user_id', user.id);
    if (bls) setBills(bls);

    const { data: debts } = await supabase.from('debts').select('*').eq('user_id', user.id).eq('status', 'unpaid');
    if (debts) setUnpaidDebts(debts);

    setLoading(false);
  };

  const handlePayUKT = async (semester: number) => {
    if (semester !== ukt.paid_semesters + 1) return alert('Harap lunasi semester secara berurutan.');
    if (!window.confirm(`Catat pelunasan UKT Semester ${semester} sebesar Rp 3.500.000?`)) return;
    
    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user && ukt.id) {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('transactions').insert({ user_id: user.id, type: 'income', amount: 3500000, description: `Penerimaan Dana UKT (Semester ${semester})`, category: 'Lainnya', transaction_date: today });
      await supabase.from('transactions').insert({ user_id: user.id, type: 'expense', amount: 3500000, description: `Pembayaran Lunas UKT Semester ${semester}`, category: 'Akademik/Tugas', transaction_date: today });
      await supabase.from('financial_targets').update({ current_amount: semester }).eq('id', ukt.id);
      fetchDashboardData();
    }
    setProcessing(false);
  };

  // GLOBAL EDIT HANDLERS
  const openEditModal = (type: 'event'|'bill'|'trx', data: any) => {
    setEditType(type); setEditData(data); setIsModalOpen(true);
  };
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    if (editType === 'event') await supabase.from('academic_events').update({ title: editData.title, deadline: editData.deadline }).eq('id', editData.id);
    if (editType === 'bill') await supabase.from('recurring_bills').update({ name: editData.name, amount: editData.amount }).eq('id', editData.id);
    if (editType === 'trx') await supabase.from('transactions').update({ description: editData.description, amount: editData.amount }).eq('id', editData.id);
    setIsModalOpen(false); fetchDashboardData(); setProcessing(false);
  };
  const handleDeleteItem = async (type: 'event'|'bill'|'trx', id: string) => {
    if (!window.confirm('Hapus item ini?')) return;
    if (type === 'event') await supabase.from('academic_events').delete().eq('id', id);
    if (type === 'bill') await supabase.from('recurring_bills').delete().eq('id', id);
    if (type === 'trx') await supabase.from('transactions').delete().eq('id', id);
    fetchDashboardData();
  };

  const disposableIncome = balance - emergencyLock;
  const dailyLimit = disposableIncome > 0 ? disposableIncome / 30 : 0;
  const totalPiutang = unpaidDebts.reduce((sum, d) => sum + Number(d.amount), 0);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 19 ? 'Selamat Sore' : 'Selamat Malam';
  let financialTip = "Kondisi stabil. Lanjutkan rutinitas dengan baik."; 
  let tipColor = "text-blue-800 bg-blue-50 border-blue-100";
  if (todayExpense > dailyLimit) { financialTip = "Pengeluaran hari ini melewati batas aman harian."; tipColor = "text-rose-800 bg-rose-50 border-rose-100"; } 
  else if (todayExpense > 0 && todayExpense <= dailyLimit) { financialTip = "Pengeluaran hari ini masih dalam batas aman."; tipColor = "text-emerald-800 bg-emerald-50 border-emerald-100"; }

  const calendarDays = Array.from({length: 30}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 14 + i); 
    return {
      dateObj: d, dateString: d.toISOString().split('T')[0],
      dayName: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()],
      dateNum: d.getDate(), isToday: d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
    };
  });

  const selectedEvents = events.filter(e => e.deadline === selectedDate);
  const selectedBills = bills.filter(b => b.due_date === new Date(selectedDate).getDate() && (!b.last_paid_month || b.last_paid_month.substring(0,7) !== selectedDate.substring(0,7)));
  const selectedTrx = transactions.filter(t => t.transaction_date === selectedDate && t.category !== 'System');
  
  const urgentEvents = events.filter(e => Math.ceil((new Date(e.deadline).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)) <= 3).slice(0, 3);
  const unpaidBillsGlobal = bills.filter(b => !b.last_paid_month || b.last_paid_month.substring(0,7) !== new Date().toISOString().substring(0,7));

  if (loading) return (
    <div className="space-y-6">
      <div className="h-24 bg-slate-200/50 rounded-[2rem] animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6"><div className="md:col-span-2 h-40 bg-slate-200/50 rounded-[2rem] animate-pulse"></div><div className="h-40 bg-slate-200/50 rounded-[2rem] animate-pulse"></div><div className="h-40 bg-slate-200/50 rounded-[2rem] animate-pulse"></div></div>
    </div>
  );

  return (
    <div className="space-y-6 relative">
      
      {/* HEADER & AI TIP */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{greeting}.</h2>
          <p className="text-slate-500 text-sm mt-1">Ringkasan operasional sistem Anda.</p>
        </div>
        <div className={`px-5 py-3.5 rounded-2xl flex items-center gap-3 w-full lg:w-auto max-w-md transition-all border ${tipColor}`}>
          <Lightbulb size={20} className="shrink-0" />
          <p className="text-xs font-bold leading-relaxed">{financialTip}</p>
        </div>
      </div>

      {/* METRIK UTAMA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="md:col-span-2 bg-blue-600 text-white p-6 rounded-[2rem] shadow-lg shadow-blue-600/20 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Total Liquid Asset</span>
              <Activity size={18} className="text-emerald-300" />
            </div>
            <div className="text-4xl font-black mb-1 tracking-tight">Rp {balance.toLocaleString('id-ID')}</div>
            <div className="text-[11px] text-blue-200 mt-4 flex items-center gap-1.5 bg-blue-700/50 w-fit px-3 py-1.5 rounded-xl">
              <ShieldAlert size={14} /> Terkunci Darurat: <span className="font-mono font-bold text-white">Rp {emergencyLock.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <Wallet size={160} className="absolute -bottom-10 -right-10 text-blue-500 opacity-30 rotate-12" />
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Limit Harian (30H)</span>
          <div className={`text-2xl font-black tracking-tight mb-3 ${dailyLimit < 20000 ? 'text-rose-600' : 'text-slate-800'}`}>
            Rp {Math.floor(dailyLimit).toLocaleString('id-ID')}
          </div>
          <div className="border-t border-slate-50 pt-3">
             <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 block">Dana Bebas</span>
             <div className="text-sm font-bold text-slate-600">Rp {disposableIncome.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Arus Kas 7H</span>
            {net7d.total >= 0 ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-rose-500" />}
          </div>
          <div className="mb-2">
            <span className={`text-sm font-black tracking-tight ${net7d.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {net7d.total >= 0 ? '+' : ''}Rp {(net7d.total/1000).toLocaleString('id-ID')}k
            </span>
          </div>
          <div className="h-12 w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={miniChartData}>
                <Bar dataKey="Total" radius={[4, 4, 0, 0]}>
                  {miniChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.Total > dailyLimit ? '#ef4444' : '#cbd5e1'} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* KALENDER TERPADU (DENGAN RIWAYAT FINANSIAL & EDIT) */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="p-5 md:p-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl"><Calendar size={20} className="text-indigo-600" /></div>
            <h3 className="font-bold text-base text-slate-800">Riwayat & Jadwal</h3>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">{new Date(selectedDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
        </div>
        
        {/* Horizontal Scroll Dates */}
        <div className="relative">
          <div ref={dateScrollRef} className="flex overflow-x-auto gap-2 px-5 md:px-6 py-4 [&::-webkit-scrollbar]:hidden scroll-smooth relative z-10" style={{ scrollbarWidth: 'none' }}>
            {calendarDays.map(day => {
              const isSelected = selectedDate === day.dateString;
              const hasEvent = events.some(e => e.deadline === day.dateString);
              const hasBill = bills.some(b => b.due_date === day.dateNum && (!b.last_paid_month || b.last_paid_month.substring(0,7) !== day.dateString.substring(0,7)));
              const hasTrx = transactions.some(t => t.transaction_date === day.dateString && t.category !== 'System');
              
              return (
                <button
                  key={day.dateString} data-today={day.isToday} onClick={() => setSelectedDate(day.dateString)}
                  className={`min-w-[60px] flex flex-col items-center justify-center p-3 rounded-[1.25rem] transition-all shrink-0 ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  <span className={`text-[10px] font-bold uppercase mb-1 ${isSelected ? 'text-indigo-200' : 'text-slate-400'} ${day.isToday && !isSelected && 'text-indigo-600'}`}>{day.isToday ? 'Hari Ini' : day.dayName}</span>
                  <span className={`text-xl font-black ${isSelected ? 'text-white' : 'text-slate-800'}`}>{day.dateNum}</span>
                  <div className="flex gap-1 mt-1.5 h-1.5">
                    {hasEvent && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-400'}`}></div>}
                    {hasBill && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-200' : 'bg-rose-400'}`}></div>}
                    {hasTrx && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-300' : 'bg-slate-300'}`}></div>}
                  </div>
                </button>
              )
            })}
          </div>
          {/* Scroll Cue Indicator */}
          <div className="absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-white to-transparent pointer-events-none z-20 flex items-center justify-end pr-1">
            <ArrowRight className="text-slate-400 animate-pulse w-5 h-5 bg-white/50 rounded-full" />
          </div>
        </div>

        {/* Selected Date Content */}
        <div className="bg-slate-50/50 p-5 md:p-6 min-h-[120px]">
          {selectedEvents.length === 0 && selectedBills.length === 0 && selectedTrx.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium py-4">Tidak ada agenda atau catatan keuangan.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Event List */}
              {selectedEvents.map(ev => (
                <div key={ev.id} className="bg-white p-3.5 rounded-2xl border border-amber-100 flex justify-between items-start gap-3 shadow-sm group">
                  <div className="flex items-start gap-3 min-w-0">
                    <Circle size={16} className="mt-0.5 text-amber-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 truncate">{ev.title}</h4>
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1">{ev.type}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal('event', ev)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit3 size={14}/></button>
                    <button onClick={() => handleDeleteItem('event', ev.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
              {/* Bill List */}
              {selectedBills.map(bill => (
                <div key={bill.id} className="bg-white p-3.5 rounded-2xl border border-rose-100 flex justify-between items-start gap-3 shadow-sm group">
                  <div className="flex items-start gap-3 min-w-0">
                    <Receipt size={16} className="mt-0.5 text-rose-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 truncate">{bill.name}</h4>
                      <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mt-1">Rp {(bill.amount/1000).toLocaleString('id-ID')}k</p>
                    </div>
                  </div>
                  <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal('bill', bill)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit3 size={14}/></button>
                    <button onClick={() => handleDeleteItem('bill', bill.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
              {/* Transaction List */}
              {selectedTrx.map(trx => (
                <div key={trx.id} className={`bg-white p-3.5 rounded-2xl border flex justify-between items-start gap-3 shadow-sm group ${trx.type === 'expense' ? 'border-rose-100' : 'border-emerald-100'}`}>
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 shrink-0 ${trx.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {trx.type === 'expense' ? <TrendingDown size={16}/> : <TrendingUp size={16}/>}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 truncate">{trx.description}</h4>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${trx.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {trx.type === 'expense' ? '-' : '+'} Rp {(trx.amount/1000).toLocaleString('id-ID')}k
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal('trx', trx)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit3 size={14}/></button>
                    <button onClick={() => handleDeleteItem('trx', trx.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OPERASIONAL KEUANGAN - GRID 2 KOLOM RAPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* UKT 8 SEMESTER BOXES (Revolusi UKT) */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-5 border-b border-slate-50 pb-4">
            <div className="flex items-center gap-2"><div className="p-1.5 bg-blue-50 rounded-lg"><Target size={18} className="text-blue-600" /></div><h3 className="font-bold text-sm text-slate-800">Pembayaran UKT</h3></div>
            <div className="text-xs font-bold text-slate-400">Rp 3.5jt / Smt</div>
          </div>
          
          <div className="grid grid-cols-4 gap-2 mb-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
              const isPaid = sem <= ukt.paid_semesters;
              return (
                <button 
                  key={sem} 
                  onClick={() => handlePayUKT(sem)} 
                  disabled={isPaid || processing}
                  className={`py-3 flex flex-col items-center justify-center rounded-2xl transition-all border ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100 cursor-default' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100'}`}
                >
                  <span className="text-[10px] font-bold uppercase mb-0.5">Smt</span>
                  <span className="text-lg font-black">{sem}</span>
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-center font-bold text-slate-400 uppercase mt-auto pt-4">Ketuk semester berwarna putih untuk melunasi.</p>
        </div>

        {/* Status Tagihan */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-4">
            <div className="flex items-center gap-2"><div className="p-1.5 bg-rose-50 rounded-lg"><Receipt size={18} className="text-rose-600" /></div><h3 className="font-bold text-sm text-slate-800">Tagihan Aktif</h3></div>
            <span className="text-xs font-bold text-slate-400">{unpaidBillsGlobal.length} Tertunda</span>
          </div>
          <div className="space-y-2 mt-auto">
            {unpaidBillsGlobal.length === 0 ? <p className="text-xs text-center text-emerald-600 bg-emerald-50 py-3 rounded-xl font-bold">Semua Lunas.</p> : unpaidBillsGlobal.slice(0,3).map(bill => (
              <div key={bill.id} className="flex justify-between items-center p-3 bg-rose-50/50 rounded-xl">
                <span className="font-bold text-xs text-rose-900 truncate">{bill.name}</span>
                <span className="text-xs font-black text-rose-700 shrink-0">Rp {(bill.amount/1000).toLocaleString('id-ID')}k</span>
              </div>
            ))}
          </div>
        </div>

        {/* Agenda Mendesak (H-3) */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-4">
            <div className="flex items-center gap-2"><div className="p-1.5 bg-amber-50 rounded-lg"><AlertTriangle size={18} className="text-amber-600" /></div><h3 className="font-bold text-sm text-slate-800">Radar H-3</h3></div>
            <span className="text-xs font-bold text-slate-400">{urgentEvents.length} Item</span>
          </div>
          <div className="space-y-2 mt-auto">
            {urgentEvents.length === 0 ? <p className="text-xs text-center text-slate-400 bg-slate-50 py-3 rounded-xl font-medium">Jadwal H-3 Kosong.</p> : urgentEvents.map(event => (
              <div key={event.id} className="flex justify-between items-center p-3 bg-amber-50/50 rounded-xl">
                <span className="font-bold text-xs text-slate-800 truncate pr-2">{event.title}</span>
                <span className="text-[10px] font-bold text-amber-600 bg-white px-2 py-1 rounded-md shrink-0 border border-amber-100">{event.deadline.substring(5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Buku Kasbon */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-4">
            <div className="flex items-center gap-2"><div className="p-1.5 bg-indigo-50 rounded-lg"><Users size={18} className="text-indigo-600" /></div><h3 className="font-bold text-sm text-slate-800">Piutang Tertunda</h3></div>
            <span className="text-xs font-bold text-slate-400">{unpaidDebts.length} Orang</span>
          </div>
          <div className="mb-3">
             <span className="text-2xl font-black text-indigo-700 tracking-tight">Rp {totalPiutang.toLocaleString('id-ID')}</span>
          </div>
          <div className="space-y-2 mt-auto">
            {unpaidDebts.length === 0 ? <p className="text-xs text-slate-400 bg-slate-50 p-2 rounded-xl text-center">Tidak ada piutang.</p> : unpaidDebts.slice(0,2).map(debt => (
              <div key={debt.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-xs text-slate-800">{debt.borrower_name}</span>
                <span className="text-xs font-black text-slate-600">Rp {(debt.amount/1000).toLocaleString('id-ID')}k</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* OVERLAY LACI BAWAH / MODAL EDIT GLOBAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 p-7 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                <h4 className="font-bold text-base text-slate-800">Edit Data Cepat</h4>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-xl"><X size={18}/></button>
              </div>

              {editType === 'event' && (
                <>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5">Nama Acara</label><input type="text" value={editData.title} onChange={e=>setEditData({...editData, title: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none" required /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5">Tanggal</label><input type="date" value={editData.deadline} onChange={e=>setEditData({...editData, deadline: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none" required /></div>
                </>
              )}
              {editType === 'bill' && (
                <>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5">Nama Tagihan</label><input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none" required /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5">Nominal (Rp)</label><input type="number" value={editData.amount} onChange={e=>setEditData({...editData, amount: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none" required /></div>
                </>
              )}
              {editType === 'trx' && (
                <>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5">Keterangan Transaksi</label><input type="text" value={editData.description} onChange={e=>setEditData({...editData, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none" required /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5">Nominal (Rp)</label><input type="number" value={editData.amount} onChange={e=>setEditData({...editData, amount: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none" required /></div>
                </>
              )}

              <button type="submit" disabled={processing} className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 mt-4 text-sm">
                {processing ? <Loader2 size={18} className="animate-spin" /> : <Edit3 size={18} />} Simpan Perubahan
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}