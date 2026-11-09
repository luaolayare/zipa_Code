import { LegalDocumentView, POLITICA_PRIVACIDAD } from '@zipa/shared';
import { router } from 'expo-router';

export default function Privacidad() {
  return <LegalDocumentView doc={POLITICA_PRIVACIDAD} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
