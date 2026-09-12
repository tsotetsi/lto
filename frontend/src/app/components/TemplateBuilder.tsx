'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SectionDefinition, SectionInstance } from '../types/builder';
import { SECTION_LIBRARY, BUILDER_PREAMBLE, BUILDER_POSTAMBLE, generateInstanceId } from '../data/builder-sections';
import { AVAILABLE_FONTS } from '../data/fonts';

/* ─── Types ─── */
interface TemplateBuilderProps {
  onCompile: (texContent: string, font: string) => void;
  isCompiling: boolean;
}

type DragType = 'library' | 'sortable' | null;

/* ─── Draggable Library Item ─── */
function LibraryCard({ section }: { section: SectionDefinition }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${section.id}`,
    data: { type: 'library', sectionDef: section },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all select-none ${
        isDragging
          ? 'opacity-50 border-[var(--accent-blue)]'
          : 'border-theme-primary hover:border-[var(--accent-blue)] hover:bg-[var(--hover-bg)]'
      }`}
    >
      <span className="text-lg shrink-0">{section.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{section.name}</p>
        <p className="text-[10px] text-theme-muted truncate">{section.description}</p>
      </div>
      <span className="text-[9px] text-theme-muted uppercase font-bold shrink-0">Drag +</span>
    </div>
  );
}

/* ─── Sortable Section Instance ─── */
function SortableSectionCard({
  instance,
  isExpanded,
  isOverlay,
  onToggleExpand,
  onVariableChange,
  onRemove,
}: {
  instance: SectionInstance;
  isExpanded: boolean;
  isOverlay?: boolean;
  onToggleExpand: () => void;
  onVariableChange: (key: string, value: string) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instance.instanceId, data: { type: 'sortable' } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.4 : 1,
    zIndex: isOverlay ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border transition-all ${
        isDragging && !isOverlay
          ? 'border-[var(--accent-blue)] shadow-lg shadow-[var(--accent-blue)]/10'
          : 'border-theme-primary bg-theme-secondary'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-theme-muted hover:text-theme-primary transition-colors shrink-0 touch-none"
          aria-label="Drag to reorder"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM8 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM8 22a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
          </svg>
        </button>

        {/* Icon + Name */}
        <span className="text-base shrink-0">{instance.icon}</span>
        <span className="text-xs font-semibold flex-1 truncate">{instance.name}</span>

        {/* Expand toggle */}
        <button
          onClick={onToggleExpand}
          className="p-1 text-theme-muted hover:text-theme-primary transition-colors"
          aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Badge */}
        <span className="text-[9px] uppercase font-bold text-theme-muted bg-theme-primary px-1.5 py-0.5 rounded shrink-0">
          {instance.hasContent ? 'Filled' : 'Empty'}
        </span>

        {/* Remove */}
        <button
          onClick={onRemove}
          className="p-1 text-theme-muted hover:text-[var(--accent-red)] transition-colors"
          aria-label={`Remove ${instance.name}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Expanded variable editor */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-theme-primary space-y-3">
          {Object.entries(getSectionDef(instance.sectionDefId)?.variables ?? {}).map(
            ([key, variable]) => (
              <div key={key}>
                <label
                  htmlFor={`${instance.instanceId}-${key}`}
                  className="block text-[10px] font-medium text-theme-secondary mb-1"
                >
                  {variable.label}
                  {variable.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {variable.type === 'multiline' ? (
                  <textarea
                    id={`${instance.instanceId}-${key}`}
                    name={key}
                    value={instance.variables[key] ?? ''}
                    onChange={(e) => onVariableChange(key, e.target.value)}
                    rows={3}
                    className="w-full px-2 py-1.5 text-[11px] bg-theme-primary border border-theme-primary rounded focus:outline-none focus:border-[var(--accent-blue)] transition-colors resize-y"
                    placeholder={`Enter ${variable.label.toLowerCase()}...`}
                  />
                ) : (
                  <input
                    id={`${instance.instanceId}-${key}`}
                    name={key}
                    type={variable.type === 'email' ? 'email' : 'text'}
                    value={instance.variables[key] ?? ''}
                    onChange={(e) => onVariableChange(key, e.target.value)}
                    className="w-full px-2 py-1.5 text-[11px] bg-theme-primary border border-theme-primary rounded focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
                    placeholder={`Enter ${variable.label.toLowerCase()}...`}
                  />
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Drag Overlay Preview ─── */
function DragOverlayContent({
  type,
  sectionDef,
  instance,
}: {
  type: DragType;
  sectionDef?: SectionDefinition | null;
  instance?: SectionInstance | null;
}) {
  if (type === 'library' && sectionDef) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-[var(--accent-blue)] bg-theme-secondary shadow-xl shadow-[var(--accent-blue)]/10 max-w-xs">
        <span className="text-lg shrink-0">{sectionDef.icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold">{sectionDef.name}</p>
          <p className="text-[10px] text-theme-muted">{sectionDef.description}</p>
        </div>
        <span className="text-[9px] text-[var(--accent-blue)] uppercase font-bold shrink-0">Adding...</span>
      </div>
    );
  }

  if (type === 'sortable' && instance) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-[var(--accent-blue)] bg-theme-secondary shadow-xl max-w-sm">
        <svg className="w-4 h-4 text-[var(--accent-blue)] shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM8 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM8 22a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
        </svg>
        <span className="text-base shrink-0">{instance.icon}</span>
        <span className="text-xs font-semibold">{instance.name}</span>
        <span className="text-[9px] text-theme-muted uppercase font-bold ml-auto">Reordering...</span>
      </div>
    );
  }

  return null;
}

/* ─── Helper ─── */
function getSectionDef(sectionDefId: string): SectionDefinition | undefined {
  return SECTION_LIBRARY.find((s) => s.id === sectionDefId);
}

/* ─── Main Component ─── */
export default function TemplateBuilder({
  onCompile,
  isCompiling,
}: TemplateBuilderProps) {
  const [sections, setSections] = useState<SectionInstance[]>([]);
  const [selectedFont, setSelectedFont] = useState(AVAILABLE_FONTS[0]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeDrag, setActiveDrag] = useState<{
    type: DragType;
    sectionDef?: SectionDefinition | null;
    instance?: SectionInstance | null;
  }>({ type: null });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  /* ─── Drag Handlers ─── */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === 'library') {
      const sectionDef = data.sectionDef as SectionDefinition;
      setActiveDrag({ type: 'library', sectionDef });
    } else {
      const instance = sections.find((s) => s.instanceId === active.id);
      setActiveDrag({ type: 'sortable', instance });
    }
  }, [sections]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Only reorder existing sortable items during drag-over.
    // Library items are added exclusively in handleDragEnd to avoid duplicates.
    if (activeData?.type === 'sortable' && overData?.type === 'sortable') {
      setSections((prev) => {
        const oldIndex = prev.findIndex((s) => s.instanceId === active.id);
        const newIndex = prev.findIndex((s) => s.instanceId === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    const activeData = active.data.current;

    // Library item dropped over droppable (not over another sortable)
    if (activeData?.type === 'library' && over) {
      const sectionDef = activeData.sectionDef as SectionDefinition;
      const overId = over.id;

      // Check if dropped on the droppable container
      if (overId === 'sections-droppable') {
        const newInstance: SectionInstance = {
          instanceId: generateInstanceId(),
          sectionDefId: sectionDef.id,
          name: sectionDef.name,
          icon: sectionDef.icon,
          variables: Object.fromEntries(
            Object.entries(sectionDef.variables).map(([key, v]) => [key, v.default])
          ),
          hasContent: false,
        };
        setSections((prev) => [...prev, newInstance]);
      }
    }

    // Sortable item reorder (handled in dragOver, but need to handle drop on droppable)
    if (activeData?.type === 'sortable' && over) {
      const overData = over.data.current;
      if (overData?.type !== 'sortable' && over.id === 'sections-droppable') {
        // Dropped back on empty area — no change needed (already in list)
        return;
      }
    }

    setActiveDrag({ type: null });
  }, []);

  /* ─── Instance Mutations ─── */
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleVariableChange = useCallback(
    (instanceId: string, key: string, value: string) => {
      setSections((prev) =>
        prev.map((s) =>
          s.instanceId === instanceId
            ? { ...s, variables: { ...s.variables, [key]: value }, hasContent: true }
            : s
        )
      );
    },
    []
  );

  const handleRemove = useCallback((id: string) => {
    setSections((prev) => prev.filter((s) => s.instanceId !== id));
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setSections([]);
    setExpandedIds(new Set());
  }, []);

  /* ─── Generate Template ─── */
  const handleGenerate = useCallback(() => {
    let texContent = BUILDER_PREAMBLE(selectedFont);

    sections.forEach((instance, index) => {
      const sectionDef = getSectionDef(instance.sectionDefId);
      if (!sectionDef) return;

      let sectionLatex = sectionDef.latexTemplate;

      // Fill variables
      Object.entries(instance.variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        sectionLatex = sectionLatex.replaceAll(placeholder, value || '');
      });

      texContent += sectionLatex;

      // Add spacing between sections
      if (index < sections.length - 1) {
        texContent += '\n\n\\vspace{8pt}\n\n';
      }
    });

    texContent += BUILDER_POSTAMBLE;
    onCompile(texContent, selectedFont);
  }, [sections, onCompile, selectedFont]);

  const sectionIds = sections.map((s) => s.instanceId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full">
        {/* ─── Left: Section Library ─── */}
        <div className="w-64 bg-theme-sidebar border-r border-theme-primary flex flex-col shrink-0">
          <div className="px-3 py-2.5 border-b border-theme-primary">
            <h3 className="text-[10px] uppercase font-bold tracking-widest text-theme-muted">
              Section Library
            </h3>
            <p className="text-[10px] text-theme-secondary mt-0.5">
              Drag sections into your template
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {SECTION_LIBRARY.map((section) => (
              <LibraryCard key={section.id} section={section} />
            ))}
          </div>
        </div>

        {/* ─── Center: Sortable Section List ─── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-3 py-2 bg-theme-header border-b border-theme-primary flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-theme-muted">
                Your Template
              </h3>
              <span className="text-[10px] bg-theme-primary text-theme-secondary px-2 py-0.5 rounded-full font-medium">
                {sections.length} {sections.length === 1 ? 'section' : 'sections'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Font selector */}
              <select
                id="builder-font-select"
                name="font"
                aria-label="Document font"
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                className="bg-theme-secondary text-theme-primary text-[10px] border border-theme-primary rounded px-2 py-1 outline-none focus:border-[var(--accent-blue)] transition-colors max-w-[120px]"
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <button
                onClick={handleGenerate}
                disabled={sections.length === 0 || isCompiling}
                className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded transition-all ${
                  sections.length === 0 || isCompiling
                    ? 'bg-theme-secondary text-theme-muted cursor-not-allowed'
                    : 'bg-[var(--accent-blue)] hover:opacity-90 text-white shadow-lg'
                }`}
              >
                {isCompiling ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Compiling...
                  </span>
                ) : (
                  'Generate Template'
                )}
              </button>
              {sections.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] uppercase font-bold px-2 py-1.5 text-theme-muted hover:text-[var(--accent-red)] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Sortable Section List */}
          <div className="flex-1 overflow-y-auto p-3">
            <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
              <DroppableSectionsContainer>
                {sections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                    <div className="w-16 h-16 rounded-full bg-theme-secondary flex items-center justify-center mb-4 border-2 border-dashed border-theme-primary">
                      <svg className="w-6 h-6 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-theme-secondary mb-1">No sections yet</p>
                    <p className="text-xs text-theme-muted max-w-xs">
                      Drag sections from the library on the left to start building your template
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sections.map((instance) => (
                      <SortableSectionCard
                        key={instance.instanceId}
                        instance={instance}
                        isExpanded={expandedIds.has(instance.instanceId)}
                        onToggleExpand={() => toggleExpand(instance.instanceId)}
                        onVariableChange={(key, value) =>
                          handleVariableChange(instance.instanceId, key, value)
                        }
                        onRemove={() => handleRemove(instance.instanceId)}
                      />
                    ))}
                  </div>
                )}
              </DroppableSectionsContainer>
            </SortableContext>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDrag.type ? (
          <DragOverlayContent
            type={activeDrag.type}
            sectionDef={activeDrag.sectionDef}
            instance={activeDrag.instance}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ─── Droppable container for the sections area ─── */
function DroppableSectionsContainer({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'sections-droppable', data: { type: 'container' } });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[300px] rounded-lg transition-colors ${
        isOver ? 'bg-[var(--hover-bg)] ring-2 ring-[var(--accent-blue)] ring-dashed' : ''
      }`}
    >
      {children}
    </div>
  );
}
