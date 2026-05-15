import React from 'react';
import LegalLayout from '../../components/legal/LegalLayout';
import { useTranslation } from '../../i18n/LanguageContext';
import { getLegalContent } from '../../legal/content';

export default function TermsPage() {
  const { lang } = useTranslation();
  const content = getLegalContent(lang).terms;
  return <LegalLayout content={content} pageKey="terms" />;
}
