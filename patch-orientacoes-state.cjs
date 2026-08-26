const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const [editModalTab, setEditModalTab] = useState<"geral" | "minuta" | "anexos">("geral");',
  'const [editModalTab, setEditModalTab] = useState<"geral" | "minuta" | "anexos">("geral");\n  const [showOrientacoesModal, setShowOrientacoesModal] = useState(false);'
);

fs.writeFileSync(file, content, 'utf8');
