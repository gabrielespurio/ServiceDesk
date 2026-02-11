import React, { useState, Fragment } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Type, List, AlignLeft, Settings2, Hash, CheckSquare, Calendar, Layers, Calculator, GripVertical, FileText, Eye, Image, Paperclip, Layout } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
  DragOverlay,
  useDroppable,
  DragStartEvent,
  rectIntersection
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface VisibilityRule {
  sourceFieldId: string;
  operator: string;
  value: string;
}

export interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  visibilityRules?: VisibilityRule[];
  fields?: FormField[];
  isDefault?: boolean;
}

const DEFAULT_FIELDS: FormField[] = [
  {
    id: "default_assunto",
    type: "text",
    label: "Assunto",
    required: true,
    placeholder: "Resumo breve do problema",
    isDefault: true,
  },
  {
    id: "default_descricao",
    type: "textarea",
    label: "Descrição",
    required: true,
    placeholder: "Por favor, detalhe os passos para reproduzir o problema...",
    isDefault: true,
  },
  {
    id: "default_prioridade",
    type: "list",
    label: "Prioridade",
    required: true,
    options: ["Baixa", "Média", "Alta", "Crítica"],
    isDefault: true,
  },
];

interface FormBuilderProps {
  initialData?: {
    name: string;
    description: string;
    fields: string;
  };
  onSave: (data: { name: string; description: string; fields: string }) => void;
  onCancel: () => void;
}

const FIELD_TYPES = [
  { id: "text", label: "Texto", icon: Type },
  { id: "list", label: "Lista", icon: List },
  { id: "number", label: "Número", icon: Hash },
  { id: "checkbox", label: "Caixa de seleção", icon: CheckSquare },
  { id: "date", label: "Data", icon: Calendar },
  { id: "multi-select", label: "Seleção múltipla", icon: Layers },
  { id: "decimal", label: "Decimal", icon: Calculator },
  { id: "textarea", label: "Textarea", icon: AlignLeft },
];

const ELEMENT_TYPES = [
  { id: "section", label: "Seção", icon: Layout },
  { id: "image", label: "Imagem", icon: Image },
  { id: "attachment", label: "Anexo", icon: Paperclip },
];

const ALL_TYPES = [...FIELD_TYPES, ...ELEMENT_TYPES];
interface SortableFieldProps {
  field: FormField;
  updateFieldLabel: (id: string, label: string) => void;
  setEditingFieldId: (id: string) => void;
  removeField: (id: string) => void;
  addFieldToSection?: (sectionId: string, fieldType: string) => void;
}

function SortableField({ field, updateFieldLabel, setEditingFieldId, removeField, addFieldToSection }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = ALL_TYPES.find(t => t.id === field.type)?.icon || Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-card border rounded-lg shadow-sm group relative ${field.type === "section" ? "border-primary/20 bg-primary/5" : ""}`}
    >
      <div className="flex items-start gap-4">
        <div
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Icon className="h-4 w-4 text-primary/70" />
              {field.isDefault ? (
                <div className="flex items-center gap-2">
                  <span className="h-8 font-bold text-sm flex items-center">{field.label}</span>
                  <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">Padrão</span>
                </div>
              ) : (
                <Input
                  value={field.label}
                  onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                  className="h-8 font-bold border-none focus-visible:ring-0 p-0 bg-transparent text-sm"
                  data-testid={`input-field-label-${field.id}`}
                />
              )}
            </div>
          </div>

          {field.type === "section" ? (
            <div className="border-2 border-dashed border-primary/10 rounded-xl p-4 min-h-[100px] bg-background/50">
              {field.fields && field.fields.length > 0 ? (
                <div className="space-y-4">
                  {/* Here we would ideally have another SortableContext for recursive DnD */}
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Campos desta Seção</p>
                  {field.fields.map((subField: FormField) => (
                    <div key={subField.id} className="scale-95 origin-left">
                      <div className="flex items-center gap-2 p-2 border rounded-md bg-white">
                        <Type className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs flex-1">{subField.label}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeField(subField.id)}
                          data-testid={`button-remove-subfield-${subField.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {addFieldToSection && (
                <div className="pt-2">
                  <Select onValueChange={(val) => addFieldToSection(field.id, val)}>
                    <SelectTrigger className="h-8 border-dashed text-xs text-muted-foreground" data-testid={`button-add-to-section-${field.id}`}>
                      <div className="flex items-center gap-1.5">
                        <Plus className="h-3 w-3" />
                        <span>Adicionar campo à seção</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map(ft => (
                        <SelectItem key={ft.id} value={ft.id}>
                          <div className="flex items-center gap-2">
                            <ft.icon className="h-3 w-3" />
                            <span>{ft.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            <div className="opacity-60 pointer-events-none">
              {field.type === "text" && <Input disabled placeholder={field.placeholder || "Exemplo de campo de texto"} />}
              {field.type === "textarea" && <Textarea disabled placeholder={field.placeholder || "Exemplo de área de texto"} className="min-h-[80px]" />}
              {field.type === "number" && <Input type="number" disabled placeholder={field.placeholder || "0"} />}
              {field.type === "decimal" && <Input type="number" step="0.01" disabled placeholder={field.placeholder || "0.00"} />}
              {field.type === "image" && (
                <div className="aspect-video bg-muted/20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2">
                  <Image className="h-8 w-8 text-muted-foreground/30" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/50">Imagem do Formulário</span>
                </div>
              )}
              {field.type === "attachment" && (
                <div className="p-4 border-2 border-dashed rounded-lg flex items-center gap-3">
                  <Paperclip className="h-5 w-5 text-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground/50 italic">Clique ou arraste arquivos para anexar</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1.5 px-2"
              onClick={() => setEditingFieldId(field.id)}
              data-testid={`button-configure-field-${field.id}`}
            >
              <Settings2 className="h-3 w-3" />
              {["list", "multi-select", "checkbox"].includes(field.type)
                ? `Valores (${field.options?.filter((o: string) => o.trim()).length || 0})`
                : "Configurações"}
            </Button>
            {field.visibilityRules && field.visibilityRules.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                <Eye className="h-3 w-3" />
                {field.visibilityRules.length} {field.visibilityRules.length === 1 ? "condição" : "condições"}
              </span>
            )}
          </div>
        </div>

        {!field.isDefault && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeField(field.id)}
            className="text-destructive hover:bg-destructive/10 -mt-1"
            data-testid={`button-remove-field-${field.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function DraggableTool({ type }: { type: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tool-${type.id}`,
    data: { type: type.id, isTool: true },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const Icon = type.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex flex-col items-center justify-center gap-1 p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-primary hover:shadow-md transition-all group aspect-square ${isDragging ? "opacity-30" : ""}`}
    >
      <div className="p-1.5 bg-gray-50 rounded-md group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-[9px] font-bold text-gray-700 text-center leading-[1.1]">{type.label}</span>
    </div>
  );
}

function DroppableArea({ id, children }: { id: string, children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[400px] rounded-xl transition-colors ${isOver ? "bg-primary/5 ring-2 ring-primary/20 ring-dashed" : ""}`}
    >
      {children}
    </div>
  );
}

export default function FormBuilder({ initialData, onSave, onCancel }: FormBuilderProps) {
  const { toast } = useToast();
  const [formName, setFormName] = useState(initialData?.name || "");
  const [formDescription, setFormDescription] = useState(initialData?.description || "");
  const [fields, setFields] = useState<FormField[]>(() => {
    const parsed: FormField[] = initialData?.fields ? JSON.parse(initialData.fields) : [];
    const existingDefaultIds = parsed.filter(f => f.isDefault).map(f => f.id);
    const missingDefaults = DEFAULT_FIELDS.filter(df => !existingDefaultIds.includes(df.id));
    return [...missingDefaults, ...parsed.filter(f => !f.isDefault || existingDefaultIds.includes(f.id))];
  });

  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeToolType, setActiveToolType] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    if (event.active.data.current?.isTool) {
      setActiveToolType(event.active.data.current.type);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveToolType(null);

    // Se arrastou uma ferramenta do menu lateral
    if (active.data.current?.isTool && over) {
      const fieldType = active.data.current.type;
      const typeInfo = ALL_TYPES.find(t => t.id === fieldType);
      const id = `${fieldType}-${Date.now()}`;
      const newField: FormField = {
        id,
        type: fieldType,
        label: `Novo ${typeInfo?.label || "Campo"}`,
        required: false,
        placeholder: "",
        options: ["list", "multi-select", "checkbox"].includes(fieldType) ? ["Opção 1"] : undefined,
        fields: fieldType === "section" ? [] : undefined,
      };

      if (over.id === "form-drop-zone") {
        setFields([...fields, newField]);
      } else {
        const overIndex = fields.findIndex((f) => f.id === over.id);
        if (overIndex !== -1) {
          const newFields = [...fields];
          newFields.splice(overIndex + 1, 0, newField);
          setFields(newFields);
        } else {
          setFields([...fields, newField]);
        }
      }

      if (fieldType !== "section" && fieldType !== "image" && fieldType !== "attachment") {
        setEditingFieldId(id);
      }
      return;
    }

    // Ordenação normal
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addField = (type: string) => {
    const typeInfo = ALL_TYPES.find(t => t.id === type);
    const newField: FormField = {
      id: `${type}-${Date.now()}`,
      type,
      label: `Novo ${typeInfo?.label || "Campo"}`,
      required: false,
      placeholder: "", // Placeholder is not set in the provided snippet, but was in original. Keeping it.
      options: ["list", "multi-select", "checkbox"].includes(type) ? ["Opção 1"] : undefined,
      fields: type === "section" ? [] : undefined,
    };
    setFields([...fields, newField]);
    if (type !== "section" && type !== "image" && type !== "attachment") {
      setEditingFieldId(newField.id);
    }
  };

  const addFieldToSection = (sectionId: string, fieldType: string) => {
    const typeInfo = ALL_TYPES.find(t => t.id === fieldType);
    const newField: FormField = {
      id: `${fieldType}-${Date.now()}`,
      type: fieldType,
      label: `Novo ${typeInfo?.label || "Campo"}`,
      required: false,
      placeholder: "",
      options: ["list", "multi-select", "checkbox"].includes(fieldType) ? ["Opção 1"] : undefined,
    };
    setFields(fields.map(f => {
      if (f.id === sectionId) {
        return { ...f, fields: [...(f.fields || []), newField] };
      }
      return f;
    }));
    if (fieldType !== "image" && fieldType !== "attachment") {
      setEditingFieldId(newField.id);
    }
  };

  const removeField = (id: string) => {
    if (id.startsWith("default_")) return;
    const recursiveRemove = (items: FormField[]): FormField[] => {
      return items
        .filter(f => f.id !== id)
        .map(f => f.fields ? { ...f, fields: recursiveRemove(f.fields) } : f);
    };
    setFields(recursiveRemove(fields));
  };

  const updateFieldLabel = (id: string, label: string) => {
    const recursiveUpdate = (items: FormField[]): FormField[] => {
      return items.map(f => {
        if (f.id === id) return { ...f, label };
        if (f.fields) return { ...f, fields: recursiveUpdate(f.fields) };
        return f;
      });
    };
    setFields(recursiveUpdate(fields));
  };

  const updateFieldPlaceholder = (id: string, placeholder: string) => {
    const recursiveUpdate = (items: FormField[]): FormField[] => {
      return items.map(f => {
        if (f.id === id) return { ...f, placeholder };
        if (f.fields) return { ...f, fields: recursiveUpdate(f.fields) };
        return f;
      });
    };
    setFields(recursiveUpdate(fields));
  };

  const toggleFieldRequired = (id: string) => {
    const recursiveUpdate = (items: FormField[]): FormField[] => {
      return items.map(f => {
        if (f.id === id) return { ...f, required: !f.required };
        if (f.fields) return { ...f, fields: recursiveUpdate(f.fields) };
        return f;
      });
    };
    setFields(recursiveUpdate(fields));
  };

  const getAllSelectableFields = (items: FormField[], excludeId?: string): FormField[] => {
    const result: FormField[] = [];
    for (const item of items) {
      if (item.id !== excludeId && ["list", "multi-select", "checkbox"].includes(item.type) && item.options && item.options.length > 0) {
        result.push(item);
      }
      if (item.fields) {
        result.push(...getAllSelectableFields(item.fields, excludeId));
      }
    }
    return result;
  };

  const addVisibilityRule = (fieldId: string) => {
    const recursiveUpdate = (items: FormField[]): FormField[] => {
      return items.map(f => {
        if (f.id === fieldId) {
          const newRule: VisibilityRule = { sourceFieldId: "", operator: "equals", value: "" };
          return { ...f, visibilityRules: [...(f.visibilityRules || []), newRule] };
        }
        if (f.fields) return { ...f, fields: recursiveUpdate(f.fields) };
        return f;
      });
    };
    setFields(recursiveUpdate(fields));
  };

  const updateVisibilityRule = (fieldId: string, index: number, updates: Partial<VisibilityRule>) => {
    const recursiveUpdate = (items: FormField[]): FormField[] => {
      return items.map(f => {
        if (f.id === fieldId && f.visibilityRules) {
          const newRules = [...f.visibilityRules];
          newRules[index] = { ...newRules[index], ...updates };
          return { ...f, visibilityRules: newRules };
        }
        if (f.fields) return { ...f, fields: recursiveUpdate(f.fields) };
        return f;
      });
    };
    setFields(recursiveUpdate(fields));
  };

  const removeVisibilityRule = (fieldId: string, index: number) => {
    const recursiveUpdate = (items: FormField[]): FormField[] => {
      return items.map(f => {
        if (f.id === fieldId && f.visibilityRules) {
          return { ...f, visibilityRules: f.visibilityRules.filter((_, i) => i !== index) };
        }
        if (f.fields) return { ...f, fields: recursiveUpdate(f.fields) };
        return f;
      });
    };
    setFields(recursiveUpdate(fields));
  };

  const addOption = (fieldId: string) => {
    const recursiveUpdate = (items: FormField[]): FormField[] => {
      return items.map(f => {
        if (f.id === fieldId) {
          return { ...f, options: [...(f.options || []), ""] };
        }
        if (f.fields) return { ...f, fields: recursiveUpdate(f.fields) };
        return f;
      });
    };
    setFields(recursiveUpdate(fields));
  };

  const updateOption = (fieldId: string, index: number, value: string) => {
    const recursiveUpdate = (items: FormField[]): FormField[] => {
      return items.map(f => {
        if (f.id === fieldId && f.options) {
          const newOptions = [...f.options];
          newOptions[index] = value;
          return { ...f, options: newOptions };
        }
        if (f.fields) return { ...f, fields: recursiveUpdate(f.fields) };
        return f;
      });
    };
    setFields(recursiveUpdate(fields));
  };

  const removeOption = (fieldId: string, index: number) => {
    const recursiveUpdate = (items: FormField[]): FormField[] => {
      return items.map(f => {
        if (f.id === fieldId && f.options) {
          return { ...f, options: f.options.filter((_, i) => i !== index) };
        }
        if (f.fields) return { ...f, fields: recursiveUpdate(f.fields) };
        return f;
      });
    };
    setFields(recursiveUpdate(fields));
  };

  const findFieldRecursive = (items: FormField[], id: string): FormField | undefined => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.fields) {
        const found = findFieldRecursive(item.fields, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const editingField = editingFieldId ? findFieldRecursive(fields, editingFieldId) : undefined;

  return (
    <div className="flex flex-col h-full relative overflow-visible">
      <div className="flex justify-between items-center mb-4 shrink-0 bg-background/95 backdrop-blur z-20 py-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-bold">Construtor de Formulário</h2>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 min-h-0 pb-10 overflow-visible">
          {/* Main Construction Area */}
          <div className="flex-1 space-y-6 overflow-y-auto pr-4">
            <Card className="border-none shadow-md">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="form-name">Nome do Formulário</Label>
                  <Input
                    id="form-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Suporte Técnico"
                    className="text-lg font-semibold h-12"
                    data-testid="input-form-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-desc">Descrição</Label>
                  <Input
                    id="form-desc"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Descrição do formulário"
                    data-testid="input-form-description"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md overflow-visible mt-6">
              <CardHeader>
                <CardTitle className="text-xl">Estrutura do Formulário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <DroppableArea id="form-drop-zone">
                  {fields.length === 0 ? (
                    <div className="h-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5 flex flex-col items-center justify-center space-y-3 pointer-events-none">
                      <div className="p-4 bg-muted/20 rounded-full">
                        <Plus className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="font-medium">O formulário está vazio</p>
                        <p className="text-sm">Arraste campos do menu lateral ou clique neles para adicionar.</p>
                      </div>
                    </div>
                  ) : (
                    <SortableContext
                      items={fields.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {fields.map((field) => (
                          <SortableField
                            key={field.id}
                            field={field}
                            updateFieldLabel={updateFieldLabel}
                            setEditingFieldId={setEditingFieldId}
                            removeField={removeField}
                            addFieldToSection={addFieldToSection}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </DroppableArea>
              </CardContent>
            </Card>

            {/* Bottom Actions Footer */}
            <div className="flex justify-end gap-3 pt-6 pb-10 border-t bg-background/50 backdrop-blur sticky bottom-0 z-30 px-2 mt-4">
              <Button variant="outline" size="lg" onClick={onCancel} data-testid="button-cancel-footer" className="w-40">
                Cancelar
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsPreviewOpen(true)}
                className="w-48 border-primary/30 text-primary hover:bg-primary/5"
                data-testid="button-preview-form"
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar Formulário
              </Button>
              <Button
                size="lg"
                onClick={() => onSave({ name: formName, description: formDescription, fields: JSON.stringify(fields) })}
                disabled={!formName}
                data-testid="button-save-form-footer"
                className="w-48"
              >
                Salvar Formulário
              </Button>
            </div>
          </div>

          {/* Right Sidebar Toolbox */}
          <aside className="w-44 shrink-0">
            <div className="sticky top-0 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
              <Card className="border-none shadow-md">
                <CardHeader className="pb-3 px-3 pt-4">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <List className="h-3 w-3" />
                    Campos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="grid grid-cols-2 gap-1.5">
                    {FIELD_TYPES.map((type) => (
                      <div key={type.id} onClick={() => addField(type.id)}>
                        <DraggableTool type={type} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardHeader className="pb-3 px-3 pt-4">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Layout className="h-3 w-3" />
                    Elementos de formulário
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="grid grid-cols-2 gap-1.5">
                    {ELEMENT_TYPES.map((type) => (
                      <div key={type.id} onClick={() => addField(type.id)}>
                        <DraggableTool type={type} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl space-y-1.5">
                <h4 className="text-[10px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
                  <Settings2 className="h-3 w-3" />
                  Dica
                </h4>
                <p className="text-[9px] text-gray-500 leading-tight">
                  Arraste ou clique para montar.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <DragOverlay>
          {activeId && activeId.toString().startsWith("tool-") ? (
            <div className="flex flex-col items-center justify-center gap-2 p-3 bg-white border-2 border-primary rounded-xl shadow-2xl scale-110 w-24 aspect-square">
              {(() => {
                const typeId = activeId.toString().replace("tool-", "");
                const type = ALL_TYPES.find(t => t.id === typeId);
                const Icon = type?.icon || Type;
                return (
                  <>
                    <div className="p-2 bg-primary/10 text-primary rounded-md">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 text-center">{type?.label}</span>
                  </>
                );
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={!!editingFieldId} onOpenChange={(open) => !open && setEditingFieldId(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Configurar Campo: {editingField?.label}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 border-b mb-4">
            <div className="space-y-2">
              <Label htmlFor="edit-field-label" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nome do Campo</Label>
              <Input
                id="edit-field-label"
                value={editingField?.label || ""}
                onChange={(e) => editingField && updateFieldLabel(editingField.id, e.target.value)}
                placeholder="Ex: Nome Completo"
                className="h-11 font-bold text-base bg-muted/5 focus-visible:ring-primary"
              />
            </div>
          </div>

          <Tabs defaultValue={["section", "image", "attachment"].includes(editingField?.type || "") ? "visibility" : "settings"} className="w-full">
            <TabsList className={`grid w-full ${["section", "image", "attachment"].includes(editingField?.type || "") ? "grid-cols-1" : "grid-cols-2"}`}>
              {!["section", "image", "attachment"].includes(editingField?.type || "") && (
                <TabsTrigger value="settings">Configurações do campo</TabsTrigger>
              )}
              <TabsTrigger value="visibility">Regras de visibilidade</TabsTrigger>
            </TabsList>

            {!["section", "image", "attachment"].includes(editingField?.type || "") && (
              <TabsContent value="settings" className="space-y-6 py-4">
                <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg border">
                  <Checkbox
                    id="edit-field-required"
                    checked={editingField?.required}
                    onCheckedChange={() => editingField && toggleFieldRequired(editingField.id)}
                  />
                  <Label htmlFor="edit-field-required" className="text-sm font-medium cursor-pointer">
                    Campo obrigatório para abertura de tickets
                  </Label>
                </div>

                {["text", "number", "decimal", "textarea"].includes(editingField?.type || "") && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-field-placeholder">Placeholder do Campo</Label>
                    <Input
                      id="edit-field-placeholder"
                      value={editingField?.placeholder || ""}
                      onChange={(e) => editingField && updateFieldPlaceholder(editingField.id, e.target.value)}
                      placeholder="Digite o placeholder que aparecerá no campo..."
                      data-testid="input-field-placeholder"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      O texto de instrução que aparece dentro do campo quando ele está vazio.
                    </p>
                  </div>
                )}

                {["list", "multi-select", "checkbox"].includes(editingField?.type || "") && (
                  <div className="space-y-4">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valores da Lista</Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {editingField?.options?.map((option, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <div className="flex-1 relative">
                            <Input
                              value={option}
                              onChange={(e) => updateOption(editingField.id, index, e.target.value)}
                              placeholder={`Valor ${index + 1}`}
                              className="h-9 pr-12 focus-visible:ring-0"
                              data-testid={`input-option-${editingField.id}-${index}`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border pointer-events-none">
                              ID: {index + 1}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(editingField.id, index)}
                            className="h-9 w-9 text-destructive hover:bg-destructive/10"
                            disabled={editingField.options!.length <= 1}
                            data-testid={`button-remove-option-${editingField.id}-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(editingFieldId!)}
                      className="w-full h-9 border-dashed hover:border-primary hover:text-primary transition-colors"
                      data-testid={`button-add-option-${editingFieldId}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Valor
                    </Button>
                  </div>
                )}

                <div className="pt-4 border-t flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingFieldId(null)}
                    data-testid="button-cancel-edit-field"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => setEditingFieldId(null)}
                    data-testid="button-save-edit-field"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </TabsContent>
            )}

            <TabsContent value="visibility" className="space-y-4 py-4">
              <div className="space-y-4">
                {(() => {
                  const selectableFields = getAllSelectableFields(fields, editingField?.id);
                  return (!editingField?.visibilityRules || editingField.visibilityRules.length === 0) ? (
                    <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/10">
                      <Eye className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <h3 className="font-medium">Regras de Visibilidade</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Defina condições para que este campo seja exibido no formulário.
                      </p>
                      {selectableFields.length === 0 ? (
                        <p className="text-xs text-muted-foreground mt-3 italic">
                          Adicione campos do tipo Lista, Seleção múltipla ou Caixa de seleção ao formulário para criar condições.
                        </p>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => editingField && addVisibilityRule(editingField.id)}
                          data-testid="button-add-first-rule"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Condição
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Este campo só será exibido quando <strong>todas</strong> as condições abaixo forem atendidas.
                      </p>
                      <div className="space-y-3">
                        {editingField.visibilityRules.map((rule, index) => {
                          const sourceField = selectableFields.find(f => f.id === rule.sourceFieldId);
                          return (
                            <div key={index} className="flex gap-2 items-end bg-muted/20 p-3 rounded-lg border relative group">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Quando o campo</Label>
                                  <Select
                                    value={rule.sourceFieldId}
                                    onValueChange={(val) => updateVisibilityRule(editingField.id, index, { sourceFieldId: val, value: "" })}
                                  >
                                    <SelectTrigger className="h-9" data-testid={`select-rule-source-${index}`}>
                                      <SelectValue placeholder="Selecione um campo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {selectableFields.map(f => (
                                        <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Operador</Label>
                                  <Select
                                    value={rule.operator}
                                    onValueChange={(val) => updateVisibilityRule(editingField.id, index, { operator: val })}
                                  >
                                    <SelectTrigger className="h-9" data-testid={`select-rule-operator-${index}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="equals">Igual a</SelectItem>
                                      <SelectItem value="not_equals">Diferente de</SelectItem>
                                      <SelectItem value="contains">Contém</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Valor</Label>
                                  {sourceField && sourceField.options && sourceField.options.length > 0 ? (
                                    <Select
                                      value={rule.value}
                                      onValueChange={(val) => updateVisibilityRule(editingField.id, index, { value: val })}
                                    >
                                      <SelectTrigger className="h-9" data-testid={`select-rule-value-${index}`}>
                                        <SelectValue placeholder="Selecione o valor..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {sourceField.options.filter(o => o.trim()).map((opt, i) => (
                                          <SelectItem key={i} value={opt}>{opt}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input
                                      value={rule.value}
                                      onChange={(e) => updateVisibilityRule(editingField.id, index, { value: e.target.value })}
                                      placeholder="Selecione um campo primeiro..."
                                      className="h-9"
                                      disabled={!rule.sourceFieldId}
                                      data-testid={`input-rule-value-${index}`}
                                    />
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeVisibilityRule(editingField.id, index)}
                                className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                                data-testid={`button-remove-rule-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                      {selectableFields.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editingField && addVisibilityRule(editingField.id)}
                          className="w-full h-9 border-dashed"
                          data-testid="button-add-rule"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Nova Condição
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Visualização do Formulário</DialogTitle>
            <DialogDescription>
              Esta é uma prévia de como o usuário final verá este formulário ao abrir um ticket.
            </DialogDescription>
          </DialogHeader>

          <FormPreview fields={fields} formName={formName} formDescription={formDescription} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function evaluateVisibility(
  field: FormField,
  formValues: Record<string, string | string[]>
): boolean {
  if (!field.visibilityRules || field.visibilityRules.length === 0) return true;
  return field.visibilityRules.every(rule => {
    if (!rule.sourceFieldId || !rule.value) return true;
    const currentValue = formValues[rule.sourceFieldId];
    if (currentValue === undefined || currentValue === "") return false;
    const isArray = Array.isArray(currentValue);
    switch (rule.operator) {
      case "equals":
        return isArray ? currentValue.includes(rule.value) : currentValue === rule.value;
      case "not_equals":
        return isArray ? !currentValue.includes(rule.value) : currentValue !== rule.value;
      case "contains":
        return isArray
          ? currentValue.some(v => v.toLowerCase().includes(rule.value.toLowerCase()))
          : currentValue.toLowerCase().includes(rule.value.toLowerCase());
      default:
        return true;
    }
  });
}

function FormPreview({ fields, formName, formDescription }: { fields: FormField[], formName: string, formDescription: string }) {
  const [formValues, setFormValues] = useState<Record<string, string | string[]>>({});

  const updateValue = (fieldId: string, value: string | string[]) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const toggleMultiValue = (fieldId: string, option: string) => {
    setFormValues(prev => {
      const current = (prev[fieldId] as string[]) || [];
      const next = current.includes(option) ? current.filter(v => v !== option) : [...current, option];
      return { ...prev, [fieldId]: next };
    });
  };

  const renderFields = (fieldsToRender: FormField[]) => {
    return fieldsToRender.map((field) => {
      const isVisible = evaluateVisibility(field, formValues);
      if (!isVisible) return null;

      return (
        <React.Fragment key={field.id}>
          {field.type === "section" ? (
            <div className="space-y-4 pt-4">
              <h3 className="text-base font-bold text-foreground border-b pb-2">{field.label}</h3>
              {field.fields && renderFields(field.fields)}
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t first:border-t-0 first:pt-0">
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
                  {field.label}
                  {field.required && <span className="text-destructive font-bold">*</span>}
                </Label>

                {field.type === "text" && (
                  <Input
                    placeholder={field.placeholder || "Digite aqui..."}
                    className="bg-muted/5 font-normal"
                    value={(formValues[field.id] as string) || ""}
                    onChange={(e) => updateValue(field.id, e.target.value)}
                  />
                )}

                {field.type === "textarea" && (
                  <Textarea
                    placeholder={field.placeholder || "Descreva detalhadamente..."}
                    className="min-h-[100px] bg-muted/5 font-normal resize-none"
                    value={(formValues[field.id] as string) || ""}
                    onChange={(e) => updateValue(field.id, e.target.value)}
                  />
                )}

                {field.type === "number" && (
                  <Input
                    type="number"
                    placeholder={field.placeholder || "0"}
                    className="bg-muted/5 font-normal"
                    value={(formValues[field.id] as string) || ""}
                    onChange={(e) => updateValue(field.id, e.target.value)}
                  />
                )}

                {field.type === "decimal" && (
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={field.placeholder || "0.00"}
                    className="bg-muted/5 font-normal"
                    value={(formValues[field.id] as string) || ""}
                    onChange={(e) => updateValue(field.id, e.target.value)}
                  />
                )}

                {field.type === "list" && (
                  <Select
                    value={(formValues[field.id] as string) || undefined}
                    onValueChange={(val) => updateValue(field.id, val)}
                  >
                    <SelectTrigger className="bg-muted/5 font-normal">
                      <SelectValue placeholder={field.placeholder || "Selecione uma opção..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.filter(opt => opt.trim()).map((opt, i) => (
                        <SelectItem key={i} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.type === "multi-select" && (
                  <div className="p-3 border rounded-lg bg-muted/5 space-y-2">
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Seleção Múltipla</p>
                    <div className="grid grid-cols-2 gap-2">
                      {field.options?.map((opt, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <Checkbox
                            id={`preview-${field.id}-${i}`}
                            checked={((formValues[field.id] as string[]) || []).includes(opt)}
                            onCheckedChange={() => toggleMultiValue(field.id, opt)}
                          />
                          <label htmlFor={`preview-${field.id}-${i}`} className="text-sm font-medium leading-none cursor-pointer">{opt}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {field.type === "checkbox" && (
                  <div className="space-y-2">
                    {field.options && field.options.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 p-2">
                        {field.options.map((opt, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            <Checkbox
                              id={`preview-check-${field.id}-${i}`}
                              checked={((formValues[field.id] as string[]) || []).includes(opt)}
                              onCheckedChange={() => toggleMultiValue(field.id, opt)}
                            />
                            <label htmlFor={`preview-check-${field.id}-${i}`} className="text-sm font-medium leading-none cursor-pointer">{opt}</label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Checkbox id={`preview-check-single-${field.id}`} />
                        <label className="text-sm font-medium leading-none cursor-pointer">Confirmar seleção</label>
                      </div>
                    )}
                  </div>
                )}

                {field.type === "date" && (
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-muted/5">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Selecione uma data...</span>
                  </Button>
                )}

                {field.type === "image" && (
                  <div className="aspect-video bg-muted/10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3">
                    <Image className="h-10 w-10 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Placeholder da Imagem</p>
                  </div>
                )}

                {field.type === "attachment" && (
                  <div className="p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer group">
                    <div className="p-3 bg-background rounded-full shadow-sm group-hover:scale-110 transition-transform">
                      <Paperclip className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">Clique para anexar arquivos</p>
                      <p className="text-[11px] text-muted-foreground mt-1">PDF, PNG, JPG ou ZIP até 10MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2 border-b pb-6">
        <h2 className="text-2xl font-black text-foreground tracking-tight">{formName || "Título do Formulário"}</h2>
        {formDescription && <p className="text-muted-foreground text-sm leading-relaxed">{formDescription}</p>}
      </div>

      <div className="space-y-6">
        {renderFields(fields)}
      </div>

      <div className="pt-8 flex justify-end">
        <Button size="lg" className="px-10 h-12 font-bold shadow-lg" disabled>
          Enviar Chamado
        </Button>
      </div>
    </div>
  );
}
