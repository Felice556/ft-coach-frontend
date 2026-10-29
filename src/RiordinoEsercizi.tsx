import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { tr } from './lingua';

// Elenco compatto degli esercizi da riordinare: si trascinano dalla maniglia ⠿ (dito o mouse)
// oppure si spostano con le frecce. Le schede vere sono alte (tanti campi): trascinarle intere
// sul telefono sarebbe scomodo, quindi qui si vede solo il nome.
export interface VoceRiordino {
  chiave: number;
  nome: string;
  dettaglio?: string;
}

export default function RiordinoEsercizi({
  voci,
  onCambia,
  onFatto,
  avvisoCollegamenti = false,
}: {
  voci: VoceRiordino[];
  onCambia: (chiavi: number[]) => void;
  onFatto: () => void;
  avvisoCollegamenti?: boolean;
}) {
  const sensori = useSensors(
    // Parte solo dopo qualche pixel: un tocco sulle frecce resta un tocco.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const chiavi = voci.map((v) => v.chiave);

  function finito(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    onCambia(arrayMove(chiavi, chiavi.indexOf(Number(active.id)), chiavi.indexOf(Number(over.id))));
  }
  const sposta = (da: number, a: number) => {
    if (a < 0 || a >= chiavi.length) return;
    onCambia(arrayMove(chiavi, da, a));
  };

  return (
    <div className="rounded-2xl border border-accent-strong/50 bg-field p-3 sm:p-4">
      <p className="mb-3 text-sm text-soft">
        {tr('Trascina gli esercizi dalla maniglia ⠿ oppure usa le frecce. Poi premi “Fatto”.', 'Drag the exercises by the ⠿ handle or use the arrows. Then press “Done”.')}
      </p>
      <DndContext sensors={sensori} collisionDetection={closestCenter} onDragEnd={finito}>
        <SortableContext items={chiavi} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {voci.map((v, i) => (
              <Voce key={v.chiave} voce={v} numero={i + 1} primo={i === 0} ultimo={i === voci.length - 1} onSu={() => sposta(i, i - 1)} onGiu={() => sposta(i, i + 1)} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {avvisoCollegamenti && (
        <p className="mt-3 text-xs text-muted">
          {tr('Superset e jumpset restano “con il successivo”: dopo aver spostato, controlla che colleghino gli esercizi giusti.', 'Supersets and jumpsets stay “with the next one”: after moving, check they link the right exercises.')}
        </p>
      )}
      <button type="button" className="btn-primary mt-3 w-full sm:w-auto" onClick={onFatto}>
        {tr('Fatto', 'Done')}
      </button>
    </div>
  );
}

function Voce({ voce, numero, primo, ultimo, onSu, onGiu }: { voce: VoceRiordino; numero: number; primo: boolean; ultimo: boolean; onSu: () => void; onGiu: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: voce.chiave });
  const nome = voce.nome.trim() || tr(`Esercizio ${numero}`, `Exercise ${numero}`);
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl border bg-surface p-2 ${isDragging ? 'relative z-10 border-accent-strong shadow-lg' : 'border-line'}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={tr(`Trascina ${nome}`, `Drag ${nome}`)}
        className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-xl text-muted hover:bg-surface-2 active:cursor-grabbing"
      >
        ⠿
      </button>
      <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-ink">{numero}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-semibold break-words text-ink">{nome}</p>
        {voce.dettaglio && <p className="truncate text-xs text-muted">{voce.dettaglio}</p>}
      </div>
      <button type="button" className="btn-ghost min-h-10 w-10 shrink-0 px-0" disabled={primo} onClick={onSu} aria-label={tr(`Sposta su ${nome}`, `Move ${nome} up`)}>
        ↑
      </button>
      <button type="button" className="btn-ghost min-h-10 w-10 shrink-0 px-0" disabled={ultimo} onClick={onGiu} aria-label={tr(`Sposta giù ${nome}`, `Move ${nome} down`)}>
        ↓
      </button>
    </li>
  );
}
