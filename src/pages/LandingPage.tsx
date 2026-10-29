import { type MouseEvent, type ReactNode } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, AudioLines, Bot, Disc3, Image as ImageIcon, Mic2, Music2, Radio, SlidersHorizontal, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLogo } from '@/components/ui/AppLogo';
import { Button } from '@/components/ui/button';

const studioTools = [
  { icon: Bot, title: 'AI music assistant', copy: 'Turn an idea into a clear creative direction, prompts and release-ready assets.' },
  { icon: Music2, title: 'Full songs and beats', copy: 'Generate original instrumentals, song concepts and complete compositions.' },
  { icon: Mic2, title: 'Lyrics and vocals', copy: 'Write lyrics, record vocals and shape performances inside one connected workflow.' },
  { icon: SlidersHorizontal, title: 'Browser DAW', copy: 'Arrange, edit, mix and apply pitch, EQ, compression, delay and reverb.' },
  { icon: AudioLines, title: 'Enhance and master', copy: 'Clean recordings and prepare balanced exports for sharing and release.' },
  { icon: ImageIcon, title: 'Visual studio', copy: 'Create cover art, merchandise concepts and promotional posters for each release.' },
];

const journeyImages = [
  { src: '/landing/vocal-studio.webp', alt: 'Artist recording vocals in the MusicInsta studio', title: 'Create in one studio' },
  { src: '/landing/daw-workspace.webp', alt: 'MusicInsta digital audio workstation', title: 'Produce and mix in the browser' },
  { src: '/landing/music-discovery.webp', alt: 'Listener discovering independent music on MusicInsta', title: 'Reach listeners by taste' },
  { src: '/landing/artist-collaboration.webp', alt: 'Independent artists collaborating with MusicInsta', title: 'Collaborate with artists' },
];

const ease = [0.22, 1, 0.36, 1] as const;

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <motion.div initial={{ opacity: 0, y: 44, filter: 'blur(8px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.18, margin: '-8% 0px -8% 0px' }} transition={{ duration: 0.7, delay, ease }} className={className}>{children}</motion.div>;
}

function InteractiveImage({ src, alt, className = '', priority = false }: { src: string; alt: string; className?: string; priority?: boolean }) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [3, -3]), { stiffness: 150, damping: 22 });
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-3, 3]), { stiffness: 150, damping: 22 });
  const move = (event: MouseEvent<HTMLElement>) => {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };
  const reset = () => { pointerX.set(0); pointerY.set(0); };

  return <motion.figure onMouseMove={move} onMouseLeave={reset} style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 1000 }} className="group relative overflow-hidden rounded-3xl bg-muted shadow-2xl">
    <motion.img src={src} alt={alt} className={`w-full object-cover ${className}`} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} whileHover={reduceMotion ? undefined : { scale: 1.045 }} transition={{ duration: 0.65, ease }} />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary/15 via-transparent to-white/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
  </motion.figure>;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(35);
  const heroX = useSpring(useTransform(pointerX, [-1, 1], [-14, 14]), { stiffness: 90, damping: 25 });
  const heroY = useSpring(useTransform(pointerY, [-1, 1], [-9, 9]), { stiffness: 90, damping: 25 });
  const cursorGlow = useMotionTemplate`radial-gradient(520px circle at ${glowX}% ${glowY}%, hsl(var(--primary) / 0.13), transparent 70%)`;

  const movePage = (event: MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = Math.min(1, Math.max(0, event.clientY / window.innerHeight));
    pointerX.set(x * 2 - 1); pointerY.set(y * 2 - 1); glowX.set(x * 100); glowY.set(y * 100);
  };
  const resetPage = () => { pointerX.set(0); pointerY.set(0); glowX.set(50); glowY.set(35); };
  const explore = () => { localStorage.setItem('musicinsta_landing_seen', '1'); navigate('/'); };

  return <div className="relative min-h-screen overflow-hidden bg-background text-foreground" onMouseMove={movePage} onMouseLeave={resetPage}>
    <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-30" style={{ background: cursorGlow }} />
    <motion.header initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-5">
        <motion.div className="flex items-center gap-3" whileHover={reduceMotion ? undefined : { scale: 1.025 }}><AppLogo size="lg" /><span className="font-display text-xl font-bold text-primary">MusicInsta</span></motion.div>
        <div className="flex gap-1 sm:gap-2"><Button variant="ghost" onClick={explore}>Explore</Button><Button onClick={() => navigate('/auth')}>Sign in</Button></div>
      </div>
    </motion.header>

    <main className="pt-16">
      <section className="relative min-h-[88vh] overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <motion.img src="/landing/live-concert.webp" alt="MusicInsta artists performing live" className="absolute inset-0 block h-full w-full max-w-none object-cover object-center" fetchPriority="high" initial={{ scale: 1.14 }} animate={{ scale: 1.08 }} style={reduceMotion ? undefined : { x: heroX, y: heroY }} transition={{ duration: 1.5, ease }} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl items-center px-5 py-20 sm:px-6">
          <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.12 } } }} className="max-w-3xl">
            <motion.span variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary backdrop-blur-md"><Sparkles className="h-4 w-4" />Create, release and get discovered</motion.span>
            <motion.h1 variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0 } }} className="mt-6 font-display text-4xl font-black leading-[.95] text-white sm:text-6xl lg:text-7xl">The music platform built around independent artists.</motion.h1>
            <motion.p variants={{ hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } }} className="mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">MusicInsta connects an AI-powered production studio, a complete browser DAW and a social music community. Make the work, publish it and reach listeners whose taste genuinely matches your sound.</motion.p>
            <motion.div variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }} className="mt-8 flex flex-wrap gap-3"><Button size="lg" onClick={() => navigate('/auth')}>Start creating <ArrowRight className="ml-2 h-4 w-4" /></Button><Button size="lg" variant="secondary" onClick={explore}>Discover music</Button></motion.div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal className="max-w-3xl"><p className="font-bold uppercase tracking-[.25em] text-primary">MusicInsta AI Studio</p><h2 className="mt-3 font-display text-3xl font-black sm:text-5xl">Every tool between the first idea and the final release.</h2><p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">Tools share the same project context, so generated songs, cover art and DAW sessions can move directly into publishing without rebuilding the release from scratch.</p></Reveal>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }} className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studioTools.map(tool => <motion.article key={tool.title} variants={{ hidden: { opacity: 0, y: 34, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease } } }} whileHover={reduceMotion ? undefined : { y: -7, scale: 1.018, boxShadow: '0 22px 55px hsl(var(--primary) / 0.13)' }} className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/35">
            <motion.div whileHover={reduceMotion ? undefined : { rotate: -5, scale: 1.1 }} className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><tool.icon className="h-7 w-7 text-primary" /></motion.div><h3 className="mt-5 text-xl font-bold">{tool.title}</h3><p className="mt-2 leading-7 text-muted-foreground">{tool.copy}</p>
          </motion.article>)}
        </motion.div>
      </section>

      <section className="border-y border-border bg-card/40 py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-6"><div className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal><InteractiveImage src="/landing/daw-workspace.webp" alt="MusicInsta browser DAW showing a multitrack session" className="aspect-[16/11]" /></Reveal>
        <Reveal delay={0.1}><p className="font-bold uppercase tracking-[.25em] text-primary">Real production workflow</p><h2 className="mt-3 font-display text-3xl font-black sm:text-4xl">Your projects follow you.</h2><p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">Cloud-synced DAW sessions keep arrangements, audio tracks and mixer settings available across devices, while local copies provide resilient recovery and fast reopening.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">
          {[['Multitrack arranging', 'Record, trim, move and mix'], ['Professional effects', 'Pitch, EQ, dynamics and space']].map(([title, copy]) => <motion.span key={title} whileHover={reduceMotion ? undefined : { y: -4, scale: 1.02 }} className="rounded-xl bg-muted p-4"><strong className="block">{title}</strong><small className="text-muted-foreground">{copy}</small></motion.span>)}
        </div></Reveal>
      </div></div></section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24"><Reveal className="mb-10 text-center"><p className="font-bold uppercase tracking-[.25em] text-primary">One connected journey</p><h2 className="mt-3 font-display text-3xl font-black sm:text-4xl">From idea to audience</h2></Reveal><div className="grid gap-6 md:grid-cols-2">
        {journeyImages.map((item, index) => <Reveal key={item.src} delay={(index % 2) * 0.1} className={index === 0 ? 'md:col-span-2' : ''}><article><InteractiveImage src={item.src} alt={item.alt} className={index === 0 ? 'max-h-[560px] aspect-[16/9]' : 'aspect-[16/10]'} /><motion.h3 whileHover={reduceMotion ? undefined : { x: 5 }} className="mt-4 inline-block text-xl font-bold">{item.title}</motion.h3></article></Reveal>)}
      </div></section>

      <section className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-accent/15 py-20 sm:py-24">
        <motion.div aria-hidden className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-primary/15 blur-3xl" animate={reduceMotion ? undefined : { scale: [1, 1.15, 1], opacity: [0.45, 0.7, 0.45] }} transition={{ duration: 5, repeat: Infinity }} />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-2"><Reveal><div className="flex gap-3">{[Radio, Users, Disc3].map((Icon, index) => <motion.div key={index} whileHover={reduceMotion ? undefined : { y: -4, rotate: index === 1 ? 4 : -4 }}><Icon className="h-7 w-7 text-primary" /></motion.div>)}</div><h2 className="mt-5 font-display text-3xl font-black sm:text-4xl">Discovery that gives independent music a fair chance.</h2><p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">MusicInsta learns from each listener's plays, completed listens, likes and skips. Familiar music comes first, followed by new artists with genuinely similar sound—not simply whoever already has the largest numbers.</p><Button className="mt-8" size="lg" onClick={() => navigate('/auth')}>Join MusicInsta</Button></Reveal><Reveal delay={0.1}><InteractiveImage src="/landing/music-discovery.webp" alt="Listener discovering artists through MusicInsta" className="aspect-[16/11]" /></Reveal></div>
      </section>
    </main>

    <Reveal><footer className="border-t border-border py-10"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left"><motion.div whileHover={reduceMotion ? undefined : { scale: 1.035 }} className="flex items-center gap-3"><AppLogo size="lg" /><strong>MusicInsta</strong></motion.div><p className="text-sm text-muted-foreground">Create boldly. Connect genuinely. Grow independently.</p></div></footer></Reveal>
  </div>;
}
