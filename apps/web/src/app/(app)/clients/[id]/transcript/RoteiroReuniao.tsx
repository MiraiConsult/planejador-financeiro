'use client';

type Secao = {
  titulo: string;
  tempo: string;
  intro?: string;
  itens: (string | { sub: string; bullets: string[] })[];
  destaque?: string;
};

const ROTEIRO: Secao[] = [
  {
    titulo: 'Abertura',
    tempo: '5 min',
    intro: 'Quebrar gelo, setar expectativa, confirmar gravação.',
    itens: [
      'Explica: "vou fazer várias perguntas, algumas óbvias, outras invasivas — responda do jeito que vier. Quanto mais número e detalhe, melhor."',
      'Confirma a gravação ("posso gravar pra alimentar nosso sistema?")',
      'Pergunta o que ele espera da consultoria (rastreia expectativa)',
    ],
  },
  {
    titulo: '1. Snapshot pessoal',
    tempo: '5 min',
    itens: [
      'Idade, profissão, há quanto tempo',
      'Estado civil, regime de bens',
      'Filhos? Idade? Dependentes financeiros (pais, irmãos)?',
      'Mora em casa própria, alugada, financiada?',
      'Cidade — tem plano de mudar?',
    ],
  },
  {
    titulo: '2. Renda — entrada do mês',
    tempo: '10 min',
    intro: 'Todas as fontes que entram, mesmo as esporádicas.',
    itens: [
      'Salário CLT — bruto e líquido (pede contracheque)',
      'Pró-labore / dividendos — empresa própria? Quanto distribui?',
      'Renda variável (comissão, bônus, 13º) — média anual',
      'Aluguéis recebidos',
      'Bicos, freelas, royalties',
      'Pensão recebida',
      'Investimentos que pagam mensalmente (FII, dividendos)',
    ],
    destaque: 'Em um mês ruim, quanto entra? Em um mês bom?',
  },
  {
    titulo: '3. Patrimônio — o que tem hoje',
    tempo: '15 min',
    intro: 'Conta tudo que tem valor, mesmo coisas que ele não venderia.',
    itens: [
      {
        sub: 'Líquido (fácil de mexer)',
        bullets: [
          'Conta corrente, poupança — saldo médio',
          'CDB, Tesouro, fundos — quanto e onde',
          'Ações, FIIs, cripto',
          'Previdência privada (PGBL/VGBL)',
        ],
      },
      {
        sub: 'Ilíquido',
        bullets: [
          'Imóveis — endereço, valor estimado, financiado?',
          'Veículos — modelo, ano, valor',
          'Participações societárias — % e valor justo',
          'Coisas de valor (joias, arte) — só se relevante',
        ],
      },
    ],
    destaque:
      'Se vendesse tudo amanhã e pagasse dívidas, quanto sobraria? Tem algo que considera patrimônio mas não geraria dinheiro se precisasse?',
  },
  {
    titulo: '4. Dívidas',
    tempo: '8 min',
    itens: [
      'Cartão de crédito — paga integral? Tem rotativo?',
      'Financiamento imóvel — saldo devedor, parcela, taxa, prazo restante',
      'Financiamento veículo — idem',
      'Crédito consignado, empréstimo pessoal',
      'Cheque especial, parcelado sem juros (limite usado)',
      'Dívidas com família/amigos',
    ],
    destaque: 'Qual dívida te incomoda mais? Por quê?',
  },
  {
    titulo: '5. Gastos — pra onde vai o dinheiro',
    tempo: '15 min',
    intro: 'Não precisa ser exato. Quero ordem de grandeza.',
    itens: [
      {
        sub: 'Fixos (saem todo mês mesmo se ficar em casa)',
        bullets: [
          'Moradia (aluguel/condomínio/IPTU/luz/água/gás/internet)',
          'Educação (escola/faculdade dos filhos, próprios cursos)',
          'Plano de saúde, mensalidades fixas',
          'Transporte (combustível, financiamento, seguro, IPVA rateado)',
          'Empregada, motorista, babá',
        ],
      },
      {
        sub: 'Variáveis (dependem do mês)',
        bullets: [
          'Mercado e farmácia',
          'Restaurantes, delivery, bares',
          'Compras (roupa, casa, eletrônicos)',
          'Viagens — quantas por ano, gasto médio',
          'Lazer (academia, shows, hobbies)',
          'Presentes (Natal, aniversários)',
        ],
      },
    ],
    destaque:
      'Qual gasto te surpreende mais quando olha o cartão? O que cortaria primeiro se precisasse?',
  },
  {
    titulo: '6. Empresa própria (se tiver)',
    tempo: '10 min',
    itens: [
      'Faturamento médio mensal',
      'Margem líquida (sobra depois de tudo)',
      'Quantos sócios, % de cada',
      'CNPJ paga gastos pessoais? Quais?',
      'SaaS, infra, colaboradores — gastos recorrentes',
      'Crescendo, estável, encolhendo?',
    ],
  },
  {
    titulo: '7. Perfil de risco e comportamento',
    tempo: '10 min',
    itens: [
      'Já investiu em algo? O quê? Deu certo ou errado?',
      'Como se sente vendo a carteira cair 30%?',
      'Prefere garantia menor ou aposta de upside?',
      'Quanto consegue separar todo mês pra investir, hoje?',
      'Já passou aperto financeiro? Como reagiu?',
      'Tem reserva de emergência? Quantos meses cobre?',
    ],
  },
  {
    titulo: '8. Eventos futuros previsíveis',
    tempo: '10 min',
    intro: 'Coisas que ele sabe que vão acontecer ou tem grande chance.',
    itens: [
      'Filhos (quantos, em quanto tempo)',
      'Faculdade dos filhos (público/privado/exterior)',
      'Casamento próprio ou de filhos',
      'Troca de carro/casa',
      'Mudança de carreira ou cidade',
      'Aposentadoria — com quantos anos quer parar?',
      'Pais idosos — pode precisar bancar cuidados?',
      'Heranças prováveis',
      'Vai abrir/comprar/vender empresa?',
    ],
  },
  {
    titulo: '9. Objetivos — o porquê de tudo',
    tempo: '8 min',
    intro: 'Pensa em 3 horizontes.',
    itens: [
      'Em 2 anos: o que quer ter ou ter feito',
      'Em 10 anos: como sua vida estaria diferente da de hoje',
      'Aposentadoria: com quantos anos, quanto precisaria por mês',
      'Legado: quer deixar quanto pra quem?',
    ],
    destaque:
      'Se acertasse 100% no plano, o que você teria daqui a 5 anos que não tem hoje?',
  },
  {
    titulo: '10. Bloqueios e medos',
    tempo: '5 min',
    itens: [
      'Qual seu maior medo financeiro?',
      'Já cometeu erro grande? Qual aprendizado?',
      'O que te impede de poupar mais hoje?',
      'Conversa de dinheiro em casa: alinhada ou conflito?',
    ],
  },
  {
    titulo: 'Encerramento',
    tempo: '3 min',
    itens: [
      '"Tem algo que você gostaria que eu soubesse e não perguntei?"',
      '"Qual a pior coisa que poderia acontecer com sua vida financeira nos próximos 12 meses?"',
      'Explica próximos passos (quando vai ter o plano, próxima reunião)',
    ],
  },
];

const DICAS = [
  'Não interrompa números soltos — deixa ele dar a faixa primeiro, depois refina',
  'Pede print/foto na hora de extrato, cartão, contracheque — economiza retrabalho',
  'Frases pra destravar: "Mais ou menos quanto?" / "Em uma escala de 1 a 10..." / "Se tivesse que chutar?"',
  'Marca o tom emocional quando ele falar de dívida/objetivo — alimenta o perfil subjetivo',
  'Não julga mesmo com gasto absurdo ou erro óbvio — corta o fluxo',
];

export function RoteiroReuniao() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 max-h-[75vh] overflow-y-auto text-xs leading-relaxed text-slate-700 dark:text-slate-300 space-y-5">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Roteiro · ~90 min
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Sequência otimizada: começa leve, esquenta nos números, encerra em objetivos.
        </p>
      </div>

      {ROTEIRO.map((s) => (
        <section key={s.titulo} className="space-y-2">
          <header className="flex items-baseline justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-[13px]">
              {s.titulo}
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
              {s.tempo}
            </span>
          </header>

          {s.intro && (
            <p className="italic text-slate-500 dark:text-slate-400 text-[11px]">
              {s.intro}
            </p>
          )}

          <ul className="space-y-1.5 pl-1">
            {s.itens.map((it, i) =>
              typeof it === 'string' ? (
                <li key={i} className="flex gap-2">
                  <span className="text-slate-400 dark:text-slate-600 shrink-0">·</span>
                  <span>{it}</span>
                </li>
              ) : (
                <li key={i} className="space-y-1">
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {it.sub}
                  </p>
                  <ul className="space-y-1 pl-3">
                    {it.bullets.map((b, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-slate-400 dark:text-slate-600 shrink-0">·</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ),
            )}
          </ul>

          {s.destaque && (
            <p className="rounded-lg bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/60 px-3 py-2 text-[11px] text-brand-800 dark:text-brand-200">
              <span className="font-semibold">Pergunta-chave:</span> {s.destaque}
            </p>
          )}
        </section>
      ))}

      <section className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-[13px]">
          Dicas operacionais
        </h3>
        <ul className="space-y-1.5 pl-1">
          {DICAS.map((d, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-slate-400 dark:text-slate-600 shrink-0">·</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
