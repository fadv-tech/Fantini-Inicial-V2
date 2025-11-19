import { describe, expect, it } from "vitest";
import { listarTribunais } from "./legalmail-client";

describe("LegalMail API Integration", () => {
  it("deve validar a API Key listando tribunais", async () => {
    // Este teste valida que a API Key está correta
    // O endpoint /api/v1/petition/tribunals é um dos mais simples e não requer parâmetros complexos
    const tribunais = await listarTribunais();
    
    console.log("Tipo da resposta:", typeof tribunais);
    console.log("É array?", Array.isArray(tribunais));
    
    if (typeof tribunais === 'string') {
      console.log("Resposta é string, tentando parse:");
      const parsed = JSON.parse(tribunais);
      console.log("É array após parse?", Array.isArray(parsed));
    }
    
    // Verificar que a resposta é um array
    expect(Array.isArray(tribunais)).toBe(true);
    
    // Verificar que há pelo menos um tribunal na lista
    expect(tribunais.length).toBeGreaterThan(0);
    
    // Verificar estrutura básica dos dados
    // A API retorna {tribunal, sistemas[]} ao invés de {value, label}
    if (tribunais.length > 0) {
      const primeiroTribunal = tribunais[0];
      expect(primeiroTribunal).toHaveProperty("tribunal");
      expect(primeiroTribunal).toHaveProperty("sistemas");
      expect(Array.isArray(primeiroTribunal.sistemas)).toBe(true);
    }
    
    console.log(`✅ API Key válida! ${tribunais.length} tribunais encontrados`);
  }, 30000); // Timeout de 30s para requisição externa
});
