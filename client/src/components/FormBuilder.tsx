import React, { useState } from "react";
import { useDraggable, useDroppable, DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Type, List, ChevronDown, AlignLeft, Trash2, GripVertical } from "lucide-react";

interface FieldType {
  id: string;
  label: string;
  icon: React.ElementType;
}

const FIELD_TYPES: FieldType[] = [
  { id: "text", label: "Campo tipo Texto", icon: Type },
  { id: "list", label: "Campo tipo Lista", icon: List },
  { id: "dropdown", label: "Dropdown", icon: ChevronDown },
  { id: "textarea", label: "Campo tipo Textarea", icon: AlignLeft },
];

interface FormField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
}

interface DraggableSidebarItemProps {
  type: string;
  label: string;
  icon: React.ElementType;
}

function DraggableSidebarItem({ type, label, icon: Icon }: DraggableSidebarItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-${type}`,
    data: { type, label, isSidebarItem: true },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-3 bg-card border rounded-md cursor-grab hover:bg-accent transition-colors ${
        isDragging ? "opacity-50 border-primary" : ""
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

interface SortableFieldProps {
  id: string;
  field: FormField;
  onRemove: (id: string) => void;
  onChange: (id: string, updates: Partial<FormField>) => void;
}

function SortableField({ id, field, onRemove, onChange }: SortableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = FIELD_TYPES.find(t => t.id === field.type)?.icon || Type;

  return (
    <div ref={setNodeRef} style={style} className="group relative bg-card border rounded-lg p-4 mb-3">
      <div className="flex items-start gap-3">
        <div {...attributes} {...listeners} className="mt-1 cursor-grab opacity-40 hover:opacity-100 transition-opacity">
          <GripVertical className="h-5 w-5" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <Input
              value={field.label}
              onChange={(e) => onChange(id, { label: e.target.value })}
              className="h-8 font-medium border-none focus-visible:ring-1 p-0"
              placeholder="Nome do campo"
            />
          </div>

          {field.type === "text" && <Input disabled placeholder="Placeholder do texto" className="bg-muted/50" />}
          {field.type === "textarea" && <Textarea disabled placeholder="Placeholder do textarea" className="bg-muted/50 min-h-[80px]" />}
          {(field.type === "dropdown" || field.type === "list") && (
            <Select disabled>
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Opções do campo" />
              </SelectTrigger>
            </Select>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(id)}
          className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface FormBuilderProps {
  initialData?: {
    name: string;
    description: string;
    fields: string;
  };
  onSave: (data: { name: string; description: string; fields: string }) => void;
  onCancel: () => void;
}

export default function FormBuilder({ initialData, onSave, onCancel }: FormBuilderProps) {
  const [formName, setFormName] = useState(initialData?.name || "");
  const [formDescription, setFormDescription] = useState(initialData?.description || "");
  const [fields, setFields] = useState<FormField[]>(initialData?.fields ? JSON.parse(initialData.fields) : []);
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Adding from sidebar
    const isSidebarItem = active.data.current?.isSidebarItem;
    const isOverCanvas = over.id === "droppable-canvas" || fields.some(f => f.id === over.id);

    if (isSidebarItem) {
      const newField: FormField = {
        id: Math.random().toString(36).substr(2, 9),
        type: active.data.current.type,
        label: active.data.current.label,
        required: false,
      };

      if (over.id === "droppable-canvas") {
        setFields((prev) => [...prev, newField]);
      } else {
        // Dropped over an existing field, insert it there
        setFields((items) => {
          const overIndex = items.findIndex((i) => i.id === over.id);
          if (overIndex === -1) return [...items, newField];
          const newItems = [...items];
          newItems.splice(overIndex, 0, newField);
          return newItems;
        });
      }
      return;
    }

    // Reordering
    if (active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(items, oldIndex, newIndex);
        }
        return items;
      });
    }
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const { setNodeRef: setCanvasRef, isOver } = useDroppable({
    id: "droppable-canvas",
  });

  return (
    <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Construtor de Formulário</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={() => onSave({ name: formName, description: formDescription, fields: JSON.stringify(fields) })} disabled={!formName}>
              Salvar Formulário
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 min-h-[600px]">
          {/* Main Canvas */}
          <div className="md:col-span-3 flex flex-col gap-6">
            <Card className="border-none shadow-sm bg-muted/30">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="form-name">Nome do Formulário</Label>
                  <Input
                    id="form-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Suporte Técnico"
                    className="text-lg font-semibold h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-desc">Descrição</Label>
                  <Input
                    id="form-desc"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Descrição do formulário"
                  />
                </div>
              </CardContent>
            </Card>

            <div
              ref={setCanvasRef}
              className={`flex-1 rounded-xl border-2 border-dashed p-6 transition-colors min-h-[400px] ${
                isOver ? "bg-primary/5 border-primary" : "border-muted-foreground/20"
              }`}
            >
              {fields.length === 0 ? (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center space-y-2 text-muted-foreground">
                  <p className="text-lg font-medium">Arraste os campos aqui</p>
                  <p className="text-sm">Selecione campos no menu à direita para começar a montar seu formulário.</p>
                </div>
              ) : (
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  {fields.map((field) => (
                    <SortableField
                      key={field.id}
                      id={field.id}
                      field={field}
                      onRemove={removeField}
                      onChange={updateField}
                    />
                  ))}
                </SortableContext>
              )}
            </div>
          </div>

          {/* Sidebar Menu */}
          <aside className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg border">
              <h3 className="font-semibold mb-4">Campos Disponíveis</h3>
                  <div className="flex flex-col gap-2">
                    {FIELD_TYPES.map((type) => (
                      <DraggableSidebarItem key={type.id} type={type.id} label={type.label} icon={type.icon} />
                    ))}
                  </div>
            </div>
          </aside>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeId && activeId.toString().startsWith("sidebar-") ? (
          <div className="flex items-center gap-3 p-3 bg-primary text-primary-foreground border rounded-md shadow-lg cursor-grabbing w-[200px] opacity-90">
            {(() => {
              const type = activeId.toString().replace("sidebar-", "");
              const fieldType = FIELD_TYPES.find(t => t.id === type);
              if (!fieldType) return null;
              const Icon = fieldType.icon;
              return (
                <>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{fieldType.label}</span>
                </>
              );
            })()}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
