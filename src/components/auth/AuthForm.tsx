import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, User, Phone, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [waitingEmail, setWaitingEmail] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [birthDate, setBirthDate] = useState('');

  const formatBirthDate = (value: string) => {
    const v = value.replace(/\D/g, '').substring(0, 8);
    if (v.length <= 2) return v;
    if (v.length <= 4) return `${v.substring(0, 2)}/${v.substring(2)}`;
    return `${v.substring(0, 2)}/${v.substring(2, 4)}/${v.substring(4)}`;
  };

  const convertToIsoDate = (date: string) => {
    const [day, month, year] = date.split('/');
    if (!day || !month || !year || year.length < 4) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Invite Flow
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Registration Steps
  const [registerStep, setRegisterStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#invite/')) {
      const code = hash.replace('#invite/', '');
      setInviteCode(code);
      setIsLogin(false); // Force to register mode
      setRegisterStep(1); // Skip step 0
      setShowInviteModal(true);
      // Clean URL
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Validations
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isEmailAvailable, setIsEmailAvailable] = useState<boolean | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Password Checklist
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const isPasswordValid = hasMinLength && hasNumber;

  // Check unique username and email
  useEffect(() => {
    const checkAvailability = async () => {
      let checkingU = false;
      let checkingE = false;

      if (username && username.length >= 3) checkingU = true;
      if (email && email.includes('@')) checkingE = true;

      if (!checkingU && !checkingE) {
        if (!checkingU) setIsUsernameAvailable(null);
        if (!checkingE) setIsEmailAvailable(null);
        return;
      }

      if (checkingU) setIsCheckingUsername(true);
      if (checkingE) setIsCheckingEmail(true);

      const { data, error } = await supabase.rpc('check_availability', {
        check_username: checkingU ? username : null,
        check_email: checkingE ? email : null
      });

      if (!error && data) {
        if (checkingU) setIsUsernameAvailable(data.username_available);
        if (checkingE) setIsEmailAvailable(data.email_available);
      }

      setIsCheckingUsername(false);
      setIsCheckingEmail(false);
    };

    const debounce = setTimeout(checkAvailability, 500);
    return () => clearTimeout(debounce);
  }, [username, email, isLogin]);

  // Poll for email confirmation if waiting
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (waitingEmail && !isConfirmed) {
      interval = setInterval(async () => {
        const { data } = await supabase.from('members').select('id').eq('email', waitingEmail).limit(1);
        if (data && data.length > 0) {
          setIsConfirmed(true);
          clearInterval(interval);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [waitingEmail, isConfirmed]);

  // Listen to auth state changes for same-browser confirmation
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && waitingEmail) {
        setIsConfirmed(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [waitingEmail]);

  const handleLogin = async () => {
    let finalEmail = identifier;
    
    // If not an email, assume it's a username
    if (!identifier.includes('@')) {
      const { data, error: rpcError } = await supabase.rpc('get_email_by_username', { p_username: identifier });
      if (rpcError || !data) {
        throw new Error('Usuário não encontrado.');
      }
      finalEmail = data;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: finalEmail, password });
    if (error) throw error;
  };

  const handleRegister = async () => {
    if (registerStep === 1) {
      if (!fullName || !nickname || !birthDate || birthDate.length < 10) {
        throw new Error('Preencha a data de nascimento corretamente (DD/MM/AAAA).');
      }
      setError(null);
      setSuccess(null);
      setRegisterStep(2);
      return;
    }

    if (!isUsernameAvailable) throw new Error('ID de Usuário já está em uso.');
    if (isEmailAvailable === false) throw new Error('Este e-mail já está cadastrado.');
    if (!isPasswordValid) throw new Error('A senha não atende aos requisitos.');
    if (!username) throw new Error('Preencha o ID de Usuário.');
    if (!email) throw new Error('O e-mail é obrigatório para cadastro.');

    const { data: authData, error: signUpError } = await supabase.auth.signUp({ 
      email: email, 
      password,
      options: {
        data: {
          full_name: fullName,
          nickname,
          username,
          gender,
          birth_date: convertToIsoDate(birthDate),
          phone: phone || null,
          invite_code: inviteCode || null
        }
      }
    });
    
    if (signUpError) throw signUpError;

    if (!authData.session) {
      setWaitingEmail(email);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        await handleLogin();
      } else {
        await handleRegister();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 md:p-6 w-full">
      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-4 md:space-y-6 rounded-3xl bg-white p-5 md:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 my-auto transition-all duration-300"
      >
        <AnimatePresence mode="wait">
          {waitingEmail ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              {!isConfirmed ? (
                <>
                  <div className="relative mb-8 mt-4">
                    <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-20" style={{ animationDuration: '3s' }} />
                    <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 shadow-inner">
                      <Mail size={48} className="animate-pulse" />
                    </div>
                  </div>
                  <h2 className="mb-3 text-2xl font-black text-slate-900 tracking-tight">Aguardando Confirmação</h2>
                  <p className="mb-8 text-sm font-medium text-slate-500 px-4 leading-relaxed">
                    Você está quase lá! Enviamos um link de acesso para o e-mail<br/>
                    <span className="font-bold text-slate-800">{waitingEmail}</span>.
                  </p>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-400 bg-slate-50 px-6 py-3 rounded-2xl mb-4 border border-slate-100">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>Aguardando você clicar no link pelo seu celular ou computador...</span>
                  </div>
                </>
              ) : (
                <>
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="mb-8 mt-4 flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30"
                  >
                    <CheckCircle2 size={56} />
                  </motion.div>
                  <h2 className="mb-3 text-2xl font-black text-slate-900 tracking-tight">Verificação concluída!</h2>
                  <p className="mb-10 text-sm font-medium text-slate-500 px-4 leading-relaxed">
                    Seu e-mail foi confirmado com sucesso. Agora você já pode acessar a sua conta.
                  </p>
                  <Button 
                    onClick={() => {
                      setWaitingEmail(null);
                      setIsConfirmed(false);
                      setIsLogin(true);
                      window.location.reload(); 
                    }} 
                    className="w-full max-w-sm h-14 text-lg shadow-lg shadow-emerald-500/20"
                  >
                    Ir para Login
                  </Button>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            {isLogin ? <LogIn size={28} /> : <UserPlus size={28} />}
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">{inviteCode && !isLogin ? 'Você foi convidado!' : isLogin ? 'Bem-vindo de volta' : 'Comece no Blee'}</h1>
          <p className="mt-1 text-xs md:text-sm font-medium text-slate-400">
            {inviteCode && !isLogin ? 'Preencha seus dados para começar.' : isLogin ? 'Gerencie suas despesas em casal' : 'Como você quer começar?'}
          </p>
        </div>

        {!isLogin && registerStep > 0 && (
          <div className="flex justify-center gap-2 py-2">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${registerStep === 1 ? 'w-6 bg-emerald-500' : 'w-2 bg-slate-200'}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${registerStep === 2 ? 'w-6 bg-emerald-500' : 'w-2 bg-slate-200'}`} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                <Input 
                  icon={User} 
                  placeholder="E-mail ou ID Usuário" 
                  value={identifier} 
                  onChange={(e) => setIdentifier(e.target.value.toLowerCase().trim())} 
                  required 
                />
                <Input 
                  icon={Lock} 
                  type="password" 
                  placeholder="Sua senha" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                
                <Button type="submit" isLoading={loading} className="w-full h-12 shadow-lg shadow-emerald-500/20 mt-6 pt-2">
                  Entrar
                </Button>
              </motion.div>
            ) : registerStep === 0 ? (
              <motion.div key="step0" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Entrar em um Casulo */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="flex-1 flex flex-col rounded-3xl border-2 border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 p-5 md:p-6 text-center shadow-xl shadow-emerald-500/5 transition-all group overflow-hidden relative"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500" />
                    
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 transition-all duration-300">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-xs md:text-sm font-black text-slate-900 mb-1">Entrar em um Casulo</h3>
                      <p className="text-[10px] md:text-xs font-medium text-slate-500 px-2 line-clamp-2">Seu parceiro já usa o Blee? Insira o código dele abaixo.</p>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center mb-4">
                      <Input 
                        placeholder="CÓDIGO" 
                        value={inviteCode || ''} 
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} 
                        className="text-center font-black tracking-widest bg-white w-full uppercase"
                        maxLength={5}
                      />
                    </div>
                    
                    <Button 
                      type="button" 
                      onClick={() => {
                        if (!inviteCode || inviteCode.length !== 5) {
                          setError("Insira um código de 5 dígitos válido.");
                          return;
                        }
                        setError(null);
                        setRegisterStep(1);
                      }} 
                      className="w-full h-12 shadow-lg shadow-emerald-500/20 mt-auto"
                    >
                      Continuar com Convite
                    </Button>
                  </motion.div>

                  {/* Divisor Mobile */}
                  <div className="md:hidden relative py-2 flex items-center">
                    <div className="flex-1 border-t border-slate-100"></div>
                    <span className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ou</span>
                    <div className="flex-1 border-t border-slate-100"></div>
                  </div>

                  {/* Divisor Desktop */}
                  <div className="hidden md:flex flex-col items-center justify-center">
                    <div className="w-[1px] h-24 bg-slate-100"></div>
                    <span className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ou</span>
                    <div className="w-[1px] h-24 bg-slate-100"></div>
                  </div>

                  {/* Criar Nova Conta */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setInviteCode(null);
                        setError(null);
                        setSuccess(null);
                        setRegisterStep(1);
                      }} 
                    className="flex-1 flex flex-col rounded-3xl border-2 border-slate-100 bg-white p-5 md:p-6 text-center shadow-xl shadow-slate-200/20 transition-all group overflow-hidden relative cursor-pointer"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 to-slate-300 group-hover:from-emerald-400 group-hover:to-emerald-500 transition-all duration-300" />
                    
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                      <UserPlus size={24} strokeWidth={1.5} />
                    </div>

                    <div className="mb-4">
                      <h3 className="text-xs md:text-sm font-black text-slate-900 mb-1">Primeiro a chegar?</h3>
                      <p className="text-[10px] md:text-xs font-medium text-slate-500 px-2 line-clamp-2">Crie sua conta do zero e convide seu parceiro depois.</p>
                    </div>
                    
                    <div className="flex-1"></div>

                    <div className="w-full flex items-center justify-center h-12 rounded-2xl font-bold transition-all duration-300 bg-slate-50 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700 mt-auto">
                      Criar Nova Conta
                    </div>
                  </motion.div>
                </div>

              </motion.div>
            ) : registerStep === 1 ? (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Perfil</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input icon={User} placeholder="Nome Completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    <Input icon={User} placeholder="Como quer ser chamado?" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
                    <Input 
                      icon={Calendar} 
                      type="text" 
                      placeholder="Data de nascimento" 
                      value={birthDate} 
                      onChange={(e) => setBirthDate(formatBirthDate(e.target.value))} 
                      required 
                      className="w-full" 
                      maxLength={10}
                      inputMode="numeric"
                    />
                    <div className="flex bg-slate-50 border border-slate-100 rounded-2xl p-1 h-[56px] items-center">
                      {(['M', 'F'] as const).map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={`flex-1 h-full rounded-xl text-sm font-bold transition-all ${gender === g ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {g === 'M' ? 'Masc' : 'Fem'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={() => { setRegisterStep(0); setError(null); }} className="w-1/3 h-12">
                    Voltar
                  </Button>
                  <Button type="button" onClick={handleRegister} className="w-2/3 h-12 shadow-md shadow-emerald-500/20">
                    Continuar
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Acesso</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div>
                      <div className="relative">
                        <Input 
                          icon={User} 
                          placeholder="ID Usuário (único)" 
                          value={username} 
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} 
                          required 
                          className={isUsernameAvailable === false ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : isUsernameAvailable === true ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20' : ''}
                        />
                        {username && !isCheckingUsername && (
                          <div className="absolute right-[14px] top-1/2 -translate-y-1/2 z-10 pointer-events-none bg-white pl-2">
                            {isUsernameAvailable ? <CheckCircle2 className="text-emerald-500" size={18} /> : isUsernameAvailable === false ? <XCircle className="text-rose-500" size={18} /> : null}
                          </div>
                        )}
                      </div>
                      <div className="h-4 mt-1 ml-1">
                        {isUsernameAvailable === false && <p className="text-[10px] text-rose-500 font-medium">Este ID já está em uso.</p>}
                        {isUsernameAvailable === true && <p className="text-[10px] text-emerald-500 font-medium">ID disponível!</p>}
                      </div>
                    </div>

                    <Input icon={Phone} type="tel" placeholder="Celular (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} />

                    <div>
                      <div className="relative">
                        <Input 
                          icon={Mail} 
                          type="email" 
                          placeholder="E-mail Pessoal" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          required 
                          className={isEmailAvailable === false ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : isEmailAvailable === true ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20' : ''}
                        />
                        {email && email.includes('@') && !isCheckingEmail && (
                          <div className="absolute right-[14px] top-1/2 -translate-y-1/2 z-10 pointer-events-none bg-white pl-2">
                            {isEmailAvailable ? <CheckCircle2 className="text-emerald-500" size={18} /> : isEmailAvailable === false ? <XCircle className="text-rose-500" size={18} /> : null}
                          </div>
                        )}
                      </div>
                      <div className="h-4 mt-1 ml-1 mb-2">
                        {isEmailAvailable === false && <p className="text-[10px] text-rose-500 font-medium">Este e-mail já está cadastrado.</p>}
                        {isEmailAvailable === true && <p className="text-[10px] text-emerald-500 font-medium">E-mail disponível!</p>}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Input icon={Lock} type="password" placeholder="Crie uma senha forte" value={password} onChange={(e) => setPassword(e.target.value)} required />
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 px-2">
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors ${hasMinLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {hasMinLength ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border-2 border-slate-300" />}
                          Mín 8 caracteres
                        </div>
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors ${hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {hasNumber ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border-2 border-slate-300" />}
                          Pelo menos 1 número
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={() => { setRegisterStep(1); setError(null); setSuccess(null); }} className="w-1/3 h-12">
                    Voltar
                  </Button>
                  <Button type="submit" isLoading={loading} className="w-2/3 h-12 shadow-lg shadow-emerald-500/20">
                    Criar Conta
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600 border border-rose-100/50"
              >
                <AlertCircle size={20} className="shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-600 border border-emerald-100/50"
              >
                <CheckCircle2 size={24} className="shrink-0" />
                <p>{success}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <div className="text-center border-t border-slate-100 pt-6">
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setRegisterStep(0);
              setError(null);
            }}
            className="text-xs font-bold text-slate-400 hover:text-emerald-500 transition-colors"
          >
            {isLogin ? 'Não tem uma conta? Comece agora' : (inviteCode ? 'Fazer login sem usar o convite' : 'Já tem uma conta? Faça login')}
          </button>
        </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Invite Onboarding Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-500">
                <UserPlus size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Você foi convidado!</h2>
              <p className="text-sm font-medium text-slate-600 mb-8 leading-relaxed">
                Bem-vindo ao Blee. O seu parceiro te convidou para gerenciar as despesas da casa juntos. 
                Crie seu perfil agora para se conectar automaticamente ao grupo.
              </p>
              <Button onClick={() => setShowInviteModal(false)} className="w-full h-12 text-sm shadow-lg shadow-emerald-500/30">
                Começar Cadastro
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
