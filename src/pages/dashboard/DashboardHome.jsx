import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Compass,
  UserCircle,
  ArrowLeft,
  FolderKanban,
  Sparkles,
  Calendar,
  MapPin,
  Wallet,
  Tag,
  Plus,
  HardHat,
  Handshake,
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { projects as projectsApi } from '../../services';
import {
  isServiceProvider,
  accountTypeLabel,
} from '../../config/constants';
import StatusBadge from '../../components/project/StatusBadge';
import { arenaConfig, canPostAnyArena } from '../../config/projectConstants';
import SupplierComingSoon from '../../components/SupplierComingSoon';

/* ============================================================
 *  DashboardHome — /dashboard
 *  ----------------------------------------------------------------
 *  Per the V5 spec, the dashboard is intentionally simple:
 *    - Friendly greeting
 *    - Quick-action shortcut cards (create project / browse / profile)
 *    - A short list of the user's most relevant projects:
 *        owners (individual / developer) → projects they posted
 *        service providers (entrepreneur / engineering) → projects
 *          they're associated with (own or partner), plus the
 *          entrepreneur's own solidarity-arena posts
 *
 *  Suppliers don't get the projects flow in V5 — they see the
 *  SupplierComingSoon embedded view instead.
 *
 *  Heavier project-management UX (accepting applications, etc.)
 *  lives on the project details page rather than here. The PDF is
 *  explicit: "we don't need a professional dashboard right now".
 * ============================================================ */

export default function DashboardHome() {
  const { user, loading } = useUser();

  if (loading) return <DashboardSkeleton />;

  // Suppliers see only the coming-soon placeholder until their
  // dedicated flow ships.
  if (user?.account_type === 'supplier') {
    return <SupplierComingSoon embedded />;
  }

  // Owner roles (individual + developer) post their own projects and
  // see them in the recent list. Service-provider roles (entrepreneur,
  // engineering) see their associated projects — owned or partnered.
  // Entrepreneurs additionally see their own solidarity-arena posts.
  //
  // The "+ مشروع جديد" quick action is gated by canPostAnyArena:
  //   individual    → posts in الخاصة (عهد)
  //   entrepreneur  → posts in التضامن
  //   developer     → posts in أرينا + إسناد
  //   engineering / supplier → no posting privileges (CTA hidden)
  const accountType = user?.account_type;
  const isOwner = !accountType || accountType === 'individual' || accountType === 'developer';
  const isProvider = isServiceProvider(accountType);
  const canPostProject = canPostAnyArena(accountType);
  // Individuals only post their own private projects — they don't browse
  // arenas (no arena lists 'individual' in viewableBy). Hide the browse
  // entry points for them so they don't land on a blocked /projects view.
  const canBrowseProjects = accountType !== 'individual';

  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px]">
      <Greeting user={user} />
      <QuickActions
        canPostProject={canPostProject}
        canBrowseProjects={canBrowseProjects}
      />
      {isOwner && <RecentProjects canBrowseProjects={canBrowseProjects} />}
      {isProvider && (
        <div className="space-y-9">
          <RecentAssociatedProjects user={user} />
          {accountType === 'entrepreneur' && <MySolidarityProjects />}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 *  Greeting
 * ============================================================ */
function Greeting({ user }) {
  const hour = new Date().getHours();
  const period =
    hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء الخير';
  const firstName = user?.name?.split(' ')[0];
  const role = accountTypeLabel(user?.account_type);

  return (
    <div className="mb-9 animate-fade-up">
      <div
        className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(19,109,74,0.08)',
          color: '#0d5538',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        <Sparkles size={12} />
        لوحة التحكّم
      </div>
      <h1
        className="font-display text-ink m-0 mb-2"
        style={{
          fontSize: 'clamp(26px, 3.4vw, 36px)',
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
        }}
      >
        {period}{firstName ? `, ${firstName}` : ''}.
      </h1>
      <p
        className="text-muted m-0"
        style={{ fontSize: 14.5, lineHeight: 1.7 }}
      >
        {role
          ? `أهلاً بك في حسابك ${role ? `كـ${role}` : ''} على تعاهد. ابدأ من الاختصارات أدناه.`
          : 'أهلاً بك في تعاهد. ابدأ من الاختصارات أدناه.'}
      </p>
    </div>
  );
}

/* ============================================================
 *  Quick action cards
 * ============================================================ */
function QuickActions({ canPostProject, canBrowseProjects }) {
  const navigate = useNavigate();

  // Build the list of cards based on the user's role. Everyone
  // except suppliers can create a project — the arena defaults
  // come from defaultArenaFor(accountType) inside the wizard.
  const actions = [];

  if (canPostProject) {
    actions.push({
      icon: UploadCloud,
      title: 'مشروع جديد',
      desc: 'انشر مشروعك وابدأ باستقبال العروض من الشركاء.',
      color: '#136d4a',
      onClick: () => navigate('/projects/new'),
    });
  }

  if (canBrowseProjects) {
    actions.push({
      icon: Compass,
      title: 'تصفّح المشاريع',
      desc: 'اعثر على مشاريع تناسبك في الساحات الثلاث.',
      color: '#2c2f7c',
      onClick: () => navigate('/projects'),
    });
  }

  actions.push({
    icon: UserCircle,
    title: 'الملف الشخصي',
    desc: 'حدّث بياناتك وبيانات شركتك.',
    color: '#3a3d99',
    onClick: () => navigate('/dashboard/profile'),
  });

  return (
    <div
      className={`grid gap-4 mb-9 ${
        actions.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
      }`}
    >
      {actions.map((a, i) => (
        <ActionCard key={i} action={a} delay={i * 0.06} />
      ))}
    </div>
  );
}

function ActionCard({ action, delay }) {
  return (
    <button
      type="button"
      onClick={action.onClick}
      className="text-right group transition-all animate-fade-up"
      style={{
        padding: '20px 22px',
        background: 'white',
        border: '1px solid #e5e3dc',
        borderRadius: 14,
        cursor: 'pointer',
        animationDelay: `${delay}s`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = action.color;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(15,17,41,0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e3dc';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div
          className="flex items-center justify-center"
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: action.color,
            color: 'white',
            boxShadow: `0 8px 18px ${action.color}30`,
          }}
        >
          <action.icon size={20} strokeWidth={1.8} />
        </div>
        <ArrowLeft
          size={18}
          className="text-muted transition-transform"
          style={{ flexShrink: 0 }}
        />
      </div>
      <div
        className="font-display font-bold mb-1"
        style={{ fontSize: 16, color: '#0f1129' }}
      >
        {action.title}
      </div>
      <div style={{ fontSize: 13, color: '#7a7a8c', lineHeight: 1.6 }}>
        {action.desc}
      </div>
    </button>
  );
}

/* ============================================================
 *  Recent projects (for owners)
 * ============================================================ */
function RecentProjects({ canBrowseProjects }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    projectsApi
      .list()
      .then((data) => !cancelled && setItems(data))
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const recent = useMemo(() => items.slice(0, 4), [items]);
  const hasMore = items.length > recent.length;

  return (
    <Section
      title="مشاريعك الأخيرة"
      icon={FolderKanban}
      action={
        hasMore && canBrowseProjects && (
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-1 font-semibold transition-colors"
            style={{
              fontSize: 12.5,
              color: '#2c2f7c',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            عرض الكل
            <ArrowLeft size={13} strokeWidth={2} />
          </button>
        )
      }
    >
      {loading ? (
        <CardGridSkeleton />
      ) : recent.length === 0 ? (
        <Empty
          title="لم تنشئ أيّ مشروع بعد."
          subtitle="ابدأ مشروعك الأوّل واحصل على عروض من شركاء موثوقين."
          ctaLabel="إنشاء مشروع جديد"
          onCta={() => navigate('/projects/new')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {recent.map((p, i) => (
            <DashboardProjectCard
              key={p.id}
              project={p}
              onClick={() => navigate(`/projects/${p.id}`)}
              delay={i * 0.05}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

function DashboardProjectCard({ project, onClick, delay = 0 }) {
  const arena = arenaConfig(project.arena);
  const showProgress =
    project.status === 'in_progress' || project.status === 'completed';

  return (
    <article
      onClick={onClick}
      className="group relative flex flex-col cursor-pointer transition-all animate-fade-up"
      style={{
        background: 'white',
        border: '1px solid #e5e3dc',
        borderRadius: 16,
        padding: '20px 22px',
        animationDelay: `${delay}s`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = arena.color;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 14px 30px rgba(15,17,41,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e3dc';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Arena accent strip */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          insetInlineStart: 22,
          insetInlineEnd: 22,
          height: 3,
          borderRadius: '0 0 4px 4px',
          background: arena.color,
          opacity: 0.85,
        }}
      />

      {/* Header: status + arena + date */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <StatusBadge status={project.status} size="sm" />
        <span
          className="inline-flex items-center rounded-full font-bold"
          style={{
            background: arena.accentSoft,
            color: arena.color,
            fontSize: 10.5,
            padding: '3px 9px',
          }}
        >
          {arena.label}
        </span>
        <span
          className="ms-auto text-muted"
          style={{ fontSize: 11, fontWeight: 500 }}
        >
          {formatRelativeDate(project.created_at)}
        </span>
      </div>

      {/* Title */}
      <h3
        className="font-display text-ink m-0 mb-2"
        style={{
          fontSize: 16.5,
          fontWeight: 700,
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: 42,
        }}
      >
        {project.name}
      </h3>

      {/* Meta */}
      <div
        className="flex items-center gap-2.5 flex-wrap mb-3"
        style={{ fontSize: 12, color: '#7a7a8c' }}
      >
        <span className="inline-flex items-center gap-1">
          <Tag size={11.5} strokeWidth={1.7} />
          {project.type}
        </span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbcec9' }} />
        <span className="inline-flex items-center gap-1">
          <MapPin size={11.5} strokeWidth={1.7} />
          {project.city}
        </span>
      </div>

      {/* Description (clamped) */}
      {project.description && (
        <p
          className="text-ink-soft m-0 mb-4"
          style={{
            fontSize: 13,
            lineHeight: 1.65,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {project.description}
        </p>
      )}

      {/* Progress for active / completed */}
      {showProgress && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="font-semibold uppercase"
              style={{ fontSize: 10, letterSpacing: '0.08em', color: '#7a7a8c' }}
            >
              التقدّم
            </span>
            <span
              className="font-bold"
              style={{ fontSize: 12, color: '#136d4a' }}
            >
              {Math.round(project.progress)}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 5,
              borderRadius: 3,
              background: '#efece4',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${project.progress}%`,
                background:
                  project.progress >= 100
                    ? '#136d4a'
                    : 'linear-gradient(90deg, #2c2f7c, #136d4a)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Footer: budget + arrow */}
      <div
        className="flex items-center justify-between pt-3 mt-auto"
        style={{ borderTop: '1px solid #efece4' }}
      >
        <div className="min-w-0">
          {project.budget ? (
            <>
              <div
                className="font-semibold uppercase mb-0.5"
                style={{ fontSize: 9.5, letterSpacing: '0.08em', color: '#7a7a8c' }}
              >
                الميزانية
              </div>
              <div
                className="font-bold inline-flex items-center gap-1"
                style={{ fontSize: 13.5, color: '#0f1129' }}
              >
                <Wallet size={12.5} strokeWidth={1.7} className="text-secondary" />
                {formatNumber(project.budget)}{' '}
                <span style={{ fontSize: 10.5, color: '#7a7a8c' }}>ر.س</span>
              </div>
            </>
          ) : project.start_date ? (
            <div
              className="font-medium inline-flex items-center gap-1"
              style={{ fontSize: 12, color: '#3a3a52' }}
            >
              <Calendar size={11.5} strokeWidth={1.7} />
              {formatDate(project.start_date)}
            </div>
          ) : (
            <span style={{ fontSize: 11.5, color: '#7a7a8c' }}>
              ميزانية غير محدّدة
            </span>
          )}
        </div>

        <span
          className="inline-flex items-center justify-center transition-all"
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: arena.accentSoft,
            color: arena.color,
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={15} strokeWidth={2} />
        </span>
      </div>
    </article>
  );
}

function formatNumber(n) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return n;
  return new Intl.NumberFormat('ar-SA').format(num);
}

function formatDate(d) {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(d));
  } catch {
    return d;
  }
}

function formatRelativeDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
  if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
  return `منذ ${Math.floor(diffDays / 365)} سنوات`;
}

/* ============================================================
 *  Recent associated projects (for service providers)
 *  ----------------------------------------------------------------
 *  Shows projects where the user is the owner or the partner —
 *  i.e. live engagements. Per the V5 Postman collection, the
 *  partner_id is set server-side when the (future) accept-
 *  application flow runs, so this will commonly be empty until
 *  that lands. The empty state nudges the user toward browsing
 *  open projects to find work.
 * ============================================================ */
function RecentAssociatedProjects({ user }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    projectsApi
      .associated(user.id)
      .then((data) => !cancelled && setItems(data))
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user?.id]);

  const recent = useMemo(() => items.slice(0, 4), [items]);

  return (
    <Section title="مشاريعك المرتبطة" icon={HardHat}>
      {loading ? (
        <CardGridSkeleton />
      ) : recent.length === 0 ? (
        <Empty
          title="لا توجد مشاريع مرتبطة حالياً."
          subtitle="بمجرد أن يقبل عميل عرضك على أحد المشاريع، سيظهر هنا للمتابعة."
          ctaLabel="تصفّح المشاريع المفتوحة"
          onCta={() => navigate('/projects')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {recent.map((p, i) => (
            <DashboardProjectCard
              key={p.id}
              project={p}
              onClick={() => navigate(`/projects/${p.id}`)}
              delay={i * 0.05}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

/* ============================================================
 *  My solidarity-arena projects (entrepreneur only)
 *  ----------------------------------------------------------------
 *  Entrepreneur is the only account type allowed to post in
 *  ساحة التضامن (per the V5 posting matrix in the Postman collection).
 *  This widget surfaces their own solidarity posts so they can
 *  jump straight into managing bids on them. The whole section is
 *  hidden when they have no solidarity projects — there's nothing
 *  useful to render in that case.
 * ============================================================ */
function MySolidarityProjects() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    projectsApi
      .list({ arena: 'solidarity' })
      .then((data) => !cancelled && setItems(data))
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading || items.length === 0) return null;

  const recent = items.slice(0, 4);

  return (
    <Section title="مشاريعك في ساحة التضامن" icon={Handshake}>
      <div className="grid gap-4 sm:grid-cols-2">
        {recent.map((p, i) => (
          <DashboardProjectCard
            key={p.id}
            project={p}
            onClick={() => navigate(`/projects/${p.id}`)}
            delay={i * 0.05}
          />
        ))}
      </div>
    </Section>
  );
}

/* ============================================================
 *  Shared bits
 * ============================================================ */
function Section({ title, icon: Icon, action, children }) {
  return (
    <section className="animate-fade-up">
      <div className="flex items-center gap-2 mb-4">
        {Icon && (
          <Icon size={16} strokeWidth={1.7} className="text-muted" />
        )}
        <h2
          className="font-display text-ink m-0"
          style={{ fontSize: 17, fontWeight: 700 }}
        >
          {title}
        </h2>
        {action && <div className="ms-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-[16px]"
          style={{
            background: 'white',
            border: '1px solid #e5e3dc',
            height: 220,
          }}
        />
      ))}
    </div>
  );
}

function Empty({ title, subtitle, ctaLabel, onCta }) {
  return (
    <div
      className="flex flex-col items-center text-center py-12 px-6 rounded-[14px]"
      style={{ background: 'white', border: '1px dashed #e5e3dc' }}
    >
      <h3
        className="font-display text-ink m-0 mb-2"
        style={{ fontSize: 16, fontWeight: 700 }}
      >
        {title}
      </h3>
      <p
        className="text-muted m-0 max-w-md"
        style={{ fontSize: 13.5, lineHeight: 1.7 }}
      >
        {subtitle}
      </p>
      {onCta && ctaLabel && (
        <button
          onClick={onCta}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold transition-all"
          style={{
            background: '#2c2f7c',
            fontSize: 13.5,
            border: '1px solid #2c2f7c',
            cursor: 'pointer',
          }}
        >
          <Plus size={14} strokeWidth={2} />
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1100px] animate-pulse">
      <div
        style={{
          height: 32,
          width: 240,
          background: '#efece4',
          borderRadius: 8,
          marginBottom: 12,
        }}
      />
      <div
        style={{
          height: 14,
          width: 320,
          background: '#efece4',
          borderRadius: 6,
          marginBottom: 32,
        }}
      />
      <div className="grid sm:grid-cols-3 gap-4 mb-9">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 140,
              background: 'white',
              border: '1px solid #e5e3dc',
              borderRadius: 14,
            }}
          />
        ))}
      </div>
      <div
        style={{
          height: 16,
          width: 200,
          background: '#efece4',
          borderRadius: 6,
          marginBottom: 16,
        }}
      />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 78,
              background: 'white',
              border: '1px solid #e5e3dc',
              borderRadius: 12,
            }}
          />
        ))}
      </div>
    </div>
  );
}
