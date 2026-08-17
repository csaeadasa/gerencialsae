export interface InfracaoItem {
  code: number;
  servico: 'Água' | 'Esgoto';
  nome: string;
}

export const INFRACCOES_AGUA: InfracaoItem[] = [
  { code: 1, servico: 'Água', nome: 'Retirada ou inversão de hidrômetros.' },
  { code: 2, servico: 'Água', nome: 'Emprego de ejetores ou bombas de sucção diretamente ligados ao ramal predial.' },
  { code: 3, servico: 'Água', nome: 'Uso de dispositivo que prejudique o abastecimento de água ou a medição do consumo, especialmente quando instalado no alimentador predial ou não previsto no padrão de ligação.' },
  { code: 4, servico: 'Água', nome: 'Uso de dispositivos ou equipamentos intercalados no alimentador predial que prejudiquem o abastecimento público de água, a medição do consumo ou o funcionamento do hidrômetro.' },
  { code: 5, servico: 'Água', nome: 'Impedir a realização da leitura ou o acesso ao hidrômetro para vistoria, manutenção ou substituição.' },
  { code: 6, servico: 'Água', nome: 'Impedir o acesso ao hidrômetro para a suspensão do fornecimento de água.' },
  { code: 7, servico: 'Água', nome: 'Intervenção indevida no ramal predial.' },
  { code: 8, servico: 'Água', nome: 'Impedir o acesso dos agentes do prestador de serviços às instalações hidrossanitárias para a realização da inspeção.' },
  { code: 9, servico: 'Água', nome: 'Não cumprimento das determinações, por escrito, do pessoal autorizado para fazer a inspeção nas instalações prediais de água.' },
  { code: 10, servico: 'Água', nome: 'Intervenção e/ou utilização de hidrantes para fins não autorizados.' },
  { code: 11, servico: 'Água', nome: 'Intervenção indevida nas redes públicas de água.' },
  { code: 12, servico: 'Água', nome: 'Interligação de outras fontes de abastecimento à instalação hidráulica predial alimentada pela rede pública de distribuição de água.' },
  { code: 13, servico: 'Água', nome: 'Revenda ou abastecimento de água a terceiros.' },
  { code: 14, servico: 'Água', nome: 'Violação ou utilização de equipamentos que prejudiquem ou interfiram no funcionamento do hidrômetro.' },
  { code: 15, servico: 'Água', nome: 'Violação de selos e de lacres do hidrômetro.' },
  { code: 16, servico: 'Água', nome: 'Violação do corte.' },
  { code: 17, servico: 'Água', nome: 'Construção sobre as redes públicas de água.' }
];

export const INFRACCOES_ESGOTO: InfracaoItem[] = [
  { code: 1, servico: 'Esgoto', nome: 'Ligações clandestinas à rede pública de esgoto.' },
  { code: 2, servico: 'Esgoto', nome: 'Construções sobre redes públicas de esgotos.' },
  { code: 3, servico: 'Esgoto', nome: 'Despejo de águas pluviais diretamente na rede coletora de esgotos sanitários ou indiretamente por meio das instalações prediais de esgoto sanitário.' },
  { code: 4, servico: 'Esgoto', nome: 'Despejo de esgotos nos logradouros, nas instalações prediais de águas pluviais e em galerias de águas pluviais.' },
  { code: 5, servico: 'Esgoto', nome: 'Lançamentos indevidos de óleos e gorduras na rede pública.' },
  { code: 6, servico: 'Esgoto', nome: 'Lançamentos não autorizados de resíduos com características não domésticas.' },
  { code: 7, servico: 'Esgoto', nome: 'Uso não autorizado do Sistema de Esgotamento Sanitário.' },
  { code: 8, servico: 'Esgoto', nome: 'Interconexões das instalações de água e esgotos.' },
  { code: 9, servico: 'Esgoto', nome: 'Mau uso das instalações da unidade usuária com danos ao ramal e à rede pública.' },
  { code: 10, servico: 'Esgoto', nome: 'Intervenção indevida nas redes públicas de esgotos sanitários.' },
  { code: 11, servico: 'Esgoto', nome: 'Não cumprimento das determinações, por escrito, do pessoal autorizado para fazer a inspeção das instalações internas de esgoto.' },
  { code: 12, servico: 'Esgoto', nome: 'Lançamento de materiais que causem obstrução ou interferência no sistema de esgotamento.' },
  { code: 13, servico: 'Esgoto', nome: 'Impedir o acesso dos agentes do prestador de serviços às instalações hidrossanitárias para a realização da inspeção.' },
  { code: 14, servico: 'Esgoto', nome: 'Recusa do usuário em conectar sua edificação a rede de esgoto disponível.' },
  { code: 15, servico: 'Esgoto', nome: 'Lançamento de esgotos gerados pela utilização de água proveniente de poços, de captação em manancial superficial ou de aproveitamento de água não potável na rede coletora de esgotos, sem a celebração de contrato específico.' },
  { code: 16, servico: 'Esgoto', nome: 'Despejo de resíduos oriundos de limpeza de fossas ou de caixas de gordura nas redes coletoras de esgotos ou redes de águas pluviais.' }
];

export const TODAS_INFRACCOES: InfracaoItem[] = [
  ...INFRACCOES_AGUA,
  ...INFRACCOES_ESGOTO
];
