import React, { useState, useEffect, useRef } from 'react';
import { Player, Match, Group, TournamentState, KnockoutMatch, KnockoutRound } from '../types';
import { subscribeToTournament, saveTournamentToFirestore } from '../services/firebaseService';

// --- LOGIC HELPERS ---

const generateUUID = () => Math.random().toString(36).substr(2, 9);

const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const DEFAULT_RULES = [
  "🏆 Vitória vale 1.0 ponto, Empate vale 0.5 ponto, e Derrota vale 0.0 pontos.",
  "🖐️ Peça Tocada é Peça Jogada: se TOCAR de propósito em uma peça sua, deve movê-la (se houver lance legal).",
  "🤫 Silêncio absoluto durante a rodada para respeitar a concentração dos adversários.",
  "🤝 Acordo de Empate: os jogadores podem propor empate mutuamente a qualquer momento.",
  "⏱️ Tempo de Jogo: se aplicável, o jogador cujo tempo acabar perde (se o adversário tiver material para mate).",
  "🏁 Final de Partida: após o término, ambos registram o resultado na mesa e arrumam as peças no tabuleiro.",
  "🔍 Critérios de Desempate: 1º Pontos, 2º Vitória no confronto direto, 3º Maior número de vitórias com as pretas."
];

const SUGGESTED_NAMES: Record<string, string[]> = {
  xadrez_dama: [
    "Magnus Carlsen", "Hikaru Nakamura", "Garry Kasparov", "Judit Polgar", "Bobby Fischer", 
    "Viswanathan Anand", "Mikhail Tal", "Anatoly Karpov", "Alireza Firouzja", "Fabiano Caruana",
    "Ding Liren", "Ian Nepomniachtchi", "Wesley So", "Praggnanandhaa R", "Gukesh D", "Nodirbek Abdusattorov"
  ],
  futebol_futsal: [
    "Real Madrid", "Barcelona", "Bayern de Munique", "Manchester City", "PSG", 
    "Liverpool", "Juventus", "Boca Juniors", "River Plate", "Flamengo", "Palmeiras", "São Paulo",
    "Arsenal", "Milan", "Chelsea", "Borussia Dortmund"
  ],
  basquete: [
    "LA Lakers", "Boston Celtics", "Golden State Warriors", "Chicago Bulls", "Miami Heat", 
    "Milwaukee Bucks", "Phoenix Suns", "Brooklyn Nets", "Denver Nuggets", "Dallas Mavericks",
    "Philadelphia 76ers", "New York Knicks", "Houston Rockets", "Toronto Raptors", "Utah Jazz", "Clipper FC"
  ],
  handebol: [
    "Gaviões do Handebol", "Lobos de Ferro", "Panteras Negras", "Tigres de Aço", "Tubarões Vermelhos", 
    "Dragões Verdes", "Fênix Dourada", "Falcões do Cerrado", "Vikings EC", "Spartacus HC",
    "Celtas de Prata", "Gladiadores HC", "Condores de Ouro", "Búfalos Selvagens", "Leões do Norte", "Falcões Reais"
  ],
  volei: [
    "Vôlei Solitário", "Ases das Quadras", "Super Smashers", "Paredão Azul", "Gigantes do Vôlei", 
    "Estrelas do Saque", "Tornado Vôlei", "Esfera de Ouro", "Meninas da Rede", "Bloqueio Forte",
    "Bolas Flutuantes", "Skaters do Ar", "Levantamento Ideal", "Ataque Rápido", "Tsunamis", "Bons de Saque"
  ],
  queimado: [
    "Destruidores FC", "Intocáveis da Quadra", "Esquiva Rápida", "Bola de Fogo", "Guerreiros da Queimada", 
    "Mira Fatal", "Artilharia Total", "Sem Limites", "Desviadores Unidos", "Queimada Total",
    "Foguetes do Pátio", "Impacto Máximo", "Linha de Frente", "Escudo Supremo", "Dodgeball Bros", "Miragem"
  ],
  tenis_mesa: [
    "Mao Zedong", "Fan Zhendong", "Ma Long", "Hugo Calderano", "Timo Boll", "Dimitrij Ovtcharov",
    "Tomokazu Harimoto", "Lin Yun-ju", "Truls Moregard", "Alexis Lebrun", "Felix Lebrun", "Dang Qiu",
    "Bernadette Szocs", "Shin Yubin", "Bruna Takahashi", "Manika Batra"
  ]
};

const GENERIC_NAMES = [
  "André Lucas", "Beatriz Rocha", "Carlos Henrique", "Daniela Costa", "Eduardo Souza",
  "Fernanda Lima", "Gabriel Silva", "Helena Santos", "Igor Moreira", "Juliana Alves",
  "Lucas Oliveira", "Mariana Xavier", "Nuno Mendes", "Olívia Pires", "Paulo Victor", "Renata Cruz"
];

const RULES_PRESETS: Record<string, string[]> = {
  xadrez_dama: [
    "🏆 Vitória vale 1.0 ponto, Empate vale 0.5 ponto, e Derrota vale 0.0 pontos.",
    "🖐️ Peça Tocada é Peça Jogada: se TOCAR de propósito em uma peça sua, deve movê-la (se houver lance legal).",
    "🤫 Silêncio absoluto durante a rodada para respeitar a concentração dos adversários.",
    "🤝 Acordo de Empate: os jogadores podem propor empate mutuamente a qualquer momento.",
    "⏱️ Tempo de Jogo: se aplicável, o jogador cujo tempo acabar perde (se o adversário tiver material para mate).",
    "🏁 Final de Partida: após o término, ambos registram o resultado na mesa e arrumam as peças no tabuleiro.",
    "🔍 Critérios de Desempate: 1º Pontos, 2º Vitória no confronto direto, 3º Maior número de vitórias com as pretas."
  ],
  futebol_futsal: [
    "⚽ Partidas de futebol/futsal com duração a definir pelo organizador.",
    "👥 Substituições são ilimitadas e volantes (pode sair e entrar a qualquer momento).",
    "🟨 Cartão amarelo impõe advertência; 2 cartões na mesma partida resultam em expulsão temporária por 2 minutos.",
    "🟥 Cartão vermelho expulsa definitivamente da partida, desfalcando a equipe temporariamente ou suspendendo para a próxima.",
    "🏆 Vitória vale 3 pontos, Empate vale 1 ponto e Derrota vale 0 pontos na fase de grupos.",
    "⏱️ Na fase de mata-mata, empates são decididos por pênaltis (3 ou 5 cobranças regulamentares).",
    "🏁 Fair Play: Cumprimentar os adversários antes e após o jogo é obrigatório."
  ],
  basquete: [
    "🏀 Partidas jogadas em quartos de tempo ou único período corrido uniforme.",
    "🚫 Não existem empates no basquete. Se empatar no tempo regulamentar, jogam-se prorrogações até que haja um vencedor.",
    "🏆 Cesta de quadra vale 2 pontos; Cesta de trás da linha de três pontos vale 3 pontos; Lance livre vale 1 ponto.",
    "🖐️ Violações de duplo drible ou andar com a bola resultam em perda da posse de bola.",
    "💥 Limite de faltas individuais: jogador com 5 faltas deve ser substituído temporariamente.",
    "🏁 Respeito mútuo às marcações dos árbitros e aos companheiros.",
    "🔍 Critérios de Desempate: 1º Saldo de Cestas, 2º Cestas Marcadas."
  ],
  handebol: [
    "🤾 Partidas com dois tempos iguais de corrida contínua.",
    "🏆 Vitória vale 3 pontos, Empate vale 1 ponto e Derrota vale 0 pontos na fase de grupos.",
    "🚫 É proibido dar mais de 3 passos sem quicar a bola ou segurá-la por mais de 3 segundos.",
    "🔕 Somente o goleiro pode pisar na área de gol demarcada de 6 metros.",
    "⏱️ Na fase mata-mata, empates são decididos por cobranças de tiros de 7 metros.",
    "🛡️ Substituições são volantes e feitas exclusivamente na zona de substituição.",
    "🏁 Respeito e integridade física em todas as disputas de bola."
  ],
  volei: [
    "🏐 Jogos disputados em Sets (ex. melhor de 3 ou melhor de 5 sets). Cada set vai até 25 pontos (com diferença de 2).",
    "🚫 Não há empates. Um time deve vencer o set e a partida final.",
    "🖐️ É permitido no máximo 3 toques na bola por equipe antes de enviá-la ao campo adversário (sem toque duplo).",
    "❌ Toques na rede do adversário ou invasão de quadra por baixo da rede constituem falta imediata.",
    "🔄 Rotação de saque: os jogadores devem rodar no sentido horário antes de cada novo saque de sua posse.",
    "🏁 O toque do bloqueio não conta como um dos três toques da equipe."
  ],
  queimado: [
    "☄️ Objetivo: Queimar (eliminar) todos os integrantes do time adversário jogando a bola neles.",
    "🛡️ Proteção: Se o jogador segurar a bola no ar sem deixá-la cair, ele NÃO está queimado e salva a posse do time.",
    "💀 Cemitério: Jogadores queimados vão para a linha de fundo adversária e ganham o direito de tentar queimar dali.",
    "🚫 Linha central: Não é permitido ultrapassar a linha divisória de quadra sob pena de falha técnica.",
    "🏆 Vitória vai para a equipe que queimar todos os adversários primeiro (ou tiver mais vivos ao fim do tempo de jogo).",
    "🤫 Conduta desportiva e diversão em primeiro lugar!"
  ],
  tenis_mesa: [
    "🏓 Partidas jogadas em melhor de 3 ou 5 sets de 11 pontos cada (com vantagem de 2 em caso de empate).",
    "🔄 Saque: o sacador deve lançar a bola para cima a pelo menos 16cm e rebater na sua metade de modo que pingue no lado adversário.",
    "🔀 No jogo de duplas, o saque deve ser rebatido obrigatoriamente na diagonal.",
    "🛡️ Toques com a raquete são válidos, mas a mão livre do jogador não pode tocar na mesa durante o andamento do ponto.",
    "🏁 O jogador que sacar perde o ponto se cometer falta visível de saque."
  ],
  outro: [
    "🏆 Vitória vale 3 pontos, Empate vale 1 ponto e Derrota vale 0 pontos (ou à escolha do organizador).",
    "🤝 Espírito esportivo e respeito mútuo em todas as fases do torneio.",
    "📐 Regras customizadas e tempos de jogo devem ser combinados com o árbitro antes do certame.",
    "🏁 Todas as partidas devem registrar seus súmulas de forma justa."
  ]
};

function getRoundName(matchCount: number, isPrelim: boolean = false): string {
  if (isPrelim) return "Fase Preliminar";
  if (matchCount === 1) return "Grande Final 🏆";
  if (matchCount === 2) return "Semifinais 🔥";
  if (matchCount === 4) return "Quartas de Final ⚔️";
  if (matchCount === 8) return "Oitavas de Final";
  if (matchCount === 16) return "Dezesseis-avos de Final";
  return `Rodada de ${matchCount * 2}`;
}

const buildKnockoutStructure = (bracketPlayers: Player[]): KnockoutRound[] => {
  const pCount = bracketPlayers.length;
  if (pCount === 0) return [];
  
  let P = 1;
  while (P * 2 < pCount) {
    P *= 2;
  }
  
  const isPowerOf2 = (pCount & (pCount - 1)) === 0;
  const rounds: KnockoutRound[] = [];
  
  if (isPowerOf2) {
    let currentMatchesCount = pCount / 2;
    let roundIdx = 0;
    let previousRoundMatches: KnockoutMatch[] = [];
    
    // First round (direct matchups)
    const firstRoundMatches: KnockoutMatch[] = [];
    for (let m = 0; m < currentMatchesCount; m++) {
      firstRoundMatches.push({
        id: generateUUID(),
        p1Id: bracketPlayers[2 * m].id,
        p2Id: bracketPlayers[2 * m + 1].id,
        roundIndex: 0,
        matchIndex: m
      });
    }
    rounds.push({
      name: getRoundName(currentMatchesCount),
      matches: firstRoundMatches
    });
    
    previousRoundMatches = firstRoundMatches;
    roundIdx = 1;
    currentMatchesCount = Math.floor(currentMatchesCount / 2);
    
    while (currentMatchesCount >= 1) {
      const nextRoundMatches: KnockoutMatch[] = [];
      for (let m = 0; m < currentMatchesCount; m++) {
        const parentMatch1 = previousRoundMatches[2 * m];
        const parentMatch2 = previousRoundMatches[2 * m + 1];
        
        nextRoundMatches.push({
          id: generateUUID(),
          p1Id: null,
          p2Id: null,
          roundIndex: roundIdx,
          matchIndex: m,
          p1SourceMatchId: parentMatch1.id,
          p2SourceMatchId: parentMatch2.id
        } as any);
      }
      rounds.push({
        name: getRoundName(currentMatchesCount),
        matches: nextRoundMatches
      });
      previousRoundMatches = nextRoundMatches;
      roundIdx++;
      currentMatchesCount = Math.floor(currentMatchesCount / 2);
    }
  } else {
    // Non-power of 2: preliminary bracket logic!
    const numRound0Matches = pCount - P;
    const numRound1Matches = P / 2;
    
    const byePlayers: string[] = [];
    const r0Players: string[] = [];
    const numByes = 2 * P - pCount;
    
    for (let i = 0; i < numByes; i++) {
      byePlayers.push(bracketPlayers[i].id);
    }
    for (let i = numByes; i < pCount; i++) {
      r0Players.push(bracketPlayers[i].id);
    }
    
    const round0Matches: KnockoutMatch[] = [];
    for (let m = 0; m < numRound0Matches; m++) {
      round0Matches.push({
        id: generateUUID(),
        p1Id: r0Players[2 * m],
        p2Id: r0Players[2 * m + 1],
        roundIndex: 0,
        matchIndex: m
      });
    }
    rounds.push({
      name: getRoundName(numRound0Matches, true),
      matches: round0Matches
    });
    
    // Round 1 (of size P/2)
    const r1Sources: { type: 'bye' | 'match_winner'; id?: string; sourceMatchIndex?: number }[] = [];
    byePlayers.forEach(id => {
      r1Sources.push({ type: 'bye', id });
    });
    for (let m = 0; m < numRound0Matches; m++) {
      r1Sources.push({ type: 'match_winner', sourceMatchIndex: m });
    }
    
    const round1Matches: KnockoutMatch[] = [];
    for (let m = 0; m < numRound1Matches; m++) {
      const src1 = r1Sources[2 * m];
      const src2 = r1Sources[2 * m + 1];
      
      round1Matches.push({
        id: generateUUID(),
        p1Id: src1.type === 'bye' ? src1.id! : null,
        p2Id: src2.type === 'bye' ? src2.id! : null,
        roundIndex: 1,
        matchIndex: m,
        p1SourceMatchId: src1.type === 'match_winner' ? round0Matches[src1.sourceMatchIndex!].id : undefined,
        p2SourceMatchId: src2.type === 'match_winner' ? round0Matches[src2.sourceMatchIndex!].id : undefined
      } as any);
    }
    rounds.push({
      name: getRoundName(numRound1Matches),
      matches: round1Matches
    });
    
    let currentMatchesInRound = round1Matches;
    let currentRoundIndex = 2;
    
    while (currentMatchesInRound.length > 1) {
      const nextRoundMatchesCount = Math.floor(currentMatchesInRound.length / 2);
      const nextRoundMatches: KnockoutMatch[] = [];
      
      for (let m = 0; m < nextRoundMatchesCount; m++) {
        const parentMatch1 = currentMatchesInRound[2 * m];
        const parentMatch2 = currentMatchesInRound[2 * m + 1];
        
        nextRoundMatches.push({
          id: generateUUID(),
          p1Id: null,
          p2Id: null,
          roundIndex: currentRoundIndex,
          matchIndex: m,
          p1SourceMatchId: parentMatch1.id,
          p2SourceMatchId: parentMatch2.id
        } as any);
      }
      
      rounds.push({
        name: getRoundName(nextRoundMatchesCount),
        matches: nextRoundMatches
      });
      
      currentMatchesInRound = nextRoundMatches;
      currentRoundIndex++;
    }
  }
  
  return rounds;
};

// --- COMPONENT ---

export const TournamentsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  
  // Setup Wizard State
  const [setupStep, setSetupStep] = useState<0 | 1 | 2 | 3>(0); // 0: Modality & Team type, 1: Count, 2: Format option, 3: Names
  const [modality, setModality] = useState<'xadrez_dama' | 'futebol_futsal' | 'basquete' | 'handebol' | 'volei' | 'queimado' | 'tenis_mesa' | 'outro'>('xadrez_dama');
  const [participantType, setParticipantType] = useState<'individual' | 'team'>('individual');
  const [playerCount, setPlayerCount] = useState(8);
  const [selectedFormat, setSelectedFormat] = useState<'mata_mata' | 'grupos_mata_mata' | 'grupo_unico'>('grupos_mata_mata');
  const [selectedNumGroups, setSelectedNumGroups] = useState(2);
  const [numAdvancers, setNumAdvancers] = useState<1 | 2>(2);
  const [finalsStyle, setFinalsStyle] = useState<'copa_do_mundo' | 'tradicional'>('copa_do_mundo');
  
  const [playerInputs, setPlayerInputs] = useState<{name: string, class: string}[]>([]);
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);

  // Tournament Data
  const [tData, setTData] = useState<TournamentState>({
    stage: 'setup',
    players: [],
    groups: [],
    matches: [],
    finalMatches: [],
    finalPlayers: [],
    modality: 'xadrez_dama',
    participantType: 'individual',
    format: 'grupos_mata_mata'
  });

  // Rules State
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [rulesDraft, setRulesDraft] = useState('');

  const isRemoteUpdate = useRef(false);

  // --- SYNC ---
  useEffect(() => {
    const unsub = subscribeToTournament((data) => {
      if (data) {
        isRemoteUpdate.current = true;
        setTData(data);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    // Simple debounce to save state
    const timer = setTimeout(() => {
      saveTournamentToFirestore(tData);
    }, 500);
    return () => clearTimeout(timer);
  }, [tData]);

  // --- RULES HANDLERS ---
  const rulesList = tData.rules || DEFAULT_RULES;

  const handleStartEditRules = () => {
    setRulesDraft(rulesList.join('\n'));
    setIsEditingRules(true);
  };

  const handleSaveRules = () => {
    const parsedRules = rulesDraft
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    setTData(prev => ({
      ...prev,
      rules: parsedRules
    }));
    setIsEditingRules(false);
  };

  const handleResetRules = () => {
    if (window.confirm("Deseja restaurar as regras para o padrão de xadrez?")) {
      setTData(prev => ({
        ...prev,
        rules: DEFAULT_RULES
      }));
      setRulesDraft(DEFAULT_RULES.join('\n'));
      setIsEditingRules(false);
    }
  };

  const renderRulesCard = (isSidebar: boolean = false) => {
    const currentRules = tData.rules || DEFAULT_RULES;

    return (
      <div className={`glass-panel p-6 rounded-xl flex flex-col h-full bg-slate-900 border border-white/20 text-white relative overflow-hidden ${isSidebar ? 'shadow-xl' : 'shadow-2xl'}`}>
        <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-8xl select-none pointer-events-none">
          📋
        </div>
        
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="font-bold text-slate-100 uppercase tracking-wider text-xs md:text-sm">
              Regras do Torneio
            </span>
          </div>
          <button
            onClick={handleStartEditRules}
            className="text-xs text-blue-400 hover:text-blue-300 font-bold hover:underline transition uppercase tracking-wider"
          >
            Editar
          </button>
        </div>

        {isEditingRules ? (
          <div className="flex-1 flex flex-col space-y-3 relative z-10 animate-fade-in">
            <p className="text-[10px] text-slate-400">
              Insira uma regra por linha. Você pode usar emojis para destacar!
            </p>
            <textarea
              className="w-full flex-1 min-h-[220px] bg-slate-850 border border-white/10 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 font-medium focus:ring-2 focus:ring-blue-500 outline-none custom-scrollbar"
              placeholder="Digite as regras aqui..."
              value={rulesDraft}
              onChange={(e) => setRulesDraft(e.target.value)}
            />
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setIsEditingRules(false)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetRules}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-950/40 border border-red-500/35 text-red-300 hover:bg-red-900/40 transition"
              >
                Padrão 🔄
              </button>
              <button
                onClick={handleSaveRules}
                className="px-3.5 py-1 text-[11px] font-bold rounded-lg bg-green-600 text-white hover:bg-green-700 transition shadow-md"
              >
                Salvar ✅
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between relative z-10">
            <ul className="space-y-3 text-[11px] md:text-xs text-slate-200 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar">
              {currentRules.map((rule, idx) => (
                <li key={idx} className="flex gap-2 items-start">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-800 border border-white/5 text-[9px] text-slate-400 shrink-0 mt-0.5 font-bold">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
            
            <p className="text-[9px] text-slate-400 border-t border-white/5 mt-4 pt-3 text-center italic">
              *Qualquer dúvida ou caso omisso, consulte o árbitro ou professor organizador.
            </p>
          </div>
        )}
      </div>
    );
  };

  // --- ACTIONS ---

  const triggerFullScreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => {
        console.warn("Error attempting to enable full-screen mode:", err);
      });
    }
  };

  const exitFullScreen = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch((err) => console.warn(err));
    }
  };

  const handleCountConfirm = () => {
    if (playerCount < 3) {
      alert("Mínimo de 3 participantes.");
      return;
    }
    setPlayerInputs(Array.from({ length: playerCount }, () => ({ name: '', class: '' })));
    setSetupStep(2); // Jump to formatDetails selection
  };

  const autofillPlayers = () => {
    const list = SUGGESTED_NAMES[modality] || GENERIC_NAMES;
    const shuffledList = [...list];
    // Shuffle slightly
    for (let i = shuffledList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledList[i], shuffledList[j]] = [shuffledList[j], shuffledList[i]];
    }

    const newInputs = Array.from({ length: playerCount }, (_, i) => {
      const name = i < shuffledList.length ? shuffledList[i] : `${participantType === 'team' ? 'Equipe' : 'Jogador'} ${i + 1}`;
      const classes = ["6º Ano A", "7º Ano B", "8º Ano A", "9º Ano C", "Clube Geral"];
      const randomClass = classes[Math.floor(Math.random() * classes.length)];
      return {
        name,
        class: randomClass
      };
    });
    setPlayerInputs(newInputs);
  };

  const updatePlayerInput = (index: number, field: 'name' | 'class', value: string) => {
    const newInputs = [...playerInputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setPlayerInputs(newInputs);
  };

  const startTournament = () => {
    const validInputs = playerInputs.filter(p => p.name.trim() !== '');
    if (validInputs.length !== playerCount) {
      alert(`Por favor, preencha o nome de todos os ${playerCount} participantes.`);
      return;
    }

    const pNameType = participantType === 'team' ? 'Equipe' : 'Jogador';

    const players: Player[] = validInputs.map(p => ({
      id: generateUUID(),
      name: p.name.trim(),
      class: p.class.trim() || 'Geral',
      points: 0, wins: 0, draws: 0, losses: 0, gamesPlayed: 0,
      goalsFor: 0, goalsAgainst: 0
    }));

    const shuffledPlayers = shuffleArray([...players]);

    if (selectedFormat === 'mata_mata') {
      const knockoutRounds = buildKnockoutStructure(shuffledPlayers);
      if (knockoutRounds.length === 0) return;
      
      setTData({
        stage: 'finals',
        players: shuffledPlayers,
        groups: [],
        matches: [],
        finalMatches: [],
        finalPlayers: shuffledPlayers.map(p => p.id),
        modality,
        participantType,
        format: 'mata_mata',
        knockoutRounds,
        currentKnockoutRoundIndex: 0,
        rules: RULES_PRESETS[modality] || RULES_PRESETS.outro
      });
      setActiveRoundIndex(0);
      return;
    }

    if (selectedFormat === 'grupo_unico') {
      const groups: Group[] = [{
        id: 0,
        name: 'Grupo Único',
        players: shuffledPlayers.map(p => p.id)
      }];

      const matches: Match[] = [];
      const pIds = groups[0].players;
      for (let i = 0; i < pIds.length; i++) {
        for (let j = i + 1; j < pIds.length; j++) {
          matches.push({
            id: generateUUID(),
            p1Id: pIds[i],
            p2Id: pIds[j],
            result: null,
            p1Score: undefined,
            p2Score: undefined,
            groupIndex: 0
          });
        }
      }

      setTData({
        stage: 'groups',
        players: shuffledPlayers,
        groups,
        matches,
        finalMatches: [],
        finalPlayers: [],
        modality,
        participantType,
        format: 'grupo_unico',
        rules: RULES_PRESETS[modality] || RULES_PRESETS.outro
      });
      return;
    }

    // --- COPA DO MUNDO STYLE PREPARATIONS ---
    const groups: Group[] = Array.from({ length: selectedNumGroups }, (_, i) => ({
      id: i,
      name: `Grupo ${String.fromCharCode(65 + i)}`,
      players: []
    }));

    shuffledPlayers.forEach((p, idx) => {
      const groupIdx = idx % selectedNumGroups;
      groups[groupIdx].players.push(p.id);
    });

    const matches: Match[] = [];
    groups.forEach(group => {
      const pIds = group.players;
      for (let i = 0; i < pIds.length; i++) {
        for (let j = i + 1; j < pIds.length; j++) {
          matches.push({
            id: generateUUID(),
            p1Id: pIds[i],
            p2Id: pIds[j],
            result: null,
            p1Score: undefined,
            p2Score: undefined,
            groupIndex: group.id
          });
        }
      }
    });

    setTData({
      stage: 'groups',
      players: shuffledPlayers,
      groups,
      matches,
      finalMatches: [],
      finalPlayers: [],
      modality,
      participantType,
      format: 'grupos_mata_mata',
      numAdvancersPerGroup: numAdvancers,
      finalsFormat: finalsStyle,
      rules: RULES_PRESETS[modality] || RULES_PRESETS.outro
    });
  };

  // --- GAMEPLAY ACTIONS ---

  const handleScoreChange = (matchId: string, side: 'p1' | 'p2', score: number | undefined, isFinal: boolean = false) => {
    const matchType = isFinal ? 'finalMatches' : 'matches';
    
    setTData(prev => {
      const newMatches = prev[matchType].map(m => {
        if (m.id === matchId) {
          const updated = { ...m };
          if (side === 'p1') updated.p1Score = score;
          else updated.p2Score = score;
          
          if (updated.p1Score !== undefined && updated.p2Score !== undefined) {
            if (updated.p1Score > updated.p2Score) {
              updated.result = '1-0';
            } else if (updated.p1Score < updated.p2Score) {
              updated.result = '0-1';
            } else {
              updated.result = '0.5-0.5';
            }
          } else {
            updated.result = null;
          }
          return updated;
        }
        return m;
      });
      
      return {
        ...prev,
        [matchType]: newMatches
      };
    });
  };

  const updateMatchResult = (matchId: string, result: '1-0' | '0-1' | '0.5-0.5', isFinal: boolean = false) => {
    const matchType = isFinal ? 'finalMatches' : 'matches';
    
    setTData(prev => {
      const newMatches = prev[matchType].map(m => 
        m.id === matchId ? { ...m, result } : m
      );
      return {
        ...prev,
        [matchType]: newMatches
      };
    });
  };

  const handleKnockoutScoreOrWinnerChange = (matchId: string, p1Sc: number | undefined, p2Sc: number | undefined, chosenWinnerId?: string) => {
    setTData(prev => {
      if (!prev.knockoutRounds) return prev;
      
      let winnerId = chosenWinnerId;
      
      if (p1Sc !== undefined && p2Sc !== undefined && !winnerId) {
        const match = prev.knockoutRounds.flatMap(r => r.matches).find(m => m.id === matchId);
        if (match) {
          if (p1Sc > p2Sc && match.p1Id) winnerId = match.p1Id;
          else if (p2Sc > p1Sc && match.p2Id) winnerId = match.p2Id;
        }
      }
      
      const newRounds = prev.knockoutRounds.map(round => ({
        ...round,
        matches: round.matches.map(m => {
          if (m.id === matchId) {
            return { 
              ...m, 
              p1Score: p1Sc, 
              p2Score: p2Sc, 
              winnerId: winnerId 
            };
          }
          return m;
        })
      }));
      
      // Dynamic downstream bracket player advancement propagation
      for (let r = 0; r < newRounds.length - 1; r++) {
        const currentRoundMatches = newRounds[r].matches;
        const nextRoundMatches = newRounds[r + 1].matches;
        
        nextRoundMatches.forEach(nextMatch => {
          const parent1 = currentRoundMatches.find(cm => cm.id === (nextMatch as any).p1SourceMatchId);
          const parent2 = currentRoundMatches.find(cm => cm.id === (nextMatch as any).p2SourceMatchId);
          
          if (parent1) {
            const oldP1Id = nextMatch.p1Id;
            nextMatch.p1Id = parent1.winnerId || null;
            if (oldP1Id !== nextMatch.p1Id) {
              nextMatch.winnerId = undefined;
              nextMatch.p1Score = undefined;
              nextMatch.p2Score = undefined;
            }
          }
          if (parent2) {
            const oldP2Id = nextMatch.p2Id;
            nextMatch.p2Id = parent2.winnerId || null;
            if (oldP2Id !== nextMatch.p2Id) {
              nextMatch.winnerId = undefined;
              nextMatch.p1Score = undefined;
              nextMatch.p2Score = undefined;
            }
          }
        });
      }
      
      const lastRound = newRounds[newRounds.length - 1];
      const finalMatch = lastRound.matches[0];
      let newStage = prev.stage;
      let newFinalPlayers = prev.finalPlayers;
      
      if (finalMatch?.winnerId) {
        newStage = 'finished';
        newFinalPlayers = [finalMatch.winnerId];
      }
      
      return {
        ...prev,
        knockoutRounds: newRounds,
        stage: newStage,
        finalPlayers: newFinalPlayers
      };
    });
  };

  const getGroupStandings = (groupId: number, playerIds: string[]) => {
    const isSport = tData.modality && tData.modality !== 'xadrez_dama' && tData.modality !== 'outro';
    const groupMatches = tData.matches.filter(m => m.groupIndex === groupId);
    
    const statsMap: Record<string, {
      points: number;
      wins: number;
      draws: number;
      losses: number;
      gamesPlayed: number;
      goalsFor: number;
      goalsAgainst: number;
    }> = {};
    
    playerIds.forEach(id => {
      statsMap[id] = { points: 0, wins: 0, draws: 0, losses: 0, gamesPlayed: 0, goalsFor: 0, goalsAgainst: 0 };
    });

    groupMatches.forEach(m => {
      if (m.result === null) return;
      
      const p1 = statsMap[m.p1Id];
      const p2 = statsMap[m.p2Id];
      if (!p1 || !p2) return;

      p1.gamesPlayed++;
      p2.gamesPlayed++;

      const p1Sc = m.p1Score !== undefined ? m.p1Score : 0;
      const p2Sc = m.p2Score !== undefined ? m.p2Score : 0;
      
      p1.goalsFor += p1Sc;
      p1.goalsAgainst += p2Sc;
      p2.goalsFor += p2Sc;
      p2.goalsAgainst += p1Sc;

      if (isSport) {
        if (m.result === '1-0') {
          p1.points += 3;
          p1.wins++;
          p2.losses++;
        } else if (m.result === '0-1') {
          p2.points += 3;
          p2.wins++;
          p1.losses++;
        } else {
          p1.points += 1;
          p1.draws++;
          p2.points += 1;
          p2.draws++;
        }
      } else {
        if (m.result === '1-0') {
          p1.points += 1;
          p1.wins++;
          p2.losses++;
        } else if (m.result === '0-1') {
          p2.points += 1;
          p2.wins++;
          p1.losses++;
         } else {
          p1.points += 0.5;
          p1.draws++;
          p2.points += 0.5;
          p2.draws++;
        }
      }
    });

    return playerIds.map(id => {
      const p = tData.players.find(pl => pl.id === id)!;
      return { ...p, ...statsMap[id] };
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      
      if (isSport) {
        const sgB = b.goalsFor - b.goalsAgainst;
        const sgA = a.goalsFor - a.goalsAgainst;
        if (sgB !== sgA) return sgB - sgA; 
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor; 
      }
      
      if (b.wins !== a.wins) return b.wins - a.wins;
      return 0;
    });
  };

  const getSortedPlayers = (playerIds: string[]) => {
    const isSport = tData.modality && tData.modality !== 'xadrez_dama' && tData.modality !== 'outro';
    const matchesToCheck = tData.finalMatches;
    
    const statsMap: Record<string, {
      points: number;
      wins: number;
      draws: number;
      losses: number;
      gamesPlayed: number;
      goalsFor: number;
      goalsAgainst: number;
    }> = {};
    
    playerIds.forEach(id => {
      statsMap[id] = { points: 0, wins: 0, draws: 0, losses: 0, gamesPlayed: 0, goalsFor: 0, goalsAgainst: 0 };
    });

    matchesToCheck.forEach(m => {
      if (m.result === null) return;
      
      const p1 = statsMap[m.p1Id];
      const p2 = statsMap[m.p2Id];
      if (!p1 || !p2) return;

      p1.gamesPlayed++;
      p2.gamesPlayed++;

      const p1Sc = m.p1Score !== undefined ? m.p1Score : 0;
      const p2Sc = m.p2Score !== undefined ? m.p2Score : 0;
      
      p1.goalsFor += p1Sc;
      p1.goalsAgainst += p2Sc;
      p2.goalsFor += p2Sc;
      p2.goalsAgainst += p1Sc;

      if (isSport) {
        if (m.result === '1-0') {
          p1.points += 3;
          p1.wins++;
          p2.losses++;
        } else if (m.result === '0-1') {
          p2.points += 3;
          p2.wins++;
          p1.losses++;
        } else if (m.result === '0.5-0.5') {
          p1.points += 1;
          p1.draws++;
          p2.points += 1;
          p2.draws++;
        }
      } else {
        if (m.result === '1-0') {
          p1.points += 1;
          p1.wins++;
          p2.losses++;
        } else if (m.result === '0-1') {
          p2.points += 1;
          p2.wins++;
          p1.losses++;
        } else if (m.result === '0.5-0.5') {
          p1.points += 0.5;
          p1.draws++;
          p2.points += 0.5;
          p2.draws++;
        }
      }
    });

    return playerIds.map(id => {
      const p = tData.players.find(pl => pl.id === id)!;
      return { ...p, ...statsMap[id] };
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      
      if (isSport) {
        const sgB = b.goalsFor - b.goalsAgainst;
        const sgA = a.goalsFor - a.goalsAgainst;
        if (sgB !== sgA) return sgB - sgA;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      }
      
      if (b.wins !== a.wins) return b.wins - a.wins;
      return 0;
    });
  };

  const advanceToFinals = () => {
    if (tData.format === 'grupos_mata_mata' && tData.finalsFormat === 'copa_do_mundo') {
      const qualifiers: { playerId: string; rank: number; groupIdx: number }[] = [];
      
      tData.groups.forEach((g, gIdx) => {
        const sorted = getGroupStandings(g.id, g.players);
        const limit = tData.numAdvancersPerGroup || 1;
        for (let rank = 0; rank < Math.min(limit, sorted.length); rank++) {
          qualifiers.push({
            playerId: sorted[rank].id,
            rank: rank + 1, 
            groupIdx: gIdx
          });
        }
      });

      const bracketPlayers: Player[] = [];
      const numGroups = tData.groups.length;

      if (tData.numAdvancersPerGroup === 2 && numGroups > 1) {
        // Copa do Mundo Seed Matchings
        for (let i = 0; i < numGroups; i += 2) {
          const g1 = i;
          const g2 = (i + 1) % numGroups;
          
          const g1_1st = qualifiers.find(q => q.groupIdx === g1 && q.rank === 1);
          const g1_2nd = qualifiers.find(q => q.groupIdx === g1 && q.rank === 2);
          const g2_1st = qualifiers.find(q => q.groupIdx === g2 && q.rank === 1);
          const g2_2nd = qualifiers.find(q => q.groupIdx === g2 && q.rank === 2);
          
          if (g1_1st) bracketPlayers.push(tData.players.find(p => p.id === g1_1st.playerId)!);
          if (g2_2nd) bracketPlayers.push(tData.players.find(p => p.id === g2_2nd.playerId)!);
          if (g2_1st) bracketPlayers.push(tData.players.find(p => p.id === g2_1st.playerId)!);
          if (g1_2nd) bracketPlayers.push(tData.players.find(p => p.id === g1_2nd.playerId)!);
        }
      } else {
        qualifiers.forEach(q => {
          const p = tData.players.find(pl => pl.id === q.playerId);
          if (p) bracketPlayers.push(p);
        });
      }

      if (bracketPlayers.length === 0) {
        alert("Nenhum classificado elegível.");
        return;
      }

      const knockoutRounds = buildKnockoutStructure(bracketPlayers);

      setTData(prev => ({
        ...prev,
        stage: 'finals',
        knockoutRounds,
        finalPlayers: bracketPlayers.map(p => p.id)
      }));
      setActiveRoundIndex(0);
      return;
    }

    // Circular finals
    const finalists: string[] = [];
    tData.groups.forEach(g => {
      const sorted = getGroupStandings(g.id, g.players);
      if (sorted.length > 0) finalists.push(sorted[0].id);
    });

    if (tData.groups.length === 1) {
       triggerFullScreen();
       setTData(prev => ({ ...prev, stage: 'finished', finalPlayers: finalists }));
       return;
    }

    const finalMatches: Match[] = [];
    for (let i = 0; i < finalists.length; i++) {
        for (let j = i + 1; j < finalists.length; j++) {
          finalMatches.push({
            id: generateUUID(),
            p1Id: finalists[i],
            p2Id: finalists[j],
            result: null,
            p1Score: undefined,
            p2Score: undefined,
            groupIndex: -1
          });
        }
    }

    setTData(prev => ({
      ...prev,
      stage: 'finals',
      finalPlayers: finalists,
      finalMatches
    }));
  };

  const finishTournament = () => {
    triggerFullScreen();
    setTData(prev => ({ ...prev, stage: 'finished' }));
  };

  // --- RENDERERS ---

  const renderMatchCard = (m: Match, isFinal: boolean) => {
    const p1 = tData.players.find(p => p.id === m.p1Id);
    const p2 = tData.players.find(p => p.id === m.p2Id);
    if (!p1 || !p2) return null;

    const isSport = tData.modality && tData.modality !== 'xadrez_dama' && tData.modality !== 'outro';
    const showDrawButton = tData.modality !== 'basquete' && tData.modality !== 'volei' && tData.modality !== 'queimado' && tData.modality !== 'tenis_mesa';

    return (
      <div key={m.id} className="flex flex-col md:flex-row items-center bg-slate-900 border border-white/10 p-4 rounded-xl shadow-md gap-3 mb-3 text-white justify-between">
         <div className="flex-1 text-center md:text-right font-bold text-slate-100 truncate w-full flex flex-col md:flex-row items-center md:justify-end gap-1.5 leading-tight">
            <span className="truncate">{p1.name}</span>
            <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono font-medium max-w-[80px] truncate">{p1.class}</span>
         </div>
         
         <div className="flex items-center gap-2 shrink-0 bg-slate-950 p-1.5 rounded-lg border border-white/5 shadow-inner">
            {isSport ? (
              <div className="flex items-center gap-1.5 px-1 bg-black/40 rounded py-0.5">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-10 h-8 text-center bg-slate-900 border border-white/10 rounded font-black text-blue-400 font-mono text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  value={m.p1Score !== undefined ? m.p1Score : ''}
                  onChange={(e) => {
                    const score = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                    handleScoreChange(m.id, 'p1', score, isFinal);
                  }}
                />
                <span className="text-xs text-slate-500 font-bold font-mono">x</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-10 h-8 text-center bg-slate-900 border border-white/10 rounded font-black text-blue-400 font-mono text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  value={m.p2Score !== undefined ? m.p2Score : ''}
                  onChange={(e) => {
                    const score = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                    handleScoreChange(m.id, 'p2', score, isFinal);
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => updateMatchResult(m.id, '1-0', isFinal)} 
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${m.result === '1-0' ? 'bg-green-600 text-white shadow-md shadow-green-900/45' : 'bg-slate-800 text-slate-400 hover:bg-slate-705'}`}>
                  V1
                </button>
                {showDrawButton && (
                  <button 
                    onClick={() => updateMatchResult(m.id, '0.5-0.5', isFinal)} 
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${m.result === '0.5-0.5' ? 'bg-orange-500 text-white shadow-md shadow-orange-900/45' : 'bg-slate-800 text-slate-400 hover:bg-slate-705'}`}>
                    Emp
                  </button>
                )}
                <button 
                  onClick={() => updateMatchResult(m.id, '0-1', isFinal)} 
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${m.result === '0-1' ? 'bg-red-600 text-white shadow-md shadow-red-900/45' : 'bg-slate-800 text-slate-400 hover:bg-slate-705'}`}>
                  V2
                </button>
              </div>
            )}
         </div>

         <div className="flex-1 text-center md:text-left font-bold text-slate-100 truncate w-full flex flex-col md:flex-row-reverse items-center md:justify-end gap-1.5 leading-tight">
            <span className="truncate">{p2.name}</span>
            <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono font-medium max-w-[80px] truncate">{p2.class}</span>
         </div>
      </div>
    );
  };

  const renderStandingsTable = (players: Player[]) => {
    const isSport = tData.modality && tData.modality !== 'xadrez_dama' && tData.modality !== 'outro';
    return (
      <div className="overflow-x-auto rounded-xl border border-white/10 shadow-inner">
        <table className="w-full text-sm text-left text-slate-100">
          <thead className="text-[10px] uppercase font-black tracking-wider bg-slate-950 text-slate-400 border-b border-white/10">
            <tr>
              <th className="px-3 py-3 text-center w-12">Pos</th>
              <th className="px-3 py-3">Nome / Turma</th>
              <th className="px-3 py-3 text-center">Pts</th>
              <th className="px-3 py-3 text-center">PJ</th>
              <th className="px-3 py-3 text-center">V</th>
              <th className="px-3 py-3 text-center">E</th>
              {isSport && (
                <>
                  <th className="px-2 py-3 text-center">GP</th>
                  <th className="px-2 py-3 text-center">GC</th>
                  <th className="px-2 py-3 text-center">SG</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-slate-900 font-medium">
            {players.map((p, i) => {
              const bgClass = i === 0 ? 'bg-yellow-500/10 text-yellow-300' : i === 1 ? 'bg-slate-400/5 text-slate-300' : 'text-slate-105';
              return (
                <tr key={p.id} className={`${bgClass} transition hover:bg-white/5`}>
                  <td className="px-3 py-3 text-center font-bold text-xs">{i+1}º</td>
                  <td className="px-3 py-3">
                    <div className="truncate max-w-[150px] font-bold leading-tight">{p.name}</div>
                    <div className="text-[9px] text-slate-400 tracking-wide font-mono mt-0.5">{p.class}</div>
                  </td>
                  <td className="px-3 py-3 text-center font-black text-blue-400 font-mono text-sm">{p.points}</td>
                  <td className="px-3 py-3 text-center text-xs font-mono">{p.gamesPlayed}</td>
                  <td className="px-3 py-3 text-center text-green-400 text-xs font-mono">{p.wins}</td>
                  <td className="px-3 py-3 text-center text-slate-400 text-xs font-mono">{p.draws || 0}</td>
                  {isSport && (
                    <>
                      <td className="px-2 py-3 text-center text-xs text-blue-300 font-mono font-medium">{p.goalsFor || 0}</td>
                      <td className="px-2 py-3 text-center text-xs text-red-300 font-mono font-medium">{p.goalsAgainst || 0}</td>
                      <td className="px-2 py-3 text-center text-xs text-emerald-400 font-mono font-bold">{ (p.goalsFor || 0) - (p.goalsAgainst || 0) }</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // --- RENDERING PLAYOFF MATCH BRACKET CARD (KNOCKOUTS) ---
  const renderKnockoutMatchCard = (m: KnockoutMatch, roundIdx: number) => {
    const p1 = tData.players.find(p => p.id === m.p1Id);
    const p2 = tData.players.find(p => p.id === m.p2Id);
    const isSport = tData.modality !== 'xadrez_dama' && tData.modality !== 'outro';

    return (
      <div key={m.id} className="bg-slate-905 border border-white/10 p-3.5 rounded-xl shadow-md space-y-3 text-white font-sans text-left">
        {/* Opponent 1 */}
        <div className={`flex justify-between items-center p-2 rounded-lg ${m.winnerId && m.winnerId === m.p1Id ? 'bg-green-600/20 text-green-400 font-bold border border-green-500/20' : 'bg-slate-950/60'}`}>
          <div className="truncate flex-1">
            {p1 ? (
              <div className="leading-tight">
                <div className="truncate text-xs font-bold">{p1.name}</div>
                <div className="text-[9px] text-slate-400 font-mono">{p1.class}</div>
              </div>
            ) : (
              <span className="text-[10px] text-slate-500 italic">A definir...</span>
            )}
          </div>
          {p1 && isSport && (
            <input
              type="number"
              placeholder="0"
              className="w-10 h-7 text-center bg-slate-900 border border-white/10 rounded font-bold text-blue-400 font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none ml-2 text-white"
              value={m.p1Score !== undefined ? m.p1Score : ''}
              onChange={(e) => {
                const score = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                handleKnockoutScoreOrWinnerChange(m.id, score, m.p2Score);
              }}
            />
          )}
        </div>

        <div className="text-center text-[10px] text-slate-500 font-mono leading-none">vs</div>

        {/* Opponent 2 */}
        <div className={`flex justify-between items-center p-2 rounded-lg ${m.winnerId && m.winnerId === m.p2Id ? 'bg-green-600/20 text-green-400 font-bold border border-green-500/20' : 'bg-slate-950/60'}`}>
          <div className="truncate flex-1">
            {p2 ? (
              <div className="leading-tight">
                <div className="truncate text-xs font-bold">{p2.name}</div>
                <div className="text-[9px] text-slate-400 font-mono">{p2.class}</div>
              </div>
            ) : (
              <span className="text-[10px] text-slate-500 italic">A definir...</span>
            )}
          </div>
          {p2 && isSport && (
            <input
              type="number"
              placeholder="0"
              className="w-10 h-7 text-center bg-slate-900 border border-white/10 rounded font-bold text-blue-400 font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none ml-2 text-white"
              value={m.p2Score !== undefined ? m.p2Score : ''}
              onChange={(e) => {
                const score = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                handleKnockoutScoreOrWinnerChange(m.id, m.p1Score, score);
              }}
            />
          )}
        </div>

        {/* Tiebreaker choice when scores are even or for non-sport modes (e.g. Chess) */}
        {p1 && p2 && (
          <div className="flex justify-center gap-1.5 pt-1.5 border-t border-white/5">
            <span className="text-[9px] text-slate-400 shrink-0 font-medium self-center mr-1">Vencedor:</span>
            <button
              onClick={() => handleKnockoutScoreOrWinnerChange(m.id, m.p1Score, m.p2Score, p1.id)}
              className={`px-2 py-0.5 text-[9px] font-bold rounded transition ${m.winnerId === p1.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-800 text-slate-450 hover:bg-slate-750'}`}
            >
              Op1
            </button>
            <button
              onClick={() => handleKnockoutScoreOrWinnerChange(m.id, m.p1Score, m.p2Score, p2.id)}
              className={`px-2 py-0.5 text-[9px] font-bold rounded transition ${m.winnerId === p2.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-800 text-slate-450 hover:bg-slate-750'}`}
            >
              Op2
            </button>
          </div>
        )}
      </div>
    );
  };

  // --- VIEW: SETUP WIZARD ---

  if (tData.stage === 'setup') {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto space-y-6">
        {onBack && (
          <button 
            onClick={onBack} 
            className="mb-2 px-5 py-2.5 bg-slate-900/80 backdrop-blur-md rounded-full text-white font-bold transition shadow-lg hover:bg-slate-800 flex items-center w-fit active:scale-95 border border-white/10"
          >
            <span className="mr-2">⬅</span> Voltar ao Menu
          </button>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 glass-panel p-6 md:p-8 rounded-xl bg-white border border-slate-200 shadow-xl flex flex-col min-h-[580px]">
            
            {/* Header / Stepper Progress indicators */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">🏆</div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Criar Novo Torneio</h2>
              <div className="flex justify-center items-center mt-3 gap-1.5">
                <span className={`h-1.5 w-8 rounded ${setupStep === 0 ? 'bg-blue-600' : 'bg-slate-200'}`}></span>
                <span className={`h-1.5 w-8 rounded ${setupStep === 1 ? 'bg-blue-600' : 'bg-slate-200'}`}></span>
                <span className={`h-1.5 w-8 rounded ${setupStep === 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></span>
                <span className={`h-1.5 w-8 rounded ${setupStep === 3 ? 'bg-blue-600' : 'bg-slate-200'}`}></span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-between">
              
              {/* STEP 0: modality and participant type selection */}
              {setupStep === 0 && (
                <div className="space-y-6 animate-fade-in text-left">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">1. Qual é a modalidade do torneio?</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(['xadrez_dama', 'futebol_futsal', 'basquete', 'handebol', 'volei', 'queimado', 'tenis_mesa', 'outro'] as const).map((sportKey) => {
                        const active = modality === sportKey;
                        const labelMap: Record<string, { title: string; emo: string }> = {
                          xadrez_dama: { title: 'Xadrez / Dama', emo: '♟️' },
                          futebol_futsal: { title: 'Futebol / Futsal', emo: '⚽' },
                          basquete: { title: 'Basquete', emo: '🏀' },
                          handebol: { title: 'Handebol', emo: '🤾' },
                          volei: { title: 'Vôlei', emo: '🏐' },
                          queimado: { title: 'Queimado', emo: '☄️' },
                          tenis_mesa: { title: 'Tênis de Mesa', emo: '🏓' },
                          outro: { title: 'Outro Esporte', emo: '🥇' }
                        };
                        const sport = labelMap[sportKey];
                        return (
                          <button
                            type="button"
                            key={sportKey}
                            onClick={() => {
                              setModality(sportKey);
                              // Auto-toggle sensible defaults for team sports
                              if (sportKey === 'futebol_futsal' || sportKey === 'basquete' || sportKey === 'handebol' || sportKey === 'volei') {
                                setParticipantType('team');
                              } else {
                                setParticipantType('individual');
                              }
                            }}
                            className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition active:scale-95 ${active ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                          >
                            <span className="text-2xl mb-1">{sport.emo}</span>
                            <span className="text-xs font-bold text-slate-800 leading-tight">{sport.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">2. Formato por Jogador ou Equipe?</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setParticipantType('individual')}
                        className={`p-5 rounded-xl border flex items-center gap-3.5 transition active:scale-95 ${participantType === 'individual' ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                      >
                        <span className="text-2xl">👤</span>
                        <div className="text-left">
                          <div className="font-bold text-slate-850 text-sm">Individual</div>
                          <div className="text-[10px] text-slate-500">Cada aluno compete por si próprio</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setParticipantType('team')}
                        className={`p-5 rounded-xl border flex items-center gap-3.5 transition active:scale-95 ${participantType === 'team' ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                      >
                        <span className="text-2xl">👥</span>
                        <div className="text-left">
                          <div className="font-bold text-slate-800 text-sm">Equipes / Grupos</div>
                          <div className="text-[10px] text-slate-500">Clubes, turmas ou trios se enfrentam</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSetupStep(1)}
                    className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md active:scale-95 text-center text-sm"
                  >
                    Definir Participantes ➜
                  </button>
                </div>
              )}

              {/* STEP 1: QUANTITY SELECT */}
              {setupStep === 1 && (
                <div className="w-full max-w-md mx-auto text-center space-y-6 animate-fade-in py-4">
                  <h3 className="text-lg font-black text-slate-800">
                    Quantos {participantType === 'team' ? 'equipes' : 'jogadores'} participarão?
                  </h3>
                  
                  <div className="flex items-center justify-center space-x-6">
                    <button 
                      type="button"
                      onClick={() => setPlayerCount(Math.max(3, playerCount - 1))}
                      className="w-14 h-14 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-2xl font-bold transition shadow-sm"
                    >-</button>
                    <span className="text-6xl font-black text-blue-600 w-32 font-mono leading-none">{playerCount}</span>
                    <button 
                      type="button"
                      onClick={() => setPlayerCount(Math.min(100, playerCount + 1))}
                      className="w-14 h-14 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-2xl font-bold transition shadow-sm"
                    >+</button>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    {[4, 6, 8, 12, 16, 24, 32].map(num => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setPlayerCount(num)}
                        className={`px-3 py-1 bg-slate-100 text-xs font-bold rounded-full hover:bg-slate-200 transition ${playerCount === num ? 'bg-blue-600 text-white hover:bg-blue-600' : 'text-slate-600'}`}
                      >
                        {num} {participantType === 'team' ? 'Equipes' : 'Alunos'}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setSetupStep(0)} className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl transition text-slate-600 text-sm flex items-center justify-center">
                      Voltar
                    </button>
                    <button 
                      type="button"
                      onClick={handleCountConfirm}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg text-sm"
                    >
                      Continuar ➜
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: FORMAT SELECTIONS */}
              {setupStep === 2 && (
                <div className="space-y-6 animate-fade-in text-left">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Escolha o Padrão do Torneio</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Format A: Groups then playoffs */}
                    <button
                      type="button"
                      onClick={() => setSelectedFormat('grupos_mata_mata')}
                      className={`p-4 border-2 rounded-xl text-left transition ${selectedFormat === 'grupos_mata_mata' ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="text-2xl mb-1">🌍</div>
                      <div className="font-bold text-slate-800 text-sm">Fase de Grupos + Playoffs</div>
                      <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Concorrentes disputam tabelas rotativas. Os mais bem posicionados avançam para o chaveamento Mata-Mata.
                      </div>
                    </button>

                    {/* Format B: Pure Playoffs (Mata-mata) - Copa do Brasil */}
                    <button
                      type="button"
                      onClick={() => setSelectedFormat('mata_mata')}
                      className={`p-4 border-2 rounded-xl text-left transition ${selectedFormat === 'mata_mata' ? 'border-orange-500 bg-orange-50/10' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="text-2xl mb-1">⚔️</div>
                      <div className="font-bold text-slate-800 text-sm">Mata-Mata Direto</div>
                      <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Eliminação simples de alto impacto. Estilo Copa do Brasil clássica de mata-mata. Quem perde é eliminado imediatamente.
                      </div>
                    </button>

                    {/* Format C: Single League */}
                    <button
                      type="button"
                      onClick={() => setSelectedFormat('grupo_unico')}
                      className={`p-4 border-2 rounded-xl text-left transition ${selectedFormat === 'grupo_unico' ? 'border-green-500 bg-green-50/10' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="text-2xl mb-1">📊</div>
                      <div className="font-bold text-slate-800 text-sm">Campeonato (Grupo Único)</div>
                      <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Todos contra todos em turno único de pontos corridos. Ideal para coroar o mais consistente sem finais.
                      </div>
                    </button>
                  </div>

                  {/* Sub configurations depending on format selection */}
                  {selectedFormat === 'grupos_mata_mata' && (
                    <div className="p-4 bg-slate-50 rounded-xl space-y-4 border border-slate-200 animate-slide-up text-left">
                      <div className="font-bold text-xs text-slate-600 uppercase tracking-wider mb-2">Ajustes dos Grupos & Classificação</div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1">Número de Grupos:</label>
                          <select
                            value={selectedNumGroups}
                            onChange={(e) => setSelectedNumGroups(parseInt(e.target.value, 10))}
                            className="w-full text-xs p-2 bg-white border border-slate-300 rounded font-bold text-slate-800 focus:outline-none"
                          >
                            <option value={2}>2 Grupos</option>
                            <option value={4}>4 Grupos</option>
                            {playerCount >= 8 && <option value={8}>8 Grupos</option>}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1">Classificados por Grupo:</label>
                          <select
                            value={numAdvancers}
                            onChange={(e) => setNumAdvancers(parseInt(e.target.value, 10) as any)}
                            className="w-full text-xs p-2 bg-white border border-slate-300 rounded font-bold text-slate-800 focus:outline-none"
                          >
                            <option value={1}>Apenas 1º Colocado</option>
                            <option value={2}>Os 2 Melhores Colocados</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1">Estilo das Finais (Playoffs):</label>
                          <select
                            value={finalsStyle}
                            onChange={(e) => setFinalsStyle(e.target.value as any)}
                            className="w-full text-xs p-2 bg-white border border-slate-300 rounded font-bold text-slate-800 focus:outline-none"
                          >
                            <option value="copa_do_mundo">Copa do Mundo (Chaveamento ⚔️)</option>
                            <option value="tradicional">Circular Tradicional (Tabela 📊)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setSetupStep(1)} className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl transition text-slate-600 text-sm text-center flex items-center justify-center">
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setSetupStep(3)}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg text-sm text-center"
                    >
                      Configurar Nomes ➜
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PLAYERS INPUT SHEET */}
              {setupStep === 3 && (
                <div className="space-y-4 animate-fade-in flex flex-col h-full text-left">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
                    <div>
                      <div className="text-xs font-black uppercase text-slate-500">Torneio de {modality.replace('_', ' ').toUpperCase()}</div>
                      <div className="font-bold text-slate-805 text-sm">{playerCount} {participantType === 'team' ? 'Equipes' : 'Alunos'} • {selectedFormat === 'grupo_unico' ? 'Pontos Corridos' : selectedFormat === 'mata_mata' ? 'Mata-Mata' : `${selectedNumGroups} Grupos`}</div>
                    </div>
                    <button
                      type="button"
                      onClick={autofillPlayers}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow flex items-center gap-1 active:scale-95"
                    >
                      ⚡ Preenchimento Rápido
                    </button>
                  </div>

                  <div className="overflow-y-auto max-h-[280px] pr-2 custom-scrollbar space-y-2.5">
                    {playerInputs.map((input, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="w-9 h-10 flex items-center justify-center bg-slate-100 border rounded font-mono font-bold text-[11px] text-slate-500 shrink-0">
                          #{i + 1}
                        </span>
                        <input
                          type="text"
                          required
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400 text-slate-800 bg-white"
                          placeholder={participantType === 'team' ? `Ex: Real Madrid, Barcelona...` : `Nome do Aluno ${i+1}`}
                          value={input.name}
                          onChange={(e) => updatePlayerInput(i, 'name', e.target.value)}
                        />
                        <input
                          type="text"
                          className="w-24 md:w-32 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400 text-slate-800 bg-white"
                          placeholder="Série/Turma"
                          value={input.class}
                          onChange={(e) => updatePlayerInput(i, 'class', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setSetupStep(2)} className="w-1/3 py-3.5 border border-slate-300 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition text-sm text-center flex items-center justify-center">
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={startTournament}
                      className="flex-1 py-3.5 bg-green-600 text-white rounded-xl font-black text-base hover:bg-green-700 transition shadow-lg text-center"
                    >
                      Iniciar Competição 🏁
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Visual Rules Panel on Right side */}
          <div className="lg:col-span-1 h-full min-h-[500px]">
            {renderRulesCard()}
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: GROUPS ROUND ROW ROBIN STAGE ---
  if (tData.stage === 'groups') {
    return (
      <div className="animate-fade-in space-y-6 pb-20 max-w-7xl mx-auto">
        
        {/* Dynamic header navigation */}
        <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl shadow-lg border border-white/10 text-white text-left">
          <div>
            <div className="text-[10px] uppercase font-black text-blue-400 tracking-wider">MODALIDADE: {modality.replace('_', ' ').toUpperCase()}</div>
            <h2 className="text-xl font-black uppercase shadow-black drop-shadow-md">Fase de Grupos</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRulesModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 text-xs font-bold transition flex items-center gap-1.5 border border-white/10 active:scale-95 shadow-sm"
            >
              <span>📋</span> Regras
            </button>
            <button 
              onClick={() => { if(confirm('Cancelar torneio atual de forma irrevogável? Todas as posições serão limpas.')) { setTData({...tData, stage:'setup'}); setSetupStep(0); } }} 
              className="bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-500/30 rounded-lg px-3 py-2 text-xs font-bold transition duration-155 active:scale-95"
            >
              Excluir
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${tData.groups.length > 1 ? 'lg:grid-cols-2' : ''} gap-6`}>
          {tData.groups.map(group => {
            const groupPlayers = getGroupStandings(group.id, group.players);
            return (
              <div key={group.id} className="glass-panel p-4 md:p-6 rounded-xl bg-slate-900/85 border border-white/10 relative shadow-xl text-left">
                <div className="flex justify-between items-center border-b border-white/5 pb-3.5 mb-6 text-white">
                  <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm flex items-center gap-2">
                    <span className="text-blue-400">🛡️</span> {group.name}
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-blue-955 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full">
                    {group.players.length} Atletas
                  </span>
                </div>
                
                <div className="mb-8 space-y-3">
                  <h4 className="text-xs uppercase font-black tracking-widest text-slate-400">Tabela de Classificação</h4>
                  {renderStandingsTable(groupPlayers)}
                </div>

                <div>
                  <h3 className="text-xs uppercase font-black tracking-widest text-slate-400 mb-3.5">Confrontos do Grupo</h3>
                  <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {tData.matches.filter(m => m.groupIndex === group.id).map(m => renderMatchCard(m, false))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Buttons to transition to next stage */}
        {tData.groups.length > 1 && (
          <div className="fixed bottom-28 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none">
            <button 
              onClick={advanceToFinals}
              className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-full font-black text-lg shadow-2xl border-4 border-white/20 hover:scale-105 active:scale-95 transition pointer-events-auto flex items-center gap-2"
            >
              <span>Datar & Chavear Finais 🔥</span>
              <span className="text-xl">⚔️</span>
            </button>
          </div>
        )}
         
        {tData.groups.length === 1 && (
          <div className="fixed bottom-28 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none">
            <button 
              type="button"
              onClick={() => {
                const winner = getGroupStandings(0, tData.groups[0].players)[0];
                triggerFullScreen();
                setTData(prev => ({ ...prev, stage: 'finished', finalPlayers: [winner.id] }));
              }}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-full font-black text-lg shadow-2xl border-4 border-white/20 hover:scale-105 active:scale-95 transition pointer-events-auto flex items-center gap-2"
            >
              <span>Finalizar & Encerrar Torneio 🏆</span>
            </button>
          </div>
        )}

        {showRulesModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-lg rounded-xl overflow-hidden relative shadow-2xl text-slate-800">
              <button 
                onClick={() => { setShowRulesModal(false); setIsEditingRules(false); }}
                className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-705 transition z-20 font-bold"
              >
                ✕
              </button>
              {renderRulesCard()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VIEW: FINALS / PLAYOFF BRACKET STAGE ---
  if (tData.stage === 'finals') {
    const hasBracket = tData.knockoutRounds && tData.knockoutRounds.length > 0;

    return (
      <div className="animate-fade-in space-y-6 max-w-7xl mx-auto pb-24 px-2">
        
        {/* Playoff title navigation */}
        <div className="flex justify-between items-center bg-slate-900 border border-white/10 p-4 rounded-xl shadow-lg text-white text-left">
          <div>
            <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">COMPETIÇÃO: {modality.replace('_', ' ').toUpperCase()}</div>
            <h2 className="text-xl md:text-2xl font-black uppercase shadow-black drop-shadow-md">Etapa Final Decisiva</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRulesModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 border border-white/10 active:scale-95 shadow-sm"
            >
              <span>📋</span> Regras
            </button>
            <button 
              onClick={() => { if(confirm('Cancelar todo o torneio?')) { setTData({...tData, stage:'setup'}); setSetupStep(0); } }} 
              className="text-white/60 hover:text-white underline text-xs"
            >
              Sair
            </button>
          </div>
        </div>

        {/* BRACKET LAYOUT SYSTEM */}
        {hasBracket ? (
          <div className="space-y-6 text-left">
            <div className="flex justify-center items-center gap-2 overflow-x-auto border-b border-white/5 pb-3">
              {tData.knockoutRounds!.map((round, rIdx) => (
                <button
                  key={rIdx}
                  onClick={() => setActiveRoundIndex(rIdx)}
                  className={`px-4 py-1.5 text-xs font-black uppercase rounded-full transition ${activeRoundIndex === rIdx ? 'bg-amber-500 text-slate-950 font-black shadow' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {round.name}
                </button>
              ))}
            </div>

            <div className="glass-panel p-6 rounded-2xl bg-slate-950/20 border border-white/15">
              <div className="text-center mb-6 text-left border-b border-white/5 pb-4">
                <span className="text-xs font-black text-amber-400 uppercase tracking-[0.2em]">{tData.knockoutRounds![activeRoundIndex].name}</span>
                <h3 className="font-bold text-slate-100 text-lg mt-0.5">Partidas Chaveadas</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tData.knockoutRounds![activeRoundIndex].matches.map(m => renderKnockoutMatchCard(m, activeRoundIndex))}
              </div>
            </div>

            {/* General Playoff summary results */}
            <div className="text-center font-mono text-[10px] text-slate-400 italic">
               *Insira os gols/pontos de cada lado. O vencedor será marcado automaticamente (em caso de empate técnico, selecione o vencedor do desempate nos botões Op1/Op2).
            </div>
            
            <div className="text-center mt-6">
               <button 
                  onClick={finishTournament}
                  className="px-10 py-4 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black tracking-wide rounded-full text-lg shadow-lg active:scale-95 transition"
               >
                  VER PODIUM & ENCERRAR 🏆
               </button>
            </div>
          </div>
        ) : (
          /* Normal Playoff Table Layout if circle format was chosen instead */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start text-left">
            <div className="glass-panel p-6 rounded-xl border bg-slate-900 text-white shadow-2xl">
              <h3 className="font-bold text-slate-100 mb-4 text-center uppercase tracking-wide">Classificação da Triangular Final</h3>
              {renderStandingsTable(getSortedPlayers(tData.finalPlayers))}
            </div>

            <div className="glass-panel p-6 rounded-xl bg-slate-900 text-white shadow-2xl space-y-4">
              <h3 className="font-bold text-slate-100 mb-4 text-center uppercase tracking-wide">Jogos Decisivos</h3>
              <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar">
                {tData.finalMatches?.map(m => renderMatchCard(m, true))}
              </div>

              <div className="pt-6 border-t border-white/5 flex justify-center">
                <button 
                  onClick={finishTournament}
                  className="w-full py-4 bg-yellow-500 text-slate-950 font-black text-base rounded-xl transition hover:bg-yellow-400 active:scale-95 shadow-md uppercase tracking-wider text-center"
                >
                  Encerrar e Ver Campeão Oficial
                </button>
              </div>
            </div>
          </div>
        )}

        {showRulesModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in text-slate-800">
            <div className="w-full max-w-lg rounded-xl overflow-hidden relative shadow-2xl">
              <button 
                onClick={() => { setShowRulesModal(false); setIsEditingRules(false); }}
                className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-705 transition z-20 font-bold"
              >
                ✕
              </button>
              {renderRulesCard()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VIEW: FINISHED (FULLSCREEN CELEBRATION WINNER PROFILE) ---
  if (tData.stage === 'finished') {
    const isSport = tData.modality !== 'xadrez_dama' && tData.modality !== 'outro';
    
    // Sort podium
    let sorted = [...tData.players];
    if (tData.finalPlayers && tData.finalPlayers.length > 0) {
      if (tData.knockoutRounds && tData.knockoutRounds.length > 0) {
        // Knockout sorting: winner is grand champion
        const lastRound = tData.knockoutRounds[tData.knockoutRounds.length - 1];
        const finalMatch = lastRound.matches[0];
        const winnerId = finalMatch?.winnerId;
        
        if (winnerId) {
          // Re-index to put winner at first
          sorted = [
            tData.players.find(p => p.id === winnerId)!,
            ...tData.players.filter(p => p.id !== winnerId)
          ].filter(Boolean);
        }
      } else {
        const sortedWithFinalsStats = getSortedPlayers(tData.finalPlayers);
        sorted = [
          ...sortedWithFinalsStats,
          ...tData.players.filter(p => !tData.finalPlayers.includes(p.id))
        ];
      }
    } else if (tData.groups.length === 1) {
      sorted = getGroupStandings(0, tData.groups[0].players);
    }

    const champion = sorted[0];
    
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        {/* High-quality background effects and canvas mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 opacity-90"></div>
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/grid.png')]"></div>
        
        <div className="relative z-10 animate-scale-in flex flex-col items-center max-h-screen overflow-y-auto py-10 w-full custom-scrollbar">
          <div className="text-8xl mb-4 animate-bounce drop-shadow-[0_0_35px_rgba(251,191,36,0.6)]">🏆</div>
          
          <h2 className="text-xs font-black text-amber-400 uppercase tracking-[0.25em] mb-2 drop-shadow-md">
            Parabéns ao Grande Campeão
          </h2>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-6 tracking-tight font-sans text-center">
            {champion?.name || "Campeão"}
          </h1>
          
          <div className="bg-white/10 backdrop-blur-md rounded-full px-6 py-2.5 text-slate-100 font-bold text-lg md:text-xl border border-white/20 shadow-xl mb-10 max-w-md truncate">
             Série / Turma: <span className="text-yellow-400 font-mono font-black">{champion?.class || "Geral"}</span>
          </div>

          <div className="glass-panel p-6 rounded-2xl w-full max-w-md mx-auto bg-black/45 border-white/10 backdrop-blur-xl mb-8 border border-white/10">
            <h3 className="font-bold text-white/80 mb-4 border-b border-white/10 pb-3 text-sm uppercase tracking-wider">Podium Oficial {participantType === 'team' ? 'Equipes' : 'Jogadores'}</h3>
            {sorted.slice(0, 3).map((p, i) => {
              if (!p) return null;
              return (
                <div key={p.id} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 text-white">
                  <div className="flex items-center gap-3 text-left">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-white text-sm shadow-md ${i===0?'bg-yellow-500':i===1?'bg-slate-400':'bg-amber-700'}`}>
                      {i+1}
                    </span>
                    <div className="text-left">
                      <span className="font-bold text-white block truncate max-w-[160px]">{p.name}</span>
                      <span className="text-[9px] text-slate-400 block font-mono">{p.class}</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-blue-300 text-sm">{ i === 0 ? 'Campeão' : i === 1 ? 'Vice' : '3º Lugar' }</span>
                </div>
              );
            })}
          </div>

          <button 
            type="button"
            onClick={() => { 
              exitFullScreen();
              setTData({
                stage: 'setup',
                players: [],
                groups: [],
                matches: [],
                finalMatches: [],
                finalPlayers: [],
                modality: 'xadrez_dama',
                participantType: 'individual',
                format: 'grupos_mata_mata'
              }); 
              setSetupStep(0); 
            }}
            className="px-8 py-3.5 bg-white text-slate-950 font-black text-base rounded-full hover:bg-slate-100 transition transform hover:scale-105 shadow-2xl active:scale-95 text-center"
          >
            Configurar Outro Torneio 🔄
          </button>
        </div>
      </div>
    );
  }

  return null;
};