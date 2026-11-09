import { ReportView, type ReportTargetType } from '@zipa/shared';
import { router, useLocalSearchParams } from 'expo-router';

const TYPES: ReportTargetType[] = ['review', 'business', 'user'];

// Reportar una reseña, un negocio o un usuario: /reportar?tipo=review&id=...&nombre=...
export default function Reportar() {
  const { tipo, id, nombre } = useLocalSearchParams<{ tipo: string; id: string; nombre?: string }>();
  const targetType = TYPES.includes(tipo as ReportTargetType) ? (tipo as ReportTargetType) : 'review';
  return (
    <ReportView
      targetType={targetType}
      targetId={id}
      targetName={nombre}
      onDone={() => (router.canGoBack() ? router.back() : router.replace('/explorar'))}
    />
  );
}
