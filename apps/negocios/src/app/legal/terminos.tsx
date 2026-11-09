import { LegalDocumentView, TERMINOS_NEGOCIOS } from '@zipa/shared';
import { router } from 'expo-router';

export default function Terminos() {
  return <LegalDocumentView doc={TERMINOS_NEGOCIOS} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
