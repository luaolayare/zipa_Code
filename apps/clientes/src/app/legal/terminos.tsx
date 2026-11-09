import { LegalDocumentView, TERMINOS_CLIENTES } from '@zipa/shared';
import { router } from 'expo-router';

export default function Terminos() {
  return <LegalDocumentView doc={TERMINOS_CLIENTES} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
