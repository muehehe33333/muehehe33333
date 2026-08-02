import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowDownRight, ArrowUpRight, Scale, Plus, Loader2, PieChart as PieIcon, TrendingDown, Receipt, Trash2, Calendar as CalendarIcon, Edit3, X, Download, Box, Check, Clock, CheckCircle2, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

type Transaction = { id: string; type: 'income' | 'expense' | 'adjustment'; amount: number; description: string; category: string; transaction_date: string; };
type Bill = { id: string; name: string; amount: number; due_date: number; category: string; last_paid_month: string | null; };
type ImpulseItem = { id: string; item_name: string; price: number; target_date: string; status: string; };
type Debt = { id: string; borrower_name: string; amount: number; status: string; created_at: string; };

const PIE_COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

export default function FinancialModule() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [sandboxItems, setSandboxItems] = useState<ImpulseItem[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form States
  const [activeFormTab, setActiveFormTab] = useState<'flow' | 'exact'>('flow');
  const [editingTrxId, setEditingTrxId] = useState<string | null>(null);
  const [flowType, setFlowType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Makan/Minum');
  const [submitting, setSubmitting] = useState(false);

  // Sub-modules Forms
  const [billName, setBillName] = useState(''); const [billAmount, setBillAmount] = useState(''); const [billDueDate, setBillDueDate] = useState('1');
  const [sandboxName, setSandboxName] = useState(''); const [sandboxPrice, setSandboxPrice] = useState(''); const [sandboxDays, setSandboxDays] = useState('3');
  const [debtName, setDebtName] = useState(''); const [debtAmount, setDebtAmount] = useState('');

  // UI States
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const currentDate = new Date();
  const [calendarMonth, setCalendarMonth] = useState(currentDate.getMonth());
  const [calendarYear, setCalendarYear] = useState(currentDate.getFullYear());
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '6m' | '1y'>('7d');
  
  // Analytics States
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [periodTotal, setPeriodTotal] = useState({ expense: 0, income: 0 });

  const expenseCategories = ['Makan/Minum', 'Transportasi', 'Kebutuhan Kos', 'Akademik/Tugas', 'Hiburan', 'Lainnya'];
  const incomeCategories = ['Kiriman Ortu', 'Gaji/Freelance', 'Pemberian/Bonus', 'Lainnya'];

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (transactions.length === 0) return;
    const now = new Date(); let startDate = new Date(); let isMonthGrouping = false;
    if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
    else if (timeRange === '30d') startDate.setDate(now.getDate() - 30);
    else if (timeRange === '6m') { startDate.setMonth(now.getMonth() - 6); isMonthGrouping = true; }
    else if (timeRange === '1y') { startDate.setFullYear(now.getFullYear() - 1); isMonthGrouping = true; }

    const filteredTrx = transactions.filter(t => t.category !== 'System' && new Date(t.transaction_date) >= startDate);
    
    const pExpense = filteredTrx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const pIncome = filteredTrx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    setPeriodTotal({ expense: pExpense, income: pIncome });

    const groupedVelocity = filteredTrx.filter(t => t.type === 'expense').reduce((acc: any, curr) => {
      const key = isMonthGrouping ? curr.transaction_date.substring(0, 7) : curr.transaction_date.substring(5, 10);
      acc[key] = (acc[key] || 0) + Number(curr.amount); return acc;
    }, {});
    setChartData(Object.keys(groupedVelocity).sort().map(k => ({ date: k, Total: groupedVelocity[k] })));

    const groupedCat = filteredTrx.filter(t => t.type === 'expense').reduce((acc: any, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount); return acc;
    }, {});
    setCategoryData(Object.keys(groupedCat).map(k => ({ name: k, value: groupedCat[k] })).sort((a, b) => b.value - a.value));
  }, [timeRange, transactions]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: trx } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false });
      const { data: bls } = await supabase.from('recurring_bills').select('*').eq('user_id', user.id).order('due_date', { ascending: true });
      const { data: sbx } = await supabase.from('impulse_sandbox').select('*').eq('user_id', user.id).eq('status', 'pending').order('target_date', { ascending: true });
      const { data: dbts } = await supabase.from('debts').select('*').eq('user_id', user.id).eq('status', 'unpaid').order('created_at', { ascending: false });
      
      if (bls) setBills(bls); if (sbx) setSandboxItems(sbx); if (dbts) setDebts(dbts);
      if (trx) {
        setTransactions(trx);
        let runningBalance = 0;
        for (let i = 0; i < trx.length; i++) {
          if (trx[i].type === 'adjustment') { runningBalance += Number(trx[i].amount); break; } 
          else if (trx[i].type === 'income') { runningBalance += Number(trx[i].amount); } 
          else if (trx[i].type === 'expense') { runningBalance -= Number(trx[i].amount); }
        }
        setCurrentBalance(runningBalance);
      }
    }
    setLoading(false);
  };

  // --- Handlers ---
  const resetForm = () => { setEditingTrxId(null); setAmount(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]); setFlowType('expense'); setCategory(expenseCategories[0]); };
  
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault(); if (!amount) return; setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const isExact = activeFormTab === 'exact';
      const payload = { user_id: user.id, type: isExact ? 'adjustment' : flowType, amount: parseFloat(amount.replace(/[^0-9]/g, '')), description: isExact ? 'Penyesuaian Saldo Sistem' : description, category: isExact ? 'System' : category, transaction_date: date };
      if (editingTrxId) await supabase.from('transactions').update(payload).eq('id', editingTrxId);
      else await supabase.from('transactions').insert(payload);
      resetForm(); fetchData();
    }
    setSubmitting(false);
  };
  const handleDeleteTransaction = async (id: string) => { if (!window.confirm("Hapus catatan ini?")) return; await supabase.from('transactions').delete().eq('id', id); if (editingTrxId === id) resetForm(); fetchData(); };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault(); const { data: { user } } = await supabase.auth.getUser();
    if (user && billName && billAmount) {
      await supabase.from('recurring_bills').insert({ user_id: user.id, name: billName, amount: parseFloat(billAmount.replace(/[^0-9]/g, '')), due_date: parseInt(billDueDate) || 1, category: 'Kebutuhan Kos' });
      setBillName(''); setBillAmount(''); setBillDueDate('1'); fetchData();
    }
  };
  const handleDeleteBill = async (id: string) => { if (!window.confirm("Hapus tagihan permanen ini?")) return; await supabase.from('recurring_bills').delete().eq('id', id); fetchData(); };

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault(); const { data: { user } } = await supabase.auth.getUser();
    if (user && debtName && debtAmount) {
      const amountNum = parseFloat(debtAmount.replace(/[^0-9]/g, '')); const today = new Date().toISOString().split('T')[0];
      await supabase.from('debts').insert({ user_id: user.id, borrower_name: debtName, amount: amountNum, status: 'unpaid' });
      await supabase.from('transactions').insert({ user_id: user.id, type: 'expense', amount: amountNum, description: `[Kasbon] ${debtName}`, category: 'Lainnya', transaction_date: today });
      setDebtName(''); setDebtAmount(''); fetchData();
    }
  };
  const handlePayDebt = async (debt: Debt) => {
    if (!window.confirm(`${debt.borrower_name} sudah bayar lunas? Saldo akan bertambah.`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('debts').update({ status: 'paid' }).eq('id', debt.id);
      await supabase.from('transactions').insert({ user_id: user.id, type: 'income', amount: debt.amount, description: `[Lunas Kasbon] ${debt.borrower_name}`, category: 'Lainnya', transaction_date: today });
      fetchData();
    }
  };

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  const generateCalendarDays = () => {
    const days = []; for (let i = 0; i < getFirstDayOfMonth(calendarYear, calendarMonth); i++) days.push(null);
    for (let i = 1; i <= getDaysInMonth(calendarYear, calendarMonth); i++) {
      const d = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTrx = transactions.filter(t => t.transaction_date === d && t.category !== 'System');
      const expense = dayTrx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      days.push({ date: i, fullDate: d, hasTransactions: dayTrx.length > 0, totalExpense: expense, intensity: expense > 100000 ? 'bg-red-500' : expense > 0 ? 'bg-red-300' : dayTrx.filter(t=>t.type==='income').length > 0 ? 'bg-emerald-400' : 'bg-slate-100' });
    }
    return days;
  };

  if (loading) return <div className="animate-pulse h-64 bg-slate-100 rounded-2xl flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Live Balance Dashboard</p><h2 className="text-4xl font-black">Rp {currentBalance.toLocaleString('id-ID')}</h2></div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors w-full sm:w-auto justify-center"><Download size={16} /> Ekspor CSV</button>
      </div>

      {/* ARUS KAS & BUKU KAS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative h-fit">
          <div className="flex border-b border-slate-200 mb-6">
            <button onClick={() => { setActiveFormTab('flow'); if(editingTrxId && activeFormTab==='exact') resetForm(); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeFormTab === 'flow' ? 'border-b-2 border-black text-black' : 'text-slate-400'}`}>Arus Kas</button>
            <button onClick={() => { setActiveFormTab('exact'); if(editingTrxId && activeFormTab==='flow') resetForm(); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeFormTab === 'exact' ? 'border-b-2 border-black text-black' : 'text-slate-400'}`}>Set Exact</button>
          </div>
          <form onSubmit={handleSubmitTransaction} className="space-y-4">
            {activeFormTab === 'flow' && (
              <>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-md">
                  <button type="button" onClick={() => {setFlowType('expense'); setCategory(expenseCategories[0]);}} className={`py-1.5 text-xs font-bold rounded ${flowType === 'expense' ? 'bg-white shadow text-black' : 'text-slate-500'}`}>Keluar</button>
                  <button type="button" onClick={() => {setFlowType('income'); setCategory(incomeCategories[0]);}} className={`py-1.5 text-xs font-bold rounded ${flowType === 'income' ? 'bg-white shadow text-black' : 'text-slate-500'}`}>Masuk</button>
                </div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50" required /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Nominal (Rp)</label><input type="text" inputMode="numeric" value={amount ? Number(amount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full px-3 py-2 border rounded-md text-sm font-mono text-lg bg-slate-50" required /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50">{(flowType === 'expense' ? expenseCategories : incomeCategories).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Keterangan</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Nama Barang" className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50" required /></div>
              </>
            )}
            {activeFormTab === 'exact' && (
              <>
                <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-md mb-4">Set saldo sinkron dengan isi dompet.</div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50" required /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Saldo Riil Saat Ini (Rp)</label><input type="text" inputMode="numeric" value={amount ? Number(amount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm font-mono text-lg bg-slate-50" required /></div>
              </>
            )}
            <button type="submit" disabled={submitting} className={`w-full text-white font-bold py-3 rounded-md transition mt-4 text-sm flex justify-center gap-2 ${editingTrxId ? 'bg-yellow-600' : 'bg-slate-900 hover:bg-black'}`}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : editingTrxId ? <Edit3 size={16} /> : <Plus size={16} />} {editingTrxId ? 'Simpan Edit' : 'Simpan Transaksi'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-[550px]">
          <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2 shrink-0">Buku Kas (Editable)</h3>
          <div className="space-y-3 overflow-y-auto flex-1 pr-2">
            {transactions.map((trx) => (
              <div key={trx.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg group hover:border-slate-300 hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${trx.type === 'expense' ? 'bg-red-100 text-red-600' : trx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-800 text-white'}`}>{trx.type === 'expense' ? <ArrowDownRight size={16} /> : trx.type === 'income' ? <ArrowUpRight size={16} /> : <Scale size={16} />}</div>
                  <div><p className="font-bold text-sm text-slate-900 line-clamp-1">{trx.description}</p><p className="text-xs font-mono text-slate-500">{trx.transaction_date} • {trx.category}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`font-mono font-bold text-sm ${trx.type === 'expense' ? 'text-red-600' : trx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>{trx.type === 'expense' ? '-' : trx.type === 'income' ? '+' : '='} Rp {Number(trx.amount).toLocaleString('id-ID')}</div>
                  <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => {setActiveFormTab(trx.type === 'adjustment' ? 'exact' : 'flow'); setEditingTrxId(trx.id); setFlowType(trx.type === 'adjustment' ? 'expense' : trx.type); setAmount(String(trx.amount)); setDescription(trx.description); setDate(trx.transaction_date); setCategory(trx.category); window.scrollTo({ top: 0, behavior: 'smooth' });}} className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100"><Edit3 size={14} /></button><button onClick={() => handleDeleteTransaction(trx.id)} className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100"><Trash2 size={14} /></button></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ANALITIK & KALENDER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h3 className="font-bold text-lg text-slate-800">Analisis Periode</h3>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as any)} className="bg-slate-100 text-xs font-bold p-2 rounded-md border-none outline-none cursor-pointer">
              <option value="7d">7 Hari</option><option value="30d">30 Hari</option><option value="6m">6 Bulan</option><option value="1y">1 Tahun</option>
            </select>
          </div>
          
          <div className="flex justify-between gap-4 mb-6">
            <div className="flex-1 bg-red-50 p-3 rounded-xl border border-red-100">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Total Keluar</p>
              <p className="font-mono font-black text-red-700 text-lg">Rp {periodTotal.expense.toLocaleString('id-ID')}</p>
            </div>
            <div className="flex-1 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Masuk</p>
              <p className="font-mono font-black text-emerald-700 text-lg">Rp {periodTotal.income.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="h-40 w-full mb-6"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}/><YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v)=>`Rp${v/1000}k`}/><Tooltip cursor={{fill:'#f1f5f9'}} contentStyle={{borderRadius:'8px',border:'none'}}/><Bar dataKey="Total" radius={[4,4,0,0]} fill="#0f172a" /></BarChart></ResponsiveContainer></div>
          
          <div className="flex-1 flex flex-col sm:flex-row items-center border-t border-slate-100 pt-4">
            <div className="h-32 w-full sm:w-1/2"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">{categoryData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}</Pie><Tooltip contentStyle={{ borderRadius:'8px', border:'none' }}/></PieChart></ResponsiveContainer></div>
            <div className="w-full sm:w-1/2 mt-4 sm:mt-0 space-y-2">
              {categoryData.slice(0,4).map((entry, index) => (
                <div key={index} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:PIE_COLORS[index%PIE_COLORS.length]}}></div><div className="flex-1 truncate text-xs text-slate-600">{entry.name}</div><div className="text-xs font-bold text-slate-900">Rp {Math.round(entry.value/1000)}k</div></div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg text-slate-800 mb-6 border-b border-slate-100 pb-4">Kalender Harian</h3>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-md text-slate-600">{['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][calendarMonth]} {calendarYear}</h3>
            <div className="flex gap-2">
              <button onClick={() => { if(calendarMonth===0){setCalendarMonth(11); setCalendarYear(y=>y-1)} else setCalendarMonth(m=>m-1) }} className="p-1.5 border rounded hover:bg-slate-50">&lt;</button>
              <button onClick={() => { if(calendarMonth===11){setCalendarMonth(0); setCalendarYear(y=>y+1)} else setCalendarMonth(m=>m+1) }} className="p-1.5 border rounded hover:bg-slate-50">&gt;</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">{['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => <div key={d} className="text-xs font-bold text-slate-400 py-1">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-2">
            {generateCalendarDays().map((day, idx) => (
              day === null ? <div key={`empty-${idx}`} className="h-14"></div> : (
                <button key={day.fullDate} onClick={() => setSelectedDate(day.fullDate)} className={`h-14 flex flex-col items-center justify-center rounded-md border transition-all ${selectedDate === day.fullDate ? 'border-black shadow-md bg-slate-50' : 'border-slate-100 hover:border-slate-300'} ${day.hasTransactions ? 'cursor-pointer' : 'opacity-50 cursor-default'}`}>
                  <span className={`text-sm font-bold ${selectedDate === day.fullDate ? 'text-black' : 'text-slate-600'}`}>{day.date}</span>
                  {day.hasTransactions && <div className={`w-2.5 h-2.5 rounded-full mt-1 ${day.intensity}`}></div>}
                </button>
              )
            ))}
          </div>
          
          {selectedDate && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl max-h-56 overflow-y-auto">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200"><span className="text-xs font-bold font-mono">{selectedDate}</span><button onClick={()=>setSelectedDate(null)}><X size={14}/></button></div>
              <div className="flex gap-4 mb-4">
                <div className="flex-1"><p className="text-[10px] font-bold text-slate-400 uppercase">Keluar</p><p className="font-mono text-sm font-bold text-red-600">Rp {transactions.filter(t => t.transaction_date === selectedDate && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0).toLocaleString('id-ID')}</p></div>
                <div className="flex-1"><p className="text-[10px] font-bold text-slate-400 uppercase">Masuk</p><p className="font-mono text-sm font-bold text-emerald-600">Rp {transactions.filter(t => t.transaction_date === selectedDate && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0).toLocaleString('id-ID')}</p></div>
              </div>
              {transactions.filter(t => t.transaction_date === selectedDate).map(trx => (
                <div key={trx.id} className="flex justify-between text-xs mb-2 bg-white p-2 border border-slate-100 rounded">
                  <span className="truncate pr-2 font-medium">{trx.description}</span><span className={`font-mono font-bold ${trx.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>{trx.type==='expense'?'-':'+'} {Number(trx.amount).toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* WIDGET TAMBAHAN (Kasbon, Sandbox, Tagihan) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KASBON */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-amber-100 pb-4"><Users size={18} className="text-amber-600" /><h3 className="font-bold text-lg text-amber-900">Buku Piutang</h3></div>
          <form onSubmit={handleSaveDebt} className="bg-white border border-amber-100 p-4 rounded-xl mb-4 space-y-3">
             <div className="grid grid-cols-1 gap-2">
               <input type="text" value={debtName} onChange={(e)=>setDebtName(e.target.value)} placeholder="Nama Teman" className="w-full px-2 py-1.5 border rounded-md text-xs bg-slate-50" required />
               <input type="text" inputMode="numeric" value={debtAmount ? Number(debtAmount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e)=>setDebtAmount(e.target.value)} placeholder="Nominal Rp" className="w-full px-2 py-1.5 border rounded-md text-xs font-mono bg-slate-50" required />
             </div>
             <button type="submit" className="w-full bg-amber-600 text-white py-1.5 rounded-md text-xs font-bold hover:bg-amber-700">Catat Piutang</button>
          </form>
          <div className="space-y-3">
            {debts.map(debt => (
              <div key={debt.id} className="bg-white border border-amber-200 p-3 rounded-xl flex justify-between items-center gap-3">
                <div><h4 className="font-bold text-sm text-slate-900">{debt.borrower_name}</h4><p className="text-xs font-mono font-bold text-amber-600 mt-0.5">Rp {Number(debt.amount).toLocaleString('id-ID')}</p></div>
                <button onClick={() => handlePayDebt(debt)} className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded text-[10px] font-bold hover:bg-black"><Check size={12}/> Lunas</button>
              </div>
            ))}
          </div>
        </div>

        {/* SANDBOX */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4"><Box size={18} className="text-blue-500" /><h3 className="font-bold text-lg text-slate-800">Impulse Sandbox</h3></div>
          <form onSubmit={async (e) => { e.preventDefault(); const { data: { user } } = await supabase.auth.getUser(); if (user && sandboxName && sandboxPrice) { const d = new Date(); d.setDate(d.getDate() + parseInt(sandboxDays)); await supabase.from('impulse_sandbox').insert({ user_id: user.id, item_name: sandboxName, price: parseFloat(sandboxPrice.replace(/[^0-9]/g, '')), target_date: d.toISOString().split('T')[0] }); setSandboxName(''); setSandboxPrice(''); fetchData(); }}} className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-4 space-y-3">
             <div className="grid grid-cols-1 gap-2">
               <input type="text" value={sandboxName} onChange={(e)=>setSandboxName(e.target.value)} placeholder="Barang Keinginan" className="w-full px-2 py-1.5 border rounded-md text-xs bg-white" required />
               <div className="flex gap-2">
                 <input type="text" inputMode="numeric" value={sandboxPrice ? Number(sandboxPrice.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e)=>setSandboxPrice(e.target.value)} placeholder="Harga Rp" className="flex-1 px-2 py-1.5 border rounded-md text-xs font-mono bg-white" required />
                 <select value={sandboxDays} onChange={(e)=>setSandboxDays(e.target.value)} className="w-20 px-2 py-1.5 border rounded-md text-xs bg-white"><option value="1">1H</option><option value="3">3H</option><option value="7">7H</option></select>
               </div>
             </div>
             <button type="submit" className="w-full bg-slate-900 text-white py-1.5 rounded-md text-xs font-bold hover:bg-black">Kunci Belanja</button>
          </form>
          <div className="space-y-3">
            {sandboxItems.map(item => {
              const isReady = new Date(item.target_date) <= new Date();
              return (
                <div key={item.id} className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col gap-2">
                  <div className="flex justify-between"><h4 className="font-bold text-sm text-slate-900">{item.item_name}</h4><p className="text-xs font-mono font-bold text-slate-500">Rp {Number(item.price).toLocaleString('id-ID')}</p></div>
                  {!isReady ? <div className="flex justify-center gap-1 bg-slate-100 text-slate-500 py-1 rounded text-[10px] font-bold"><Clock size={12}/> Terkunci s/d {item.target_date}</div> : <div className="flex gap-2"><button onClick={async ()=>{if(!window.confirm('Beli?'))return; const { data: { user } } = await supabase.auth.getUser(); if(user) {await supabase.from('impulse_sandbox').update({status:'approve'}).eq('id',item.id); await supabase.from('transactions').insert({user_id:user.id,type:'expense',amount:item.price,description:`[Sandbox] ${item.item_name}`,category:'Hiburan',transaction_date:new Date().toISOString().split('T')[0]}); fetchData();}}} className="flex-1 flex justify-center gap-1 bg-emerald-600 text-white py-1 rounded text-[10px] font-bold"><Check size={12}/> Beli</button><button onClick={async ()=>{if(!window.confirm('Batal?'))return; await supabase.from('impulse_sandbox').update({status:'reject'}).eq('id',item.id); fetchData();}} className="flex-1 flex justify-center gap-1 bg-white text-red-600 border border-red-200 py-1 rounded text-[10px] font-bold"><X size={12}/> Batal</button></div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* TAGIHAN TETAP (REVISI BEBAS BAYAR KAPAN SAJA) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4"><Receipt size={18} className="text-slate-500" /><h3 className="font-bold text-lg text-slate-800">Tagihan Tetap</h3></div>
          
          <form onSubmit={handleSaveBill} className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-4 space-y-3">
             <div className="grid grid-cols-1 gap-2">
               <input type="text" value={billName} onChange={(e)=>setBillName(e.target.value)} placeholder="Nama Tagihan (Cth: Kos)" className="w-full px-2 py-1.5 border rounded-md text-xs bg-white" required />
               <div className="flex gap-2">
                 <input type="text" inputMode="numeric" value={billAmount ? Number(billAmount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e)=>setBillAmount(e.target.value)} placeholder="Nominal Rp" className="flex-1 px-2 py-1.5 border rounded-md text-xs font-mono bg-white" required />
                 <input type="number" min="1" max="31" value={billDueDate} onChange={(e)=>setBillDueDate(e.target.value)} placeholder="Tgl" className="w-16 px-2 py-1.5 border rounded-md text-xs bg-white" required />
               </div>
             </div>
             <button type="submit" className="w-full bg-slate-900 text-white py-1.5 rounded-md text-xs font-bold hover:bg-black">Tambah Tagihan</button>
          </form>

          <div className="space-y-3">
            {bills.map(bill => {
              // Cek apakah sudah dibayar bulan ini (Hanya untuk indikator visual)
              const isPaid = bill.last_paid_month && (new Date(bill.last_paid_month).getMonth() === new Date().getMonth() && new Date(bill.last_paid_month).getFullYear() === new Date().getFullYear());
              
              return (
              <div key={bill.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{bill.name}</h4>
                    <p className="text-xs font-mono font-bold text-slate-500">Rp {Number(bill.amount).toLocaleString('id-ID')}</p>
                  </div>
                  <button onClick={() => handleDeleteBill(bill.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                </div>
                
                <div className="flex justify-between items-end mt-1">
                  <div>
                    <span className="block text-[10px] text-slate-500 font-bold mb-1">Jatuh Tempo: Tgl {bill.due_date}</span>
                    {isPaid ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">✓ Selesai bln ini</span> : <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">Belum bayar</span>}
                  </div>
                  {/* Tombol Bayar selalu muncul dan bisa dieksekusi berkali-kali */}
                  <button onClick={async ()=>{
                    if(!window.confirm(`Catat pembayaran untuk ${bill.name}?`))return; 
                    const { data: { user } } = await supabase.auth.getUser(); 
                    if(user) {
                      const t = new Date().toISOString().split('T')[0]; 
                      await supabase.from('transactions').insert({user_id:user.id, type:'expense', amount:bill.amount, description:`[Tagihan] ${bill.name}`, category:bill.category||'Kebutuhan Kos', transaction_date:t}); 
                      await supabase.from('recurring_bills').update({last_paid_month:t}).eq('id',bill.id); 
                      fetchData();
                    }
                  }} className="text-[10px] font-bold bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-black transition">
                    Catat Bayar
                  </button>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>
    </div>
  );
}