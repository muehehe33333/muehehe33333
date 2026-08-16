import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowDownRight, ArrowUpRight, Scale, Plus, Loader2, Receipt, Trash2, Edit3, X, Download, Box, Check, Clock, Users, Wallet, ArrowRight, Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

type Transaction = { id: string; type: 'income' | 'expense' | 'adjustment'; amount: number; description: string; notes?: string; category: string; transaction_date: string; };
type Bill = { id: string; name: string; amount: number; due_date: number; category: string; last_paid_month: string | null; };
type ImpulseItem = { id: string; item_name: string; price: number; target_date: string; status: string; };
type Debt = { id: string; borrower_name: string; amount: number; status: string; created_at: string; };

const PIE_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'];

export default function FinancialModule() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [sandboxItems, setSandboxItems] = useState<ImpulseItem[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Main Transaction Form States (Modal)
  const [isTrxModalOpen, setIsTrxModalOpen] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<'flow' | 'exact'>('flow');
  const [editingTrxId, setEditingTrxId] = useState<string | null>(null);
  const [flowType, setFlowType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState(''); 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Makan/Minum');
  const [submitting, setSubmitting] = useState(false);

  // UI States (Expandable Notes)
  const [expandedTrxId, setExpandedTrxId] = useState<string | null>(null);

  // Mini Modules States
  const [isBillFormOpen, setIsBillFormOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [billName, setBillName] = useState(''); const [billAmount, setBillAmount] = useState(''); const [billDueDate, setBillDueDate] = useState('1');

  const [isSandboxFormOpen, setIsSandboxFormOpen] = useState(false);
  const [editingSandboxId, setEditingSandboxId] = useState<string | null>(null);
  const [sandboxName, setSandboxName] = useState(''); const [sandboxPrice, setSandboxPrice] = useState(''); const [sandboxDays, setSandboxDays] = useState('3');

  const [isDebtFormOpen, setIsDebtFormOpen] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [debtName, setDebtName] = useState(''); const [debtAmount, setDebtAmount] = useState('');

  // Chart States
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '6m' | '1y'>('7d');
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [periodTotal, setPeriodTotal] = useState({ expense: 0, income: 0 });

  // Full Calendar States
  const currentDate = new Date();
  const [calendarMonth, setCalendarMonth] = useState(currentDate.getMonth());
  const [calendarYear, setCalendarYear] = useState(currentDate.getFullYear());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(currentDate.toISOString().split('T')[0]);

  const expenseCategories = ['Makan/Minum', 'Transportasi', 'Kebutuhan Kos', 'Akademik/Tugas', 'Hiburan', 'Lainnya'];
  const incomeCategories = ['Kiriman Ortu', 'Gaji/Freelance', 'Pemberian/Bonus', 'Lainnya'];
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

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

  // --- HANDLERS: TRANSACTIONS ---
  const resetTrxForm = () => { 
    setEditingTrxId(null); setAmount(''); setDescription(''); setNotes(''); setDate(new Date().toISOString().split('T')[0]); 
    setFlowType('expense'); setCategory(expenseCategories[0]); setIsTrxModalOpen(false); 
  };
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault(); if (!amount) return; setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const isExact = activeFormTab === 'exact';
      const payload = { 
        user_id: user.id, type: isExact ? 'adjustment' : flowType, 
        amount: parseFloat(amount.replace(/[^0-9]/g, '')), 
        description: isExact ? 'Penyesuaian Saldo Sistem' : description, 
        notes: isExact ? '' : notes,
        category: isExact ? 'System' : category, 
        transaction_date: date 
      };
      
      if (editingTrxId) await supabase.from('transactions').update(payload).eq('id', editingTrxId);
      else await supabase.from('transactions').insert(payload);
      
      resetTrxForm(); fetchData();
    }
    setSubmitting(false);
  };
  const handleEditTrx = (trx: Transaction) => {
    setActiveFormTab(trx.type === 'adjustment' ? 'exact' : 'flow'); setEditingTrxId(trx.id); setFlowType(trx.type === 'adjustment' ? 'expense' : trx.type); 
    setAmount(String(trx.amount)); setDescription(trx.description); setNotes(trx.notes || ''); setDate(trx.transaction_date); setCategory(trx.category); 
    setIsTrxModalOpen(true);
  };
  const handleDeleteTransaction = async (id: string) => { if (!window.confirm("Hapus catatan ini?")) return; await supabase.from('transactions').delete().eq('id', id); fetchData(); };

  // --- HANDLERS: BILLS ---
  const resetBillForm = () => { setEditingBillId(null); setBillName(''); setBillAmount(''); setBillDueDate('1'); setIsBillFormOpen(false); };
  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault(); const { data: { user } } = await supabase.auth.getUser();
    if (user && billName && billAmount) {
      const payload = { user_id: user.id, name: billName, amount: parseFloat(billAmount.replace(/[^0-9]/g, '')), due_date: parseInt(billDueDate) || 1, category: 'Kebutuhan Kos' };
      if (editingBillId) await supabase.from('recurring_bills').update(payload).eq('id', editingBillId);
      else await supabase.from('recurring_bills').insert(payload);
      resetBillForm(); fetchData();
    }
  };
  const handleEditBill = (b: Bill) => { setEditingBillId(b.id); setBillName(b.name); setBillAmount(String(b.amount)); setBillDueDate(String(b.due_date)); setIsBillFormOpen(true); };
  const handleDeleteBill = async (id: string) => { if (!window.confirm("Hapus tagihan ini?")) return; await supabase.from('recurring_bills').delete().eq('id', id); fetchData(); };

  // --- HANDLERS: DEBTS ---
  const resetDebtForm = () => { setEditingDebtId(null); setDebtName(''); setDebtAmount(''); setIsDebtFormOpen(false); };
  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault(); const { data: { user } } = await supabase.auth.getUser();
    if (user && debtName && debtAmount) {
      const amountNum = parseFloat(debtAmount.replace(/[^0-9]/g, '')); const today = new Date().toISOString().split('T')[0];
      if (editingDebtId) {
        await supabase.from('debts').update({ borrower_name: debtName, amount: amountNum }).eq('id', editingDebtId);
      } else {
        await supabase.from('debts').insert({ user_id: user.id, borrower_name: debtName, amount: amountNum, status: 'unpaid' });
        await supabase.from('transactions').insert({ user_id: user.id, type: 'expense', amount: amountNum, description: `[Kasbon] ${debtName}`, category: 'Lainnya', transaction_date: today });
      }
      resetDebtForm(); fetchData();
    }
  };
  const handleEditDebt = (d: Debt) => { setEditingDebtId(d.id); setDebtName(d.borrower_name); setDebtAmount(String(d.amount)); setIsDebtFormOpen(true); };
  const handlePayDebt = async (debt: Debt) => {
    if (!window.confirm(`${debt.borrower_name} sudah bayar lunas? Saldo akan bertambah.`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('debts').update({ status: 'paid' }).eq('id', debt.id);
      await supabase.from('transactions').insert({ user_id: user.id, type: 'income', amount: debt.amount, description: `[Lunas Kasbon] ${debt.borrower_name}`, category: 'Lainnya', transaction_date: new Date().toISOString().split('T')[0] });
      fetchData();
    }
  };

  // --- HANDLERS: SANDBOX ---
  const resetSandboxForm = () => { setEditingSandboxId(null); setSandboxName(''); setSandboxPrice(''); setSandboxDays('3'); setIsSandboxFormOpen(false); };
  const handleSaveSandbox = async (e: React.FormEvent) => {
    e.preventDefault(); const { data: { user } } = await supabase.auth.getUser();
    if (user && sandboxName && sandboxPrice) {
      const d = new Date(); d.setDate(d.getDate() + parseInt(sandboxDays));
      const payload = { item_name: sandboxName, price: parseFloat(sandboxPrice.replace(/[^0-9]/g, '')), target_date: d.toISOString().split('T')[0] };
      if (editingSandboxId) await supabase.from('impulse_sandbox').update(payload).eq('id', editingSandboxId);
      else await supabase.from('impulse_sandbox').insert({ user_id: user.id, ...payload });
      resetSandboxForm(); fetchData();
    }
  };
  const handleEditSandbox = (s: ImpulseItem) => { setEditingSandboxId(s.id); setSandboxName(s.item_name); setSandboxPrice(String(s.price)); setSandboxDays('3'); setIsSandboxFormOpen(true); };

  // --- CALENDAR LOGIC ---
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  const generateCalendarDays = () => {
    const days = [];
    for (let i = 0; i < getFirstDayOfMonth(calendarYear, calendarMonth); i++) days.push(null);
    for (let i = 1; i <= getDaysInMonth(calendarYear, calendarMonth); i++) {
      const d = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTrx = transactions.filter(t => t.transaction_date === d && t.category !== 'System');
      const expense = dayTrx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const income = dayTrx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      days.push({ 
        date: i, fullDate: d, hasTransactions: dayTrx.length > 0, 
        intensity: expense > 50000 ? 'bg-rose-500' : expense > 0 ? 'bg-rose-300' : income > 0 ? 'bg-emerald-400' : 'bg-transparent'
      });
    }
    return days;
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;

  return (
    <div className="space-y-6 relative">
      
      {/* HEADER: LIVE BALANCE + TOMBOL MODAL */}
      <div className="bg-slate-900 text-white p-7 md:p-8 rounded-[2rem] shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6 overflow-hidden relative">
        <div className="relative z-10">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Live Balance Dashboard</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Rp {currentBalance.toLocaleString('id-ID')}</h2>
        </div>
        <div className="relative z-10 flex gap-3 w-full md:w-auto">
          <button onClick={() => { resetTrxForm(); setIsTrxModalOpen(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
            <Plus size={18} /> Catat Transaksi
          </button>
          <button className="flex items-center justify-center p-3.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-2xl hover:bg-slate-700 transition-colors" title="Ekspor CSV">
            <Download size={18} />
          </button>
        </div>
        <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none"><Wallet size={200} /></div>
      </div>

      {/* BARIS 1: BUKU KAS & ANALISIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BUKU KAS (HISTORY TERBARU) */}
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-[2rem] p-6 sm:p-7 shadow-sm flex flex-col h-[400px] lg:h-[500px]">
          <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-50 pb-4 shrink-0">Buku Kas</h3>
          <div className="space-y-3 overflow-y-auto flex-1 pr-2 [&::-webkit-scrollbar]:hidden">
            {transactions.slice(0, 15).length === 0 ? <p className="text-center text-sm text-slate-400 mt-10">Belum ada transaksi.</p> : transactions.slice(0, 15).map((trx) => {
              const isExpanded = expandedTrxId === trx.id;
              return (
              <div key={trx.id} className="p-3 sm:p-4 bg-slate-50/50 border border-transparent hover:border-slate-100 rounded-2xl group transition-all flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${trx.type === 'expense' ? 'bg-rose-100 text-rose-600' : trx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-800 text-white'}`}>{trx.type === 'expense' ? <ArrowDownRight size={16} /> : trx.type === 'income' ? <ArrowUpRight size={16} /> : <Scale size={16} />}</div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 truncate pr-2">{trx.description}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{trx.transaction_date} • {trx.category}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className={`font-black tracking-tight text-xs sm:text-sm ${trx.type === 'expense' ? 'text-rose-600' : trx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>{trx.type === 'expense' ? '-' : trx.type === 'income' ? '+' : '='} Rp {(trx.amount/1000).toLocaleString('id-ID')}k</div>
                    <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditTrx(trx)} className="text-slate-400 hover:text-blue-600 p-1"><Edit3 size={14} /></button>
                      <button onClick={() => handleDeleteTransaction(trx.id)} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
                {/* SMART EXPAND DESKRIPSI OPSIONAL */}
                {trx.notes && (
                  <div className="mt-1 pt-2 border-t border-slate-200/50">
                    <button onClick={() => setExpandedTrxId(isExpanded ? null : trx.id)} className="text-[10px] font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                      {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>} {isExpanded ? 'Tutup Catatan' : 'Lihat Catatan'}
                    </button>
                    {isExpanded && <div className="mt-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg shadow-sm border border-slate-100 whitespace-pre-wrap leading-relaxed">{trx.notes}</div>}
                  </div>
                )}
              </div>
            )})}
          </div>
        </div>

        {/* ANALISIS PERIODE (Fixed Height Issue) */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2rem] p-6 sm:p-7 shadow-sm flex flex-col h-auto lg:h-[500px]">
          <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4 shrink-0">
            <h3 className="font-bold text-lg text-slate-800">Analisis</h3>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as any)} className="bg-slate-50 text-xs font-bold px-3 py-2 rounded-xl border-none outline-none cursor-pointer text-slate-600">
              <option value="7d">7 Hari</option><option value="30d">30 Hari</option><option value="6m">6 Bulan</option><option value="1y">1 Tahun</option>
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 flex-1 min-h-0">
            <div className="flex flex-col h-full">
              <div className="flex gap-3 mb-4 shrink-0">
                <div className="flex-1 bg-rose-50/50 p-4 rounded-2xl border border-rose-50">
                  <p className="text-[10px] font-bold text-rose-500 uppercase mb-0.5">Keluar</p>
                  <p className="font-black tracking-tight text-rose-700 text-base sm:text-lg">Rp {(periodTotal.expense/1000).toLocaleString('id-ID')}k</p>
                </div>
                <div className="flex-1 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-50">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase mb-0.5">Masuk</p>
                  <p className="font-black tracking-tight text-emerald-700 text-base sm:text-lg">Rp {(periodTotal.income/1000).toLocaleString('id-ID')}k</p>
                </div>
              </div>
              <div className="flex-1 min-h-[200px] w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={40} tickFormatter={(v)=>`${v/1000}k`}/>
                    <Tooltip cursor={{fill:'#f8fafc'}} contentStyle={{borderRadius:'16px',border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.05)'}}/>
                    <Bar dataKey="Total" radius={[4,4,0,0]} fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col h-full border-t md:border-t-0 md:border-l border-slate-50 pt-6 md:pt-0 md:pl-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 shrink-0">Distribusi Pengeluaran</h4>
              <div className="h-40 w-full mb-4 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value" stroke="none">
                      {categoryData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius:'16px', border:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.05)' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 min-h-[120px] [&::-webkit-scrollbar]:hidden">
                {categoryData.length === 0 ? <p className="text-xs text-slate-400 text-center">Data kosong.</p> : categoryData.map((entry, index) => (
                  <div key={index} className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:PIE_COLORS[index%PIE_COLORS.length]}}></div>
                      <div className="truncate text-[10px] font-bold text-slate-600 uppercase">{entry.name}</div>
                    </div>
                    <div className="text-[10px] font-black tracking-tight text-slate-800">Rp {(entry.value/1000)}k</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BARIS 2: KALENDER BULANAN FULL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kalender Utama */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2rem] p-6 sm:p-7 shadow-sm h-fit">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl"><Calendar size={20} className="text-blue-600" /></div>
              <h3 className="font-bold text-lg text-slate-800">{monthNames[calendarMonth]} {calendarYear}</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { if(calendarMonth===0){setCalendarMonth(11); setCalendarYear(y=>y-1)} else setCalendarMonth(m=>m-1) }} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"><ChevronLeft size={18} /></button>
              <button onClick={() => { if(calendarMonth===11){setCalendarMonth(0); setCalendarYear(y=>y+1)} else setCalendarMonth(m=>m+1) }} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"><ChevronRight size={18} /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => <div key={d} className="text-[10px] sm:text-xs font-bold text-slate-400 py-1 uppercase">{d}</div>)}
          </div>
          
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {generateCalendarDays().map((day, idx) => (
              day === null ? <div key={`empty-${idx}`} className="h-12 sm:h-16"></div> : (
                <button 
                  key={day.fullDate} 
                  onClick={() => setSelectedCalendarDate(day.fullDate)} 
                  className={`h-12 sm:h-16 flex flex-col items-center justify-start pt-2 rounded-2xl border transition-all ${selectedCalendarDate === day.fullDate ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-transparent bg-slate-50/50 hover:bg-slate-50'} ${day.hasTransactions ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className={`text-xs sm:text-sm font-bold ${selectedCalendarDate === day.fullDate ? 'text-blue-700' : 'text-slate-600'}`}>{day.date}</span>
                  {day.hasTransactions && (
                    <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full mt-1.5 ${day.intensity}`}></div>
                  )}
                </button>
              )
            ))}
          </div>
        </div>

        {/* Detail Hari yang Dipilih */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 sm:p-7 shadow-sm min-h-[300px] lg:h-auto flex flex-col">
           {selectedCalendarDate ? (
             <>
               <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                 <h3 className="font-bold font-mono text-base text-slate-800">{selectedCalendarDate}</h3>
                 <button onClick={()=>setSelectedCalendarDate(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><X size={16}/></button>
               </div>
               
               <div className="flex gap-4 mb-5">
                 <div className="flex-1 bg-rose-50/50 p-3 rounded-xl border border-rose-50">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Keluar</p>
                   <p className="font-mono text-sm font-black text-rose-600">Rp {transactions.filter(t => t.transaction_date === selectedCalendarDate && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0).toLocaleString('id-ID')}</p>
                 </div>
                 <div className="flex-1 bg-emerald-50/50 p-3 rounded-xl border border-emerald-50">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Masuk</p>
                   <p className="font-mono text-sm font-black text-emerald-600">Rp {transactions.filter(t => t.transaction_date === selectedCalendarDate && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0).toLocaleString('id-ID')}</p>
                 </div>
               </div>

               <div className="overflow-y-auto flex-1 pr-2 space-y-2 max-h-[250px] lg:max-h-full [&::-webkit-scrollbar]:hidden">
                 {transactions.filter(t => t.transaction_date === selectedCalendarDate).length === 0 ? (
                   <p className="text-xs text-slate-400 text-center py-6">Tidak ada transaksi pada tanggal ini.</p>
                 ) : transactions.filter(t => t.transaction_date === selectedCalendarDate).map(trx => {
                   const isExpanded = expandedTrxId === trx.id;
                   return (
                   <div key={trx.id} className="flex flex-col bg-slate-50 p-3 rounded-xl group transition-all">
                     <div className="flex justify-between items-center">
                       <span className="text-xs font-bold text-slate-700 truncate pr-2">{trx.description}</span>
                       <div className="flex items-center gap-2 shrink-0">
                         <span className={`text-xs font-mono font-black ${trx.type === 'expense' ? 'text-rose-600' : trx.type === 'income' ? 'text-emerald-600' : 'text-slate-600'}`}>
                           {trx.type==='expense'?'-':trx.type==='income'?'+':'='} {Number(trx.amount).toLocaleString('id-ID')}
                         </span>
                         <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditTrx(trx)} className="text-slate-400 hover:text-blue-600 p-1"><Edit3 size={12} /></button>
                            <button onClick={() => handleDeleteTransaction(trx.id)} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 size={12} /></button>
                         </div>
                       </div>
                     </div>
                     {trx.notes && (
                        <div className="mt-1 pt-2 border-t border-slate-200/50">
                          <button onClick={() => setExpandedTrxId(isExpanded ? null : trx.id)} className="text-[10px] font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                            {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>} {isExpanded ? 'Tutup Catatan' : 'Lihat Catatan'}
                          </button>
                          {isExpanded && <div className="mt-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg shadow-sm border border-slate-100 whitespace-pre-wrap">{trx.notes}</div>}
                        </div>
                     )}
                   </div>
                 )})}
               </div>
             </>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-10 opacity-60">
               <Calendar size={48} className="mb-4 text-slate-300" />
               <p className="text-sm font-medium">Pilih tanggal di kalender untuk melihat rincian.</p>
             </div>
           )}
        </div>

      </div>

      {/* BARIS 3: HORIZONTAL CAROUSEL UNTUK ALAT SPESIFIK */}
      <div className="relative mt-2">
        <div className="flex overflow-x-auto lg:grid lg:grid-cols-3 snap-x snap-mandatory gap-6 pb-6 [&::-webkit-scrollbar]:hidden scroll-smooth relative z-10">
          
          {/* BUKU PIUTANG */}
          <div className="snap-center shrink-0 w-[85vw] md:w-[350px] lg:w-auto bg-indigo-50/30 border border-indigo-100 rounded-[2rem] p-6 shadow-sm flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-6 border-b border-indigo-100/50 pb-4">
              <div className="flex items-center gap-3"><div className="p-2 bg-indigo-100 rounded-xl"><Users size={18} className="text-indigo-600" /></div><h3 className="font-bold text-base text-indigo-900">Buku Piutang</h3></div>
              <button onClick={() => {resetDebtForm(); setIsDebtFormOpen(!isDebtFormOpen);}} className="text-indigo-600 bg-indigo-100 p-1.5 rounded-lg"><Plus size={16}/></button>
            </div>
            
            {isDebtFormOpen && (
              <form onSubmit={handleSaveDebt} className="bg-white border border-indigo-50 p-4 rounded-2xl mb-4 space-y-3 shadow-sm animate-in fade-in zoom-in-95">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-bold uppercase text-slate-400">{editingDebtId ? 'Edit Kasbon' : 'Kasbon Baru'}</span>
                   {editingDebtId && <button type="button" onClick={resetDebtForm} className="text-rose-500"><X size={14}/></button>}
                 </div>
                 <input type="text" value={debtName} onChange={(e)=>setDebtName(e.target.value)} placeholder="Nama Peminjam" className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-100" required />
                 <input type="text" inputMode="numeric" value={debtAmount ? Number(debtAmount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e)=>setDebtAmount(e.target.value)} placeholder="Nominal Rp" className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-black font-mono focus:ring-2 focus:ring-indigo-100" required />
                 <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-indigo-700">Simpan</button>
              </form>
            )}

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
              {debts.length === 0 && !isDebtFormOpen && <div className="text-xs text-center text-slate-400 mt-10">Buku bersih.</div>}
              {debts.map(debt => (
                <div key={debt.id} className="bg-white p-3.5 rounded-2xl shadow-sm flex justify-between items-center gap-2 group">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-slate-800 truncate">{debt.borrower_name}</h4>
                    <p className="text-xs font-black tracking-tight text-indigo-600 mt-0.5">Rp {(debt.amount/1000).toLocaleString('id-ID')}k</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEditDebt(debt)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors lg:opacity-0 lg:group-hover:opacity-100"><Edit3 size={14}/></button>
                    <button onClick={() => handlePayDebt(debt)} className="flex items-center justify-center p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition" title="Tandai Lunas"><Check size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* IMPULSE SANDBOX */}
          <div className="snap-center shrink-0 w-[85vw] md:w-[350px] lg:w-auto bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3"><div className="p-2 bg-slate-200 rounded-xl"><Box size={18} className="text-slate-600" /></div><h3 className="font-bold text-base text-slate-800">Sandbox</h3></div>
              <button onClick={() => {resetSandboxForm(); setIsSandboxFormOpen(!isSandboxFormOpen);}} className="text-slate-600 bg-slate-200 p-1.5 rounded-lg"><Plus size={16}/></button>
            </div>
            
            {isSandboxFormOpen && (
              <form onSubmit={handleSaveSandbox} className="bg-white p-4 rounded-2xl mb-4 space-y-3 shadow-sm border border-slate-50 animate-in fade-in zoom-in-95">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-bold uppercase text-slate-400">{editingSandboxId ? 'Edit Barang' : 'Kunci Barang'}</span>
                   {editingSandboxId && <button type="button" onClick={resetSandboxForm} className="text-rose-500"><X size={14}/></button>}
                 </div>
                 <input type="text" value={sandboxName} onChange={(e)=>setSandboxName(e.target.value)} placeholder="Nama Barang" className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-200" required />
                 <div className="flex gap-2">
                   <input type="text" inputMode="numeric" value={sandboxPrice ? Number(sandboxPrice.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e)=>setSandboxPrice(e.target.value)} placeholder="Harga Rp" className="flex-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-black font-mono focus:ring-2 focus:ring-slate-200" required />
                   <select value={sandboxDays} onChange={(e)=>setSandboxDays(e.target.value)} className="w-16 px-1 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-center" disabled={!!editingSandboxId}>
                     <option value="1">1H</option><option value="3">3H</option><option value="7">7H</option>
                   </select>
                 </div>
                 <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded-xl text-xs font-bold hover:bg-slate-900">Simpan</button>
              </form>
            )}

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
              {sandboxItems.length === 0 && !isSandboxFormOpen && <div className="text-xs text-center text-slate-400 mt-10">Sandbox kosong.</div>}
              {sandboxItems.map(item => {
                const isReady = new Date(item.target_date) <= new Date();
                return (
                  <div key={item.id} className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-50 flex flex-col gap-2 group">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 pr-2">
                        <h4 className="font-bold text-sm text-slate-800 truncate">{item.item_name}</h4>
                        <p className="text-[10px] font-black tracking-tight text-slate-500 mt-0.5">Rp {(item.price/1000).toLocaleString('id-ID')}k</p>
                      </div>
                      <button onClick={() => handleEditSandbox(item)} className="text-slate-400 hover:text-slate-800 p-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"><Edit3 size={14}/></button>
                    </div>
                    {!isReady ? 
                      <div className="flex justify-center items-center gap-1.5 bg-slate-50 text-slate-400 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider"><Clock size={10}/> Kunci: {item.target_date}</div> : 
                      <div className="flex gap-1.5 mt-1">
                        <button onClick={async ()=>{if(!window.confirm('Beli sekarang?'))return; const { data: { user } } = await supabase.auth.getUser(); if(user) {await supabase.from('impulse_sandbox').update({status:'approve'}).eq('id',item.id); await supabase.from('transactions').insert({user_id:user.id,type:'expense',amount:item.price,description:`[Sandbox] ${item.item_name}`,category:'Hiburan',transaction_date:new Date().toISOString().split('T')[0]}); fetchData();}}} className="flex-1 flex justify-center items-center gap-1 bg-emerald-100 text-emerald-700 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-200 transition"><Check size={12}/> Beli</button>
                        <button onClick={async ()=>{if(!window.confirm('Batal beli?'))return; await supabase.from('impulse_sandbox').update({status:'reject'}).eq('id',item.id); fetchData();}} className="p-1.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition"><X size={14}/></button>
                      </div>
                    }
                  </div>
                )
              })}
            </div>
          </div>

          {/* TAGIHAN TETAP */}
          <div className="snap-center shrink-0 w-[85vw] md:w-[350px] lg:w-auto bg-rose-50/30 border border-rose-100 rounded-[2rem] p-6 shadow-sm flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-6 border-b border-rose-100/50 pb-4">
              <div className="flex items-center gap-3"><div className="p-2 bg-rose-100 rounded-xl"><Receipt size={18} className="text-rose-600" /></div><h3 className="font-bold text-base text-rose-900">Tagihan Tetap</h3></div>
              <button onClick={() => {resetBillForm(); setIsBillFormOpen(!isBillFormOpen);}} className="text-rose-600 bg-rose-100 p-1.5 rounded-lg"><Plus size={16}/></button>
            </div>
            
            {isBillFormOpen && (
              <form onSubmit={handleSaveBill} className="bg-white border border-rose-50 p-4 rounded-2xl mb-4 space-y-3 shadow-sm animate-in fade-in zoom-in-95">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-bold uppercase text-slate-400">{editingBillId ? 'Edit Tagihan' : 'Tagihan Baru'}</span>
                   {editingBillId && <button type="button" onClick={resetBillForm} className="text-rose-500"><X size={14}/></button>}
                 </div>
                 <input type="text" value={billName} onChange={(e)=>setBillName(e.target.value)} placeholder="Nama Tagihan" className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-100" required />
                 <div className="flex gap-2">
                   <input type="text" inputMode="numeric" value={billAmount ? Number(billAmount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e)=>setBillAmount(e.target.value)} placeholder="Nominal Rp" className="flex-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-black font-mono focus:ring-2 focus:ring-rose-100" required />
                   <input type="number" min="1" max="31" value={billDueDate} onChange={(e)=>setBillDueDate(e.target.value)} placeholder="Tgl" className="w-16 px-1 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-center" required />
                 </div>
                 <button type="submit" className="w-full bg-rose-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-rose-700">Simpan</button>
              </form>
            )}

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
              {bills.length === 0 && !isBillFormOpen && <div className="text-xs text-center text-slate-400 mt-10">Tidak ada tagihan.</div>}
              {bills.map(bill => {
                const isPaid = bill.last_paid_month && (new Date(bill.last_paid_month).getMonth() === new Date().getMonth() && new Date(bill.last_paid_month).getFullYear() === new Date().getFullYear());
                return (
                <div key={bill.id} className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-50 flex flex-col gap-2 group">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 pr-2">
                      <h4 className="font-bold text-sm text-slate-800 truncate">{bill.name}</h4>
                      <p className="text-xs font-black tracking-tight text-slate-500 mt-0.5">Rp {(bill.amount/1000).toLocaleString('id-ID')}k</p>
                    </div>
                    <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => handleEditBill(bill)} className="text-slate-400 hover:text-rose-500 p-1"><Edit3 size={14}/></button>
                      <button onClick={() => handleDeleteBill(bill.id)} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 size={14}/></button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-1 border-t border-slate-50 pt-2">
                    {isPaid ? <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1 uppercase"><Check size={10}/> Lunas</span> : <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg uppercase tracking-wider">Tgl {bill.due_date}</span>}
                    <button onClick={async ()=>{
                      if(!window.confirm(`Catat pembayaran untuk ${bill.name}?`))return; 
                      const { data: { user } } = await supabase.auth.getUser(); 
                      if(user) {
                        const t = new Date().toISOString().split('T')[0]; 
                        await supabase.from('transactions').insert({user_id:user.id, type:'expense', amount:bill.amount, description:`[Tagihan] ${bill.name}`, category:bill.category||'Kebutuhan Kos', transaction_date:t}); 
                        await supabase.from('recurring_bills').update({last_paid_month:t}).eq('id',bill.id); 
                        fetchData();
                      }
                    }} className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-900 transition">
                      Bayar
                    </button>
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>
        
        {/* Penanda Visual Scroll Horizontal (Muncul di HP) */}
        <div className="absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-[#F8F9FA] to-transparent pointer-events-none lg:hidden flex items-center justify-end pr-1 z-20">
          <ArrowRight className="text-slate-400 animate-pulse w-5 h-5 bg-white/50 rounded-full" />
        </div>
      </div>

      {/* OVERLAY LACI BAWAH / MODAL TRANSAKSI */}
      {isTrxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
              <h4 className="font-bold text-base text-slate-800">{editingTrxId ? 'Edit Transaksi' : 'Catat Transaksi'}</h4>
              <button type="button" onClick={resetTrxForm} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-xl"><X size={18}/></button>
            </div>
            
            <div className="flex bg-slate-50 p-1 rounded-2xl mb-6">
              <button onClick={() => setActiveFormTab('flow')} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${activeFormTab === 'flow' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Arus Kas</button>
              <button onClick={() => setActiveFormTab('exact')} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${activeFormTab === 'exact' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Set Exact</button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="space-y-4">
              {activeFormTab === 'flow' && (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <button type="button" onClick={() => {setFlowType('expense'); setCategory(expenseCategories[0]);}} className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${flowType === 'expense' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Keluar</button>
                    <button type="button" onClick={() => {setFlowType('income'); setCategory(incomeCategories[0]);}} className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${flowType === 'income' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Masuk</button>
                  </div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Tanggal</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100" required /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Nominal (Rp)</label><input type="text" inputMode="numeric" value={amount ? Number(amount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-lg font-black font-mono focus:ring-2 focus:ring-blue-100" required /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Kategori</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100">{(flowType === 'expense' ? expenseCategories : incomeCategories).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Judul Transaksi <span className="text-rose-500">*</span></label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Misal: Makan Siang" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100" required /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Catatan Opsional</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Misal: Di warteg bareng Budi..." rows={2} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 resize-none"></textarea></div>
                </>
              )}
              {activeFormTab === 'exact' && (
                <>
                  <div className="bg-blue-50 text-blue-800 text-[11px] p-4 rounded-xl mb-4 leading-relaxed font-medium border border-blue-100">Gunakan fitur ini jika ada selisih perhitungan, untuk menyamakan saldo sistem dengan isi dompet asli Anda.</div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Tanggal</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100" required /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Saldo Riil Saat Ini (Rp)</label><input type="text" inputMode="numeric" value={amount ? Number(amount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-lg font-black font-mono focus:ring-2 focus:ring-blue-100" required /></div>
                </>
              )}
              <button type="submit" disabled={submitting} className={`w-full text-white font-bold py-3.5 rounded-xl transition-all mt-4 text-sm flex justify-center items-center gap-2 ${editingTrxId ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'}`}>
                {submitting ? <Loader2 size={18} className="animate-spin" /> : editingTrxId ? <Edit3 size={18} /> : <Plus size={18} />} {editingTrxId ? 'Simpan Perubahan' : 'Catat Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}