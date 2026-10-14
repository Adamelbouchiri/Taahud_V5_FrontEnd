import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle } from 'lucide-react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { useTranslation } from '../i18n/LanguageContext';
import arDict from '../i18n/dictionaries/ar';
import enDict from '../i18n/dictionaries/en';
import zhDict from '../i18n/dictionaries/zh';
import urDict from '../i18n/dictionaries/ur';

/* ============================================================
 *  FaqPage — /faq «الأسئلة الشائعة»
 *  ----------------------------------------------------------------
 *  Category tabs over an accordion of questions. Content is the
 *  `faq.categories` array — read straight from the dictionary since
 *  t() only resolves strings. A language without its own FAQ (ur,
 *  zh) shows the English one. Reached from the footer's platform
 *  column.
 * ============================================================ */

const DICTS = { ar: arDict, en: enDict, zh: zhDict, ur: urDict };

function categoriesFor(lang) {
  return (DICTS[lang] || arDict).faq?.categories || enDict.faq.categories;
}

export default function FaqPage() {
  const { t, lang } = useTranslation();
  const categories = categoriesFor(lang);
  const [active, setActive] = useState(categories[0].key);
  const current = categories.find((c) => c.key === active) || categories[0];

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 116, background: 'var(--bg-surface)' }}>
        <section className="relative py-20 lg:py-24">
          <div className="max-w-[920px] mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <span
                aria-hidden
                className="inline-block mb-4"
                style={{ width: 44, height: 3, borderRadius: 3, background: '#c9a35a' }}
              />
              <h1
                className="font-display m-0"
                style={{
                  fontSize: 'clamp(30px, 4vw, 46px)',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  color: 'var(--text-brand-deep)',
                }}
              >
                {t('faq.title')}
              </h1>
              <p
                className="m-0 mt-4 mx-auto"
                style={{ maxWidth: '62ch', fontSize: 16, lineHeight: 1.9, color: 'var(--text-muted)' }}
              >
                {t('faq.intro')}
              </p>
            </div>

            <div
              role="tablist"
              aria-label={t('faq.tabsLabel')}
              className="flex flex-wrap justify-center gap-2 mb-8"
            >
              {categories.map((c) => {
                const selected = c.key === current.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActive(c.key)}
                    className="font-semibold transition-colors"
                    style={{
                      padding: '8px 16px',
                      borderRadius: 999,
                      fontSize: 13.5,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      border: `1px solid ${selected ? 'var(--bg-ink-deep)' : 'var(--border-default)'}`,
                      background: selected ? 'var(--bg-ink-deep)' : 'var(--bg-canvas)',
                      color: selected ? '#fff' : 'var(--text-ink-soft)',
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            <div role="tabpanel" key={current.key} className="flex flex-col gap-3">
              {current.items.map((item) => (
                <details key={item.q} className="faq-item">
                  <summary>
                    <span className="flex-1">{item.q}</span>
                    <ChevronDown size={18} className="faq-caret" aria-hidden />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>

            <NotFoundNote t={t} />
          </div>
        </section>
      </main>
      <Footer />

      <style>{FAQ_CSS}</style>
    </>
  );
}

/* «لم تجد إجابة سؤالك؟» — closes the list with a route to the
   contact page: the support button and the plain link both go there. */
function NotFoundNote({ t }) {
  return (
    <div className="faq-note">
      <span className="faq-note-ic" aria-hidden>
        <HelpCircle size={18} strokeWidth={1.8} />
      </span>
      <div className="faq-note-text">
        <b>{t('faq.notFound.title')}</b>
        <p>{t('faq.notFound.body')}</p>
      </div>
      <div className="faq-note-actions">
        <Link to="/contact" className="faq-note-btn">
          {t('faq.notFound.support')}
        </Link>
        <Link to="/contact" className="faq-note-link">
          {t('faq.notFound.contact')}
        </Link>
      </div>
    </div>
  );
}

const FAQ_CSS = `
        .faq-item {
          background: var(--bg-canvas);
          border: 1px solid var(--border-default);
          border-radius: 14px;
          overflow: hidden;
        }
        .faq-item summary {
          list-style: none;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-ink);
        }
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-item .faq-caret {
          flex: none;
          color: var(--text-muted);
          transition: transform 0.18s;
        }
        .faq-item[open] .faq-caret { transform: rotate(180deg); }
        .faq-item p {
          margin: 0;
          padding: 0 20px 18px;
          font-size: 14px;
          line-height: 1.9;
          color: var(--text-ink-soft);
        }
        .faq-note {
          margin-top: 28px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 22px;
          background: var(--bg-canvas);
          border: 1px solid var(--border-default);
          border-radius: 14px;
        }
        .faq-note-ic {
          flex: none;
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          color: var(--text-ink);
        }
        .faq-note-text { flex: 1; min-width: 0; }
        .faq-note-text b { display: block; font-size: 15px; font-weight: 700; color: var(--text-ink); }
        .faq-note-text p { margin: 2px 0 0; font-size: 13.5px; line-height: 1.8; color: var(--text-muted); }
        .faq-note-actions { flex: none; display: flex; align-items: center; gap: 18px; }
        .faq-note-btn {
          display: inline-flex;
          align-items: center;
          height: 40px;
          padding: 0 20px;
          border-radius: 10px;
          background: var(--bg-ink-deep);
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          transition: background .15s;
        }
        .faq-note-btn:hover { background: var(--bg-ink-deep-hover); }
        .faq-note-link { font-size: 14px; font-weight: 700; color: var(--text-ink); text-decoration: none; }
        .faq-note-link:hover { color: var(--text-brand); text-decoration: underline; }
        @media (max-width: 640px) {
          .faq-note { flex-wrap: wrap; }
          .faq-note-text { flex-basis: calc(100% - 50px); }
          .faq-note-actions { width: 100%; padding-inline-start: 50px; }
        }
`;
