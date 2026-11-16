-- Zipa lo tiene: el filtro de palabras ofensivas también reconoce plurales ("malparidos", "maricones").
-- En las pruebas, "malparidos" pasaba porque la lista solo tenía "malparido".
-- MISMA regla que findOffensiveWords en packages/shared/src/moderation.ts.

create or replace function public.texto_ofensivo(t text) returns boolean
language sql immutable as $$
  with limpio as (
    select ' ' || regexp_replace(translate(lower(coalesce(t, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', ' ', 'g') || ' ' as s
  )
  select exists (
    select 1 from limpio, unnest(array[
      'hijueputa', 'hijuepucha', 'hpta', 'hp', 'gonorrea', 'malparido', 'malparida', 'malnacido', 'malnacida',
      'puta', 'puto', 'putas', 'putos', 'mierda', 'mierdero', 'pendejo', 'pendeja', 'imbecil', 'idiota',
      'estupido', 'estupida', 'perra', 'zorra', 'marica', 'maricon', 'careverga', 'verga', 'cabron', 'cabrona',
      'culo', 'culicagado', 'huevon', 'guevon', 'webon', 'gueva', 'carechimba', 'lameculos',
      'retrasado', 'mongolico', 'subnormal'
    ]) as palabra
    where position(' ' || palabra || ' ' in limpio.s) > 0
       or position(' ' || palabra || 's ' in limpio.s) > 0
       or position(' ' || palabra || 'es ' in limpio.s) > 0
  );
$$;
