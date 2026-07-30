import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowDownRight, ArrowUpRight, Scale, Plus, Loader2, PieChart as PieIcon, TrendingDown, Receipt, Trash2, Calendar as CalendarIcon, Edit3, X, Download, Box, Check, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

type Transaction = { id: string; type: 'income' | 'expense' | 'adjustment'; amount: number; description: string; category: string; transaction_date: string; };
type Bill = { id: string; name: string; amount: number; due_date: number; category: string; last_paid_month: string | null; };
type ImpulseItem = { id: string; item_name: string; price: number; target_date: string; status: string; };

const PIE_COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

export default function FinancialModule() {
  const [mainTab, setMainTab] = useState<'entry' | 'analytics' | 'calendar' | 'bills' | 'sandbox'>('entry');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [sandboxItems, setSandboxItems] = useState<ImpulseItem[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const [activeFormTab, setActiveFormTab] = useState<'flow' | 'exact'>('flow');
  const [editingTrxId, setEditingTrxId] = useState<string | null>(null);
  const [flowType, setFlowType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Makan/Minum');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState('1');
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  const [sandboxName, setSandboxName] = useState('');
  const [sandboxPrice, setSandboxPrice] = useState('');
  const [sandboxDays, setSandboxDays] = useState('3');

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const currentDate = new Date();
  const [calendarMonth, setCalendarMonth] = useState(currentDate.getMonth());
  const [calendarYear, setCalendarYear] = useState(currentDate.getFullYear());

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '6m' | '1y'>('7d');
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  const expenseCategories = ['Makan/Minum', 'Transportasi', 'Kebutuhan Kos', 'Akademik/Tugas', 'Hiburan', 'Lainnya'];
  const incomeCategories = ['Kiriman Ortu', 'Gaji/Freelance', 'Pemberian/Bonus', 'Lainnya'];

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (transactions.length === 0) return;
    const now = new Date();
    let startDate = new Date();
    let isMonthGrouping = false;

    if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
    else if (timeRange === '30d') startDate.setDate(now.getDate() - 30);
    else if (timeRange === '6m') { startDate.setMonth(now.getMonth() - 6); isMonthGrouping = true; }
    else if (timeRange === '1y') { startDate.setFullYear(now.getFullYear() - 1); isMonthGrouping = true; }

    const filteredExpenses = transactions.filter(t => t.type === 'expense' && t.category !== 'System' && new Date(t.transaction_date) >= startDate);

    const groupedVelocity = filteredExpenses.reduce((acc: any, curr) => {
      const key = isMonthGrouping ? curr.transaction_date.substring(0, 7) : curr.transaction_date.substring(5, 10);
      acc[key] = (acc[key] || 0) + Number(curr.amount);
      return acc;
    }, {});

    const sortedChart = Object.keys(groupedVelocity).sort().map(k => ({ date: k, Total: groupedVelocity[k] }));
    setChartData(sortedChart);

    const groupedCat = filteredExpenses.reduce((acc: any, curr) => {
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
      
      if (bls) setBills(bls);
      if (sbx) setSandboxItems(sbx);
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

  // ----- FORM HANDLERS -----
  const resetForm = () => { setEditingTrxId(null); setAmount(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]); setFlowType('expense'); setCategory(expenseCategories[0]); };
  
  const handleEditTransaction = (trx: Transaction) => {
    setMainTab('entry'); setActiveFormTab(trx.type === 'adjustment' ? 'exact' : 'flow'); setEditingTrxId(trx.id);
    setFlowType(trx.type === 'adjustment' ? 'expense' : trx.type); setAmount(String(trx.amount)); setDescription(trx.description); setDate(trx.transaction_date); setCategory(trx.category);
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
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

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Hapus catatan ini?")) return;
    await supabase.from('transactions').delete().eq('id', id);
    if (editingTrxId === id) resetForm(); fetchData();
  };

  // ----- BILLS HANDLERS (PENYEMPURNAAN) -----
  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { user_id: user.id, name: billName, amount: parseFloat(billAmount.replace(/[^0-9]/g, '')), due_date: parseInt(billDueDate) || 1, category: 'Kebutuhan Kos' };
    if (editingBillId) { await supabase.from('recurring_bills').update(payload).eq('id', editingBillId); setEditingBillId(null); } 
    else { await supabase.from('recurring_bills').insert(payload); }
    setBillName(''); setBillAmount(''); setBillDueDate('1'); fetchData();
  };

  const handleEditBill = (bill: Bill) => { setEditingBillId(bill.id); setBillName(bill.name); setBillAmount(String(bill.amount)); setBillDueDate(String(bill.due_date)); };
  const handleDeleteBill = async (id: string) => { if (!window.confirm("Hapus tagihan tetap ini?")) return; await supabase.from('recurring_bills').delete().eq('id', id); fetchData(); };

  // FUNGSI BARU: Bayar Tagihan Otomatis
  const handlePayBill = async (bill: Bill) => {
    if (!window.confirm(`Catat pembayaran lunas untuk ${bill.name} sebesar Rp ${Number(bill.amount).toLocaleString('id-ID')}?`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // 1. Catat ke Buku Kas sebagai Pengeluaran
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'expense',
      amount: bill.amount,
      description: `[Tagihan] ${bill.name}`,
      category: bill.category || 'Kebutuhan Kos',
      transaction_date: today
    });

    // 2. Update status tagihan bahwa bulan ini sudah lunas
    await supabase.from('recurring_bills').update({ last_paid_month: today }).eq('id', bill.id);
    
    fetchData();
  };

  // Helper untuk ngecek apakah tagihan sudah dibayar bulan ini
  const isBillPaidThisMonth = (lastPaidDate: string | null) => {
    if (!lastPaidDate) return false;
    const paidDate = new Date(lastPaidDate);
    const now = new Date();
    return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
  };

  // ----- SANDBOX HANDLERS -----
  const handleSaveSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxName || !sandboxPrice) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const targetDate = new Date(); targetDate.setDate(targetDate.getDate() + parseInt(sandboxDays));
    await supabase.from('impulse_sandbox').insert({ user_id: user.id, item_name: sandboxName, price: parseFloat(sandboxPrice.replace(/[^0-9]/g, '')), target_date: targetDate.toISOString().split('T')[0] });
    setSandboxName(''); setSandboxPrice(''); fetchData();
  };

  const handleSandboxAction = async (item: ImpulseItem, action: 'approve' | 'reject') => {
    if (!window.confirm(`Yakin ingin ${action === 'approve' ? 'MEMBELI' : 'MEMBATALKAN'} barang ini?`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('impulse_sandbox').update({ status: action }).eq('id', item.id);
    if (action === 'approve') {
      await supabase.from('transactions').insert({ user_id: user.id, type: 'expense', amount: item.price, description: `[Sandbox] ${item.item_name}`, category: 'Hiburan', transaction_date: new Date().toISOString().split('T')[0] });
    }
    fetchData();
  };

  // ----- EXPORT CSV -----
  const exportCSV = () => {
    const headers = "Tanggal,Tipe,Kategori,Keterangan,Nominal(Rp)\n";
    const rows = transactions.map(t => `${t.transaction_date},${t.type},${t.category},"${t.description}",${t.amount}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.setAttribute("download", "Laporan_Keuangan_HQ.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // ----- CALENDAR HELPERS -----
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  const generateCalendarDays = () => {
    const days = []; for (let i = 0; i < getFirstDayOfMonth(calendarYear, calendarMonth); i++) days.push(null);
    for (let i = 1; i <= getDaysInMonth(calendarYear, calendarMonth); i++) {
      const d = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTrx = transactions.filter(t => t.transaction_date === d);
      const expense = dayTrx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      days.push({ date: i, fullDate: d, hasTransactions: dayTrx.length > 0, totalExpense: expense, intensity: expense > 100000 ? 'bg-red-500' : expense > 0 ? 'bg-red-300' : dayTrx.length > 0 ? 'bg-emerald-400' : 'bg-slate-100' });
    }
    return days;
  };

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[600px]">
      <div className="bg-slate-900 text-white p-6 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Live Balance</p>
          <h2 className="text-3xl font-black">Rp {currentBalance.toLocaleString('id-ID')}</h2>
        </div>
        <div className="flex flex-wrap bg-slate-800 rounded-lg p-1 gap-1">
          {['entry', 'analytics', 'calendar', 'bills', 'sandbox'].map((t) => (
            <button key={t} onClick={() => setMainTab(t as any)} className={`px-3 py-2 rounded-md text-xs font-bold transition-colors capitalize ${mainTab === t ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'}`}>
              {t === 'entry' ? 'Catat' : t === 'analytics' ? 'Analitik' : t === 'calendar' ? 'Kalender' : t === 'bills' ? 'Tagihan' : 'Karantina'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="flex-1 flex justify-center items-center py-20"><Loader2 size={32} className="animate-spin text-slate-300" /></div> : (
        <div className="flex-1">
          
          {/* TAB 1: ENTRY TRANSAKSI */}
          {mainTab === 'entry' && (
            <div className="flex flex-col md:flex-row h-full">
              <div className="w-full md:w-1/2 p-6 border-r border-slate-100 relative">
                {editingTrxId && (
                  <div className="absolute top-0 left-0 right-0 bg-yellow-100 text-yellow-800 text-xs font-bold p-2 text-center flex justify-between px-4">
                    <span>MODE EDIT</span><button onClick={resetForm}><X size={14}/></button>
                  </div>
                )}
                <div className={`flex border-b border-slate-200 mb-6 ${editingTrxId ? 'mt-6' : ''}`}>
                  <button onClick={() => { setActiveFormTab('flow'); if(editingTrxId && activeFormTab==='exact') resetForm(); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeFormTab === 'flow' ? 'border-b-2 border-black text-black' : 'text-slate-400'}`}>Arus Kas</button>
                  <button onClick={() => { setActiveFormTab('exact'); if(editingTrxId && activeFormTab==='flow') resetForm(); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeFormTab === 'exact' ? 'border-b-2 border-black text-black' : 'text-slate-400'}`}>Set Exact</button>
                </div>
                <form onSubmit={handleSubmitTransaction} className="space-y-4">
                  {activeFormTab === 'flow' && (
                    <>
                      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-md">
                        <button type="button" onClick={() => {setFlowType('expense'); setCategory(expenseCategories[0]);}} className={`py-1.5 text-xs font-bold rounded ${flowType === 'expense' ? 'bg-white shadow text-black' : 'text-slate-500'}`}>Pengeluaran</button>
                        <button type="button" onClick={() => {setFlowType('income'); setCategory(incomeCategories[0]);}} className={`py-1.5 text-xs font-bold rounded ${flowType === 'income' ? 'bg-white shadow text-black' : 'text-slate-500'}`}>Pemasukan</button>
                      </div>
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required /></div>
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Nominal (Rp)</label><input type="text" inputMode="numeric" value={amount ? Number(amount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full px-3 py-2 border rounded-md text-sm font-mono text-lg" required /></div>
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm bg-white">{(flowType === 'expense' ? expenseCategories : incomeCategories).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Keterangan</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Nama Barang/Kegiatan" className="w-full px-3 py-2 border rounded-md text-sm" required /></div>
                    </>
                  )}
                  {activeFormTab === 'exact' && (
                    <>
                      <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-md mb-4">Set saldo paksa sesuai dompet saat ini tanpa hitung manual.</div>
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required /></div>
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">Saldo Riil (Rp)</label><input type="text" inputMode="numeric" value={amount ? Number(amount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm font-mono text-lg" required /></div>
                    </>
                  )}
                  <button type="submit" disabled={submitting} className={`w-full text-white font-bold py-3 rounded-md transition mt-4 text-sm flex justify-center gap-2 ${editingTrxId ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-slate-900 hover:bg-black'}`}>
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : editingTrxId ? <Edit3 size={16} /> : <Plus size={16} />} {editingTrxId ? 'Simpan Edit' : 'Simpan Transaksi'}
                  </button>
                </form>
              </div>
              
              <div className="w-full md:w-1/2 p-6 bg-slate-50 h-[600px] overflow-y-auto">
                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-200 pb-2">Riwayat (Editable)</h3>
                <div className="space-y-3">
                  {transactions.slice(0, 20).map((trx) => (
                    <div key={trx.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm group hover:border-slate-300">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${trx.type === 'expense' ? 'bg-red-100 text-red-600' : trx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-800 text-white'}`}>{trx.type === 'expense' ? <ArrowDownRight size={16} /> : trx.type === 'income' ? <ArrowUpRight size={16} /> : <Scale size={16} />}</div>
                        <div><p className="font-bold text-sm text-slate-900 line-clamp-1">{trx.description}</p><p className="text-xs font-mono text-slate-500">{trx.transaction_date} • {trx.category}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`font-mono font-bold text-sm ${trx.type === 'expense' ? 'text-red-600' : trx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>{trx.type === 'expense' ? '-' : trx.type === 'income' ? '+' : '='} Rp {Number(trx.amount).toLocaleString('id-ID')}</div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditTransaction(trx)} className="text-slate-400 hover:text-blue-600 bg-slate-50 p-1 rounded"><Edit3 size={12} /></button>
                          <button onClick={() => handleDeleteTransaction(trx.id)} className="text-slate-400 hover:text-red-600 bg-slate-50 p-1 rounded"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANALITIK VISUAL */}
          {mainTab === 'analytics' && (
            <div className="p-8 bg-slate-50 min-h-[600px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                  {['7d', '30d', '6m', '1y'].map(r => (
                    <button key={r} onClick={() => setTimeRange(r as any)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${timeRange === r ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                      {r === '7d' ? '7 Hari' : r === '30d' ? '30 Hari' : r === '6m' ? '6 Bulan' : '1 Tahun'}
                    </button>
                  ))}
                </div>
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors">
                  <Download size={16} /> Ekspor Data CSV
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-md">Tren Pengeluaran</h3><TrendingDown size={16} className="text-slate-400" /></div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp${v/1000}k`} />
                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                        <Bar dataKey="Total" radius={[4, 4, 0, 0]}>{chartData.map((e, i) => (<Cell key={i} fill={e.Total > 50000 ? '#ef4444' : '#0f172a'} />))}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
                  <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-md">Distribusi Kategori</h3><PieIcon size={16} className="text-slate-400" /></div>
                  <div className="flex-1 flex items-center mt-4">
                    <div className="h-56 w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryData} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                            {categoryData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 pl-6 flex flex-col gap-3 justify-center">
                      {categoryData.length === 0 ? <span className="text-xs text-slate-400">Tidak ada pengeluaran.</span> : categoryData.slice(0,5).map((entry, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                          <div className="flex-1 truncate text-sm text-slate-600">{entry.name}</div>
                          <div className="text-sm font-bold text-slate-900">Rp {Math.round(entry.value / 1000)}k</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KALENDER GRID */}
          {mainTab === 'calendar' && (
            <div className="flex flex-col md:flex-row h-full">
              <div className="w-full md:w-2/3 p-6 border-r border-slate-100 bg-white">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg">{['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][calendarMonth]} {calendarYear}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { if(calendarMonth===0){setCalendarMonth(11); setCalendarYear(y=>y-1)} else setCalendarMonth(m=>m-1) }} className="p-2 border rounded hover:bg-slate-50">&lt;</button>
                    <button onClick={() => { if(calendarMonth===11){setCalendarMonth(0); setCalendarYear(y=>y+1)} else setCalendarMonth(m=>m+1) }} className="p-2 border rounded hover:bg-slate-50">&gt;</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">{['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => <div key={d} className="text-xs font-bold text-slate-400 py-2">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-2">
                  {generateCalendarDays().map((day, idx) => (
                    day === null ? <div key={`empty-${idx}`} className="h-16"></div> : (
                      <button key={day.fullDate} onClick={() => setSelectedDate(day.fullDate)} className={`h-16 flex flex-col items-center justify-center rounded-md border transition-all ${selectedDate === day.fullDate ? 'border-black shadow-md scale-105' : 'border-slate-100 hover:border-slate-300'} ${day.hasTransactions ? 'cursor-pointer' : 'opacity-50 cursor-default'}`}>
                        <span className={`text-sm font-bold ${selectedDate === day.fullDate ? 'text-black' : 'text-slate-600'}`}>{day.date}</span>
                        {day.hasTransactions && <div className={`w-3 h-3 rounded-full mt-1 ${day.intensity}`}></div>}
                      </button>
                    )
                  ))}
                </div>
              </div>
              <div className="w-full md:w-1/3 p-6 bg-slate-50 h-[600px] overflow-y-auto">
                {!selectedDate ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <CalendarIcon size={32} className="mb-2 opacity-20" /><p className="text-sm">Klik tanggal berwarna untuk rincian.</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                      <h3 className="font-bold font-mono text-lg">{selectedDate}</h3><button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-black"><X size={16} /></button>
                    </div>
                    <div className="space-y-3">
                      {transactions.filter(t => t.transaction_date === selectedDate).map(trx => (
                        <div key={trx.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                          <div><p className="font-bold text-sm text-slate-900">{trx.description}</p><p className="text-xs text-slate-500">{trx.category}</p></div>
                          <span className={`font-mono font-bold text-sm ${trx.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>{trx.type === 'expense' ? '-' : '+'} Rp {Number(trx.amount).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TAGIHAN TETAP (SISTEM PEMBAYARAN OTOMATIS) */}
          {mainTab === 'bills' && (
             <div className="p-8 bg-slate-50 min-h-[500px]">
             <div className="max-w-3xl mx-auto space-y-8">
               <form onSubmit={handleSaveBill} className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-4">
                 <h4 className="font-bold text-sm uppercase tracking-wider text-slate-500">{editingBillId ? 'Edit Tagihan' : 'Tambah Tagihan'}</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div><label className="block text-xs font-bold text-slate-700 mb-1">Nama Tagihan</label><input type="text" value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="Contoh: Uang Kos" className="w-full px-3 py-2 border rounded-md text-sm" required /></div>
                   <div><label className="block text-xs font-bold text-slate-700 mb-1">Nominal (Rp)</label><input type="text" inputMode="numeric" value={billAmount ? Number(billAmount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e) => setBillAmount(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm font-mono" required /></div>
                   <div><label className="block text-xs font-bold text-slate-700 mb-1">Tgl Jatuh Tempo</label><input type="number" min="1" max="31" value={billDueDate} onChange={(e) => setBillDueDate(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required /></div>
                 </div>
                 <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-md text-sm font-bold hover:bg-black">{editingBillId ? 'Simpan' : 'Tambah'}</button>
               </form>

               <div className="space-y-4">
                 <h4 className="font-bold text-sm uppercase tracking-wider text-slate-500">Status Tagihan Bulan Ini</h4>
                 {bills.map(bill => {
                   const isPaid = isBillPaidThisMonth(bill.last_paid_month);
                   
                   return (
                   <div key={bill.id} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group">
                     <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-lg flex justify-center items-center ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                         <Receipt size={24} />
                       </div>
                       <div>
                         <h4 className="font-bold text-lg text-slate-900">{bill.name}</h4>
                         <p className="text-sm text-slate-500">Jatuh tempo tgl <span className="font-bold">{bill.due_date}</span></p>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                       <div className="text-xl font-black font-mono">Rp {Number(bill.amount).toLocaleString('id-ID')}</div>
                       
                       {/* Panel Aksi (Bayar / Lunas / Edit) */}
                       <div className="flex items-center gap-2">
                         {isPaid ? (
                           <div className="flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md">
                             <CheckCircle2 size={14} /> Lunas
                           </div>
                         ) : (
                           <button onClick={() => handlePayBill(bill)} className="flex items-center gap-1 text-xs font-bold bg-slate-900 text-white px-4 py-1.5 rounded-md hover:bg-black transition-colors">
                             Bayar Sekarang
                           </button>
                         )}
                         
                         {/* Tombol Hapus & Edit tersembunyi, muncul saat di-hover */}
                         <div className="hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                           <button onClick={() => handleEditBill(bill)} className="p-1 border rounded text-slate-600 hover:bg-slate-100"><Edit3 size={14} /></button>
                           <button onClick={() => handleDeleteBill(bill.id)} className="p-1 border border-red-200 bg-red-50 text-red-600 rounded"><Trash2 size={14} /></button>
                         </div>
                       </div>
                     </div>
                   </div>
                 )})}
               </div>
             </div>
           </div>
          )}

          {/* TAB 5: RUANG KARANTINA (Sama) */}
          {mainTab === 'sandbox' && (
            <div className="p-8 bg-slate-50 min-h-[600px]">
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3 space-y-6">
                  <div className="bg-blue-900 text-white p-6 rounded-xl shadow-sm">
                    <Box size={24} className="mb-4 text-blue-400" />
                    <h3 className="font-bold text-lg mb-2">Impulse Sandbox</h3>
                    <p className="text-sm text-blue-200 leading-relaxed">Jangan langsung beli barang tersier. Masukkan ke sini, tunggu masa cooldown, dan lihat apakah Anda masih menginginkannya.</p>
                  </div>
                  <form onSubmit={handleSaveSandbox} className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-slate-500">Karantina Barang Baru</h4>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Nama Barang Keinginan</label><input type="text" value={sandboxName} onChange={(e) => setSandboxName(e.target.value)} placeholder="Misal: Skin Valorant / Sepatu" className="w-full px-3 py-2 border rounded-md text-sm" required /></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Harga Barang (Rp)</label><input type="text" inputMode="numeric" value={sandboxPrice ? Number(sandboxPrice.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''} onChange={(e) => setSandboxPrice(e.target.value)} placeholder="0" className="w-full px-3 py-2 border rounded-md text-sm font-mono" required /></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Masa Tunggu (Hari)</label><select value={sandboxDays} onChange={(e) => setSandboxDays(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm"><option value="1">1 Hari (Besok)</option><option value="3">3 Hari</option><option value="7">7 Hari (Seminggu)</option></select></div>
                    <button type="submit" className="w-full bg-slate-900 text-white py-2 rounded-md text-sm font-bold hover:bg-black">Kunci Sekarang</button>
                  </form>
                </div>
                <div className="w-full md:w-2/3">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-4">Daftar Karantina Aktif</h4>
                  <div className="space-y-4">
                    {sandboxItems.length === 0 ? (
                      <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl"><p className="text-sm">Tidak ada barang yang sedang dikarantina.</p></div>
                    ) : (
                      sandboxItems.map(item => {
                        const isReady = new Date(item.target_date) <= new Date();
                        return (
                          <div key={item.id} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
                            <div><h4 className="font-bold text-slate-900">{item.item_name}</h4><p className="text-xl font-black font-mono mt-1">Rp {Number(item.price).toLocaleString('id-ID')}</p></div>
                            <div className="w-full sm:w-auto">
                              {!isReady ? (
                                <div className="flex items-center gap-2 bg-slate-100 text-slate-500 px-4 py-2 rounded-lg text-sm font-bold border border-slate-200"><Clock size={16} /> Terkunci s/d {item.target_date}</div>
                              ) : (
                                <div className="flex flex-col sm:flex-row gap-2 w-full">
                                  <button onClick={() => handleSandboxAction(item, 'approve')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700"><Check size={16} /> Ya, Beli</button>
                                  <button onClick={() => handleSandboxAction(item, 'reject')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50"><X size={16} /> Batalkan Niat</button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}