import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Type, List, ChevronDown, AlignLeft } from "lucide-react";

interface FormField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
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

const FIELD_TYPES = [
  { id: "text", label: "Texto", icon: Type },
  { id: "list", label: "Lista", icon: List },
  { id: "dropdown", label: "Dropdown", icon: ChevronDown },
  { id: "textarea", label: "Textarea", icon: AlignLeft },
];

export default function FormBuilder({ initialData, onSave, onCancel }: FormBuilderProps) {
  const [formName, setFormName] = useState(initialData?.name || "");
  const [formDescription, setFormDescription] = useState(initialData?.description || "");
  const [fields, setFields] = useState<FormField[]>(initialData?.fields ? JSON.parse(initialData.fields) : []);
  
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  const addField = () => {
    if (!newFieldLabel.trim()) return;
    
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: newFieldType,
      label: newFieldLabel,
      required: false,
      options: (newFieldType === "list" || newFieldType === "dropdown") ? [""] : undefined,
    };
    
    setFields([...fields, newField]);
    setNewFieldLabel("");
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateFieldLabel = (id: string, label: string) => {
    setFields(fields.map(f => f.id === id ? { ...f, label } : f));
  };

  const addOption = (fieldId: string) => {
    setFields(fields.map(f => {
      if (f.id === fieldId) {
        return { ...f, options: [...(f.options || []), ""] };
      }
      return f;
    }));
  };

  const updateOption = (fieldId: string, index: number, value: string) => {
    setFields(fields.map(f => {
      if (f.id === fieldId && f.options) {
        const newOptions = [...f.options];
        newOptions[index] = value;
        return { ...f, options: newOptions };
      }
      return f;
    }));
  };

  const removeOption = (fieldId: string, index: number) => {
    setFields(fields.map(f => {
      if (f.id === fieldId && f.options) {
        return { ...f, options: f.options.filter((_, i) => i !== index) };
      }
      return f;
    }));
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Construtor de Formulário</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel">Cancelar</Button>
          <Button 
            onClick={() => onSave({ name: formName, description: formDescription, fields: JSON.stringify(fields) })} 
            disabled={!formName}
            data-testid="button-save-form"
          >
            Salvar Formulário
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border shadow-sm">
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

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Campos do Formulário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 p-4 bg-muted/30 rounded-lg border border-dashed">
              <div className="flex-1 space-y-2">
                <Label>Nome do Campo</Label>
                <Input 
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="Digite o nome do campo..."
                  data-testid="input-new-field-label"
                />
              </div>
              <div className="w-full md:w-48 space-y-2">
                <Label>Tipo do Campo</Label>
                <Select value={newFieldType} onValueChange={setNewFieldType}>
                  <SelectTrigger data-testid="select-new-field-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={addField} 
                  className="w-full md:w-auto"
                  disabled={!newFieldLabel.trim()}
                  data-testid="button-add-field"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Campo
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {fields.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border rounded-lg bg-muted/10">
                  <p>Nenhum campo adicionado ainda.</p>
                </div>
              ) : (
                fields.map((field) => (
                  <div key={field.id} className="flex items-start gap-4 p-4 bg-card border rounded-lg shadow-sm group">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = FIELD_TYPES.find(t => t.id === field.type)?.icon || Type;
                          return <Icon className="h-4 w-4 text-muted-foreground" />;
                        })()}
                        <Input
                          value={field.label}
                          onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                          className="h-8 font-medium border-none focus-visible:ring-1 p-0 bg-transparent"
                          data-testid={`input-field-label-${field.id}`}
                        />
                      </div>
                      
                      <div className="opacity-60 pointer-events-none">
                        {field.type === "text" && <Input disabled placeholder="Exemplo de campo de texto" />}
                        {field.type === "textarea" && <Textarea disabled placeholder="Exemplo de área de texto" className="min-h-[80px]" />}
                      </div>

                      {(field.type === "dropdown" || field.type === "list") && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opções (uma por linha)</Label>
                            <span className="text-[10px] text-muted-foreground italic">Pressione Enter para novas opções</span>
                          </div>
                          <Textarea
                            value={field.options?.join("\n") || ""}
                            onChange={(e) => {
                              const newOptions = e.target.value.split("\n");
                              setFields(fields.map(f => f.id === field.id ? { ...f, options: newOptions } : f));
                            }}
                            placeholder="Opção 1&#10;Opção 2&#10;Opção 3..."
                            className="min-h-[100px] text-sm font-mono leading-relaxed"
                            data-testid={`textarea-options-${field.id}`}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Total de {field.options?.filter(o => o.trim()).length || 0} opções válidas.
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeField(field.id)}
                      className="text-destructive"
                      data-testid={`button-remove-field-${field.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
