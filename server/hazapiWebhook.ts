import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { aiAssistants, aiActions, aiLogs } from "@shared/schema";

const debounceMap = new Map<string, {
  timer: NodeJS.Timeout,
  messages: string[],
  assistantId: number,
  n8nWebhookUrl: string,
  userName?: string
}>();

export async function handleHazapiWebhook(req: any, res: any) {
  try {
    const assistantId = parseInt(req.params.assistantId);
    if (isNaN(assistantId)) {
      return res.status(400).json({ error: "Invalid assistant ID" });
    }

    const payload = req.body;
    console.log("[Hazapi Proxy] Webhook Recebido - Analisando payload:", JSON.stringify(payload, null, 2));
    
    // Ignorar eventos que não sejam mensagens ou sejam enviadas por mim (bot)
    // Hazapi/Evolution API
    const isFromMe = payload?.msg?.key?.fromMe || payload?.message?.key?.fromMe || payload?.fromMe || false;
    const isMessageEvent = payload?.method === "message" || payload?.event === "messages.upsert" || payload?.event === "message";
    
    if (isFromMe) {
      return res.status(200).json({ status: "ignored_from_me" });
    }
    
    // Extrair numero e nome
    const remoteJid = payload?.msg?.key?.remoteJid || payload?.from || payload?.number || payload?.message?.key?.remoteJid;
    if (!remoteJid) {
       return res.status(200).json({ status: "no_remote_jid" });
    }
    
    const phoneNumber = remoteJid.split('@')[0];
    const pushName = payload?.msg?.pushName || payload?.pushName || payload?.message?.pushName || "Usuário";

    // FILTRO DE TESTE: Apenas interagir com o número do usuário (+55 17 99220-4822)
    const allowedNumbers = ["17992204822", "1792204822"];
    const isAllowed = allowedNumbers.some(num => phoneNumber.includes(num));
    if (!isAllowed) {
       console.log(`[Hazapi Proxy] Mensagem ignorada do número (${phoneNumber}). O filtro está ativo apenas para o seu número.`);
       return res.status(200).json({ status: "ignored_unauthorized_number", phoneNumber });
    }

    // Extrair texto e media
    let messageText = payload?.msg?.message?.conversation || 
                      payload?.msg?.message?.extendedTextMessage?.text || 
                      payload?.message?.conversation || 
                      payload?.message?.extendedTextMessage?.text || 
                      payload?.text || "";

    let hasAudio = payload?.msg?.message?.audioMessage || payload?.message?.audioMessage;
    const hasImage = payload?.msg?.message?.imageMessage || payload?.message?.imageMessage;

    if (hasAudio) {
       // Evolution API usually sends base64 if configured
       const base64Audio = hasAudio.base64 || payload?.data?.base64 || payload?.base64;
       
       if (base64Audio) {
         try {
           const [assistant] = await db.select().from(aiAssistants).where(eq(aiAssistants.id, assistantId));
           if (assistant && assistant.apiKey && assistant.provider === 'openai') {
             console.log("[Hazapi Proxy] Transcribing Audio via Whisper API...");
             const buffer = Buffer.from(base64Audio, 'base64');
             const blob = new Blob([buffer], { type: hasAudio.mimetype || "audio/ogg" });
             const formData = new FormData();
             formData.append("file", blob, "audio.ogg");
             formData.append("model", "whisper-1");
             
             const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
               method: "POST",
               headers: { "Authorization": `Bearer ${assistant.apiKey}` },
               body: formData as any
             });
             
             if (whisperRes.ok) {
               const whisperData = await whisperRes.json() as any;
               messageText = `[Áudio Transcrito]: ${whisperData.text}`;
               console.log("[Hazapi Proxy] Audio transcribed successfully:", messageText);
             } else {
               messageText = "[Falha ao transcrever o áudio do usuário (Erro na OpenAI)]";
             }
           } else {
             messageText = "[O usuário enviou um áudio, mas a chave da OpenAI não está configurada para transcrição]";
           }
         } catch (e) {
           console.error("[Hazapi Proxy] Error during Whisper transcription:", e);
           messageText = "[Erro ao processar o áudio do usuário]";
         }
       } else {
         messageText = "[O usuário enviou uma mensagem de áudio, mas o sistema não recebeu o arquivo de mídia (base64 disabled na API)]";
       }
    } else if (hasImage) {
       messageText += "\n[O usuário enviou uma imagem]";
    }

    if (!messageText.trim()) {
       return res.status(200).json({ status: "empty_message" });
    }

    // Obter URL do N8N
    const [action] = await db.select().from(aiActions)
      .where(and(eq(aiActions.assistantId, assistantId), eq(aiActions.actionType, 'n8n')));
      
    if (!action || !action.config) {
      return res.status(404).json({ error: "N8N action not configured for this assistant" });
    }
    
    let n8nConfig;
    try {
      n8nConfig = typeof action.config === 'string' ? JSON.parse(action.config) : action.config;
    } catch(e) {
      return res.status(500).json({ error: "Invalid N8N config" });
    }
    
    const n8nWebhookUrl = n8nConfig.webhookUrl;
    if (!n8nWebhookUrl) {
      return res.status(404).json({ error: "N8N webhook URL not found" });
    }

    // Debounce Logic
    const debounceKey = `${assistantId}_${phoneNumber}`;
    
    if (debounceMap.has(debounceKey)) {
      const existing = debounceMap.get(debounceKey)!;
      clearTimeout(existing.timer);
      existing.messages.push(messageText);
      existing.timer = setTimeout(() => flushDebounce(debounceKey), 2000);
    } else {
      debounceMap.set(debounceKey, {
        assistantId,
        n8nWebhookUrl,
        userName: pushName,
        messages: [messageText],
        timer: setTimeout(() => flushDebounce(debounceKey), 2000)
      });
    }

    res.status(200).json({ status: "queued", delay: 2000 });

  } catch (error: any) {
    console.error("[Hazapi Proxy] Error processing webhook:", error);
    res.status(500).json({ error: error.message });
  }
}

async function flushDebounce(debounceKey: string) {
  const data = debounceMap.get(debounceKey);
  if (!data) return;
  debounceMap.delete(debounceKey);

  const finalMessage = data.messages.join("\n\n");
  const phoneNumber = debounceKey.split('_')[1];

  console.log(`[Hazapi Proxy] Flushing aggregated message for ${phoneNumber}:`, finalMessage);

  // Send to N8N
  try {
    const response = await fetch(data.n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensagem: finalMessage,
        telefone: phoneNumber,
        nome: data.userName
      })
    });
    
    if (!response.ok) {
       console.error(`[Hazapi Proxy] N8N returned error:`, await response.text());
    } else {
       console.log(`[Hazapi Proxy] Successfully sent to N8N`);
    }
  } catch (error) {
    console.error(`[Hazapi Proxy] Failed to trigger N8N:`, error);
  }
}
