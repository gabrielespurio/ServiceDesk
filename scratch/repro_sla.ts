import { Ticket, SlaPolicy, Form } from "./shared/schema";

// Mock data
const ticket: any = {
  id: 13,
  title: "Teste TI Critico",
  category: "TI",
  priority: "critica",
  status: "resolvido",
  createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
  updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Resolved 7 days ago
};

const policies: any[] = [
  {
    id: 1,
    name: "TI - Critico",
    active: true,
    resolutionTime: 60, // 1 hour
    conditions: JSON.stringify({
      all: [
        { field: "form", value: "1" },
        { field: "priority", value: "critica" }
      ]
    })
  }
];

const forms: any[] = [
  { id: 1, name: "TI" }
];

function calculateSla(ticket: any, policies: any[], forms: any[]) {
  const matchingPolicy = policies.find(policy => {
    if (!policy.active) return false;
    try {
      const conditions = JSON.parse(policy.conditions || "[]");
      const condList = Array.isArray(conditions) ? conditions : (conditions.all || []);
      
      if (condList.length === 0) return false;

      return condList.every((c: any) => {
        if (c.field === "form") {
          const targetFormId = Number(c.value);
          const targetForm = forms.find(f => f.id === targetFormId);
          const matchesName = targetForm && ticket.category === targetForm.name;
          return matchesName;
        }
        if (c.field === "priority") return ticket.priority === c.value;
        return true;
      });
    } catch (e) {
      return false;
    }
  });

  if (!matchingPolicy) return null;

  const targetMinutes = matchingPolicy.resolutionTime || 0;
  if (targetMinutes === 0) return null;

  const createdAt = new Date(ticket.createdAt!);
  const deadline = new Date(createdAt.getTime() + targetMinutes * 60000);
  
  const now = new Date();
  const isOverdue = now > deadline && ticket.status !== "resolvido" && ticket.status !== "fechado";
  
  return {
    deadline,
    isOverdue,
    matchingPolicyName: matchingPolicy.name
  };
}

const sla = calculateSla(ticket, policies, forms);
console.log("SLA Object:", JSON.stringify(sla, null, 2));

if (sla) {
    const { formatDistanceToNow } = require("date-fns");
    const { ptBR } = require("date-fns/locale");
    const distance = formatDistanceToNow(new Date(sla.deadline), { locale: ptBR });
    console.log("Distance display:", distance + " restante");
}
