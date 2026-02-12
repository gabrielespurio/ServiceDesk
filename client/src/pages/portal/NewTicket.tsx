import { useCreateTicket } from "@/hooks/use-tickets";
import { useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type Form as FormDef } from "@shared/schema";
import { type FormField as DynamicField, evaluateVisibility } from "@/components/FormBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, FileQuestion, Paperclip, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewTicket() {
  const [, setLocation] = useLocation();
  const createTicket = useCreateTicket();
  const { toast } = useToast();

  const [selectedArea, setSelectedArea] = useState<string>("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("media");
  const [description, setDescription] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string | string[]>>({});

  const { data: activeForms, isLoading: formsLoading } = useQuery<FormDef[]>({
    queryKey: [api.forms.listActive.path],
  });

  const DEFAULT_FIELD_IDS = ["default_assunto", "default_descricao", "default_prioridade"];
  const DEFAULT_FIELDS: DynamicField[] = [
    { id: "default_assunto", type: "text", label: "Assunto", required: true, placeholder: "Resumo breve do problema", isDefault: true },
    { id: "default_descricao", type: "textarea", label: "Descrição", required: true, placeholder: "Por favor, detalhe os passos para reproduzir o problema...", isDefault: true },
    { id: "default_prioridade", type: "list", label: "Prioridade", required: true, options: ["Baixa", "Média", "Alta", "Crítica"], isDefault: true },
  ];

  const selectedForm = activeForms?.find(f => f.name === selectedArea);
  const formFields: DynamicField[] = (() => {
    if (!selectedForm) return [];
    const parsed: DynamicField[] = JSON.parse(selectedForm.fields);
    const existingDefaultIds = parsed.filter(f => f.isDefault).map(f => f.id);
    const missingDefaults = DEFAULT_FIELDS.filter(df => !existingDefaultIds.includes(df.id));
    if (missingDefaults.length > 0) {
      return [...missingDefaults, ...parsed];
    }
    return parsed;
  })();

  const handleAreaChange = (area: string) => {
    setSelectedArea(area);
    setFormValues({});
  };

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

  const collectVisibleFields = (fields: DynamicField[]): DynamicField[] => {
    const result: DynamicField[] = [];
    for (const field of fields) {
      if (!evaluateVisibility(field, formValues)) continue;
      if (field.type === "section" && field.fields) {
        result.push(...collectVisibleFields(field.fields));
      } else {
        result.push(field);
      }
    }
    return result;
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      toast({ title: "Campo obrigatório", description: "Preencha o assunto do chamado.", variant: "destructive" });
      return false;
    }
    if (title.trim().length < 5) {
      toast({ title: "Assunto muito curto", description: "O assunto deve ter pelo menos 5 caracteres.", variant: "destructive" });
      return false;
    }
    if (!selectedArea) {
      toast({ title: "Campo obrigatório", description: "Selecione a área do chamado.", variant: "destructive" });
      return false;
    }
    if (!description.trim()) {
      toast({ title: "Campo obrigatório", description: "Preencha a descrição do chamado.", variant: "destructive" });
      return false;
    }
    if (description.trim().length < 10) {
      toast({ title: "Descrição muito curta", description: "A descrição deve ter pelo menos 10 caracteres.", variant: "destructive" });
      return false;
    }

    const visibleFields = collectVisibleFields(formFields);
    for (const field of visibleFields) {
      if (field.isDefault) continue;
      if (field.required) {
        const val = formValues[field.id];
        if (!val || (Array.isArray(val) ? val.length === 0 : val.trim() === "")) {
          toast({ title: "Campo obrigatório", description: `Preencha o campo "${field.label}".`, variant: "destructive" });
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const customFieldsData: Record<string, { label: string; value: string | string[]; type: string }> = {};
    const visibleFields = collectVisibleFields(formFields);
    for (const field of visibleFields) {
      if (field.isDefault) continue;
      const val = formValues[field.id];
      if (val !== undefined && val !== "" && !(Array.isArray(val) && val.length === 0)) {
        customFieldsData[field.id] = {
          label: field.label,
          value: val,
          type: field.type,
        };
      }
    }

    createTicket.mutate(
      {
        title,
        category: selectedArea,
        priority: priority as any,
        description,
        customFields: Object.keys(customFieldsData).length > 0 ? JSON.stringify(customFieldsData) : null,
      },
      {
        onSuccess: (data) => {
          setLocation(`/portal/ticket/${data.id}`);
        },
      }
    );
  };

  const renderDefaultField = (field: DynamicField) => {
    if (field.id === "default_assunto") {
      return (
        <div key={field.id} className="space-y-2">
          <Label className="text-sm font-semibold">Assunto <span className="text-destructive font-bold">*</span></Label>
          <Input
            data-testid="input-title"
            placeholder="Resumo breve do problema"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      );
    }
    if (field.id === "default_descricao") {
      return (
        <div key={field.id} className="space-y-2">
          <Label className="text-sm font-semibold">Descrição <span className="text-destructive font-bold">*</span></Label>
          <Textarea
            data-testid="textarea-description"
            placeholder="Por favor, detalhe os passos para reproduzir o problema..."
            className="min-h-[120px] resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      );
    }
    if (field.id === "default_prioridade") {
      return (
        <div key={field.id} className="space-y-2">
          <Label className="text-sm font-semibold">Prioridade</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger data-testid="select-priority">
              <SelectValue placeholder="Selecione a prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    return null;
  };

  const renderDynamicFields = (fieldsToRender: DynamicField[]): React.ReactNode => {
    return fieldsToRender.map((field) => {
      const isVisible = evaluateVisibility(field, formValues);
      if (!isVisible) return null;

      if (field.isDefault) {
        return renderDefaultField(field);
      }

      if (field.type === "section") {
        return (
          <div key={field.id} className="space-y-4 pt-4">
            <h3 className="text-base font-bold text-foreground border-b pb-2" data-testid={`section-${field.id}`}>{field.label}</h3>
            {field.fields && renderDynamicFields(field.fields)}
          </div>
        );
      }

      return (
        <div key={field.id} className="space-y-2">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            {field.label}
            {field.required && <span className="text-destructive font-bold">*</span>}
          </Label>

          {field.type === "text" && (
            <Input
              data-testid={`input-${field.id}`}
              placeholder={field.placeholder || "Digite aqui..."}
              value={(formValues[field.id] as string) || ""}
              onChange={(e) => updateValue(field.id, e.target.value)}
            />
          )}

          {field.type === "textarea" && (
            <Textarea
              data-testid={`textarea-${field.id}`}
              placeholder={field.placeholder || "Descreva detalhadamente..."}
              className="min-h-[100px] resize-none"
              value={(formValues[field.id] as string) || ""}
              onChange={(e) => updateValue(field.id, e.target.value)}
            />
          )}

          {field.type === "number" && (
            <Input
              data-testid={`input-${field.id}`}
              type="number"
              placeholder={field.placeholder || "0"}
              value={(formValues[field.id] as string) || ""}
              onChange={(e) => updateValue(field.id, e.target.value)}
            />
          )}

          {field.type === "decimal" && (
            <Input
              data-testid={`input-${field.id}`}
              type="number"
              step="0.01"
              placeholder={field.placeholder || "0.00"}
              value={(formValues[field.id] as string) || ""}
              onChange={(e) => updateValue(field.id, e.target.value)}
            />
          )}

          {field.type === "list" && (
            <Select
              value={(formValues[field.id] as string) || undefined}
              onValueChange={(val) => updateValue(field.id, val)}
            >
              <SelectTrigger data-testid={`select-${field.id}`}>
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
            <div className="p-3 border rounded-lg space-y-2" data-testid={`multiselect-${field.id}`}>
              <div className="grid grid-cols-2 gap-2">
                {field.options?.map((opt, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Checkbox
                      id={`ticket-${field.id}-${i}`}
                      checked={((formValues[field.id] as string[]) || []).includes(opt)}
                      onCheckedChange={() => toggleMultiValue(field.id, opt)}
                    />
                    <label htmlFor={`ticket-${field.id}-${i}`} className="text-sm font-medium leading-none cursor-pointer">{opt}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {field.type === "checkbox" && (
            <div className="space-y-2" data-testid={`checkbox-${field.id}`}>
              {field.options && field.options.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 p-2">
                  {field.options.map((opt, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <Checkbox
                        id={`ticket-check-${field.id}-${i}`}
                        checked={((formValues[field.id] as string[]) || []).includes(opt)}
                        onCheckedChange={() => toggleMultiValue(field.id, opt)}
                      />
                      <label htmlFor={`ticket-check-${field.id}-${i}`} className="text-sm font-medium leading-none cursor-pointer">{opt}</label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`ticket-check-single-${field.id}`}
                    checked={(formValues[field.id] as string) === "true"}
                    onCheckedChange={(checked) => updateValue(field.id, checked ? "true" : "")}
                  />
                  <label htmlFor={`ticket-check-single-${field.id}`} className="text-sm font-medium leading-none cursor-pointer">{field.label}</label>
                </div>
              )}
            </div>
          )}

          {field.type === "date" && (
            <Input
              data-testid={`date-${field.id}`}
              type="date"
              value={(formValues[field.id] as string) || ""}
              onChange={(e) => updateValue(field.id, e.target.value)}
            />
          )}

          {field.type === "image" && (
            <div className="aspect-video bg-muted/10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3">
              <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground font-medium">Placeholder da Imagem</p>
            </div>
          )}

          {field.type === "attachment" && (
            <div className="p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer">
              <div className="p-3 bg-background rounded-full shadow-sm">
                <Paperclip className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">Clique para anexar arquivos</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG ou ZIP até 10MB</p>
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button
        variant="ghost"
        className="pl-0"
        onClick={() => setLocation("/portal")}
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Chamados
      </Button>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Criar Solicitação</h1>
        <p className="text-muted-foreground">Descreva seu problema e ajudaremos a resolvê-lo.</p>
      </div>

      <Card className="border-border/50 shadow-lg">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Área <span className="text-destructive font-bold">*</span></Label>
              {formsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando áreas...
                </div>
              ) : activeForms && activeForms.length > 0 ? (
                <Select value={selectedArea} onValueChange={handleAreaChange}>
                  <SelectTrigger data-testid="select-area">
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeForms.map((form) => (
                      <SelectItem key={form.id} value={form.name} data-testid={`select-area-${form.id}`}>
                        {form.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <FileQuestion className="h-4 w-4" />
                  Nenhuma área cadastrada
                </div>
              )}
            </div>

            {selectedForm && (
              <div className="space-y-4">
                {renderDynamicFields(formFields)}
              </div>
            )}

            {!selectedForm && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Assunto <span className="text-destructive font-bold">*</span></Label>
                  <Input
                    data-testid="input-title"
                    placeholder="Resumo breve do problema"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Prioridade</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Descrição <span className="text-destructive font-bold">*</span></Label>
                  <Textarea
                    data-testid="textarea-description"
                    placeholder="Por favor, detalhe os passos para reproduzir o problema..."
                    className="min-h-[120px] resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto min-w-[150px]"
                disabled={createTicket.isPending}
                data-testid="button-submit"
              >
                {createTicket.isPending ? "Enviando..." : "Enviar Chamado"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
