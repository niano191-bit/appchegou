import { MARCA } from "@/lib/marca";
import type { PedidoComItens } from "@/lib/pedidos";
import { formatarReais } from "@/types/database";

function esc(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatarHora(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      timeZone: "America/Bahia",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Monta HTML da comanda (impressora térmica / A4) */
export function htmlComanda(pedido: PedidoComItens) {
  const codigo = pedido.id.slice(0, 8).toUpperCase();
  const total =
    Number(pedido.total) + Number(pedido.taxa_entrega);
  const itens = pedido.itens_pedido
    .map(
      (item) =>
        `<tr>
          <td>${item.quantidade}x</td>
          <td>${esc(item.nome)}</td>
          <td class="dir">${esc(
            formatarReais(Number(item.preco_unitario) * item.quantidade),
          )}</td>
        </tr>`,
    )
    .join("");

  const cliente = pedido.cliente_nome
    ? `<p><strong>Cliente:</strong> ${esc(pedido.cliente_nome)}</p>`
    : "";
  const telefone = pedido.cliente_telefone
    ? `<p><strong>Tel:</strong> ${esc(pedido.cliente_telefone)}</p>`
    : "";
  const obs = pedido.observacao?.trim()
    ? `<p class="obs"><strong>OBS:</strong> ${esc(pedido.observacao.trim())}</p>`
    : "";
  const bairro = pedido.bairro_entrega
    ? ` (${esc(pedido.bairro_entrega)})`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Comanda #${esc(codigo)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ui-monospace, "Courier New", monospace;
      font-size: 13px;
      line-height: 1.35;
      color: #000;
      padding: 12px;
      width: 80mm;
      max-width: 100%;
    }
    h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
    .sub { text-align: center; font-size: 11px; margin-bottom: 10px; }
    .linha { border-top: 1px dashed #000; margin: 8px 0; }
    .cod { font-size: 22px; font-weight: 700; text-align: center; letter-spacing: 1px; }
    p { margin: 3px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    td { padding: 3px 0; vertical-align: top; }
    td:first-child { width: 2.2em; font-weight: 700; }
    .dir { text-align: right; white-space: nowrap; }
    .obs { margin-top: 8px; font-size: 14px; font-weight: 700; }
    .total { font-size: 15px; font-weight: 700; margin-top: 6px; }
    .rodape { text-align: center; font-size: 10px; margin-top: 12px; }
    @media print {
      body { padding: 0; width: 80mm; }
      @page { margin: 4mm; size: auto; }
    }
  </style>
</head>
<body>
  <h1>${esc(MARCA.nome)}</h1>
  <p class="sub">Comanda da cozinha</p>
  <p class="cod">#${esc(codigo)}</p>
  <p class="sub">${esc(formatarHora(pedido.criado_em))}</p>
  <div class="linha"></div>
  ${cliente}
  ${telefone}
  <p><strong>Entrega:</strong> ${esc(pedido.endereco_entrega)}${bairro}</p>
  <div class="linha"></div>
  <table>${itens}</table>
  ${obs}
  <div class="linha"></div>
  <p>Itens: ${esc(formatarReais(Number(pedido.total)))}</p>
  <p>Entrega: ${esc(formatarReais(Number(pedido.taxa_entrega)))}</p>
  <p class="total">TOTAL ${esc(formatarReais(total))}</p>
  <p class="rodape">${esc(MARCA.tagline)}</p>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;
}

/** Abre janela de impressão da comanda */
export function imprimirComanda(pedido: PedidoComItens) {
  if (typeof window === "undefined") return;

  const html = htmlComanda(pedido);
  const janela = window.open("", "_blank", "noopener,noreferrer,width=420,height=720");

  if (!janela) {
    // Pop-up bloqueado: tenta iframe oculto
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.alert(
        "Não foi possível abrir a impressão. Permita pop-ups neste site e tente de novo.",
      );
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }
    }, 250);
    return;
  }

  janela.document.open();
  janela.document.write(html);
  janela.document.close();
}
