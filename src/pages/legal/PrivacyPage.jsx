import React from 'react';
import LegalLayout from '../../components/legal/LegalLayout';
import { useTranslation } from '../../i18n/LanguageContext';
import { getLegalContent } from '../../legal/content';

export default function PrivacyPage() {
  const { lang } = useTranslation();
  const content = getLegalContent(lang).privacy;
  return <LegalLayout content={content} pageKey="privacy" />;
}
