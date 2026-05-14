import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowRight,
  Tag,
  MapPin,
  Wallet,
  Calendar,
  Clock,
  Award,
  ListChecks,
  FileText,
  User,
  Send,
  AlertCircle,
  Pencil,
  Users,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  LayoutDashboard,
} from 'lucide-react';
import Logo from '../components/Logo';
import { projects as projectsApi } from '../services';
import { isServiceProvider } from '../config/constants';
import { arenaConfig } from '../config/projectConstants';
import { UserProvider, useUser } from '../contexts/UserContext';
import StatusBadge from '../components/project/StatusBadge';

/* ============================================================
 *  ProjectDetailsPage — /projects/:id
 *  ----------------------------------------------------------------
 *  Standalone page (not inside DashboardLayout). Has its own
 *  topbar and provides its own UserProvider so role-aware actions
 *  (edit / apply / etc.) still work.
 *
 *  Three view modes based on the viewer:
 *    - Owner:               edit button + applications received
 *    - Eligible applicant:  "تقديم طلب" CTA
 *    - Anyone else:         read-only details
 * ============================================================ */

export default function ProjectDetailsPageRoute() {
  return (
    <UserProvider>
      <ProjectDetailsPage />
    </UserProvider>
  );
}

function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    projectsApi
      .get(id)
      .then((p) => {
        if (!cancelled) setProject(p);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'تعذّر تحميل المشروع.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <Shell><LoadingState /></Shell>;
  if (error || !project) return <Shell><ErrorView message={error} onBack={() => navigate(-1)} /></Shell>;

  const isOwner = user && project.user_id === user.id;
  // Service providers (entrepreneur + engineering) are the only
  // bidders in V5. Suppliers ship later with their own flow.
  const isApplicant = user && isServiceProvider(user.account_type);
  const canApply =
    isApplicant && project.status === 'open_for_bids' && !project.has_applied && !isOwner;

  return (
    <Shell>
      <div className="px-5 lg:px-8 py-8 lg:py-10 max-w-[1280px] mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'تصفّح المشاريع', to: '/projects' },
            { label: project.name },
          ]}
        />

        {/* Header */}
        <Header
          project={project}
          isOwner={isOwner}
          canApply={canApply}
          onEdit={() => navigate(`/projects/${project.id}/edit`)}
          onApply={() => navigate(`/projects/${project.id}/apply`)}
        />

      {/* Two-column body */}
      <div className="grid lg:grid-cols-[1.5fr,1fr] gap-6 lg:gap-8 mt-8">
        {/* Main content */}
        <div className="space-y-6 min-w-0">
          {project.description && (
            <Section title="وصف المشروع">
              <p
                className="m-0"
                style={{ fontSize: 14.5, color: '#3a3a52', lineHeight: 1.85 }}
              >
                {project.description}
              </p>
            </Section>
          )}

          {project.scope && (
            <Section title="نطاق العمل">
              <p
                className="m-0"
                style={{ fontSize: 14.5, color: '#3a3a52', lineHeight: 1.85 }}
              >
                {project.scope}
              </p>
            </Section>
          )}

          {project.requirements && project.requirements.length > 0 && (
            <Section title="المتطلبات" icon={ListChecks}>
              <ul className="m-0 p-0 space-y-2.5">
                {project.requirements.map((r, i) => (
                  <li
                    key={i}
                    className="list-none flex items-start gap-3"
                    style={{ fontSize: 14, color: '#0f1129', lineHeight: 1.6 }}
                  >
                    <span
                      className="flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'rgba(19,109,74,0.1)',
                        color: '#136d4a',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {project.files && project.files.length > 0 && (
            <Section title="الملفات المرفقة" icon={FileText}>
              <ul className="m-0 p-0 space-y-2">
                {project.files.map((f) => (
                  <FileRow key={f.id} file={f} />
                ))}
              </ul>
            </Section>
          )}

          {/* Owner-only: applications received */}
          {isOwner && (
            <Section title="الطلبات المستلمة" icon={Users}>
              <div
                className="p-6 rounded-[12px] text-center"
                style={{
                  background: '#fafaf6',
                  border: '1px dashed #e5e3dc',
                  color: '#7a7a8c',
                  fontSize: 13.5,
                }}
              >
                ستظهر هنا الطلبات المقدّمة على مشروعك. (صفحة كاملة قيد التطوير.)
              </div>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <FactsCard project={project} />
          <OwnerCard owner={project.owner} />
          {project.is_accepted === true && project.partner_id && (
            <PartnerCard partnerId={project.partner_id} />
          )}
        </aside>
      </div>
      </div>
    </Shell>
  );
}

/* ============================================================
 *  Shell — topbar wrapper for the standalone details page
 * ============================================================ */
function Shell({ children }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fafaf6' }}>
      <header
        className="sticky top-0 z-30 bg-white"
        style={{ borderBottom: '1px solid #e5e3dc' }}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-[96px] flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="bg-transparent border-0 p-0 cursor-pointer"
            aria-label="الرئيسية"
          >
            <Logo height={68} />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] font-semibold transition-all"
            style={{
              fontSize: 13,
              background: 'white',
              border: '1px solid #e5e3dc',
              color: '#3a3a52',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#cfcdc4';
              e.currentTarget.style.background = '#fafaf6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e3dc';
              e.currentTarget.style.background = 'white';
            }}
          >
            <LayoutDashboard size={15} strokeWidth={1.8} />
            لوحة التحكّم
          </button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

/* ============================================================
 *  Header — title, status, primary actions
 * ============================================================ */
function Header({ project, isOwner, canApply, onEdit, onApply }) {
  return (
    <div className="mb-6 animate-fade-up">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <StatusBadge status={project.status} />
            {project.arena && (
              <ArenaPill arena={project.arena} />
            )}
            {project.is_accepted === true && (
              <span
                className="inline-flex items-center gap-1 rounded-full font-semibold"
                style={{
                  fontSize: 11.5,
                  padding: '4px 10px',
                  background: 'rgba(19,109,74,0.08)',
                  color: '#0d5538',
                  border: '1px solid rgba(19,109,74,0.18)',
                }}
              >
                <CheckCircle2 size={12} />
                مقبول
              </span>
            )}
          </div>

          <h1
            className="font-display text-ink m-0 mb-2"
            style={{
              fontSize: 'clamp(24px, 3vw, 32px)',
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
            }}
          >
            {project.name}
          </h1>

          {/* Quick meta strip */}
          <div
            className="flex items-center gap-3 flex-wrap"
            style={{ fontSize: 13, color: '#7a7a8c' }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Tag size={13} strokeWidth={1.7} />
              {project.type}
            </span>
            <Dot />
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} strokeWidth={1.7} />
              {project.city}
            </span>
            {project.created_at && (
              <>
                <Dot />
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={13} strokeWidth={1.7} />
                  نُشر {formatRelativeDate(project.created_at)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          {isOwner && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold transition-all"
              style={{
                fontSize: 13.5,
                background: 'white',
                border: '1px solid #e5e3dc',
                color: '#3a3a52',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#cfcdc4';
                e.currentTarget.style.background = '#fafaf6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e3dc';
                e.currentTarget.style.background = 'white';
              }}
            >
              <Pencil size={14} strokeWidth={1.8} />
              تعديل
            </button>
          )}

          {canApply && (
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold transition-all"
              style={{
                fontSize: 13.5,
                background: '#136d4a',
                border: '1px solid #136d4a',
                cursor: 'pointer',
                boxShadow: '0 6px 14px rgba(19,109,74,0.22)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0d5538';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#136d4a';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Send size={14} strokeWidth={1.8} />
              تقديم طلب
            </button>
          )}

          {project.has_applied && (
            <span
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] font-semibold"
              style={{
                fontSize: 13.5,
                background: 'rgba(19,109,74,0.08)',
                color: '#0d5538',
                border: '1px solid rgba(19,109,74,0.22)',
              }}
            >
              <CheckCircle2 size={14} />
              قدّمت طلباً
            </span>
          )}
        </div>
      </div>

      {/* Progress bar (active/completed projects) */}
      {(project.status === 'in_progress' || project.status === 'completed') && (
        <div
          className="mt-6 p-5 rounded-[14px]"
          style={{ background: 'white', border: '1px solid #e5e3dc' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="font-semibold uppercase"
              style={{
                fontSize: 11,
                letterSpacing: '0.1em',
                color: '#7a7a8c',
              }}
            >
              تقدّم المشروع
            </span>
            <span
              className="font-bold"
              style={{ fontSize: 14, color: '#136d4a' }}
            >
              {Math.round(project.progress)}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 8,
              borderRadius: 4,
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
    </div>
  );
}

/* ============================================================
 *  Section wrapper
 * ============================================================ */
function Section({ title, icon: Icon, children }) {
  return (
    <section
      className="rounded-[14px] animate-fade-up"
      style={{ background: 'white', border: '1px solid #e5e3dc' }}
    >
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{ borderBottom: '1px solid #efece4' }}
      >
        {Icon && (
          <Icon size={16} strokeWidth={1.7} className="text-muted" />
        )}
        <h2
          className="font-display text-ink m-0"
          style={{ fontSize: 15, fontWeight: 700 }}
        >
          {title}
        </h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

/* ============================================================
 *  Sidebar cards
 * ============================================================ */

function FactsCard({ project }) {
  const facts = [
    { icon: Tag, label: 'النوع', value: project.type },
    { icon: MapPin, label: 'المدينة', value: project.city },
    project.budget != null && {
      icon: Wallet,
      label: 'الميزانية',
      value: `${formatNumber(project.budget)} ر.س`,
    },
    project.expected_duration && {
      icon: Clock,
      label: 'المدة المتوقعة',
      value: project.expected_duration,
    },
    project.start_date && {
      icon: Calendar,
      label: 'تاريخ البداية',
      value: formatDate(project.start_date),
    },
    project.end_date && {
      icon: Calendar,
      label: 'تاريخ الانتهاء',
      value: formatDate(project.end_date),
    },
    project.experience && {
      icon: Award,
      label: 'الخبرة المطلوبة',
      value: project.experience,
    },
  ].filter(Boolean);

  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{ background: 'white', border: '1px solid #e5e3dc' }}
    >
      <div
        className="px-5 py-4"
        style={{ borderBottom: '1px solid #efece4' }}
      >
        <h3
          className="font-display text-ink m-0"
          style={{ fontSize: 14, fontWeight: 700 }}
        >
          تفاصيل المشروع
        </h3>
      </div>
      <ul className="m-0 p-0 px-5 py-4 space-y-4">
        {facts.map((f) => (
          <li key={f.label} className="list-none flex items-start gap-3">
            <f.icon
              size={15}
              strokeWidth={1.7}
              className="flex-shrink-0 mt-0.5 text-muted"
            />
            <div className="min-w-0">
              <div
                className="font-medium uppercase mb-0.5"
                style={{
                  fontSize: 10.5,
                  letterSpacing: '0.08em',
                  color: '#7a7a8c',
                }}
              >
                {f.label}
              </div>
              <div
                className="font-semibold"
                style={{ fontSize: 13.5, color: '#0f1129' }}
              >
                {f.value}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OwnerCard({ owner }) {
  if (!owner) return null;
  return (
    <div
      className="rounded-[14px] p-5"
      style={{ background: 'white', border: '1px solid #e5e3dc' }}
    >
      <div
        className="font-semibold uppercase mb-3"
        style={{
          fontSize: 10.5,
          letterSpacing: '0.1em',
          color: '#7a7a8c',
        }}
      >
        صاحب المشروع
      </div>
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center font-display font-bold flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(44,47,124,0.08)',
            color: '#2c2f7c',
            fontSize: 18,
          }}
        >
          {owner.name?.[0] || '؟'}
        </div>
        <div className="min-w-0">
          <div
            className="font-bold truncate"
            style={{ fontSize: 14, color: '#0f1129' }}
          >
            {owner.name}
          </div>
          <div
            className="flex items-center gap-1 truncate"
            style={{ fontSize: 12, color: '#7a7a8c' }}
          >
            <User size={11} strokeWidth={1.8} />
            {ownerTypeLabel(owner.account_type)}
            {owner.city && (
              <>
                <span>·</span>
                <span>{owner.city}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerCard({ partnerId }) {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{
        background: 'rgba(19,109,74,0.04)',
        border: '1px solid rgba(19,109,74,0.18)',
      }}
    >
      <div
        className="font-semibold uppercase mb-2 inline-flex items-center gap-1.5"
        style={{
          fontSize: 10.5,
          letterSpacing: '0.1em',
          color: '#0d5538',
        }}
      >
        <CheckCircle2 size={12} />
        شريك المشروع
      </div>
      <p
        className="m-0"
        style={{ fontSize: 13, color: '#3a3a52', lineHeight: 1.6 }}
      >
        تم اختيار شريك للمشروع (#{partnerId}). تفاصيل الشريك ستظهر هنا قريباً.
      </p>
    </div>
  );
}

function FileRow({ file }) {
  // BE returns `original_name` and `size_bytes`. Fall back to parsing
  // file_path / url only if those are missing (older mock data).
  const name =
    file.original_name ||
    file.file_path?.split('/').pop() ||
    file.url?.split('/').pop() ||
    `ملف #${file.id}`;
  const ext = name.split('.').pop()?.toLowerCase();
  const href = file.url || file.file_path;

  let Icon = FileText;
  let color = '#7a7a8c';
  let bg = '#f4f1e9';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    Icon = ImageIcon;
    color = '#2c2f7c';
    bg = 'rgba(44,47,124,0.08)';
  } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
    Icon = FileSpreadsheet;
    color = '#136d4a';
    bg = 'rgba(19,109,74,0.08)';
  } else if (ext === 'zip' || ext === 'rar') {
    Icon = FileArchive;
    color = '#3a3d99';
    bg = 'rgba(58,61,153,0.08)';
  } else if (ext === 'pdf') {
    color = '#b91c1c';
    bg = 'rgba(185,28,28,0.06)';
  }

  return (
    <li
      className="list-none flex items-center gap-3 px-4 py-3 rounded-[11px]"
      style={{ background: '#fafaf6', border: '1px solid #efece4' }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: bg,
          color,
        }}
      >
        <Icon size={16} strokeWidth={1.7} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="font-semibold truncate"
          style={{ fontSize: 13, color: '#0f1129' }}
        >
          {name}
        </div>
        {file.size_bytes != null && (
          <div style={{ fontSize: 11.5, color: '#7a7a8c', marginTop: 1 }}>
            {formatSize(file.size_bytes)}
          </div>
        )}
      </div>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center transition-colors"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'white',
            border: '1px solid #e5e3dc',
            color: '#3a3a52',
            flexShrink: 0,
          }}
          aria-label={`تنزيل ${name}`}
        >
          <Download size={14} strokeWidth={1.8} />
        </a>
      )}
    </li>
  );
}

function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/* ============================================================
 *  Breadcrumb
 * ============================================================ */
function Breadcrumb({ items }) {
  return (
    <nav
      className="flex items-center gap-2 mb-6 flex-wrap"
      style={{ fontSize: 13 }}
    >
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {it.to && !isLast ? (
              <Link
                to={it.to}
                className="link"
                style={{ fontWeight: 500, color: '#7a7a8c' }}
              >
                {it.label}
              </Link>
            ) : (
              <span
                className="font-medium truncate"
                style={{
                  color: isLast ? '#0f1129' : '#7a7a8c',
                  maxWidth: 280,
                }}
              >
                {it.label}
              </span>
            )}
            {!isLast && (
              <ArrowRight
                size={12}
                strokeWidth={1.7}
                className="text-muted flex-shrink-0"
                style={{ transform: 'rotate(180deg)' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

/* ============================================================
 *  Loading + error states
 * ============================================================ */

function LoadingState() {
  return (
    <div className="px-5 lg:px-8 py-8 lg:py-10 animate-pulse">
      <div
        style={{ height: 14, width: 240, background: '#efece4', borderRadius: 6, marginBottom: 24 }}
      />
      <div
        style={{ height: 28, width: '70%', maxWidth: 600, background: '#efece4', borderRadius: 8, marginBottom: 12 }}
      />
      <div
        style={{ height: 14, width: 320, background: '#efece4', borderRadius: 6, marginBottom: 36 }}
      />
      <div className="grid lg:grid-cols-[1.5fr,1fr] gap-6">
        <div
          style={{ height: 380, background: 'white', border: '1px solid #e5e3dc', borderRadius: 14 }}
        />
        <div
          style={{ height: 380, background: 'white', border: '1px solid #e5e3dc', borderRadius: 14 }}
        />
      </div>
    </div>
  );
}

function ErrorView({ message, onBack }) {
  return (
    <div className="max-w-md mx-auto py-20 px-6 text-center">
      <div
        className="mx-auto mb-5 flex items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'rgba(185,28,28,0.08)',
          color: '#b91c1c',
        }}
      >
        <AlertCircle size={28} strokeWidth={1.7} />
      </div>
      <h2
        className="font-display text-ink m-0 mb-2"
        style={{ fontSize: 22, fontWeight: 700 }}
      >
        تعذّر تحميل المشروع
      </h2>
      <p className="text-muted m-0 mb-7" style={{ fontSize: 14, lineHeight: 1.7 }}>
        {message || 'المشروع غير موجود أو ليس لديك صلاحية الوصول إليه.'}
      </p>
      <button
        onClick={onBack}
        className="btn-primary"
        style={{ width: 'auto' }}
      >
        رجوع
      </button>
    </div>
  );
}

/* ============================================================
 *  Helpers
 * ============================================================ */

function Dot() {
  return (
    <span
      style={{
        width: 3,
        height: 3,
        borderRadius: '50%',
        background: '#cbcec9',
      }}
    />
  );
}

/* Small pill showing which arena the project belongs to.
   Color comes from the arena's config so it matches the browse
   page tabs and the dashboard recent-list pill. */
function ArenaPill({ arena }) {
  const cfg = arenaConfig(arena);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-semibold"
      style={{
        fontSize: 11.5,
        padding: '4px 10px',
        background: cfg.accentSoft,
        color: cfg.color,
        border: `1px solid ${cfg.color}33`,
      }}
    >
      <span
        className="rounded-full"
        style={{
          width: 6,
          height: 6,
          background: cfg.color,
        }}
      />
      {cfg.label}
    </span>
  );
}

function ownerTypeLabel(t) {
  if (t === 'developer') return 'مطوّر عقاري';
  if (t === 'individual') return 'عميل';
  return 'صاحب المشروع';
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
