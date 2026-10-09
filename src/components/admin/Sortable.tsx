"use client";

import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVertical } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";

/** Vertical drag-and-drop list with a big grab handle (works with touch). */
export function SortableList<T>({ items, getId, onReorder, render }: { items: T[]; getId: (t: T) => string; onReorder: (ids: string[]) => void; render: (item: T, handle: ReactNode) => ReactNode }) {
  const [order, setOrder] = useState(items.map(getId));
  useEffect(() => setOrder(items.map(getId)), [items, getId]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(items.map((i) => [getId(i), i]));
  const end = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(order, order.indexOf(String(e.active.id)), order.indexOf(String(e.over.id)));
    setOrder(next);
    onReorder(next);
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {order.map((id) => byId.get(id) && <Row key={id} id={id} render={(h) => render(byId.get(id)!, h)} />)}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function Row({ id, render }: { id: string; render: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button type="button" {...attributes} {...listeners} className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-xl text-chocolate/40 active:cursor-grabbing" aria-label="Trascina per riordinare">
      <DotsSixVertical weight="bold" className="size-6" />
    </button>
  );
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }} className={isDragging ? "relative scale-[1.02] opacity-90 shadow-float" : ""}>
      {render(handle)}
    </li>
  );
}
