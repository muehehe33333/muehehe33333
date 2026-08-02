import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Activity, AlertTriangle, Target, CheckCircle2, TrendingDown, Calendar, Receipt, Lightbulb, Wallet, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';

export default function ExecutiveDashboard() {
  const [balance, setBalance] = useState(0);
  const [emergencyLock, setEmergencyLock] = useState(0);
  const [ukt, setUkt] = useState({ id: '', current: 0, target: 3500000 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [urgentEvents, setUrgentEvents] = useState<any[]>([]);
  const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
  const [unpaidDebts, setUnpaidDebts] = useState<any[]>([]);
  
  const [miniChartData, setMiniChartData] = useState<any[]>([]);
  const [todayExpense, setTodayExpense] = useState(0);
  const [net7d, setNet7d] = useState({ income: 0, expense: 0, total: 0 });

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
    if (settings) setEmergencyLock(settings.emergency_lock);
    
    const { data: uktData } = await supabase.from('financial_targets').select('*').eq('user_id', user.id).eq('type', 'ukt').single();
    if (uktData) setUkt({ id: uktData.id, current: uktData.current_amount, target: uktData.target_amount });

    const { data: trx } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false });
    
    if (trx) {
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
      
      let sumInc7d = 0;
      let sumExp7d = 0;

      const chartData = last7Days.map(date => {
        const dailyExp = trx.filter(t => t.type === 'expense' && t.category !== 'System' && t.transaction_date === date).reduce((sum, t) => sum + Number(t.amount), 0);
        const dailyInc = trx.filter(t => t.type === 'income' && t.category !== 'System' && t.transaction_date === date).reduce((sum, t) => sum + Number(t.amount), 0);
        sumExp7d += dailyExp;
        sumInc7d += dailyInc;
        return { date: date.substring(8, 10), Total: dailyExp };
      });

      setMiniChartData(chartData);
      setNet7d({ income: sumInc7d, expense: sumExp7d, total: sumInc7d - sumExp7d });
    }

    const { data: events } = await supabase.from('academic_events').select('*').eq('user_id', user.id).neq('status', 'completed').order('deadline', { ascending: true });
    if (events) setUrgentEvents(events.filter(e => Math.ceil((new Date(e.deadline).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)) <= 3).slice(0, 3));

    const { data: bills } = await supabase.from('recurring_bills').select('*').eq('user_id', user.id);
    if (bills) setUnpaidBills(bills.filter(b => !b.last_paid_month || (new Date(b.last_paid_month).getMonth() !== new Date().getMonth() || new Date(b.last_paid_month).getFullYear() !== new Date().getFullYear())));

    const { data: debts } = await supabase.from('debts').select('*').eq('user_id', user.id).eq('status', 'unpaid');
    if (debts) setUnpaidDebts(debts);

    setLoading(false);
  };

  const handleLunasUKT = async () => {
    if (!window.confirm(`Proses pelunasan UKT sebesar Rp ${Number(ukt.target).toLocaleString('id-ID')}? Ini akan mereset target kembali ke 0 untuk semester berikutnya.`)) return;
    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && ukt.id) {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('transactions').insert({ user_id: user.id, type: 'income', amount: ukt.target, description: 'Penerimaan Dana UKT', category: 'Lainnya', transaction_date: today });
      await supabase.from('transactions').insert({ user_id: user.id, type: 'expense', amount: ukt.target, description: 'Pembayaran Lunas UKT Semester', category: 'Akademik/Tugas', transaction_date: today });
      
      // Reset target ke 0 untuk persiapan semester depan
      await supabase.from('financial_targets').update({ current_amount: 0 }).eq('id', ukt.id);
      
      fetchDashboardData();
    }
    setProcessing(false);
  };

  const disposableIncome = balance - emergencyLock;
  const dailyLimit = disposableIncome > 0 ? disposableIncome / 30 : 0;
  const uktPercentage = Math.min(100, Math.round((ukt.current / ukt.target) * 100));
  const totalPiutang = unpaidDebts.reduce((sum, d) => sum + Number(d.amount), 0);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 19 ? 'Selamat Sore' : 'Selamat Malam';
  
  let financialTip = "Kondisi finansial stabil. Lanjutkan rutinitas Anda."; 
  let tipColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (todayExpense > dailyLimit) { financialTip = "Awas! Pengeluaran hari ini melewati batas aman harian."; tipColor = "text-red-700 bg-red-50 border-red-200"; } 
  else if (todayExpense > 0 && todayExpense <= dailyLimit) { financialTip = "Pengeluaran hari ini masih dalam batas aman."; tipColor = "text-blue-700 bg-blue-50 border-blue-200"; }

  if (loading) return <div className="animate-pulse h-[600px] bg-slate-100 rounded-2xl"></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{greeting}.</h2>
          <p className="text-slate-500 text-sm mt-1">Berikut adalah ringkasan operasional Anda hari ini.</p>
        </div>
        <div className={`px-4 py-3 border rounded-xl flex items-start gap-3 w-full md:w-auto max-w-md ${tipColor}`}>
          <Lightbulb size={18} className="mt-0.5 shrink-0" />
          <p className="text-xs font-medium leading-relaxed">{financialTip}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        <div className="md:col-span-2 bg-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Liquid Asset</span>
              <Activity size={18} className="text-emerald-400" />
            </div>
            <div className="text-4xl font-black mb-1">Rp {balance.toLocaleString('id-ID')}</div>
            <div className="text-xs text-slate-400 border-t border-slate-700 pt-3 mt-4 flex items-center gap-2">
              <ShieldAlert size={14} className="text-slate-500"/> Terkunci Darurat: <span className="font-mono text-slate-300">Rp {emergencyLock.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 opacity-10"><Wallet size={160} /></div>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dana Bebas</span></div>
            <div className="text-2xl font-black text-slate-900 mb-1">Rp {disposableIncome.toLocaleString('id-ID')}</div>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-3">
            <div className="flex justify-between items-start mb-1"><span className={`text-[10px] font-bold uppercase tracking-wider ${dailyLimit < 20000 ? 'text-red-600' : 'text-slate-500'}`}>Limit Harian (30H)</span></div>
            <div className={`text-xl font-black ${dailyLimit < 20000 ? 'text-red-600' : 'text-slate-900'}`}>Rp {Math.floor(dailyLimit).toLocaleString('id-ID')}</div>
          </div>
        </div>

        <div className="bg-slate-50 p-5 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Arus Kas 7 Hari</span>
            {net7d.total >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
          </div>
          <div className="mb-2">
            <span className={`text-lg font-black font-mono ${net7d.total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {net7d.total >= 0 ? '+' : ''}Rp {net7d.total.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="h-16 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={miniChartData}>
                <Bar dataKey="Total" radius={[2, 2, 0, 0]}>
                  {miniChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.Total > dailyLimit ? '#ef4444' : '#94a3b8'} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2"><Target size={18} className="text-slate-400" /><h3 className="font-bold text-sm text-slate-800">Alokasi UKT Semester</h3></div>
              <div className="text-xl font-black">{uktPercentage}%</div>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full mb-3 overflow-hidden">
              <div className="bg-slate-900 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${uktPercentage}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="text-xs text-slate-500">
                Terkumpul: <span className="font-bold text-slate-900">Rp {Number(ukt.current).toLocaleString('id-ID')}</span> / Rp {Number(ukt.target).toLocaleString('id-ID')}
              </div>
              <button onClick={handleLunasUKT} disabled={processing} className="text-xs font-bold bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2">
                <CheckCircle2 size={14} /> Bayar & Reset Target
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2"><Calendar size={16} className="text-slate-400" /><h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Radar Agenda (H-3)</h3></div>
              {urgentEvents.length > 0 && <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 font-bold px-2 py-1 rounded animate-pulse"><AlertTriangle size={12}/> PERHATIAN</span>}
            </div>
            <div className="space-y-3">
              {urgentEvents.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Jadwal aman.</p> : urgentEvents.map(event => (
                <div key={event.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{event.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black uppercase bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{event.type}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Tenggat: {event.deadline}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 h-fit">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2"><Receipt size={16} className="text-slate-400" /><h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Status Tagihan</h3></div>
            <div className="space-y-3">
              {unpaidBills.length === 0 ? <div className="flex flex-col items-center justify-center py-4 text-emerald-600 text-center"><CheckCircle2 size={24} className="mb-1 opacity-50" /><p className="text-xs font-bold">Semua lunas.</p></div> : unpaidBills.map(bill => (
                <div key={bill.id} className="flex justify-between items-center p-2.5 bg-red-50 border border-red-100 rounded-xl">
                  <div><h4 className="font-bold text-xs text-red-900">{bill.name}</h4><p className="text-[10px] text-red-600">Tgl {bill.due_date}</p></div>
                  <span className="text-xs font-mono font-bold text-red-700">Rp {Number(bill.amount).toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className={`border rounded-2xl shadow-sm p-6 ${unpaidDebts.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between items-start mb-2"><div className="flex items-center gap-2"><Users size={16} className={unpaidDebts.length > 0 ? 'text-amber-600' : 'text-slate-400'} /><h3 className={`font-bold text-sm uppercase tracking-wider ${unpaidDebts.length > 0 ? 'text-amber-800' : 'text-slate-600'}`}>Buku Kasbon</h3></div></div>
            <div className={`text-xl font-black font-mono mb-4 ${unpaidDebts.length > 0 ? 'text-amber-700' : 'text-slate-400'}`}>Rp {totalPiutang.toLocaleString('id-ID')}</div>
            <div className="space-y-2">
              {unpaidDebts.length === 0 ? <p className="text-xs text-slate-500">Tidak ada uang Anda yang ditahan orang lain.</p> : unpaidDebts.map(debt => (
                <div key={debt.id} className="flex justify-between items-center bg-white border border-amber-100 p-2 rounded-lg"><span className="text-xs font-bold text-slate-700 truncate pr-2">{debt.borrower_name}</span><span className="text-xs font-mono font-bold text-amber-600">Rp {Number(debt.amount).toLocaleString('id-ID')}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}