import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Type, List, ChevronDown, AlignLeft, Settings2, Check, Hash, CheckSquare, Calendar, Layers, Calculator } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VisibilityRule {
  field: string;
  operator: string;
  value: string;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
  visibilityRules?: VisibilityRule[];
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
  { id: "number", label: "Número", icon: Hash },
  { id: "checkbox", label: "Caixa de seleção", icon: CheckSquare },
  { id: "date", label: "Data", icon: Calendar },
  { id: "multi-select", label: "Seleção múltipla", icon: Layers },
  { id: "decimal", label: "Decimal", icon: Calculator },
  { id: "textarea", label: "Textarea", icon: AlignLeft },
];

export default function FormBuilder({ initialData, onSave, onCancel }: FormBuilderProps) {
  const [formName, setFormName] = useState(initialData?.name || "");
  const [formDescription, setFormDescription] = useState(initialData?.description || "");
  const [fields, setFields] = useState<FormField[]>(initialData?.fields ? JSON.parse(initialData.fields) : []);
  
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const addField = () => {
    if (!newFieldLabel.trim()) return;
    
    const id = `field-${Date.now()}`;
    const newField: FormField = {
      id,
      type: newFieldType,
      label: newFieldLabel,
      required: newFieldRequired,
      options: (newFieldType === "list" || newFieldType === "dropdown" || newFieldType === "multi-select") ? [""] : undefined,
    };
    
    setFields([...fields, newField]);
    setNewFieldLabel("");
    setNewFieldRequired(false);
    setEditingFieldId(id);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateFieldLabel = (id: string, label: string) => {
    setFields(fields.map(f => f.id === id ? { ...f, label } : f));
  };

  const toggleFieldRequired = (id: string) => {
    setFields(fields.map(f => f.id === id ? { ...f, required: !f.required } : f));
  };

  const addVisibilityRule = (fieldId: string) => {
    setFields(fields.map(f => {
      if (f.id === fieldId) {
        const newRule: VisibilityRule = {
          field: "field",
          operator: "equals",
          value: ""
        };
        return { ...f, visibilityRules: [...(f.visibilityRules || []), newRule] };
      }
      return f;
    }));
  };

  const updateVisibilityRule = (fieldId: string, index: number, updates: Partial<VisibilityRule>) => {
    setFields(fields.map(f => {
      if (f.id === fieldId && f.visibilityRules) {
        const newRules = [...f.visibilityRules];
        newRules[index] = { ...newRules[index], ...updates };
        return { ...f, visibilityRules: newRules };
      }
      return f;
    }));
  };

  const removeVisibilityRule = (fieldId: string, index: number) => {
    setFields(fields.map(f => {
      if (f.id === fieldId && f.visibilityRules) {
        return { ...f, visibilityRules: f.visibilityRules.filter((_, i) => i !== index) };
      }
      return f;
    }));
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

  const editingField = fields.find(f => f.id === editingFieldId);

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

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Campos do Formulário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg border border-dashed">
              <div className="flex flex-col md:flex-row gap-4">
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
              </div>
              <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-2">
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
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          {(() => {
                            const Icon = FIELD_TYPES.find(t => t.id === field.type)?.icon || Type;
                            return <Icon className="h-4 w-4 text-muted-foreground" />;
                          })()}
                          <Input
                            value={field.label}
                            onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                            className="h-8 font-medium border-none focus-visible:ring-0 p-0 bg-transparent"
                            data-testid={`input-field-label-${field.id}`}
                          />
                        </div>
                      </div>
                      
                      <div className="opacity-60 pointer-events-none">
                        {field.type === "text" && <Input disabled placeholder="Exemplo de campo de texto" />}
                        {field.type === "textarea" && <Textarea disabled placeholder="Exemplo de área de texto" className="min-h-[80px]" />}
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-fit h-8 gap-2"
                        onClick={() => setEditingFieldId(field.id)}
                        data-testid={`button-configure-field-${field.id}`}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        {field.type === "list" || field.type === "multi-select" 
                          ? `Configurar Valores (${field.options?.filter(o => o.trim()).length || 0})`
                          : "Configurar Campo"}
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeField(field.id)}
                      className="text-destructive hover:bg-destructive/10"
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

      <Dialog open={!!editingFieldId} onOpenChange={(open) => !open && setEditingFieldId(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Configurar Campo: {editingField?.label}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">Configurações do campo</TabsTrigger>
              <TabsTrigger value="visibility">Regras de visibilidade</TabsTrigger>
            </TabsList>

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

              {(editingField?.type === "list" || editingField?.type === "multi-select") && (
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
            </TabsContent>

            <TabsContent value="visibility" className="space-y-4 py-4">
              <div className="space-y-4">
                {(!editingField?.visibilityRules || editingField.visibilityRules.length === 0) ? (
                  <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/10">
                    <Settings2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h3 className="font-medium">Regras de Visibilidade</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Defina condições para que este campo seja exibido no formulário.
                    </p>
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
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {editingField.visibilityRules.map((rule, index) => (
                        <div key={index} className="flex gap-2 items-end bg-muted/20 p-3 rounded-lg border relative group">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Campo</Label>
                              <Select 
                                value={rule.field} 
                                onValueChange={(val) => updateVisibilityRule(editingField.id, index, { field: val })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="field">Campo</SelectItem>
                                  <SelectItem value="status">Status do ticket</SelectItem>
                                  <SelectItem value="sla">SLA</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Operador</Label>
                              <Select 
                                value={rule.operator} 
                                onValueChange={(val) => updateVisibilityRule(editingField.id, index, { operator: val })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {rule.field === "field" && (
                                    <>
                                      <SelectItem value="equals">Igual a</SelectItem>
                                      <SelectItem value="not_equals">Diferente de</SelectItem>
                                      <SelectItem value="contains">Contém</SelectItem>
                                    </>
                                  )}
                                  {rule.field === "status" && (
                                    <>
                                      <SelectItem value="equals">É</SelectItem>
                                      <SelectItem value="not_equals">Não é</SelectItem>
                                    </>
                                  )}
                                  {rule.field === "sla" && (
                                    <>
                                      <SelectItem value="overdue">Atrasado</SelectItem>
                                      <SelectItem value="within">No prazo</SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Valor</Label>
                              <Input 
                                value={rule.value}
                                onChange={(e) => updateVisibilityRule(editingField.id, index, { value: e.target.value })}
                                className="h-9"
                                placeholder="Digite o valor..."
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeVisibilityRule(editingField.id, index)}
                            className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-dashed"
                      onClick={() => addVisibilityRule(editingField.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar outra condição
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" onClick={() => setEditingFieldId(null)}>Concluído</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
